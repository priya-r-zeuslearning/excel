import { HeaderDragSelectHandlerBase } from '../select/HeaderDragSelectHandlerBase';
import { Grid } from '../../core/grid';

export class ColumnHeaderDragSelectHandler extends HeaderDragSelectHandlerBase {
  constructor(grid: Grid) { super(grid); }

  hitTest(x: number, y: number): boolean {
    const HEADER_SIZE = 40, RESIZE_GUTTER = 5;
    if (y < HEADER_SIZE && x >= HEADER_SIZE) {
      const { col, within } = this.grid['findColumnByOffset'](x - HEADER_SIZE);
      return within < this.grid['colMgr'].getWidth(col) - RESIZE_GUTTER;
    }
    return false;
  }

  protected getIndex(evt: MouseEvent): number {
    const { x } = this.grid['getMousePos'](evt);
    const { col } = this.grid['findColumnByOffset'](x - 40);
    return col;
  }

  protected clearOtherSelection(): void {
    this.grid['selMgr'].clearSelectedRows();
  }

  protected setPendingEditCell(idx: number): void {
    this.grid['pendingEditCell'] = { row: 0, col: idx };
  }

  protected startDrag(): void {
    this.grid['selMgr'].startDrag(0, this.dragStartIdx!);
  }

  protected updateDrag(idx: number): void {
    this.grid['selMgr'].updateDrag(0, idx);
  }

  protected setSelectedRange(start: number, end: number): void {
    const selectedCols: number[] = [];
    for (let c = start; c <= end; c++) selectedCols.push(c);
    this.grid['selMgr'].setSelectedColumns(selectedCols);
  }

  protected selectSingle(idx: number): void {
    this.grid['selMgr'].selectColumn(idx);
  }

  protected clearSelection(): void {
    this.grid['selMgr'].clearSelectedColumns();
  }

  protected addToSelection(idx: number): void {
    this.grid['selMgr'].addSelectedColumn(idx);
  }

  protected getDragDelta(evt: MouseEvent): number {
    return evt.clientX - (this.dragStartMouse?.x ?? 0);
  }
} 