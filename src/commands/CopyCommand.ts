import type { Command } from "./Command";
import type { DragRect,  } from "../core/Selection";
import type { Grid } from "../core/grid";
import type { ClipboardManager } from "./ClipboardManager";

export class CopyCommand implements Command {
    private selection: DragRect | null = null;
    private data: any[][] = [];
    private grid: Grid;
    private clipboard: ClipboardManager | null = null;

    constructor(selection: DragRect, grid: Grid, clipboard: ClipboardManager) {
        this.selection = selection;
        this.grid = grid;
        this.clipboard   = clipboard;
        this.data  = [];
    }
  execute(): void {
      const rows = [];
   
      for (let r = this.selection!.startRow; r <= this.selection!.endRow; r++) {
        const row = [];
        for (let c = this.selection!.startCol; c <= this.selection!.endCol; c++) {
          row.push(this.grid.getCell(r, c).getValue());
        }
        rows.push(row);
      }
      this.data = rows;
      this.clipboard!.setData(rows); // store in clipboard manager
    }
    undo(): void {
       //not needed
    }
}
