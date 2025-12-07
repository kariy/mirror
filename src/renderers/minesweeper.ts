import type { Renderer } from "../core/renderer";
import type { Grid, TileState } from "../core/grid";

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

interface MinesweeperTileData {
  minesweeperValue: number; // -1 = mine, 0 = empty, 1-8 = adjacent mines
}

export class MinesweeperRenderer implements Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileData: Map<string, MinesweeperTileData> = new Map();
  private lastGridSize = { cols: 0, rows: 0 };
  private mineRatio: number;

  constructor(canvas: HTMLCanvasElement, mineRatio = 0.05) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    this.ctx = ctx;
    this.mineRatio = mineRatio;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(grid: Grid, tileSize: number): void {
    const cols = grid.getCols();
    const rows = grid.getRows();

    if (cols !== this.lastGridSize.cols || rows !== this.lastGridSize.rows) {
      this.generateMinesweeperData(cols, rows);
      this.lastGridSize = { cols, rows };
    }

    const { width, height } = this.canvas;

    this.ctx.save();
    this.ctx.translate(width, 0);
    this.ctx.scale(-1, 1);

    this.ctx.fillStyle = COLORS.raised;
    this.ctx.fillRect(0, 0, width, height);

    grid.forEachTile((tile) => {
      this.renderTile(tile, tileSize);
    });

    this.ctx.restore();
  }

  private generateMinesweeperData(cols: number, rows: number): void {
    this.tileData.clear();
    const totalTiles = cols * rows;
    const mineCount = Math.floor(totalTiles * this.mineRatio);
    const minePositions = new Set<number>();

    while (minePositions.size < mineCount) {
      minePositions.add(Math.floor(Math.random() * totalTiles));
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const isMine = minePositions.has(idx);
        this.tileData.set(`${row},${col}`, {
          minesweeperValue: isMine ? -1 : 0,
        });
      }
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const data = this.tileData.get(`${row},${col}`)!;
        if (data.minesweeperValue !== -1) {
          data.minesweeperValue = this.countAdjacentMines(row, col, rows, cols);
        }
      }
    }
  }

  private countAdjacentMines(row: number, col: number, rows: number, cols: number): number {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const data = this.tileData.get(`${nr},${nc}`);
          if (data?.minesweeperValue === -1) {
            count++;
          }
        }
      }
    }
    return count;
  }

  private renderTile(tile: TileState, tileSize: number): void {
    const x = tile.col * tileSize;
    const y = tile.row * tileSize;
    const borderWidth = Math.max(1, Math.floor(tileSize * 0.12));

    if (tile.pressed) {
      this.drawRevealedTile(x, y, tileSize, tileSize, tile);
    } else {
      this.drawRaisedTile(x, y, tileSize, tileSize, borderWidth);
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
    const data = this.tileData.get(`${tile.row},${tile.col}`);
    const value = data?.minesweeperValue ?? 0;

    if (value === -1) {
      this.ctx.fillStyle = COLORS.mineBackground;
    } else {
      this.ctx.fillStyle = COLORS.revealed;
    }
    this.ctx.fillRect(x, y, w, h);

    this.ctx.fillStyle = COLORS.borderDarker;
    this.ctx.fillRect(x, y, w, 1);
    this.ctx.fillRect(x, y, 1, h);

    if (value === -1) {
      this.drawMine(x + w / 2, y + h / 2, Math.min(w, h) * 0.3);
    } else if (value > 0) {
      this.drawNumber(x, y, w, h, value);
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
