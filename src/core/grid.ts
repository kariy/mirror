export interface TileState {
  row: number;
  col: number;
  pressed: boolean;
  minesweeperValue: number; // -1 = mine, 0 = empty, 1-8 = adjacent mines
}

export interface GridConfig {
  cols: number;
  rows: number;
  mineRatio: number;
}

export class Grid {
  private tiles: TileState[][] = [];
  private cols: number;
  private rows: number;

  constructor(config: GridConfig) {
    this.cols = config.cols;
    this.rows = config.rows;
    this.initializeTiles(config.mineRatio);
  }

  private initializeTiles(mineRatio: number): void {
    this.tiles = [];
    const totalTiles = this.cols * this.rows;
    const mineCount = Math.floor(totalTiles * mineRatio);
    const minePositions = new Set<number>();

    while (minePositions.size < mineCount) {
      minePositions.add(Math.floor(Math.random() * totalTiles));
    }

    for (let row = 0; row < this.rows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.cols; col++) {
        const idx = row * this.cols + col;
        const isMine = minePositions.has(idx);
        this.tiles[row][col] = {
          row,
          col,
          pressed: false,
          minesweeperValue: isMine ? -1 : 0,
        };
      }
    }

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.tiles[row][col].minesweeperValue !== -1) {
          this.tiles[row][col].minesweeperValue = this.countAdjacentMines(row, col);
        }
      }
    }
  }

  private countAdjacentMines(row: number, col: number): number {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          if (this.tiles[nr][nc].minesweeperValue === -1) {
            count++;
          }
        }
      }
    }
    return count;
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

  resize(cols: number, rows: number, mineRatio: number): void {
    this.cols = cols;
    this.rows = rows;
    this.initializeTiles(mineRatio);
  }
}
