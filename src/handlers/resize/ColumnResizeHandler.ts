import { HeaderResizeHandlerBase } from './HeaderResizeHandlerBase';
import { Grid } from '../../core/grid';
import { ResizeColumnCommand } from '../../commands/ResizeColumnCommand';
import { CompositeCommand } from '../../commands/CompositeCommand';

export class ColumnResizeHandler extends HeaderResizeHandlerBase {
  constructor(grid: Grid) { super(grid); }

  hitTest(x: number, y: number): boolean {
    const HEADER_SIZE = 40, RESIZE_GUTTER = 5;
    if (y < HEADER_SIZE && x >= HEADER_SIZE) {
      const { col, within } = this.grid['findColumnByOffset'](x - HEADER_SIZE);
      return within >= this.grid['colMgr'].getWidth(col) - RESIZE_GUTTER;
    }
    return false;
  }

  protected getIndex(evt: MouseEvent): number {
    const { x } = this.grid['getMousePos'](evt);
    const { col } = this.grid['findColumnByOffset'](x - 40);
    return col;
  }

  protected getWithin(x: number, y: number): number {
    const { col, within } = this.grid['findColumnByOffset'](x - 40);
    return within;
  }

  protected getHeaderSize(): number { return 40; }
  protected getResizeGutter(): number { return 5; }
  protected getManager(): any { return {
    getSize: (col: number) => this.grid['colMgr'].getWidth(col)
  }; }
  protected getSelected(): number[] { return this.grid['selMgr'].getSelectedColumns(); }
  protected getResizeCommand(idx: number, from: number, to: number): any {
    return new ResizeColumnCommand(this.grid, idx, from, to);
  }
  protected getCompositeCommand(cmds: any[]): any { return new CompositeCommand(cmds); }
  protected getMinSize(): number { return 40; }
  protected getCursor(): string { return 'col-resize'; }
  protected getDragDelta(evt: MouseEvent): number {
    return evt.clientX - this.dragStartCoord;
  }
  protected setSize(idx: number, size: number): void {
    this.grid['colMgr'].setWidth(idx, size);
  }
  protected updateEditorPosition(): void {
    this.grid['updateEditorPosition']();
  }
  protected getDragStartCoord(evt: MouseEvent): number {
    return evt.clientX;
  }
} 