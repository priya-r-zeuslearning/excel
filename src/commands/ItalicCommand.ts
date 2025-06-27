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
  /**
   * Executes the italic command.
   */
  execute(): void {
    this.cell.setIsItalic(this.newItalic);
  }

  /**
   * Undoes the italic command.
   */
  undo(): void {
    this.cell.setIsItalic(this.oldItalic);
  }

  /**
   * Redoes the italic command.
   */
  redo(): void {
    this.cell.setIsItalic(this.newItalic);
  }
} 