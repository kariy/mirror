import type { Renderer } from "../core/renderer";
import type { Grid } from "../core/grid";

const COLORS = {
  background: "#1a1a1a",
};

export class FlipDotRenderer implements Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dotStates: Float32Array = new Float32Array(0);
  private lastCols = 0;
  private lastRows = 0;
  private flipSpeed = 0.18;

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
      this.dotStates = new Float32Array(cols * rows);
      this.lastCols = cols;
      this.lastRows = rows;
    }

    this.ctx.save();
    this.ctx.translate(width, 0);
    this.ctx.scale(-1, 1);

    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, width, height);

    const dotRadius = tileSize * 0.4;
    const gap = tileSize;
    const halfGap = gap / 2;

    // Disable shadows for performance
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;

    grid.forEachTile((tile) => {
      const idx = tile.row * cols + tile.col;
      const target = tile.pressed ? 1 : 0;
      let current = this.dotStates[idx];

      if (current !== target) {
        current += (target - current) * this.flipSpeed;
        if (Math.abs(target - current) < 0.02) {
          current = target;
        }
        this.dotStates[idx] = current;
      }

      const cx = tile.col * gap + halfGap;
      const cy = tile.row * gap + halfGap;

      // Flip animation only during transition (squeeze in the middle)
      const distFromRest = Math.min(current, 1 - current) * 2; // 0 at rest, 1 at midpoint
      const scaleY = 1 - distFromRest * 0.7;

      // Fast color interpolation
      const r = 42 + (203 * current) | 0;
      const g = 42 + (188 * current) | 0;
      const b = 42 + (24 * current) | 0;

      this.ctx.fillStyle = `rgb(${r},${g},${b})`;
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy, dotRadius, dotRadius * scaleY, 0, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.restore();
  }
}
