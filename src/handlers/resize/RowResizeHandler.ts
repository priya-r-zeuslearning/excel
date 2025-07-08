import { HeaderResizeHandlerBase } from './HeaderResizeHandlerBase';
import { Grid } from '../../core/grid';
import { ResizeRowCommand } from '../../commands/ResizeRowCommand';
import { CompositeCommand } from '../../commands/CompositeCommand';

export class RowResizeHandler extends HeaderResizeHandlerBase {
  constructor(grid: Grid) { super(grid); }

  hitTest(x: number, y: number): boolean {
    const HEADER_SIZE = 40, RESIZE_GUTTER = 5;
    if (x < HEADER_SIZE && y >= HEADER_SIZE) {
      const { row, within } = this.grid['findRowByOffset'](y - HEADER_SIZE);
      return within >= this.grid['rowMgr'].getHeight(row) - RESIZE_GUTTER;
    }
    return false;
  }

  protected getIndex(evt: MouseEvent): number {
    const { y } = this.grid['getMousePos'](evt);
    const { row } = this.grid['findRowByOffset'](y - 40);
    return row;
  }

  protected getWithin(x: number, y: number): number {
    const { row, within } = this.grid['findRowByOffset'](y - 40);
    return within;
  }

  protected getHeaderSize(): number { return 40; }
  protected getResizeGutter(): number { return 5; }
  protected getManager(): any { return {
    getSize: (row: number) => this.grid['rowMgr'].getHeight(row)
  }; }
  protected getSelected(): number[] { return this.grid['selMgr'].getSelectedRows(); }
  protected getResizeCommand(idx: number, from: number, to: number): any {
    return new ResizeRowCommand(this.grid, idx, from, to);
  }
  protected getCompositeCommand(cmds: any[]): any { return new CompositeCommand(cmds); }
  protected getMinSize(): number { return 20; }
  protected getCursor(): string { return 'row-resize'; }
  protected getDragDelta(evt: MouseEvent): number {
    return evt.clientY - this.dragStartCoord;
  }
  protected setSize(idx: number, size: number): void {
    this.grid['rowMgr'].setHeight(idx, size);
  }
  protected updateEditorPosition(): void {
    this.grid['updateEditorPosition']();
  }
  protected getDragStartCoord(evt: MouseEvent): number {
    return evt.clientY;
  }
} 