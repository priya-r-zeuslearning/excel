import type { Command } from "./Command";
import { Grid } from "../core/grid";

export class InsertColumnCommand implements Command {
  private grid: Grid;
  private colIndex: number;
  private backupCells: Array<{ row: number; cell: any }>; // backup as array of {row, cell}

  constructor(grid: Grid, colIndex: number) {
    this.grid = grid;
    this.colIndex = colIndex;
    this.backupCells = [];
  }

  execute() {
    // Backup the column data for all rows
    this.backupCells = [];
    for (const [row, rowMap] of this.grid.cells.entries()) {
      if (rowMap.has(this.colIndex)) {
        this.backupCells.push({ row, cell: rowMap.get(this.colIndex) });
      }
    }
    this.grid.colMgr.insertColumn(this.colIndex);
    this.grid.shiftCellsRight(this.colIndex);
  }

  undo() {
    this.grid.colMgr.deleteColumn(this.colIndex);
    this.grid.shiftCellsLeft(this.colIndex);
    // Restore backed up column data
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