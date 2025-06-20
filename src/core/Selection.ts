import { RowManager } from "./RowManager";
import { ColumnManager } from "./ColumnManager";

export interface DragRect {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/**
 * Keeps ALL selection‑related state in one place and offers helpers
 * so Grid doesn’t need to know about the details.
 */
export class SelectionManager {
  private selectedCell: { row: number; col: number } | null = null;
  private selectedRow: number | null = null;
  private selectedCol: number | null = null;

  private dragStart: { row: number; col: number } | null = null;
  private dragEnd: { row: number; col: number } | null = null;
  private dragging = false;

  /*────────────────────────────── Public state helpers ──*/

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

  /*────────────────────────────── Selection APIs ────────*/
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

  /*──────── Drag‑to‑select (rectangular) ───────*/
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

  /*────────────────────────────── Getters ───────────────*/
  public getSelectedCell(): { row: number; col: number } | null {
    return this.selectedCell;
  }

  public getSelectedRow(): number | null {
    return this.selectedRow;
  }

  public getSelectedCol(): number | null {
    return this.selectedCol;
  }

  public getDragRect(): DragRect | null {
    if (!this.dragStart || !this.dragEnd) return null;
    return {
      startRow: Math.min(this.dragStart.row, this.dragEnd.row),
      endRow: Math.max(this.dragStart.row, this.dragEnd.row),
      startCol: Math.min(this.dragStart.col, this.dragEnd.col),
      endCol: Math.max(this.dragStart.col, this.dragEnd.col)
    };
  }

  /*────────────────────────────── Rendering ─────────────*/
  /**
   * Draw highlights (full row/col + rectangular drag selection + single cell)
   *
   * Call this **before** drawing cell text so the highlight sits underneath.
   */
  public drawSelection(
    ctx: CanvasRenderingContext2D,
    rowMgr: RowManager,
    colMgr: ColumnManager,
    HEADER_SIZE: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // 1️⃣  Entire column
    if (this.selectedCol !== null) {
      let x = HEADER_SIZE;
      for (let c = 0; c < this.selectedCol; c++) x += colMgr.getWidth(c);
      const w = colMgr.getWidth(this.selectedCol);
      ctx.fillStyle = "#d0ebff";
      ctx.fillRect(x, HEADER_SIZE, w, canvasHeight - HEADER_SIZE);
    }

    // 2️⃣  Entire row
    if (this.selectedRow !== null) {
      let y = HEADER_SIZE;
      for (let r = 0; r < this.selectedRow; r++) y += rowMgr.getHeight(r);
      const h = rowMgr.getHeight(this.selectedRow);
      ctx.fillStyle = "#d0ebff";
      ctx.fillRect(HEADER_SIZE, y, canvasWidth - HEADER_SIZE, h);
    }

    // 3️⃣  Drag rectangle
    const rect = this.getDragRect();
    if (rect) {
      let y = HEADER_SIZE;
      for (let r = 0; r < rect.startRow; r++) y += rowMgr.getHeight(r);

      for (let r = rect.startRow; r <= rect.endRow; r++) {
        let x = HEADER_SIZE;
        for (let c = 0; c < rect.startCol; c++) x += colMgr.getWidth(c);

        let cellX = x;
        let cellY = y;

        for (let c = rect.startCol; c <= rect.endCol; c++) {
          const w = colMgr.getWidth(c);
          const h = rowMgr.getHeight(r);
          ctx.fillStyle = "#d0ebff";
          ctx.fillRect(cellX, cellY, w, h);
          cellX += w;
        }

        y += rowMgr.getHeight(r);
      }
    }

    // 4️⃣ Single cell (optional, nicer border)
    if (this.selectedCell) {
      const { row, col } = this.selectedCell;
      const x = HEADER_SIZE + colMgr.getX(col);
      const y = HEADER_SIZE + rowMgr.getY(row);
      const w = colMgr.getWidth(col);
      const h = rowMgr.getHeight(row);
      ctx.strokeStyle = "#1976d2";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.lineWidth = 1;
    }
  }
}
