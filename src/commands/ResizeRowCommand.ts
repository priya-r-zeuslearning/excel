import { Grid } from "../core/grid";
import type { Command } from "./Command";

export class ResizeRowCommand implements Command {
    private grid: Grid;
    private row: number;
    private oldHeight: number;
    private newHeight: number;
    /**
     * 
     * @param grid Grid object 
     * @param row Row to be resized 
     * @param oldHeight Previous Height
     * @param newHeight new Height 
     */
    constructor(grid: Grid, row: number, oldHeight: number, newHeight: number) {
        this.grid = grid;
        this.row = row;
        this.oldHeight = oldHeight;
        this.newHeight = newHeight;
    }
    /**
     * 
     * @param newHeight 
     */
    updateNewSize(newHeight: number): void {
        this.newHeight = newHeight;
    }

    execute(): void {
        this.grid.rowMgr.setHeight(this.row, this.newHeight);
    }

    undo(): void {
        this.grid.rowMgr.setHeight(this.row, this.oldHeight);
    }
}