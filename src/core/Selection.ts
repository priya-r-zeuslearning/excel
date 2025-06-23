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

  public clear(): void {
    this.selectedCell = null;
    this.selectedRow = null;
    this.selectedCol = null;
    this.dragStart = null;
    this.dragEnd = null;
    this.dragging = false;
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
    canvasWidth: number,
    canvasHeight: number,
    scrollX = 0,
    scrollY = 0,
    colors?: {
      rangeFill?: string;
      rowColFill?: string;
      activeFill?: string;
      activeBorder?: string;
    }
  ): void {
    ctx.save();
    const rangeFill = colors?.rangeFill || "#dbeef3";
    const rowColFill = colors?.rowColFill || "#e4ecf7";
    const activeFill = colors?.activeFill || "#107C41";
    const activeBorder = colors?.activeBorder || "#107C41";

    // Highlight entire column
    if (this.selectedCol !== null) {
      const col = this.selectedCol;
      const x = HEADER_SIZE + colMgr.getX(col) - scrollX;
      const w = colMgr.getWidth(col);
      const y = HEADER_SIZE - scrollY;
      const h = canvasHeight;
      ctx.fillStyle = rowColFill;
      ctx.fillRect(x, y, w, h);
    }

    // Highlight entire row
    if (this.selectedRow !== null) {
      const row = this.selectedRow;
      const x = HEADER_SIZE - scrollX;
      const y = HEADER_SIZE + rowMgr.getY(row) - scrollY;
      const w = canvasWidth;
      const h = rowMgr.getHeight(row);
      ctx.fillStyle = rowColFill;
      ctx.fillRect(x, y, w, h);
    }

    // Drag rectangle (range selection)
    const rect = this.getDragRect();
    if (rect) {
      for (let r = rect.startRow; r <= rect.endRow; r++) {
        const y = HEADER_SIZE + rowMgr.getY(r) - scrollY;
        const h = rowMgr.getHeight(r);
        let x = HEADER_SIZE + colMgr.getX(rect.startCol) - scrollX;
        for (let c = rect.startCol; c <= rect.endCol; c++) {
          const w = colMgr.getWidth(c);
          ctx.fillStyle = rangeFill;
          ctx.fillRect(x, y, w, h);
          x += w;
        }
      }
    }

    // Selected cell border and fill (Excel style)
    if (this.selectedCell) {
      const { row, col } = this.selectedCell;
      const x = HEADER_SIZE + colMgr.getX(col) - scrollX;
      const y = HEADER_SIZE + rowMgr.getY(row) - scrollY;
      const w = colMgr.getWidth(col);
      const h = rowMgr.getHeight(row);
      
      ctx.save();
      ctx.strokeStyle = activeBorder;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      ctx.restore();
    }

    ctx.restore();
  }
}
