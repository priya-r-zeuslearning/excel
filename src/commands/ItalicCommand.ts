import type { Command } from "./Command";
import { Cell } from "../core/cell";

export class ItalicCommand implements Command {
  private cell: Cell;
  private oldItalic: boolean;
  private newItalic: boolean;

  constructor(cell: Cell, newItalic: boolean) {
    this.cell = cell;
    this.oldItalic = cell.getIsItalic();
    this.newItalic = newItalic;
  }
  
  execute(): void {
    this.cell.setIsItalic(this.newItalic);
  }

  undo(): void {
    this.cell.setIsItalic(this.oldItalic);
  }

  redo(): void {
    this.cell.setIsItalic(this.newItalic);
  }
} 