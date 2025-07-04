import { Cell } from "../core/cell";
import type { Command } from "./Command";

export class AlignmentCommand implements Command{
  private cell: Cell;
  private oldAlignment: 'left' | 'center' | 'right'|undefined ;
  private newAlignment: 'left' | 'center' | 'right';

  constructor(cell: Cell, newAlignment: 'left' | 'center' | 'right') {
    this.cell = cell;
    this.oldAlignment = cell.getAlignment();
    this.newAlignment = newAlignment;
  }

  execute() {
    this.cell.setAlignment(this.newAlignment);
  }

  undo() {
    this.cell.setAlignment(this.oldAlignment);
  }
} 