// src/core/RowManager.ts

/**
 * Manages row heights and related operations.
 */
export class RowManager {
    /** Stores the height of each row */
    private rowHeights: number[] = [];
  
    constructor(rowCount: number, defaultHeight: number = 30) {
      for (let i = 0; i < rowCount; i++) {
        this.rowHeights.push(defaultHeight);
      }
    }
  
    /** Get height of a row */
    getHeight(rowIndex: number): number {
      return this.rowHeights[rowIndex];
    }
  
    /** Set height of a row */
    setHeight(rowIndex: number, height: number): void {
      this.rowHeights[rowIndex] = height;
    }
  
    /** Get y-position of a row's top edge */
    getY(rowIndex: number): number {
      let y = 0;
      for (let i = 0; i < rowIndex; i++) {
        y += this.rowHeights[i];
      }
      return y;
    }
  
    /** Get total height of all rows */
    getTotalHeight(): number {
      return this.rowHeights.reduce((a, b) => a + b, 0);
    }
  }
  