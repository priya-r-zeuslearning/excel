// src/core/Grid.ts
import { Cell } from "./cell";
import { RowManager } from "./RowManager";
import { ColumnManager } from "./ColumnManager";
import { SelectionManager } from "./Selection";

/**
 * Default sizes used by managers on first construction.
 */
const DEFAULT_COL_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 30;

/** How many rows & columns we create (can be huge later) */
const ROWS = 100000;
const COLS = 500;

/** Size of the header band (row numbers / column letters) */
const HEADER_SIZE = 40;

/** How many pixels near an edge counts as a "resize hotspot" */
const RESIZE_GUTTER = 3;

/**
 * Manages rendering, selection, editing and resizing of a spreadsheet-like canvas grid.
 */
export class Grid {
  /*────────── DOM & Context ─────────────────────────────────────────────*/
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  /*────────── Row / Column size managers ───────────────────────────────*/
  private readonly rowMgr: RowManager;
  private readonly colMgr: ColumnManager;

  /*────────── Selection manager  ───────────────────────────────────*/
  private readonly selMgr: SelectionManager;

  /*────────── Data model ───────────────────────────────────────────────*/
  private readonly cells: Cell[][] = [];

  /*────────── Editing overlay ─────────────────────────────────────────*/
  private editorInput: HTMLInputElement | null = null;
  private editingCell: { row: number; col: number } | null = null;

  /*────────── Resize drag state ───────────────────────────────────────*/
  private resizingCol: number | null = null;
  private resizingRow: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private originalSize = 0;

  /*────────── Scrollable container ────────────────────────────────────*/
  private container: HTMLElement | null = null;

  /*──────────────────────────────────────────────────────────────────────*/

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not supported");
    this.ctx = ctx;

    // Find the scrollable container
    this.container = this.canvas.parentElement;
    if (this.container) {
      this.container.addEventListener("scroll", () =>
        requestAnimationFrame(() => this.render())
      );
    }
    

    this.rowMgr = new RowManager(ROWS, DEFAULT_ROW_HEIGHT);
    this.colMgr = new ColumnManager(COLS, DEFAULT_COL_WIDTH);
    this.selMgr = new SelectionManager();

