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
  private dragEnd: { row: number; col: number|null } | null = null;
  private dragging = false;
  private dragRect: DragRect | null = null; // Store the final drag rectangle
  private dragRange: { startRow: number | null; endRow: number | null; startCol: number | null; endCol: number | null; } | null = null;

  public clear(): void {
    this.selectedCell = null;
    this.selectedRow = null;
    this.selectedCol = null;
    this.dragStart = null;
    this.dragEnd = null;
    this.dragging = false;
    this.dragRect = null;
  }

  public clearSelection(): void {
    this.clear();
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
  selectColumns(startCol: number, endCol: number): void {
    this.selectedCell = null;
    this.selectedRow = null;
    this.selectedCol = null;
    this.dragRange = {
      startRow: null,
      endRow: null,
      startCol,
      endCol,
    };
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

  public updateDrag(row: number, col: number | null): void {
    if (!this.dragging || !this.dragStart) return;
    this.dragEnd = { row, col: col! };
  }

  public endDrag(): void {
    this.dragging = false;
    // Keep the drag rectangle for header highlighting
    if (this.dragStart && this.dragEnd) {
      this.dragRect = {
        startRow: Math.min(this.dragStart.row, this.dragEnd.row),
        endRow: Math.max(this.dragStart.row, this.dragEnd.row),
        startCol: Math.min(this.dragStart.col, this.dragEnd.col!),
        endCol: Math.max(this.dragStart.col, this.dragEnd.col!),
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
      startCol: Math.min(this.dragStart.col, this.dragEnd.col!),
      endCol: Math.max(this.dragStart.col, this.dragEnd.col!),
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
    rowHeaderWidth: number,
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
      const x = rowHeaderWidth + colMgr.getX(col) - scrollX;
      const w = colMgr.getWidth(col);
      const y = 0;
      const h = rowMgr.getTotalHeight() + HEADER_SIZE;
      ctx.save();
      ctx.strokeStyle = "#107C41";
      ctx.fillStyle = "#107C410a";
      ctx.fillRect(x + 0.5, y, w - 1, h);
      ctx.lineWidth = 1/ window.devicePixelRatio;
      ctx.strokeRect(x + 0.5, y, w - 1, h);
      ctx.restore();
    }

    // Highlight entire row (border only, full width)
    if (this.selectedRow !== null) {
      const row = this.selectedRow;
      const x = rowHeaderWidth ;
      const y = HEADER_SIZE + rowMgr.getY(row) - scrollY;
      const w = colMgr.getTotalWidth();
      const h = rowMgr.getHeight(row);
      ctx.save();
      ctx.strokeStyle = "#107C41";
      ctx.fillStyle = "#107C410a";
      ctx.fillRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.lineWidth = 1/window.devicePixelRatio;
      ctx.strokeRect(x+0.5, y + .5, w +0.5, h - 0.5);
      ctx.restore();
    }

    // Drag rectangle (range selection, with fill and border)
    const rect = this.getDragRect();
    if (rect) {
      // Highlight all column headers in the drag rect with black background
      for (let c = rect.startCol; c <= rect.endCol; c++) {
        const x = rowHeaderWidth + colMgr.getX(c) - scrollX;
        const w = colMgr.getWidth(c);
        ctx.save();
        ctx.fillStyle = "#000000";
        ctx.fillRect(x, 0, w, HEADER_SIZE);
        ctx.restore();
      }
      // Multi-column selection by dragging column headers
      // Draw a single rectangle covering the whole selected columns area
      // Draw a single big rectangle covering all selected columns (not one per column)
      if (rect.startRow === 0 && rect.endRow === 0 && rect.startCol !== rect.endCol) {
        // Find leftmost and rightmost columns
        const leftCol = Math.min(rect.startCol, rect.endCol);
        const rightCol = Math.max(rect.startCol, rect.endCol);
        const x = rowHeaderWidth + colMgr.getX(leftCol) - scrollX;
        const y = 0;
        const w = colMgr.getX(rightCol) + colMgr.getWidth(rightCol) - colMgr.getX(leftCol);
        const h = rowMgr.getTotalHeight() + HEADER_SIZE;
        ctx.save();
        ctx.strokeStyle = "#107C41";
        ctx.fillStyle = "#107C410a";
        ctx.fillRect(x + 0.5, y, w - 1, h);
        ctx.lineWidth = 2 / window.devicePixelRatio;
        ctx.strokeRect(x + 0.5, y, w - 1, h);
        ctx.restore();
        return;
      }
      // Multi-row selection by dragging row headers
      if (rect.startCol === 0 && rect.endCol === 0 && rect.startRow !== rect.endRow) {
        
          const firstRow = Math.min(rect.startRow, rect.endRow);
          const lastRow = Math.max(rect.startRow, rect.endRow);
          const y = rowHeaderWidth + rowMgr.getY(firstRow) - scrollY;
          const h = rowMgr.getY( lastRow) - rowMgr.getY(firstRow) + rowMgr.getHeight(lastRow);
          const x = 0;
          const w = colMgr.getTotalWidth() + HEADER_SIZE;
          ctx.save();
          ctx.strokeStyle = "#107C41";
          ctx.fillStyle = "#107C410a";
          ctx.fillRect(x, y + 0.5, w, h - 1);
          ctx.lineWidth = 2 / window.devicePixelRatio;
          ctx.strokeRect(x, y + 0.5, w, h - 1);
          ctx.restore();
        
        return;
      }
      // Normal rectangle selection
      let x1 =  rowHeaderWidth + colMgr.getX(rect.startCol) - scrollX;
      let y1 = HEADER_SIZE + rowMgr.getY(rect.startRow) - scrollY;
      let x2 = rowHeaderWidth + colMgr.getX(rect.endCol) - scrollX + colMgr.getWidth(rect.endCol);
      let y2 = HEADER_SIZE + rowMgr.getY(rect.endRow) - scrollY + rowMgr.getHeight(rect.endRow);
      // Clamp to HEADER_SIZE so selection never goes into header
      x1 = Math.max(x1, HEADER_SIZE);
      y1 = Math.max(y1, HEADER_SIZE);
      
      ctx.save();
      ctx.fillStyle = "#107C410a";
      ctx.fillRect(x1 + 0.5, y1 + 0.5, x2 - x1 - 1, y2 - y1 - 1);
      ctx.strokeStyle = "#107C41";
      ctx.lineWidth = 2/window.devicePixelRatio;
      ctx.strokeRect(x1 + 1, y1 + 1.5, x2 - x1 - 1, y2 - y1 - 1);
      ctx.restore();
    }

    // Selected cell border only (Excel style, no fill)
    if (this.selectedCell) {
      const { row, col } = this.selectedCell;
      const x = rowHeaderWidth + colMgr.getX(col) - scrollX ;
      const y = HEADER_SIZE + rowMgr.getY(row) - scrollY ;
      const w = colMgr.getWidth(col) ;
      const h = rowMgr.getHeight(row) ;
      ctx.save();
      ctx.strokeStyle = "#107C41";
      ctx.lineWidth = 3 / window.devicePixelRatio;
 
      ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
      ctx.restore();
    }

    ctx.restore();
  }
}
