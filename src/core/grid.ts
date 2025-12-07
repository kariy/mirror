export interface TileState {
  row: number;
  col: number;
  pressed: boolean;
}

export interface GridConfig {
  cols: number;
  rows: number;
}

export class Grid {
  private tiles: TileState[][] = [];
  private cols: number;
  private rows: number;

  constructor(config: GridConfig) {
    this.cols = config.cols;
    this.rows = config.rows;
    this.initializeTiles();
  }

  private initializeTiles(): void {
    this.tiles = [];
    for (let row = 0; row < this.rows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.tiles[row][col] = {
          row,
          col,
          pressed: false,
        };
      }
    }
  }

  updateFromMask(
    getMaskValue: (normalizedX: number, normalizedY: number) => number,
    threshold: number
  ): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const normalizedX = (col + 0.5) / this.cols;
        const normalizedY = (row + 0.5) / this.rows;
        const maskValue = getMaskValue(normalizedX, normalizedY);

        const tile = this.tiles[row][col];
        tile.pressed = maskValue >= threshold;
      }
    }
  }

  getTile(row: number, col: number): TileState | undefined {
    return this.tiles[row]?.[col];
  }

  getCols(): number {
    return this.cols;
  }

  getRows(): number {
    return this.rows;
  }

  forEachTile(callback: (tile: TileState) => void): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        callback(this.tiles[row][col]);
      }
    }
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.initializeTiles();
  }
}
