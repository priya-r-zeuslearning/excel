import { Cell } from "../core/cell";
import { ROWS, COLS } from "./GridConstants";

/**
 * Handles row and column operations for the grid
 */
export class GridOperations {
  private cells: Map<number, Map<number, Cell>>;

  constructor(cells: Map<number, Map<number, Cell>>) {
    this.cells = cells;
  }

  /**
   * Inserts a new row at the specified position
   */
  public insertRow(insertAt: number, rowMgr: any): void {
    // Insert a new row at the selected position
    rowMgr.insertRow(insertAt);

    // Shift cells down
    this.shiftCellsDown(insertAt);
  }

  /**
   * Inserts a new column at the specified position
   */
  public insertColumn(insertAt: number, colMgr: any): void {
    // Insert a new column at the selected position
    colMgr.insertColumn(insertAt);

    // Shift cells right
    this.shiftCellsRight(insertAt);
  }

  /**
   * Deletes a row at the specified position
   */
  public deleteRow(deleteAt: number, rowMgr: any): void {
    if (deleteAt >= 0 && deleteAt < ROWS) {
      // Remove the row
      rowMgr.deleteRow(deleteAt);

      // Shift cells up
      this.shiftCellsUp(deleteAt);
    }
  }

  /**
   * Deletes a column at the specified position
   */
  public deleteColumn(deleteAt: number, colMgr: any): void {
    if (deleteAt >= 0 && deleteAt < COLS) {
      // Remove the column
      colMgr.deleteColumn(deleteAt);

      // Shift cells left
      this.shiftCellsLeft(deleteAt);
    }
  }

  /**
   * Shifts cells down by one row
   */
  private shiftCellsDown(insertAt: number): void {
    // Move all cells from insertAt onwards down by one row
    for (let row = ROWS - 2; row >= insertAt; row--) {
      const rowMap = this.cells.get(row);
      if (rowMap) {
        const newRowMap = new Map();
        for (const [col, cell] of rowMap) {
          const newCell = new Cell(row + 1, col);
          newCell.setValue(cell.getValue());
          newRowMap.set(col, newCell);
        }
        this.cells.set(row + 1, newRowMap);
      }
    }
    // Clear the inserted row (make it empty, don't delete)
    this.cells.set(insertAt, new Map());
  }

  /**
   * Shifts cells right by one column
   */
  private shiftCellsRight(insertAt: number): void {
    // Only process rows that have data
    for (const rowMap of this.cells.values()) {
      // Find all columns in this row that need to be shifted
      const cols = Array.from(rowMap.keys()).filter((col) => col >= insertAt);
      // Sort descending so we don't overwrite
      cols.sort((a, b) => b - a);
      for (const col of cols) {
        const cell = rowMap.get(col)!;
        rowMap.set(col + 1, new Cell(cell.row, col + 1));
        rowMap.get(col + 1)!.setValue(cell.getValue());
        rowMap.delete(col);
      }
    }
  }

  /**
   * Shifts cells up by one row
   */
  private shiftCellsUp(deleteAt: number): void {
    // Move all cells from deleteAt + 1 onwards up by one row
    for (let row = deleteAt; row < ROWS - 1; row++) {
      const rowMap = this.cells.get(row + 1);
      if (rowMap) {
        const newRowMap = new Map();
        for (const [col, cell] of rowMap) {
          const newCell = new Cell(row, col);
          newCell.setValue(cell.getValue());
          newRowMap.set(col, newCell);
        }
        this.cells.set(row, newRowMap);
      } else {
        this.cells.delete(row);
      }
    }
    // Clear the last row
    this.cells.delete(ROWS - 1);
  }

  /**
   * Shifts cells left by one column
   */
  private shiftCellsLeft(deleteAt: number): void {
    for (const rowMap of this.cells.values()) {
      // Remove the deleted column first
      rowMap.delete(deleteAt);
      // Find all columns in this row that need to be shifted
      const cols = Array.from(rowMap.keys()).filter((col) => col > deleteAt);
      // Sort ascending so we don't overwrite
      cols.sort((a, b) => a - b);
      for (const col of cols) {
        const cell = rowMap.get(col)!;
        rowMap.set(col - 1, new Cell(cell.row, col - 1));
        rowMap.get(col - 1)!.setValue(cell.getValue());
        rowMap.delete(col);
      }
    }
  }

  /**
   * Gets the number of created cells
   */
  public countCreatedCells(): number {
    let count = 0;
    for (const rowMap of this.cells.values()) {
      count += rowMap.size;
    }
    return count;
  }

  /**
   * Gets a cell at the specified position, creating it if it doesn't exist
   */
  public getCell(row: number, col: number): Cell {
    let rowMap = this.cells.get(row);
    if (!rowMap) {
      rowMap = new Map();
      this.cells.set(row, rowMap);
    }
    if (!rowMap.has(col)) {
      rowMap.set(col, new Cell(row, col));
    }
    return rowMap.get(col)!;
  }

  /**
   * Gets a cell if it exists, or null if it doesn't
   */
  public getCellIfExists(row: number, col: number): Cell | null {
    const rowMap = this.cells.get(row);
    if (!rowMap) return null;
    return rowMap.get(col) || null;
  }

  /**
   * Gets the value of a cell if it exists, or empty string if it doesn't
   */
  public getCellValueIfExists(row: number, col: number): string {
    const rowMap = this.cells.get(row);
    if (!rowMap) return "";
    const cell = rowMap.get(col);
    return cell ? cell.getValue() : "";
  }

  /**
   * Sets the value of a cell
   */
  public setCellValue(row: number, col: number, value: string): void {
    if (value.trim() === "") return;
    const cell = this.getCell(row, col);
    cell.setValue(value);
  }

  /**
   * Gets the cells map
   */
  public getCells(): Map<number, Map<number, Cell>> {
    return this.cells;
  }
} 