// src/core/Cell.ts

/**
 * @class Cell
 * @classdesc Represents a single cell in the grid, storing its value and state.
 */
export class Cell {
    /** @type {number} The row index of the cell. */
    public  row: number;
    /** @type {number} The column index of the cell. */
    public  col: number;
    /** @type {string} The value stored in the cell. */
    private value: string = "";
    /** @type {string} The formula stored in the cell (if any). */
    private formula: string = "";
    /** @type {number} The font size of the cell. */
    private fontSize: number = 14;
    /** @type {boolean} Whether the cell text is bold. */
    private isBold: boolean = false;
    /** @type {boolean} Whether the cell text is italic. */
    private isItalic: boolean = false;

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
     * Gets the formula of the cell.
     * @returns {string} The cell formula.
     */
    getFormula(): string {
        return this.formula;
    }

    /**
     * Checks if the cell contains a formula.
     * @returns {boolean} True if the cell has a formula.
     */
    hasFormula(): boolean {
        return this.formula !== "";
    }

    /**
     * Checks if a value looks like a formula.
     * @param {string} value The value to check.
     * @returns {boolean} True if the value is a formula.
     */
    static isFormula(value: string): boolean {
        return value.startsWith("=") && value.length > 1;
    }

    public clear(): void {
        this.value = "";
        this.formula = "";
        this.fontSize = 14;
        this.isBold = false;
        this.isItalic = false;
    }

    /**
     * Sets the value of the cell.
     * @param {string} value The new value.
     */
    setValue(value: string): void {
        this.value = value;
        // Clear formula if setting a non-formula value
      
    }
    /**
     * Removes the formula from the cell.
     */
    removeFormula(): void {
        this.value = "";
        this.formula = "";
    }
    /**
     * Sets the formula of the cell.
     * @param {string} formula The new formula.
     */
    setFormula(formula: string): void {
        this.formula = formula;
        this.value = formula; // Store the formula as the display value
    }

    /**
     * Gets the font size of the cell.
     * @returns {number} The font size.
     */
    getFontSize(): number {
        return this.fontSize;
    }

    /**
     * Sets the font size of the cell.
     * @param {number} size The new font size.
     */
    setFontSize(size: number): void {
        this.fontSize = size;
    }

    /**
     * Gets whether the cell text is bold.
     * @returns {boolean} True if bold, false otherwise.
     */
    getIsBold(): boolean {
        return this.isBold;
    }

    /**
     * Sets whether the cell text is bold.
     * @param {boolean} bold True to make bold, false otherwise.
     */
    setIsBold(bold: boolean): void {
        this.isBold = bold;
    }

    /**
     * Gets whether the cell text is italic.
     * @returns {boolean} True if italic, false otherwise.
     */
    getIsItalic(): boolean {
        return this.isItalic;
    }

    /**
     * Sets whether the cell text is italic.
     * @param {boolean} italic True to make italic, false otherwise.
     */
    setIsItalic(italic: boolean): void {
        this.isItalic = italic;
    }
}
  