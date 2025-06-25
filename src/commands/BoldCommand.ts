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

  execute(): void {
    this.cell.setIsBold(this.newBold);
  }

  undo(): void {
    this.cell.setIsBold(this.oldBold);
  }

  redo(): void {
    this.cell.setIsBold(this.newBold);
  }
} 