import { Grid } from "../core/grid";
import type { Command } from "./Command";

/**
 *      RESIZING COMMAND FOR COLUMNS
 */
export class ResizeColumnCommand implements Command {
    private grid: Grid;
    private col: number;
    private oldWidth: number;
    private newWidth: number;
    /**
     * 
     * @param grid Grid Object
     * @param col the column which is beimh resozed
     * @param oldWidth p;
     * @param newWidth 
     */
    constructor(grid: Grid, col: number, oldWidth: number, newWidth: number) {
        this.grid = grid;
        this.col = col;
        this.oldWidth = oldWidth;
        this.newWidth = newWidth;
    }
    /**
     * 
     * @param newWidth 
     */
    updateNewSize(newWidth: number): void {
        this.newWidth = newWidth;
    }
    /**
     * sets the width of the column
     */
    execute(): void {
        this.grid.colMgr.setWidth(this.col, this.newWidth);
    }
    /**
     * resets the width of the column
     */
    undo(): void {
        this.grid.colMgr.setWidth(this.col, this.oldWidth);
    }
}