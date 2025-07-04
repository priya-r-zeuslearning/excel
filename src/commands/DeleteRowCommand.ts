import type { Command } from "./Command";
import { Grid, ROWS } from "../core/grid";

export class DeleteRowCommand implements Command {
  private grid: Grid;
  private rowIndex: number;
  private backupRow: Map<number, any> | null = null;

  constructor(grid: Grid, rowIndex: number) {
    this.grid = grid;
    this.rowIndex = rowIndex;
  }

  execute() {
    // Backup the row data before deleting
    this.backupRow = this.grid.cells.get(this.rowIndex) ? new Map(this.grid.cells.get(this.rowIndex)) : null;
    this.grid.rowMgr.deleteRow(this.rowIndex);
    this.grid.shiftCellsUp(this.rowIndex);
    // After shifting up, delete the last row (not rowIndex)
    this.grid.cells.delete(ROWS - 1);
  }

  undo() {
    this.grid.shiftCellsDown(this.rowIndex);
    this.grid.rowMgr.insertRow(this.rowIndex);
    if (this.backupRow) {
      this.grid.cells.set(this.rowIndex, new Map(this.backupRow));
    }
  }
} 