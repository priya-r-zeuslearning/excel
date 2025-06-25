// src/core/RowManager.ts

/**
 * @class RowManager
 * @classdesc Manages row heights and related operations for the grid.
 */
export class RowManager {
    /** @type {number[]} Stores the height of each row. */
    private rowHeights: number[] = [];
  
    /**
     * Initializes the RowManager.
     * @param {number} rowCount The number of rows.
     * @param {number} defaultHeight The default height for each row.
     */
    constructor(rowCount: number, defaultHeight: number = 30) {
      for (let i = 0; i < rowCount; i++) {
        this.rowHeights.push(defaultHeight);
      }
    }
  
    /**
     * Gets the height of a row.
     * @param {number} rowIndex The row index.
     * @returns {number} The height of the row.
     */
    getHeight(rowIndex: number): number {
      return this.rowHeights[rowIndex];
    }
    getTotalHeight(): number {
      let total = 0;
      for (let i = 0; i < this.rowHeights.length; i++) {
        total += this.getHeight(i);
      }
      return total;
    }
    
    /**
     * Sets the height of a row.
     * @param {number} rowIndex The row index.
     * @param {number} height The new height.
     */
    setHeight(rowIndex: number, height: number): void {
      this.rowHeights[rowIndex] = height;
    }
  
    /**
     * Gets the y-position of a row's top edge.
     * @param {number} rowIndex The row index.
     * @returns {number} The y-position.
     */
    getY(rowIndex: number): number {
      let y = 0;
      for (let i = 0; i < rowIndex; i++) {
        y += this.rowHeights[i];
      }
      return y;
    }

    /**
     * Inserts a new row at the specified index.
     * @param {number} rowIndex The index where to insert the new row.
     */
    insertRow(rowIndex: number): void {
      this.rowHeights.splice(rowIndex, 0, 30); // Default height of 30
    }

    /**
     * Deletes a row at the specified index.
     * @param {number} rowIndex The index of the row to delete.
     */
    deleteRow(rowIndex: number): void {
      if (rowIndex >= 0 && rowIndex < this.rowHeights.length) {
        this.rowHeights.splice(rowIndex, 1);
      }
    }
  
    /** Get total height of all rows */
    // getTotalHeight(): number {
    //   return this.rowHeights.reduce((a, b) => a + b, 0);
    // }
  }
  