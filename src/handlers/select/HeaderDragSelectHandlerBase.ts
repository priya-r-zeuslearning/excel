import type { EventHandler } from '../EventHandler';
import { Grid } from '../../core/grid';

export abstract class HeaderDragSelectHandlerBase implements EventHandler {
  protected grid: Grid;
  protected dragStartIdx: number | null = null;
  protected dragStartMouse: { x: number; y: number } | null = null;
  protected isDragging: boolean = false;

  constructor(grid: Grid) { this.grid = grid; }

  abstract hitTest(x: number, y: number): boolean;
  protected abstract getIndex(evt: MouseEvent): number;
  protected abstract clearOtherSelection(): void;
  protected abstract setPendingEditCell(idx: number): void;
  protected abstract startDrag(): void;
  protected abstract updateDrag(idx: number): void;
  protected abstract setSelectedRange(start: number, end: number): void;
  protected abstract selectSingle(idx: number): void;
  protected abstract clearSelection(): void;
  protected abstract addToSelection(idx: number): void;

  onPointerDown(evt: MouseEvent): void {
    const idx = this.getIndex(evt);
    this.dragStartIdx = idx;
    this.dragStartMouse = { x: evt.clientX, y: evt.clientY };
    this.isDragging = false;
    this.clearOtherSelection();
    this.setPendingEditCell(idx);
  }

  onPointerMove(evt: MouseEvent): void {
    this.grid['canvas'].style.cursor = 'grab';
  }

  onPointerDrag(evt: MouseEvent): void {
    const idx = this.getIndex(evt);
    if (!this.isDragging && this.dragStartMouse && Math.abs(this.getDragDelta(evt)) > 2) {
      this.startDrag();
      this.clearSelection();
      this.addToSelection(this.dragStartIdx!);
      this.isDragging = true;
    }
    if (this.isDragging) {
      this.updateDrag(idx);
      const start = Math.min(this.dragStartIdx!, idx);
      const end = Math.max(this.dragStartIdx!, idx);
      this.setSelectedRange(start, end);
      this.setPendingEditCell(idx);
      this.grid['scheduleRender']();
    }
  }

  onPointerUp(evt: MouseEvent): void {
    if (!this.isDragging && this.dragStartIdx !== null) {
      this.selectSingle(this.dragStartIdx);
      this.clearSelection();
      this.addToSelection(this.dragStartIdx);
      this.grid['scheduleRender']();
    }
    this.dragStartIdx = null;
    this.dragStartMouse = null;
    this.isDragging = false;
    this.grid['pendingEditCell'] = null;
    if (this.grid['selMgr'].isDragging()) {
      this.grid['selMgr'].endDrag();
      this.grid['scheduleRender']();
      this.grid['computeSelectionStats']();
    }
  }

  protected abstract getDragDelta(evt: MouseEvent): number;
} 