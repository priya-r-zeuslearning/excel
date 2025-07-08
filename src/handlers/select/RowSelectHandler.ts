import type { EventHandler } from '../EventHandler';
import { Grid } from '../../core/grid';

export class RowSelectHandler implements EventHandler {
  private grid: Grid;
  private dragStartRow: number | null = null;
  private dragStartMouse: { x: number; y: number } | null = null;
  private isDragging: boolean = false;

  constructor(grid: Grid) { this.grid = grid; }

  hitTest(x: number, y: number): boolean {
    const HEADER_SIZE = 40;
    if (x < HEADER_SIZE && y >= HEADER_SIZE) {
      const { row } = this.grid['findRowByOffset'](y - HEADER_SIZE);
      return true;
    }
    return false;
  }

  onPointerDown(evt: MouseEvent): void {
    const { y } = this.grid['getMousePos'](evt);
    const { row } = this.grid['findRowByOffset'](y - 40);
    this.dragStartRow = row;
    this.dragStartMouse = { x: evt.clientX, y: evt.clientY };
    this.isDragging = false;
    this.grid['selMgr'].clearSelectedColumns();
    this.grid['pendingEditCell'] = { row, col: 0 };
  }

  onPointerMove(evt: MouseEvent): void {
    this.grid['canvas'].style.cursor = 'cell';
  }

  onPointerDrag(evt: MouseEvent): void {
    const { y } = this.grid['getMousePos'](evt);
    const { row } = this.grid['findRowByOffset'](y - 40);
    if (!this.isDragging && this.dragStartMouse && Math.abs(evt.clientY - this.dragStartMouse.y) > 2) {
      this.grid['selMgr'].startDrag(this.dragStartRow!, 0);
      this.grid['selMgr'].clearSelectedRows();
      this.grid['selMgr'].addSelectedRow(this.dragStartRow!);
      this.isDragging = true;
    }
    if (this.isDragging) {
      this.grid['selMgr'].updateDrag(row, 0);
      const startRow = Math.min(this.dragStartRow!, row);
      const endRow = Math.max(this.dragStartRow!, row);
      const selectedRows: number[] = [];
      for (let r = startRow; r <= endRow; r++) selectedRows.push(r);
      this.grid['selMgr'].setSelectedRows(selectedRows);
    //   this.grid['pendingEditCell'] = { row, col: 0 };
      this.grid['scheduleRender']();
    }
  }

  onPointerUp(evt: MouseEvent): void {
    if (!this.isDragging && this.dragStartRow !== null) {
      this.grid['selMgr'].selectRow(this.dragStartRow);
      this.grid['selMgr'].clearSelectedRows();
      this.grid['selMgr'].addSelectedRow(this.dragStartRow);
      this.grid['scheduleRender']();
    }
    this.dragStartRow = null;
    this.dragStartMouse = null;
    this.isDragging = false;
    //this.grid['pendingEditCell'] = null;
    if (this.grid['selMgr'].isDragging()) {
      this.grid['selMgr'].endDrag();
      this.grid['scheduleRender']();
      this.grid['computeSelectionStats']();
    }
  }
} 