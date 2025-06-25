// src/core/Cell.ts

/**
 * @class Cell
 * @classdesc Represents a single cell in the grid, storing its value and state.
 */
export class Cell {
    /** @type {number} The row index of the cell. */
    public readonly row: number;
    /** @type {number} The column index of the cell. */
    public readonly col: number;
    /** @type {string} The value stored in the cell. */
    private value: string = "";

    /**
     * Initializes a Cell.
     * @param {number} row The row index.
     * @param {number} col The column index.
     */
    constructor(row: number, col: number) {
        this.row = row;
        this.col = col;
    }

    /**
     * Gets the value of the cell.
     * @returns {string} The cell value.
     */
    getValue(): string {
        return this.value;
    }

    /**
     * Sets the value of the cell.
     * @param {string} value The new value.
     */
    setValue(value: string): void {
        this.value = value;
    }
}
  