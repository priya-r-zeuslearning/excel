// src/core/ColumnManager.ts

/**
 * Manages column widths and related operations.
 */
export class ColumnManager {
    /** Stores the width of each column */
    private colWidths: number[] = [];
  
    constructor(colCount: number, defaultWidth: number = 100) {
      for (let i = 0; i < colCount; i++) {
        this.colWidths.push(defaultWidth);
      }
    }
  
    /** Get width of a column */
    getWidth(colIndex: number): number {
      return this.colWidths[colIndex];
    }
  
    /** Set width of a column */
    setWidth(colIndex: number, width: number): void {
      this.colWidths[colIndex] = width;
    }
  
    /** Get x-position of a column's left edge */
    getX(colIndex: number): number {
      let x = 0;
      for (let i = 0; i < colIndex; i++) {
        x += this.colWidths[i];
      }
      return x;
    }
  
    /** Get total width of all columns */
    getTotalWidth(): number {
      return this.colWidths.reduce((a, b) => a + b, 0);
    }

    /**
     * Inserts a new column at the specified index.
     * @param {number} colIndex The index where to insert the new column.
     */
    insertColumn(colIndex: number): void {
      this.colWidths.splice(colIndex, 0, 100); // Default width of 100
    }

    /**
     * Deletes a column at the specified index.
     * @param {number} colIndex The index of the column to delete.
     */
    deleteColumn(colIndex: number): void {
      if (colIndex >= 0 && colIndex < this.colWidths.length) {
        this.colWidths.splice(colIndex, 1);
      }
    }
  }
  