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

  /**
   * Executes the font size command.
   */
  execute(): void {
    this.cell.setFontSize(this.newSize);
  }

  /**
   * Undoes the font size command.
   */
  undo(): void {
    this.cell.setFontSize(this.oldSize);
  }

  /**
   * Redoes the font size command.
   */
  redo(): void {
    this.cell.setFontSize(this.newSize);
  }
} 