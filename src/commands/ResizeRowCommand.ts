import { Grid } from "../core/grid";
import type { Command } from "./Command";

export class ResizeRowCommand implements Command {
    private grid: Grid;
    private row: number;
    private oldHeight: number;
    private newHeight: number;

    constructor(grid: Grid, row: number, oldHeight: number, newHeight: number) {
        this.grid = grid;
        this.row = row;
        this.oldHeight = oldHeight;
        this.newHeight = newHeight;
    }

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