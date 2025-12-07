import { WebcamCapture } from "./core/webcam";
import { Segmenter } from "./core/segmentation";
import { Grid } from "./core/grid";
import { Renderer } from "./core/renderer";

interface AppState {
  running: boolean;
  gridDensity: number;
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
  private segmentInterval = 50;

  constructor() {
    const video = document.getElementById("webcam") as HTMLVideoElement;
    const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;

    this.webcam = new WebcamCapture(video);
    this.segmenter = new Segmenter();
    this.renderer = new Renderer(canvas);

    this.state = {
      running: false,
      gridDensity: 40,
      threshold: 0.5,
    };

    this.grid = this.createGrid();
    this.setupEventListeners();
    this.startCamera();
  }

  private createGrid(): Grid {
    const cols = this.state.gridDensity;
    const rows = Math.floor(cols * 0.75);
    return new Grid({ cols, rows, mineRatio: 0.05 });
  }

  private setupEventListeners(): void {
    const gridSlider = document.getElementById("grid-density") as HTMLInputElement;
    const sensitivitySlider = document.getElementById("depth-sensitivity") as HTMLInputElement;

    gridSlider.addEventListener("input", () => {
      this.state.gridDensity = parseInt(gridSlider.value, 10);
      this.grid = this.createGrid();
    });

    sensitivitySlider.addEventListener("input", () => {
      this.state.threshold = 1 - parseInt(sensitivitySlider.value, 10) / 10;
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

      const width = this.webcam.getWidth();
      const height = this.webcam.getHeight();
      this.renderer.resize(width, height);

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
      this.renderer.render(this.grid);

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
