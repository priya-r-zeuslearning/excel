import type { EventHandler } from '../EventHandler';
import { Grid } from '../../core/grid';

export class HeaderDragHandler implements EventHandler {
  private grid: Grid;
  private dragStartColHeader: number | null = null;
  private dragStartMouse: { x: number; y: number } | null = null;
  private isColHeaderDrag: boolean = false;
  private colHeaderDragged: boolean = false;
  // Only handles column header drag selection

  constructor(grid: Grid) {
    this.grid = grid;
  }

  hitTest(x: number, y: number): boolean {
    const HEADER_SIZE = 40;
    const RESIZE_GUTTER = 5;
    // Column header (not in gutter)
    if (y < HEADER_SIZE && x >= HEADER_SIZE) {
      const { col, within } = this.grid['findColumnByOffset'](x - HEADER_SIZE);
      if (within < this.grid['colMgr'].getWidth(col) - RESIZE_GUTTER) {
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
    this.colHeaderDragged = false;
    // Column header drag
    if (mouseY < HEADER_SIZE && mouseX >= HEADER_SIZE) {
      const { col } = this.grid['findColumnByOffset'](x - HEADER_SIZE);
      this.isColHeaderDrag = true;
      this.dragStartColHeader = col;
      this.dragStartMouse = { x: evt.clientX, y: evt.clientY };
      this.grid['selMgr'].clearSelectedRows();
      this.grid['pendingEditCell'] = { row: 0, col };
    }
  }

  onPointerMove(evt: MouseEvent): void {
    // Always set cursor to 'cell' by default
    this.grid['canvas'].style.cursor = 'cell';
    // Update cursor if in column header
    const rect = this.grid['canvas'].getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    const HEADER_SIZE = 40;
    if (mouseY < HEADER_SIZE && mouseX >= HEADER_SIZE) {
      this.grid['canvas'].style.cursor = 'grab';
      return;
    }
  }

  onPointerDrag(evt: MouseEvent): void {
    const rect = this.grid['canvas'].getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    const { x, y } = this.grid['getMousePos'](evt);
    const HEADER_SIZE = 40;
    // Column header drag selection
    if (this.isColHeaderDrag && this.dragStartColHeader !== null) {
      if (!this.grid['selMgr'].isDragging() && this.dragStartMouse) {
        const dx = Math.abs(evt.clientX - this.dragStartMouse.x);
        if (dx > 2) {
          this.grid['selMgr'].startDrag(0, this.dragStartColHeader);
          this.grid['selMgr'].clearSelectedColumns();
          this.grid['selMgr'].addSelectedColumn(this.dragStartColHeader);
          this.colHeaderDragged = true;
        }
      }
      if (this.grid['selMgr'].isDragging()) {
        const { col } = this.grid['findColumnByOffset'](x - HEADER_SIZE);
        this.grid['selMgr'].updateDrag(0, col);
        // Update selected columns array based on drag range
        const startCol = Math.min(this.dragStartColHeader!, col);
        const endCol = Math.max(this.dragStartColHeader!, col);
        const selectedCols: number[] = [];
        for (let c = startCol; c <= endCol; c++) {
          selectedCols.push(c);
        }
        // this.grid['pendingEditCell'] = { row: 0, col };
        // Auto-scroll horizontally if mouse is near left or right edge
        const edgeThreshold = 25;
        const scrollAmount = 40;
        const clientWidth = this.grid['canvas'].clientWidth;
        if (mouseX > clientWidth - edgeThreshold) {
          this.grid['container'].scrollLeft = Math.min(
            this.grid['container'].scrollLeft + scrollAmount,
            this.grid['container'].scrollWidth - this.grid['container'].clientWidth
          );
        } else if (mouseX < edgeThreshold) {
          this.grid['container'].scrollLeft = Math.max(
            this.grid['container'].scrollLeft - scrollAmount,
            0
          );
        }
        this.grid['selMgr'].setSelectedColumns(selectedCols);
        this.grid['scheduleRender']();
      }
    }
  }

  onPointerUp(evt: MouseEvent): void {
    // If not dragged, treat as single column selection
    if (this.isColHeaderDrag && this.dragStartColHeader !== null && !this.colHeaderDragged) {
      this.grid['selMgr'].selectColumn(this.dragStartColHeader);
      this.grid['selMgr'].clearSelectedColumns();
      this.grid['selMgr'].addSelectedColumn(this.dragStartColHeader);
      this.grid['scheduleRender']();
    }
    this.isColHeaderDrag = false;
    this.dragStartColHeader = null;
    this.dragStartMouse = null;
    this.colHeaderDragged = false;
    // this.grid['pendingEditCell'] = null;
    // Finalize drag selection if we were dragging
    if (this.grid['selMgr'].isDragging()) {
      this.grid['selMgr'].endDrag();
      this.grid['scheduleRender']();
      this.grid['computeSelectionStats']();
    }
  }
} 