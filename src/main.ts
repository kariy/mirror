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
  renderer: Renderer;
  grid: Grid;
}

interface AppState {
  running: boolean;
  tileSize: number;
  threshold: number;
  activeWindow: string;
  videoWidth: number;
  videoHeight: number;
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
      videoWidth: 1280,
      videoHeight: 720,
    };

    this.initializeWindows();
    this.resizeAllWindows();
    this.renderActiveWindow();
    this.setupEventListeners();
    this.startCamera();
  }

  private renderActiveWindow(): void {
    const activeWin = this.windows.get(this.state.activeWindow);
    if (activeWin) {
      activeWin.renderer.render(activeWin.grid, this.state.tileSize);
    }
  }

  private initializeWindows(): void {
    const windowElements = document.querySelectorAll<HTMLDivElement>(".xp-window");

    windowElements.forEach((element) => {
      const id = element.id;
      const type = element.dataset.renderer as RendererType;
      const canvas = element.querySelector("canvas") as HTMLCanvasElement;

      const renderer = this.createRenderer(type, canvas);
      const grid = this.createGrid();

      this.windows.set(id, {
        id,
        type,
        element,
        canvas,
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

  private createGrid(): Grid {
    const cols = Math.max(1, Math.floor(this.state.videoWidth / this.state.tileSize));
    const rows = Math.max(1, Math.floor(this.state.videoHeight / this.state.tileSize));
    return new Grid({ cols, rows });
  }

  private resizeAllWindows(): void {
    this.windows.forEach((win) => {
      win.canvas.width = this.state.videoWidth;
      win.canvas.height = this.state.videoHeight;
      win.renderer.resize(this.state.videoWidth, this.state.videoHeight);
      win.grid = this.createGrid();
    });
  }

  private setupEventListeners(): void {
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
  }

  private async startCamera(): Promise<void> {
    try {
      await this.segmenter.initialize();
      await this.webcam.start({ width: 1280, height: 720 });

      this.state.videoWidth = this.webcam.getWidth();
      this.state.videoHeight = this.webcam.getHeight();

      this.resizeAllWindows();

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
