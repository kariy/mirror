import { WebcamCapture } from "./core/webcam";
import { Segmenter } from "./core/segmentation";
import { Grid } from "./core/grid";
import type { Renderer } from "./core/renderer";
import { MinesweeperRenderer, FlipDotRenderer } from "./renderers";

type RendererType = "minesweeper" | "flipdot";

interface AppState {
  running: boolean;
  tileSize: number;
  threshold: number;
  rendererType: RendererType;
}

class App {
  private webcam: WebcamCapture;
  private segmenter: Segmenter;
  private grid: Grid;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;
  private state: AppState;
  private animationFrameId: number | null = null;
  private lastSegmentTime = 0;
  private segmentInterval = 33;

  constructor() {
    const video = document.getElementById("webcam") as HTMLVideoElement;
    this.canvas = document.getElementById("main-canvas") as HTMLCanvasElement;

    this.webcam = new WebcamCapture(video);
    this.segmenter = new Segmenter();

    this.state = {
      running: false,
      tileSize: 16,
      threshold: 0.3,
      rendererType: "minesweeper",
    };

    this.renderer = this.createRenderer(this.state.rendererType);
    this.grid = this.createGrid();
    this.setupEventListeners();
    this.startCamera();
  }

  private createRenderer(type: RendererType): Renderer {
    switch (type) {
      case "flipdot":
        return new FlipDotRenderer(this.canvas);
      case "minesweeper":
      default:
        return new MinesweeperRenderer(this.canvas);
    }
  }

  setRenderer(type: RendererType): void {
    this.state.rendererType = type;
    this.renderer = this.createRenderer(type);
  }

  private createGrid(width?: number, height?: number): Grid {
    const canvasContainer = document.getElementById("canvas-container") as HTMLDivElement;
    const w = width ?? canvasContainer.clientWidth ?? 640;
    const h = height ?? canvasContainer.clientHeight ?? 480;
    const cols = Math.max(1, Math.floor(w / this.state.tileSize));
    const rows = Math.max(1, Math.floor(h / this.state.tileSize));
    return new Grid({ cols, rows });
  }

  private setupEventListeners(): void {
    const canvasContainer = document.getElementById("canvas-container") as HTMLDivElement;

    const resizeObserver = new ResizeObserver(() => {
      const width = canvasContainer.clientWidth;
      const height = canvasContainer.clientHeight;
      this.renderer.resize(width, height);
      this.grid = this.createGrid(width, height);
    });
    resizeObserver.observe(canvasContainer);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state.running) {
        this.pauseLoop();
      } else if (!document.hidden && this.state.running) {
        this.startLoop();
      }
    });
  }

  private async startCamera(): Promise<void> {
    const errorMessage = document.getElementById("error-message") as HTMLDivElement;
    errorMessage.classList.add("hidden");

    try {
      await this.segmenter.initialize();
      await this.webcam.start({ width: 640, height: 480 });

      const canvasContainer = document.getElementById("canvas-container") as HTMLDivElement;
      this.renderer.resize(canvasContainer.clientWidth, canvasContainer.clientHeight);

      this.state.running = true;
      this.startLoop();
    } catch (error) {
      console.error("Failed to start:", error);
      errorMessage.classList.remove("hidden");
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

      this.grid.updateFromMask(
        (x, y) => this.segmenter.getMaskValueAt(x, y),
        this.state.threshold
      );
      this.renderer.render(this.grid, this.state.tileSize);

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

const app = new App();

// Expose for console switching: app.setRenderer("flipdot") or app.setRenderer("minesweeper")
(window as unknown as { app: App }).app = app;

function setupWindowDrag() {
  const windowEl = document.getElementById("window") as HTMLDivElement;
  const titleBar = document.querySelector(".title-bar") as HTMLDivElement;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  titleBar.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).closest(".title-bar-controls")) return;
    isDragging = true;
    offsetX = e.clientX - windowEl.offsetLeft;
    offsetY = e.clientY - windowEl.offsetTop;
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

setupWindowDrag();

function updateClock() {
  const clock = document.getElementById("clock");
  if (clock) {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

updateClock();
setInterval(updateClock, 1000);
