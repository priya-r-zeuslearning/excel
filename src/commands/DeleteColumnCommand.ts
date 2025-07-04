import type { Command } from "./Command";
import { Grid, COLS } from "../core/grid";

export class DeleteColumnCommand implements Command {
  private grid: Grid;
  private colIndex: number;
  private backupCells: Array<{ row: number; cell: any }>; // backup as array of {row, cell}

  constructor(grid: Grid, colIndex: number) {
    this.grid = grid;
    this.colIndex = colIndex;
    this.backupCells = [];
  }

  execute() {
    // Backup only the column data for all rows before deleting
    this.backupCells = [];
    for (const [row, rowMap] of this.grid.cells.entries()) {
      if (rowMap.has(this.colIndex)) {
        this.backupCells.push({ row, cell: rowMap.get(this.colIndex) });
      }
    }
    this.grid.colMgr.deleteColumn(this.colIndex);
    this.grid.shiftCellsLeft(this.colIndex);
    // After shifting left, delete the last column in each row (not colIndex)
    for (const rowMap of this.grid.cells.values()) {
      rowMap.delete(COLS - 1);
    }
  }

  undo() {
    this.grid.shiftCellsRight(this.colIndex);
    this.grid.colMgr.insertColumn(this.colIndex);
    // Restore backed up column data to the correct column after shifting
    for (const { row, cell } of this.backupCells) {
      let rowMap = this.grid.cells.get(row);
      if (!rowMap) {
        rowMap = new Map();
        this.grid.cells.set(row, rowMap);
      }
      rowMap.set(this.colIndex, cell);
    }
  }
} 