    this.initializeCells();
    this.addEventListeners();
    this.render();
  }

  /*────────── Initialisation ───────────────────────────────────────────*/
  private initializeCells(): void {
    // Instead of creating all 100,000 x 500 cells, just initialize rows array
    for (let r = 0; r < ROWS; r++) {
      this.cells[r] = [];
    }
  }
  private getCell(row: number, col: number): Cell {
    if (!this.cells[row]) this.cells[row] = [];
    if (!this.cells[row][col]) {
      this.cells[row][col] = new Cell(row, col);
    }
    return this.cells[row][col];
  }
  

  /*────────── Event wiring ─────────────────────────────────────────────*/
  private addEventListeners(): void {
    this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.canvas.addEventListener("dblclick", this.onDoubleClick.bind(this));
    this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    window.addEventListener("mousemove", this.onMouseDrag.bind(this));
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  /*────────── Coordinate helpers ───────────────────────────────────────*/
  private getMousePos(evt: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }

  private findColumnByOffset(offsetX: number): { col: number; within: number } {
    let x = 0;
    for (let c = 0; c < COLS; c++) {
      const w = this.colMgr.getWidth(c);
      if (offsetX < x + w) return { col: c, within: offsetX - x };
      x += w;
    }
    return { col: COLS - 1, within: 0 };
  }

  private findRowByOffset(offsetY: number): { row: number; within: number } {
    let y = 0;
    for (let r = 0; r < ROWS; r++) {
      const h = this.rowMgr.getHeight(r);
      if (offsetY < y + h) return { row: r, within: offsetY - y };
      y += h;
    }
    return { row: ROWS - 1, within: 0 };
  }

  /*────────── Mouse handlers ───────────────────────────────────────────*/
  private onMouseDown(evt: MouseEvent): void {
    const { x, y } = this.getMousePos(evt);

    /* 1️⃣ Header-edge resize checks */
    if (y < HEADER_SIZE) {
      const { col, within } = this.findColumnByOffset(x - HEADER_SIZE);
      if (within >= this.colMgr.getWidth(col) - RESIZE_GUTTER) {
        this.resizingCol = col;
        this.dragStartX = evt.clientX;
        this.originalSize = this.colMgr.getWidth(col);
        return;
      }
    }
    if (x < HEADER_SIZE) {
      const { row, within } = this.findRowByOffset(y - HEADER_SIZE);
      if (within >= this.rowMgr.getHeight(row) - RESIZE_GUTTER) {
        this.resizingRow = row;
        this.dragStartY = evt.clientY;
        this.originalSize = this.rowMgr.getHeight(row);
        return;
      }
    }

    /* 2️⃣  Header clicks – full row / column selection */
    if (y < HEADER_SIZE && x >= HEADER_SIZE) {
      const { col } = this.findColumnByOffset(x - HEADER_SIZE);
      this.selMgr.selectColumn(col);
      this.render();
      return;
    }
    if (x < HEADER_SIZE && y >= HEADER_SIZE) {
      const { row } = this.findRowByOffset(y - HEADER_SIZE);
      this.selMgr.selectRow(row);
      this.render();
      return;
    }

    /* 3️⃣  Inside grid – start drag selection (or single cell) */
    if (x >= HEADER_SIZE && y >= HEADER_SIZE) {
      const { col } = this.findColumnByOffset(x - HEADER_SIZE);
      const { row } = this.findRowByOffset(y - HEADER_SIZE);
      if (evt.shiftKey) {
        // could extend previous selection – not implemented yet
      }
      this.selMgr.startDrag(row, col);
      this.render();
    }
  }

  private onDoubleClick(evt: MouseEvent): void {
    const { x, y } = this.getMousePos(evt);
    if (x < HEADER_SIZE || y < HEADER_SIZE) return;

    const { col } = this.findColumnByOffset(x - HEADER_SIZE);
    const { row } = this.findRowByOffset(y - HEADER_SIZE);
    this.startEditingCell(row, col);
  }

  private onMouseMove(evt: MouseEvent): void {
    const { x, y } = this.getMousePos(evt);

    /* Cursor feedback for resize */
    this.canvas.style.cursor = "default";
    if (y < HEADER_SIZE && x >= HEADER_SIZE) {
      const { col, within } = this.findColumnByOffset(x - HEADER_SIZE);
      if (within >= this.colMgr.getWidth(col) - RESIZE_GUTTER) {
        this.canvas.style.cursor = "col-resize";
      }
    } else if (x < HEADER_SIZE && y >= HEADER_SIZE) {
      const { row, within } = this.findRowByOffset(y - HEADER_SIZE);
      if (within >= this.rowMgr.getHeight(row) - RESIZE_GUTTER) {
        this.canvas.style.cursor = "row-resize";
      }
    }

    /* Drag-to-select update */
    if (this.selMgr.isDragging() && x >= HEADER_SIZE && y >= HEADER_SIZE) {
      const { col } = this.findColumnByOffset(x - HEADER_SIZE);
      const { row } = this.findRowByOffset(y - HEADER_SIZE);
      this.selMgr.updateDrag(row, col);
      this.render();
    }
  }

  private onMouseDrag(evt: MouseEvent): void {
    /* Column resize */
    if (this.resizingCol !== null) {
      const dx = evt.clientX - this.dragStartX;
      const newW = Math.max(40, this.originalSize + dx);
      this.colMgr.setWidth(this.resizingCol, newW);
      this.render();
    }
    /* Row resize */
    if (this.resizingRow !== null) {
      const dy = evt.clientY - this.dragStartY;
      const newH = Math.max(20, this.originalSize + dy);
      this.rowMgr.setHeight(this.resizingRow, newH);
      this.render();
    }
  }

  private onMouseUp(): void {
    this.resizingCol = null;
    this.resizingRow = null;
    this.selMgr.endDrag();
  }

  private onKeyDown(_e: KeyboardEvent): void {
    /* arrow-key navigation to come */
  }

  /*────────── Editing overlay helpers ─────────────────────────────────*/
  private startEditingCell(row: number, col: number): void {
    if (!this.editorInput) this.createEditorInput();
  
    // Offsets inside the scroll‑container, not the page
    const scrollX = this.container!.scrollLeft;
    const scrollY = this.container!.scrollTop;
  
    const x = HEADER_SIZE + this.colMgr.getX(col) - scrollX;
    const y = HEADER_SIZE + this.rowMgr.getY(row) - scrollY;
  
    Object.assign(this.editorInput!.style, {
      left: `${x + 2}px`,
      top: `${y + 2}px`,
      width: `${this.colMgr.getWidth(col) - 6}px`,
      height: `${this.rowMgr.getHeight(row) - 6}px`,
      display: "block"
    });
  
    this.editorInput!.value = this.getCell(row, col).getValue();
    this.editorInput!.focus();
    this.editingCell = { row, col };
  }
  

  private createEditorInput(): void {
    this.editorInput = document.createElement("input");
    this.editorInput.type = "text";
    Object.assign(this.editorInput.style, {
      position: "absolute",
      zIndex: "1000",
      border: "1px solid #1976d2",
      backgroundColor: "#f5fafd",
      outline: "none",
      color: "#222",
      font: "13px 'Segoe UI', sans-serif",
      borderRadius: "2px"
    } as CSSStyleDeclaration);

    this.container!.appendChild(this.editorInput);
    this.editorInput.addEventListener("blur", () => this.finishEditing(true));
    this.editorInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.finishEditing(true);
      if (e.key === "Escape") this.finishEditing(false);
    });
  }

  private finishEditing(commit: boolean): void {
    if (!this.editorInput || !this.editingCell) return;
    const { row, col } = this.editingCell;
    if (commit) this.cells[row][col].setValue(this.editorInput.value);
    this.editorInput.style.display = "none";
    this.editingCell = null;
    this.render();
  }
