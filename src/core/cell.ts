// src/core/Cell.ts

/**
 * Represents a single cell in the grid.
 */
export class Cell {
    /** Row index of the cell */
    public row: number;
  
    /** Column index of the cell */
    public col: number;
  
    /** Value stored in the cell */
    public value: string;
  
    /**
     * Creates a new cell.
     * @param row The row index
     * @param col The column index
     * @param value The value to store
     */
    constructor(row: number, col: number, value: string = "") {
      this.row = row;
      this.col = col;
      this.value = value;
    }
    getValue() {
        return this.value;
    }
    setValue(value: string) {
        this.value = value;
    }
  }
  