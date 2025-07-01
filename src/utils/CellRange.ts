/**
 * Converts a column name to an index.
 * @param col the column name
 * @returns the index of the column
 */
export function colToIndex(col: string): number {
    const column = col.toUpperCase();
    let index = 0;
    for (let i = 0; i < column.length; i++) {
        index = index * 26 + (column.charCodeAt(i) - 64); // 64 instead of 65
    }
    return index - 1; // Make it zero-based
}


/**
 * Converts a cell name to a row and column index.
 * @param cellname the cell name
 * @returns the row and column index of the cell
 */
export function getCoordinates(cellname: string): { row: number, col: number } {
    const match = cellname.match(/^([A-Z a-z]*)([0-9]+)$/);
    if (!match) {
        throw new Error(`Invalid cell name: ${cellname}`);
    }
    const [, col, row] = match;
    return {
        row: parseInt(row) - 1,
        col: colToIndex(col),
    };
}