private getVisibleRange(): {
  firstRow: number; lastRow: number;
  firstCol: number; lastCol: number;
} {
  let scrollX = this.container?.scrollLeft ?? 0;
  let scrollY = this.container?.scrollTop ?? 0;
  let viewW = this.container?.clientWidth ?? this.canvas.width;
  let viewH = this.container?.clientHeight ?? this.canvas.height;

  let firstRow = 0, lastRow = ROWS - 1, y = HEADER_SIZE;
  for (let r = 0; r < ROWS; r++) {
    const h = this.rowMgr.getHeight(r);
    if (y + h >= scrollY) { firstRow = r; break; }
    y += h;
  }

  let rowY = HEADER_SIZE + this.rowMgr.getY(firstRow);
  for (let r = firstRow; r < ROWS; r++) {
    const h = this.rowMgr.getHeight(r);
    if (rowY > scrollY + viewH) { lastRow = r; break; }
    rowY += h;
  }

  let firstCol = 0, lastCol = COLS - 1, x = HEADER_SIZE;
  for (let c = 0; c < COLS; c++) {
    const w = this.colMgr.getWidth(c);
    if (x + w >= scrollX) { firstCol = c; break; }
    x += w;
  }

  let colX = HEADER_SIZE + this.colMgr.getX(firstCol);
  for (let c = firstCol; c < COLS; c++) {
    const w = this.colMgr.getWidth(c);
    if (colX > scrollX + viewW) { lastCol = c; break; }
    colX += w;
  }

  return { firstRow, lastRow, firstCol, lastCol };
}

  /*────────── Rendering ───────────────────────────────────────────────*/
   render(): void {
    // Get scroll offsets
    let scrollX = 0, scrollY = 0, viewW = this.canvas.width, viewH = this.canvas.height;
if (this.container) {
  scrollX = this.container.scrollLeft;
  scrollY = this.container.scrollTop;
  viewW = this.container.clientWidth;
  viewH = this.container.clientHeight;
}

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    /* Column headers */
    let x = HEADER_SIZE;
    for (let c = 0; c < COLS; c++) {
      const w = this.colMgr.getWidth(c);
      if (x + w >= scrollX && x <= scrollX + viewW) {
        this.drawHeader(c, true, x, w);
      }
      x += w;
    }

    /* Row headers */
    let y = HEADER_SIZE;
    for (let r = 0; r < ROWS; r++) {
      const h = this.rowMgr.getHeight(r);
      if (y + h >= scrollY && y <= scrollY + viewH) {
        this.drawHeader(r, false, y, h);
      }
      y += h;
    }

    /* Selection highlights (rows, cols, drag rect, cell border) */
    this.selMgr.drawSelection(
      this.ctx,
      this.rowMgr,
      this.colMgr,
      HEADER_SIZE,
      this.canvas.width,
      this.canvas.height
    );

    /* Top-left corner */
    this.ctx.fillStyle = "#e0e0e0";
    this.ctx.fillRect(0, 0, HEADER_SIZE, HEADER_SIZE);
    this.ctx.strokeStyle = "#ccc";
    this.ctx.strokeRect(0, 0, HEADER_SIZE, HEADER_SIZE);

    /* Find visible rows/cols */
    let firstRow = 0, lastRow = ROWS - 1, firstCol = 0, lastCol = COLS - 1;

    // First visible row
    for (let r = 0, y = HEADER_SIZE; r < ROWS; r++) {
      const h = this.rowMgr.getHeight(r);
      if (y + h >= scrollY) { firstRow = r; break; }
      y += h;
    }
    
    // Last visible row
    for (let r = firstRow, y = HEADER_SIZE + this.rowMgr.getY(firstRow); r < ROWS; r++) {
      const h = this.rowMgr.getHeight(r);
      if (y > scrollY + viewH) { lastRow = r; break; }
      y += h;
    }
    
    // First visible column
    for (let c = 0, x = HEADER_SIZE; c < COLS; c++) {
      const w = this.colMgr.getWidth(c);
      if (x + w >= scrollX) { firstCol = c; break; }
      x += w;
    }
    
    // Last visible column
    for (let c = firstCol, x = HEADER_SIZE + this.colMgr.getX(firstCol); c < COLS; c++) {
      const w = this.colMgr.getWidth(c);
      if (x > scrollX + viewW) { lastCol = c; break; }
      x += w;
    }
    
    /* Draw only visible cells */
    let yPos = HEADER_SIZE + this.rowMgr.getY(firstRow);
    for (let r = firstRow; r <= lastRow; r++) {
      const rowH = this.rowMgr.getHeight(r);
      let xPos = HEADER_SIZE + this.colMgr.getX(firstCol);
    
      for (let c = firstCol; c <= lastCol; c++) {
        const colW = this.colMgr.getWidth(c);
    
        // draw background if selected
        const active = this.selMgr.getSelectedCell();
        if (active && active.row === r && active.col === c) {
          this.ctx.fillStyle = "#d0e6ff";
          this.ctx.fillRect(xPos, yPos, colW, rowH);
        }
    
        // draw border and text
        this.ctx.strokeStyle = "#e0e0e0";
        this.ctx.strokeRect(xPos, yPos, colW, rowH);
        this.ctx.fillStyle = "#000";
        this.ctx.font = "13px 'Segoe UI', sans-serif";
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "middle";
        const cellValue = this.getCell(r, c).getValue();
        const maxTextWidth = colW - 16; // padding 8 on both sides
        const clipped = this.clipText(cellValue, maxTextWidth);
        this.ctx.fillText(clipped, xPos + 8, yPos + rowH / 2);
        
        
    
        xPos += colW;
      }
    
      yPos += rowH;
    }
    
  }
  private clipText(text: string, maxWidth: number): string {
    let width = this.ctx.measureText(text).width;
    if (width <= maxWidth) return text;
  
    while (text.length > 0 && this.ctx.measureText(text + "…").width > maxWidth) {
      text = text.slice(0, -1);
    }
  
    return text + "…";
  }
  
  private suppressRender = false;

  public beginBatchUpdate() {
    this.suppressRender = true;
  }
  
  public endBatchUpdate() {
    this.suppressRender = false;
    this.render(); // only once
  }
  
  public setCellValue(row: number, col: number, value: string): void {
    const cell = this.getCell(row, col);
    cell.setValue(value);
  
    if (!this.suppressRender) {
      this.render();
    }
  }
  
  
  /*────────── Header drawing helper ──────────────────────────────────*/
  private drawHeader(
    index: number,
    isColumn: boolean,
    pos: number,
    size: number
  ): void {
    const ctx = this.ctx;
    const x = isColumn ? pos : 0;
    const y = isColumn ? 0 : pos;
    const w = isColumn ? size : HEADER_SIZE;
    const h = isColumn ? HEADER_SIZE : size;

    ctx.fillStyle = "#f3f3f3";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#bbb";
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#000";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = isColumn ? this.columnName(index) : (index + 1).toString();
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  private columnName(idx: number): string {
    let name = "";
    let n = idx;
    do {
      name = String.fromCharCode(65 + (n % 26)) + name;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return name;
  }
}
