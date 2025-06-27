import type { Cell } from "../core/cell";
import { Grid } from "../core/grid";
import type { Command } from "./Command";


export class EditCellCommand implements Command {
    private grid: Grid;
    private cell: Cell;
    private row: number;
    private col: number;
    private oldValue: string;
    private newValue: string;

    constructor(grid: Grid, cell: Cell, oldValue: string, newValue: string) {
        this.grid = grid;
        this.cell = cell;
        this.row = cell.row;
        this.col = cell.col;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
    /**
     * Executes the edit cell command.
     */
    execute(): void {
        this.cell.setValue(this.newValue);
        // Recalculate formulas after changing a cell value
        this.grid.recalculateFormulas();
    }
    /**
     * Undoes the edit cell command.
     */
    undo(): void {
        this.cell.setValue(this.oldValue);
        // Recalculate formulas after undoing a cell value change
        this.grid.recalculateFormulas();
    }
    
}