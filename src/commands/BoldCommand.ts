import type { Command } from "./Command";
import { Cell } from "../core/cell";

export class BoldCommand implements Command {
  private cell: Cell;
  private oldBold: boolean;
  private newBold: boolean;

  constructor(cell: Cell, newBold: boolean) {
    this.cell = cell;
    this.oldBold = cell.getIsBold();
    this.newBold = newBold;
  }

  /**
   * Executes the bold command.
   */
  execute(): void {
    this.cell.setIsBold(this.newBold);
  }

  /**
   * Undoes the bold command.
   */
  undo(): void {
    this.cell.setIsBold(this.oldBold);
  }

  /**
   * Redoes the bold command.
   */
  redo(): void {
    this.cell.setIsBold(this.newBold);
  }
} 