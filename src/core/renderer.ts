import type { Grid, TileState } from "./grid";

const COLORS = {
  raised: "#c0c0c0",
  revealed: "#bdbdbd",
  borderLight: "#ffffff",
  borderDark: "#808080",
  borderDarker: "#404040",
  numbers: [
    "",
    "#0000ff", // 1 - blue
    "#008000", // 2 - green
    "#ff0000", // 3 - red
    "#000080", // 4 - dark blue
    "#800000", // 5 - maroon
    "#008080", // 6 - teal
    "#000000", // 7 - black
    "#808080", // 8 - gray
  ],
  mine: "#000000",
  mineBackground: "#ff0000",
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

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
    const { width, height } = this.canvas;

    this.ctx.fillStyle = COLORS.raised;
    this.ctx.fillRect(0, 0, width, height);

    grid.forEachTile((tile) => {
      this.renderTile(tile, tileSize, tileSize);
    });
  }

  private renderTile(tile: TileState, tileWidth: number, tileHeight: number): void {
    const x = tile.col * tileWidth;
    const y = tile.row * tileHeight;
    const borderWidth = Math.max(1, Math.floor(Math.min(tileWidth, tileHeight) * 0.12));

    if (tile.pressed) {
      this.drawRevealedTile(x, y, tileWidth, tileHeight, tile);
    } else {
      this.drawRaisedTile(x, y, tileWidth, tileHeight, borderWidth);
    }
  }

  private drawRaisedTile(
    x: number,
    y: number,
    w: number,
    h: number,
    border: number
  ): void {
    this.ctx.fillStyle = COLORS.raised;
    this.ctx.fillRect(x, y, w, h);

    this.ctx.fillStyle = COLORS.borderLight;
    this.ctx.fillRect(x, y, w, border);
    this.ctx.fillRect(x, y, border, h);

    this.ctx.fillStyle = COLORS.borderDark;
    this.ctx.fillRect(x + w - border, y, border, h);
    this.ctx.fillRect(x, y + h - border, w, border);
  }

  private drawRevealedTile(
    x: number,
    y: number,
    w: number,
    h: number,
    tile: TileState
  ): void {
    if (tile.minesweeperValue === -1) {
      this.ctx.fillStyle = COLORS.mineBackground;
    } else {
      this.ctx.fillStyle = COLORS.revealed;
    }
    this.ctx.fillRect(x, y, w, h);

    this.ctx.fillStyle = COLORS.borderDarker;
    this.ctx.fillRect(x, y, w, 1);
    this.ctx.fillRect(x, y, 1, h);

    if (tile.minesweeperValue === -1) {
      this.drawMine(x + w / 2, y + h / 2, Math.min(w, h) * 0.3);
    } else if (tile.minesweeperValue > 0) {
      this.drawNumber(x, y, w, h, tile.minesweeperValue);
    }
  }

  private drawMine(cx: number, cy: number, radius: number): void {
    this.ctx.fillStyle = COLORS.mine;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fill();

    const spikeLength = radius * 1.4;
    this.ctx.strokeStyle = COLORS.mine;
    this.ctx.lineWidth = radius * 0.3;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 4;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - Math.cos(angle) * spikeLength, cy - Math.sin(angle) * spikeLength);
      this.ctx.lineTo(cx + Math.cos(angle) * spikeLength, cy + Math.sin(angle) * spikeLength);
      this.ctx.stroke();
    }
  }

  private drawNumber(x: number, y: number, w: number, h: number, value: number): void {
    const fontSize = Math.floor(Math.min(w, h) * 0.7);
    this.ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
    this.ctx.fillStyle = COLORS.numbers[value] || "#000";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(value.toString(), x + w / 2, y + h / 2);
  }
}
