import { Grid } from "../core/grid";
import type { Command } from "./Command";


export class ResizeColumnCommand implements Command {
    private grid: Grid;
    private col: number;
    private oldWidth: number;
    private newWidth: number;

    constructor(grid: Grid, col: number, oldWidth: number, newWidth: number) {
        this.grid = grid;
        this.col = col;
        this.oldWidth = oldWidth;
        this.newWidth = newWidth;
    }

    updateNewSize(newWidth: number): void {
        this.newWidth = newWidth;
    }

    execute(): void {
        this.grid.colMgr.setWidth(this.col, this.newWidth);
    }

    undo(): void {
        this.grid.colMgr.setWidth(this.col, this.oldWidth);
    }
}