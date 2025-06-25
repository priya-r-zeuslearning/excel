import { RowManager } from "./RowManager";
import { ColumnManager } from "./ColumnManager";

export interface DragRect {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/**
 * @typedef {Object} SelectionColors
 * @property {string} rangeFill - Fill color for selection range
 * @property {string} rowColFill - Fill color for row/col selection
 * @property {string} activeFill - Fill color for active cell
 * @property {string} activeBorder - Border color for active cell
 */

/**
 * Centralises **all** selection‑related state (active cell, full row/col, drag rectangle)
 * so that `Grid` doesn't need to know internal details.
 */
export class SelectionManager {
  private selectedCell: { row: number; col: number } | null = null;
  private selectedRow: number | null = null;
  private selectedCol: number | null = null;

  private dragStart: { row: number; col: number } | null = null;
  private dragEnd: { row: number; col: number } | null = null;
  private dragging = false;
  private dragRect: DragRect | null = null; // Store the final drag rectangle

  public clear(): void {
    this.selectedCell = null;
    this.selectedRow = null;
    this.selectedCol = null;
    this.dragStart = null;
    this.dragEnd = null;
    this.dragging = false;
    this.dragRect = null;
  }

  public isDragging(): boolean {
    return this.dragging;
  }

  public selectCell(row: number, col: number): void {
    this.clear();
    this.selectedCell = { row, col };
  }

  public selectRow(row: number): void {
    this.clear();
    this.selectedRow = row;
  }

  public selectColumn(col: number): void {
    this.clear();
    this.selectedCol = col;
  }

  public startDrag(row: number, col: number): void {
    this.clear();
    this.dragging = true;
    this.dragStart = { row, col };
    this.dragEnd = { row, col };
  }

  public updateDrag(row: number, col: number): void {
    if (!this.dragging || !this.dragStart) return;
    this.dragEnd = { row, col };
  }

  public endDrag(): void {
    this.dragging = false;
    // Keep the drag rectangle for header highlighting
    if (this.dragStart && this.dragEnd) {
      this.dragRect = {
        startRow: Math.min(this.dragStart.row, this.dragEnd.row),
        endRow: Math.max(this.dragStart.row, this.dragEnd.row),
        startCol: Math.min(this.dragStart.col, this.dragEnd.col),
        endCol: Math.max(this.dragStart.col, this.dragEnd.col),
      };
    }
  }

  public getSelectedCell() {
    return this.selectedCell;
  }

  public getSelectedRow() {
    return this.selectedRow;
  }

  public getSelectedCol() {
    return this.selectedCol;
  }

  public getDragRect(): DragRect | null {
    // Return the stored drag rectangle if not currently dragging
    if (!this.dragging && this.dragRect) {
      return this.dragRect;
    }
    
    // Return current drag rectangle if dragging
    if (!this.dragStart || !this.dragEnd) return null;
    return {
      startRow: Math.min(this.dragStart.row, this.dragEnd.row),
      endRow: Math.max(this.dragStart.row, this.dragEnd.row),
      startCol: Math.min(this.dragStart.col, this.dragEnd.col),
      endCol: Math.max(this.dragStart.col, this.dragEnd.col),
    };
  }

  /**
   * Draw selection highlights. Must be called **before** text so that
   * the text appears on top of the highlight fills.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {RowManager} rowMgr
   * @param {ColumnManager} colMgr
   * @param {number} HEADER_SIZE
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @param {number} [scrollX=0]
   * @param {number} [scrollY=0]
   * @param {SelectionColors} [colors] - Optional color overrides
   */
  public drawSelection(
    ctx: CanvasRenderingContext2D,
    rowMgr: RowManager,
    colMgr: ColumnManager,
    HEADER_SIZE: number,
    // canvasWidth: number,
    // canvasHeight: number,
    scrollX = 0,
    scrollY = 0
 
  ): void {
    ctx.save();
    // const rangeFill = colors?.rangeFill || "#dbeef3";
    // const rowColFill = colors?.rowColFill || "#e4ecf7";
    // const activeFill = colors?.activeFill || "#107C41";
    // const activeBorder = colors?.activeBorder || "#107C41";

    // Highlight entire column (border only, full height)
    if (this.selectedCol !== null) {
      const col = this.selectedCol;
      const x = HEADER_SIZE + colMgr.getX(col) - scrollX;
      const w = colMgr.getWidth(col);
      const y = 0;
      const h = rowMgr.getTotalHeight() + HEADER_SIZE;
      ctx.save();
      ctx.strokeStyle = "#107C41";
      ctx.lineWidth = 1/ window.devicePixelRatio;
      ctx.strokeRect(x + 0.5, y, w - 1, h);
      ctx.restore();
    }

    // Highlight entire row (border only, full width)
    if (this.selectedRow !== null) {
      const row = this.selectedRow;
      const x = HEADER_SIZE ;
      const y = HEADER_SIZE + rowMgr.getY(row) - scrollY;
      const w = colMgr.getTotalWidth();
      const h = rowMgr.getHeight(row);
      ctx.save();
      ctx.strokeStyle = "#107C41";
      ctx.lineWidth = 1/window.devicePixelRatio;
      ctx.strokeRect(x+0.5, y + .5, w +0.5, h - 0.5);
      ctx.restore();
    }

    // Drag rectangle (range selection, with fill and border)
    const rect = this.getDragRect();
    if (rect) {
      let x1 = HEADER_SIZE + colMgr.getX(rect.startCol) - scrollX;
      let y1 = HEADER_SIZE + rowMgr.getY(rect.startRow) - scrollY;
      let x2 = HEADER_SIZE + colMgr.getX(rect.endCol) - scrollX + colMgr.getWidth(rect.endCol);
      let y2 = HEADER_SIZE + rowMgr.getY(rect.endRow) - scrollY + rowMgr.getHeight(rect.endRow);
      // Clamp to HEADER_SIZE so selection never goes into header
      x1 = Math.max(x1, HEADER_SIZE);
      y1 = Math.max(y1, HEADER_SIZE);
      
      ctx.save();
      // Draw fill
      // ctx.fillStyle = "rgba(16, 124, 65, 0.1)"; // Light green fill
      // ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      
      // Draw border
      ctx.strokeStyle = "#107C41";
      ctx.lineWidth = 2/window.devicePixelRatio;
      ctx.strokeRect(x1 + 1, y1 + 1.5, x2 - x1 - 1, y2 - y1 - 1);
      ctx.restore();
    }

    // Selected cell border only (Excel style, no fill)
    if (this.selectedCell) {
      const { row, col } = this.selectedCell;
      const x = HEADER_SIZE + colMgr.getX(col) - scrollX;
      const y = HEADER_SIZE + rowMgr.getY(row) - scrollY;
      const w = colMgr.getWidth(col);
      const h = rowMgr.getHeight(row);
      ctx.save();
      ctx.strokeStyle = "#107C41";
      ctx.lineWidth = 3/window.devicePixelRatio;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 0.5, h - 0.5);
      ctx.restore();
    }

    ctx.restore();
  }
}
