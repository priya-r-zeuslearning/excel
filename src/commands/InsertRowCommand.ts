import type { Command } from "./Command";
import { Grid } from "../core/grid";

export class InsertRowCommand implements Command {
  private grid: Grid;
  private rowIndex: number;

  constructor(grid: Grid, rowIndex: number) {
    this.grid = grid;
    this.rowIndex = rowIndex;
  }

  execute() {
    this.grid.rowMgr.insertRow(this.rowIndex);
    this.grid.shiftCellsDown(this.rowIndex);
  }

  undo() {
    this.grid.rowMgr.deleteRow(this.rowIndex);
    this.grid.shiftCellsUp(this.rowIndex);
    this.grid.cells.delete(this.rowIndex);
  }
} 