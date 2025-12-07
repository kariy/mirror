import type { Grid } from "./grid";

export interface Renderer {
  resize(width: number, height: number): void;
  render(grid: Grid, tileSize: number): void;
}
