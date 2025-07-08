import { HeaderDragSelectHandlerBase } from './select/HeaderDragSelectHandlerBase';
import { Grid } from '../core/grid';

export class RowHeaderDragSelectHandler extends HeaderDragSelectHandlerBase {
  constructor(grid: Grid) { super(grid); }

  hitTest(x: number, y: number): boolean {
    const HEADER_SIZE = 40, RESIZE_GUTTER = 5;
    if (x < HEADER_SIZE && y >= HEADER_SIZE) {
      const { row, within } = this.grid['findRowByOffset'](y - HEADER_SIZE);
      return within < this.grid['rowMgr'].getHeight(row) - RESIZE_GUTTER;
    }
    return false;
  }

  protected getIndex(evt: MouseEvent): number {
    const { y } = this.grid['getMousePos'](evt);
    const { row } = this.grid['findRowByOffset'](y - 40);
    return row;
  }

  protected clearOtherSelection(): void {
    this.grid['selMgr'].clearSelectedColumns();
  }

  protected setPendingEditCell(idx: number): void {
    this.grid['pendingEditCell'] = { row: idx, col: 0 };
  }

  protected startDrag(): void {
    this.grid['selMgr'].startDrag(this.dragStartIdx!, 0);
  }

  protected updateDrag(idx: number): void {
    this.grid['selMgr'].updateDrag(idx, 0);
  }

  protected setSelectedRange(start: number, end: number): void {
    const selectedRows: number[] = [];
    for (let r = start; r <= end; r++) selectedRows.push(r);
    this.grid['selMgr'].setSelectedRows(selectedRows);
  }

  protected selectSingle(idx: number): void {
    this.grid['selMgr'].selectRow(idx);
  }

  protected clearSelection(): void {
    this.grid['selMgr'].clearSelectedRows();
  }

  protected addToSelection(idx: number): void {
    this.grid['selMgr'].addSelectedRow(idx);
  }

  protected getDragDelta(evt: MouseEvent): number {
    return evt.clientY - (this.dragStartMouse?.y ?? 0);
  }
} 