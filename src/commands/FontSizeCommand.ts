import type { Command } from "./Command";
import { Cell } from "../core/cell";

export class FontSizeCommand implements Command {
  private cell: Cell;
  private oldSize: number;
  private newSize: number;

  constructor(cell: Cell, newSize: number) {
    this.cell = cell;
    this.oldSize = cell.getFontSize();
    this.newSize = newSize;
  }

  execute(): void {
    this.cell.setFontSize(this.newSize);
  }

  undo(): void {
    this.cell.setFontSize(this.oldSize);
  }

  redo(): void {
    this.cell.setFontSize(this.newSize);
  }
} 