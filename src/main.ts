import { WebcamCapture } from "./core/webcam";
import { Segmenter } from "./core/segmentation";
import { Grid } from "./core/grid";
import type { Renderer } from "./core/renderer";
import { MinesweeperRenderer, FlipDotRenderer } from "./renderers";

type RendererType = "minesweeper" | "flipdot";

interface WindowState {
  id: string;
  type: RendererType;
  element: HTMLDivElement;
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  renderer: Renderer;
  grid: Grid;
}

interface AppState {
  running: boolean;
  tileSize: number;
  threshold: number;
  activeWindow: string;
}

class App {
  private webcam: WebcamCapture;
  private segmenter: Segmenter;
  private windows: Map<string, WindowState> = new Map();
  private state: AppState;
  private animationFrameId: number | null = null;
  private lastSegmentTime = 0;
  private segmentInterval = 33;

  constructor() {
    const video = document.getElementById("webcam") as HTMLVideoElement;
    this.webcam = new WebcamCapture(video);
    this.segmenter = new Segmenter();

    this.state = {
      running: false,
      tileSize: 16,
      threshold: 0.3,
      activeWindow: "window-minesweeper",
    };

    this.initializeWindows();
    this.setupEventListeners();
    this.startCamera();
  }

  private initializeWindows(): void {
    const windowElements = document.querySelectorAll<HTMLDivElement>(".xp-window");

    windowElements.forEach((element) => {
      const id = element.id;
      const type = element.dataset.renderer as RendererType;
      const canvas = element.querySelector("canvas") as HTMLCanvasElement;
      const container = element.querySelector(".canvas-container") as HTMLDivElement;

      const renderer = this.createRenderer(type, canvas);
      const grid = this.createGrid(container);

      this.windows.set(id, {
        id,
        type,
        element,
        canvas,
        container,
        renderer,
        grid,
      });
    });
  }

  private createRenderer(type: RendererType, canvas: HTMLCanvasElement): Renderer {
    switch (type) {
      case "flipdot":
        return new FlipDotRenderer(canvas);
      case "minesweeper":
      default:
        return new MinesweeperRenderer(canvas);
    }
  }

  private createGrid(container: HTMLDivElement): Grid {
    const w = container.clientWidth || 640;
    const h = container.clientHeight || 480;
    const cols = Math.max(1, Math.floor(w / this.state.tileSize));
    const rows = Math.max(1, Math.floor(h / this.state.tileSize));
    return new Grid({ cols, rows });
  }

  private setupEventListeners(): void {
    // Resize observers for each window
    this.windows.forEach((win) => {
      const resizeObserver = new ResizeObserver(() => {
        const width = win.container.clientWidth;
        const height = win.container.clientHeight;
        win.renderer.resize(width, height);
        win.grid = this.createGrid(win.container);
      });
      resizeObserver.observe(win.container);

      // Window dragging
      this.setupWindowDrag(win.element);
    });

    // Taskbar clicks
    const taskbarItems = document.querySelectorAll<HTMLButtonElement>(".taskbar-item");
    taskbarItems.forEach((item) => {
      item.addEventListener("click", () => {
        const windowId = item.dataset.window;
        if (windowId) {
          this.activateWindow(windowId);
        }
      });
    });

    // Visibility change
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state.running) {
        this.pauseLoop();
      } else if (!document.hidden && this.state.running) {
        this.startLoop();
      }
    });
  }

  private setupWindowDrag(windowEl: HTMLDivElement): void {
    const titleBar = windowEl.querySelector(".title-bar") as HTMLDivElement;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    titleBar.addEventListener("mousedown", (e) => {
      if ((e.target as HTMLElement).closest(".title-bar-controls")) return;
      isDragging = true;
      offsetX = e.clientX - windowEl.offsetLeft;
      offsetY = e.clientY - windowEl.offsetTop;
      
      // Bring to front when dragging
      this.activateWindow(windowEl.id);
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const x = Math.max(0, e.clientX - offsetX);
      const y = Math.max(0, e.clientY - offsetY);
      windowEl.style.left = `${x}px`;
      windowEl.style.top = `${y}px`;
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  private activateWindow(windowId: string): void {
    this.state.activeWindow = windowId;

    // Update window visibility
    this.windows.forEach((win) => {
      win.element.classList.toggle("active", win.id === windowId);
    });

    // Update taskbar
    const taskbarItems = document.querySelectorAll<HTMLButtonElement>(".taskbar-item");
    taskbarItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.window === windowId);
    });

    // Resize active window's canvas
    const activeWin = this.windows.get(windowId);
    if (activeWin) {
      const width = activeWin.container.clientWidth;
      const height = activeWin.container.clientHeight;
      activeWin.renderer.resize(width, height);
      activeWin.grid = this.createGrid(activeWin.container);
    }
  }

  private async startCamera(): Promise<void> {
    try {
      await this.segmenter.initialize();
      await this.webcam.start({ width: 640, height: 480 });

      // Initialize all window sizes
      this.windows.forEach((win) => {
        win.renderer.resize(win.container.clientWidth, win.container.clientHeight);
      });

      this.state.running = true;
      this.startLoop();
    } catch (error) {
      console.error("Failed to start:", error);
      document.querySelectorAll(".error-message").forEach((el) => {
        el.classList.remove("hidden");
      });
    }
  }

  private startLoop(): void {
    if (this.animationFrameId !== null) return;

    const loop = (timestamp: number) => {
      if (!this.state.running) return;

      if (timestamp - this.lastSegmentTime > this.segmentInterval) {
        if (this.webcam.isActive()) {
          this.segmenter.processFrame(this.webcam.getVideoElement(), timestamp);
          this.lastSegmentTime = timestamp;
        }
      }

      // Only render active window
      const activeWin = this.windows.get(this.state.activeWindow);
      if (activeWin) {
        activeWin.grid.updateFromMask(
          (x, y) => this.segmenter.getMaskValueAt(x, y),
          this.state.threshold
        );
        activeWin.renderer.render(activeWin.grid, this.state.tileSize);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private pauseLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

new App();

function updateClock() {
  const clock = document.getElementById("clock");
  if (clock) {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

updateClock();
setInterval(updateClock, 1000);
