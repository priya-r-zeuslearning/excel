import type { Command } from "./Command";
import type { Grid } from "../core/grid";
import type { ClipboardManager } from "./ClipboardManager";

export class PasteCommand implements Command {
    private targetRow: number;
    private targetCol: number;
    private grid: Grid;
    private clipboard: ClipboardManager | null = null;
    private oldData: any[][] = [];
    private newData: any[][] = [];
    constructor(targetRow: number, targetCol: number, grid: Grid, clipboard: ClipboardManager) {
        this.targetRow = targetRow;
        this.targetCol = targetCol;
        this.grid = grid;
        this.clipboard = clipboard;
    }
    execute(): void {
        const dataToPaste = this.clipboard!.getData();
        this.newData = dataToPaste;
      
    for (let r = 0; r < dataToPaste.length; r++) {
        const oldRow: any[] = [];
        for (let c = 0; c < dataToPaste[r].length; c++) {
          const oldVal = this.grid.getCell(this.targetRow + r, this.targetCol + c).getValue();
          oldRow.push(oldVal);
          this.grid.getCell(this.targetRow + r, this.targetCol + c).setValue(dataToPaste[r][c]);
        }
        this.oldData.push(oldRow);
      }
    }
    undo(): void {
        for (let r = 0; r < this.oldData.length; r++) {
            for (let c = 0; c < this.oldData[r].length; c++) {
                this.grid.getCell(this.targetRow + r, this.targetCol + c).setValue(this.oldData[r][c]);
            }
        }
    }
}   