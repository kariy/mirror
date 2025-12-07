import type { Renderer } from "../core/renderer";
import type { Grid } from "../core/grid";

const ASCII_CHARS = " .:-=+*#%@";

export class AsciiRenderer implements Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private charStates: Float32Array = new Float32Array(0);
  private lastCols = 0;
  private lastRows = 0;
  private transitionSpeed = 0.2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(grid: Grid, tileSize: number): void {
    const cols = grid.getCols();
    const rows = grid.getRows();
    const { width, height } = this.canvas;

    if (cols !== this.lastCols || rows !== this.lastRows) {
      this.charStates = new Float32Array(cols * rows);
      this.lastCols = cols;
      this.lastRows = rows;
    }

    this.ctx.save();
    this.ctx.translate(width, 0);
    this.ctx.scale(-1, 1);

    this.ctx.fillStyle = "#0a0a0a";
    this.ctx.fillRect(0, 0, width, height);

    const fontSize = Math.floor(tileSize * 0.9);
    this.ctx.font = `${fontSize}px "Courier New", monospace`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    grid.forEachTile((tile) => {
      const idx = tile.row * cols + tile.col;
      const target = tile.pressed ? 1 : 0;
      let current = this.charStates[idx];

      if (current !== target) {
        current += (target - current) * this.transitionSpeed;
        if (Math.abs(target - current) < 0.02) {
          current = target;
        }
        this.charStates[idx] = current;
      }

      const charIndex = Math.floor(current * (ASCII_CHARS.length - 1));
      const char = ASCII_CHARS[charIndex];

      const cx = tile.col * tileSize + tileSize / 2;
      const cy = tile.row * tileSize + tileSize / 2;

      const brightness = 80 + Math.floor(current * 175);
      this.ctx.fillStyle = `rgb(${brightness}, ${Math.floor(brightness * 1.1)}, ${brightness})`;
      this.ctx.fillText(char, cx, cy);
    });

    this.ctx.restore();
  }
}
