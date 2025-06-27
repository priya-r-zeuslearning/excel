import { getCoordinates } from "../utils/CellRange";
import { Grid } from "../core/grid";

/**
 * 
 * @param formula the formula to evaluate
 * @param grid the grid to evaluate the formula in
 * @returns the result of the formula
 */
export function evaluateFormula(formula: string, grid: Grid) {
    // First check for single cell reference like A1, B5, etc.
    const singleCellMatch = formula.match(/^([A-Z]+[0-9]+)$/);
    if (singleCellMatch) {
        const cellRef = singleCellMatch[1];
        const { row, col } = getCoordinates(cellRef);
        const rowMap = grid.cells.get(row);
        if (rowMap) {
            const cell = rowMap.get(col);
            if (cell) {
                return cell.getValue();
            }
        }
        return "0";
    }

    const match = formula.match(/^([A-Z a-z]+)\(([A-Z a-z]*[0-9]+):([A-Z a-z]*[0-9]+)\)$/);
    if (!match) {
        throw new Error(`Invalid formula format: ${formula}. Expected format: FUNCTION(START:END) or CELL_REFERENCE`);
    }
    const [, functionName, start, end] = match;
    const values: number[] = getValuesInRange(start, end, grid);
    
    if (values.length === 0) {
        return "0";
    }
    
    switch (functionName.toUpperCase()) {
        case "SUM": 
            return values.reduce((a, b) => a + b, 0).toString();
        case "COUNT": 
            return values.length.toString();
        case "MAX": 
            return Math.max(...values).toString();
        case "MIN": 
            return Math.min(...values).toString();
        case "AVG": 
            return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
        default: 
            return "#FUNC";
    }
}
/**
 * 
 * @param start the start cell of the range
 * @param end the end cell of the range
 * @param grid the grid to get the values from
 * @returns the values in the range
 */
function getValuesInRange(start: string, end: string, grid: Grid) :number[]  {
    let {row:r1, col:c1} = getCoordinates(start);
    let { row: r2, col: c2 } = getCoordinates(end);

    // grid.drawMarchingAnts( r1, c1, r2, c2);
    const values: number[] = [];
    for (let row = Math.min(r1, r2); row <= Math.max(r1, r2); row++) {
        const rowMap = grid.cells.get(row);
        if (!rowMap) continue;
        for (let col = Math.min(c1, c2); col <= Math.max(c1, c2); col++) {
            const cell = rowMap.get(col);
            if (!cell) continue;
            const value = parseFloat(cell.getValue());
            if (isNaN(value)) continue;
            values.push(value);
        }
    }
    return values;
}