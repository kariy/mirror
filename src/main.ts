import { WebcamCapture } from "./core/webcam";
import { Segmenter } from "./core/segmentation";
import { Grid } from "./core/grid";
import { Renderer } from "./core/renderer";

interface AppState {
  running: boolean;
  tileSize: number;
  threshold: number;
}

class App {
  private webcam: WebcamCapture;
  private segmenter: Segmenter;
  private grid: Grid;
  private renderer: Renderer;
  private state: AppState;
  private animationFrameId: number | null = null;
  private lastSegmentTime = 0;
  private segmentInterval = 33;

  constructor() {
    const video = document.getElementById("webcam") as HTMLVideoElement;
    const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;

    this.webcam = new WebcamCapture(video);
    this.segmenter = new Segmenter();
    this.renderer = new Renderer(canvas);

    this.state = {
      running: false,
      tileSize: 16,
      threshold: 0.3,
    };

    this.grid = this.createGrid();
    this.setupEventListeners();
    this.startCamera();
  }

  private createGrid(width?: number, height?: number): Grid {
    const canvasContainer = document.getElementById("canvas-container") as HTMLDivElement;
    const w = width ?? canvasContainer.clientWidth ?? 640;
    const h = height ?? canvasContainer.clientHeight ?? 480;
    const cols = Math.max(1, Math.floor(w / this.state.tileSize));
    const rows = Math.max(1, Math.floor(h / this.state.tileSize));
    return new Grid({ cols, rows, mineRatio: 0.05 });
  }

  private setupEventListeners(): void {
    const gridSlider = document.getElementById("grid-density") as HTMLInputElement;
    const sensitivitySlider = document.getElementById("depth-sensitivity") as HTMLInputElement;
    const canvasContainer = document.getElementById("canvas-container") as HTMLDivElement;

    const resizeObserver = new ResizeObserver(() => {
      const width = canvasContainer.clientWidth;
      const height = canvasContainer.clientHeight;
      this.renderer.resize(width, height);
      this.grid = this.createGrid(width, height);
    });
    resizeObserver.observe(canvasContainer);

    gridSlider.addEventListener("input", () => {
      this.state.tileSize = 6 + Math.floor((80 - parseInt(gridSlider.value, 10)) / 2);
      this.grid = this.createGrid();
    });

    sensitivitySlider.addEventListener("input", () => {
      this.state.threshold = 0.9 - parseInt(sensitivitySlider.value, 10) / 12;
    });

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

new App();

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
