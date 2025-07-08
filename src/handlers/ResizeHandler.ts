import type { EventHandler } from './EventHandler';
import { Grid } from '../core/grid';

export class ResizeHandler implements EventHandler {
  private grid: Grid;
  private resizingCol: number | null = null;
  private resizingRow: number | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private originalSize: number = 0;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  hitTest(x: number, y: number): boolean {
    // Check column header resize gutter
    const HEADER_SIZE = 40;
    const RESIZE_GUTTER = 5;
    if (y < HEADER_SIZE && x >= HEADER_SIZE) {
      const { col, within } = this.grid['findColumnByOffset'](x - HEADER_SIZE);
      if (within >= this.grid['colMgr'].getWidth(col) - RESIZE_GUTTER) {
        return true;
      }
    }
    // Check row header resize gutter
    if (x < HEADER_SIZE && y >= HEADER_SIZE) {
      const { row, within } = this.grid['findRowByOffset'](y - HEADER_SIZE);
      if (within >= this.grid['rowMgr'].getHeight(row) - RESIZE_GUTTER) {
        return true;
      }
    }
    return false;
  }

  onPointerDown(evt: MouseEvent): void {
    const rect = this.grid['canvas'].getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    const { x, y } = this.grid['getMousePos'](evt);
    const HEADER_SIZE = 40;
    const RESIZE_GUTTER = 5;
    // Column resize
    if (mouseY < HEADER_SIZE && mouseX >= HEADER_SIZE) {
      const { col, within } = this.grid['findColumnByOffset'](x - HEADER_SIZE);
      if (within >= this.grid['colMgr'].getWidth(col) - RESIZE_GUTTER) {
        this.resizingCol = col;
        this.dragStartX = evt.clientX;
        this.originalSize = this.grid['colMgr'].getWidth(col);
        this.grid['isResizing'] = true;
      }
    }
    // Row resize
    if (mouseX < HEADER_SIZE && mouseY >= HEADER_SIZE) {
      const { row, within } = this.grid['findRowByOffset'](y - HEADER_SIZE);
      if (within >= this.grid['rowMgr'].getHeight(row) - RESIZE_GUTTER) {
        this.resizingRow = row;
        this.dragStartY = evt.clientY;
        this.originalSize = this.grid['rowMgr'].getHeight(row);
        this.grid['isResizing'] = true;
      }
    }
  }

  onPointerMove(evt: MouseEvent): void {
    // Update cursor if in gutter
    const rect = this.grid['canvas'].getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    const { x, y } = this.grid['getMousePos'](evt);
    const HEADER_SIZE = 40;
    const RESIZE_GUTTER = 5;
    if (mouseY < HEADER_SIZE && mouseX >= HEADER_SIZE) {
      const { col, within } = this.grid['findColumnByOffset'](x - HEADER_SIZE);
      if (within >= this.grid['colMgr'].getWidth(col) - RESIZE_GUTTER) {
        this.grid['canvas'].style.cursor = 'col-resize';
        return;
      }
    }
    if (mouseX < HEADER_SIZE && mouseY >= HEADER_SIZE) {
      const { row, within } = this.grid['findRowByOffset'](y - HEADER_SIZE);
      if (within >= this.grid['rowMgr'].getHeight(row) - RESIZE_GUTTER) {
        this.grid['canvas'].style.cursor = 'row-resize';
        return;
      }
    }
    this.grid['canvas'].style.cursor = 'cell';
  }

  onPointerDrag(evt: MouseEvent): void {
    // Update size as pointer moves
    if (this.resizingCol !== null && this.grid['isResizing']) {
      const dx = evt.clientX - this.dragStartX;
      const newW = Math.max(40, this.originalSize + dx);
      this.grid['colMgr'].setWidth(this.resizingCol, newW);
      this.grid['scheduleRender']();
    }
    if (this.resizingRow !== null && this.grid['isResizing']) {
      const dy = evt.clientY - this.dragStartY;
      const newH = Math.max(20, this.originalSize + dy);
      this.grid['rowMgr'].setHeight(this.resizingRow, newH);
      this.grid['scheduleRender']();
    }
  }

  onPointerUp(evt: MouseEvent): void {
    // Commit the resize
    this.resizingCol = null;
    this.resizingRow = null;
    this.grid['isResizing'] = false;
  }
} 