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
const ROWS = 100_000;
const COLS = 500;

/** How many extra rows / columns to draw outside the viewport */
const RENDER_BUFFER_PX = 200;

/** Size of the header band (row numbers / column letters) */
const HEADER_SIZE = 40;

/** How many pixels near an edge counts as a "resize hotspot" */
const RESIZE_GUTTER = 3;

/**
 * @class Grid
 * @classdesc Manages rendering, selection, editing, and resizing of a spreadsheet-like canvas grid.
 * Supports virtual scrolling, cell editing, selection, and data import.
 */
export class Grid {
  /** @type {HTMLCanvasElement} The canvas element for rendering the grid. */
  private readonly canvas: HTMLCanvasElement;
  /** @type {CanvasRenderingContext2D} The 2D rendering context for the canvas. */
  private readonly ctx: CanvasRenderingContext2D;
  /** @type {RowManager} Manages row heights and operations. */
  private readonly rowMgr: RowManager;
  /** @type {ColumnManager} Manages column widths and operations. */
  private readonly colMgr: ColumnManager;
  /** @type {SelectionManager} Manages selection state and drawing. */
  private readonly selMgr: SelectionManager;
  /** @type {Cell[][]} Stores all cell objects. */
  private readonly cells: Cell[][] = [];
  /** @type {HTMLInputElement|null} The input element for cell editing. */
  private editorInput: HTMLInputElement | null = null;
  /** @type {{row: number, col: number}|null} The currently editing cell. */
  private editingCell: { row: number; col: number } | null = null;
  /** @type {HTMLElement} The scrollable container for the grid. */
  private container: HTMLElement;
  /** @type {boolean} Suppresses rendering during batch updates. */
  private suppressRender = false;
  /** @type {boolean} Whether a render is scheduled. */
  private renderScheduled = false;
  /** @type {boolean} Whether the mouse is currently down for drag selection. */
  private isMouseDown = false;
  /** @type {{row: number, col: number}|null} The cell where drag selection started. */
  private dragStartCell: { row: number; col: number } | null = null;
  /** @type {number|null} The column being resized, if any. */
  private resizingCol: number | null = null;
  /** @type {number|null} The row being resized, if any. */
  private resizingRow: number | null = null;
  /** @type {number} The X position where a drag or resize started. */
  private dragStartX: number = 0;
  /** @type {number} The Y position where a drag or resize started. */
  private dragStartY: number = 0;
  /** @type {number} The original size (width/height) before resizing. */
  private originalSize: number = 0;

  /* ─────────────────────────────────────────────────────────────────── */
  /**
   * Initializes the Grid.
   * @param {HTMLCanvasElement} canvas The canvas element to render on.
   */
  constructor(canvas: HTMLCanvasElement) {
    /* Canvas / context */
    this.canvas = canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not supported");
    this.ctx = ctx;

    this.container = document.getElementById("canvas-container")!;

    const fakeScrollDiv = document.createElement("div");
    fakeScrollDiv.style.height = ROWS * DEFAULT_ROW_HEIGHT + "px";
    fakeScrollDiv.style.width = COLS * DEFAULT_COL_WIDTH + "px";
    this.container.appendChild(fakeScrollDiv);
    

const filler = document.getElementById("scroll-filler")!;



    this.container.addEventListener("scroll", () => {this.updateEditorPosition();  this.scheduleRender()});
    window.addEventListener("resize", () => {this.updateEditorPosition();  this.resizeCanvas()});

    this.rowMgr = new RowManager(ROWS, DEFAULT_ROW_HEIGHT);
    this.colMgr = new ColumnManager(COLS, DEFAULT_COL_WIDTH);
    this.selMgr = new SelectionManager();
    const virtualHeight = this.rowMgr.getTotalHeight();
    const virtualWidth = this.colMgr.getTotalWidth();
    filler.style.height = virtualHeight + "px";
filler.style.width = virtualWidth + "px";


    this.initializeCells();
    this.addEventListeners();
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
    this.scheduleRender();
  }

  private scheduleRender(): void {
    if (this.renderScheduled || this.suppressRender) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.render();
      this.renderScheduled = false;
    });
  }

  /* ────────── PRIVATE UTILS ────────────────────────────────────────── */

  /* ────────── Initialisation ───────────────────────────────────────── */
  /**
   * Initializes the cell storage for the grid.
   */
  private initializeCells(): void {
    for (let r = 0; r < ROWS; r++) {
      this.cells[r] = [];
    }
  }

  /**
   * Gets the cell object at the specified row and column.
   * @param {number} row The row index.
   * @param {number} col The column index.
   * @returns {Cell} The cell object.
   */
  private getCell(row: number, col: number): Cell {
    if (!this.cells[row]) this.cells[row] = [];
    if (!this.cells[row][col]) {
      this.cells[row][col] = new Cell(row, col);
    }
    return this.cells[row][col];
  }

  /* ────────── Event wiring ─────────────────────────────────────────── */
  /**
   * Adds all event listeners for mouse and keyboard interaction.
   */
  private addEventListeners(): void {
    this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.canvas.addEventListener("dblclick", this.onDoubleClick.bind(this));
    this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    window.addEventListener("mousemove", this.onMouseDrag.bind(this));
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  /* ────────── Coordinate helpers ───────────────────────────────────── */
  /**
   * Returns mouse position **inside the grid's logical coord‑space**
   * (i.e. including scroll offset, so 0,0 is the first data cell).
   */
  private getMousePos(evt: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left + this.container.scrollLeft;
    const y = evt.clientY - rect.top + this.container.scrollTop;
    return { x, y };
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

  /* ────────── Mouse handlers (selection / resize / edit) ───────────── */
  private onMouseDown(evt: MouseEvent): void {
    const { x, y } = this.getMousePos(evt);

    /* 1️⃣ Header‑edge resize checks */
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

    /* 2️⃣ Header clicks – full row / column selection */
    if (y < HEADER_SIZE && x >= HEADER_SIZE) {
      const { col } = this.findColumnByOffset(x - HEADER_SIZE);
      this.selMgr.selectColumn(col);
      this.scheduleRender();
      return;
    }
    if (x < HEADER_SIZE && y >= HEADER_SIZE) {
      const { row } = this.findRowByOffset(y - HEADER_SIZE);
      this.selMgr.selectRow(row);
      this.scheduleRender();
      return;
    }

    /* 3️⃣ Inside grid – start drag selection (or single cell) */
    if (x >= HEADER_SIZE && y >= HEADER_SIZE) {
      const { col } = this.findColumnByOffset(x - HEADER_SIZE);
      const { row } = this.findRowByOffset(y - HEADER_SIZE);
      this.selMgr.startDrag(row, col);
      this.scheduleRender();
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
    this.canvas.style.cursor = "cell";
    if (y < HEADER_SIZE && x >= HEADER_SIZE) {
      const { col, within } = this.findColumnByOffset(x - HEADER_SIZE);
      if (within >= this.colMgr.getWidth(col) - RESIZE_GUTTER) this.canvas.style.cursor = "col-resize";
    } else if (x < HEADER_SIZE && y >= HEADER_SIZE) {
      const { row, within } = this.findRowByOffset(y - HEADER_SIZE);
      if (within >= this.rowMgr.getHeight(row) - RESIZE_GUTTER) this.canvas.style.cursor = "row-resize";
    }

    /* Drag‑to‑select update */
    if (this.selMgr.isDragging() && x >= HEADER_SIZE && y >= HEADER_SIZE) {
      const { col } = this.findColumnByOffset(x - HEADER_SIZE);
      const { row } = this.findRowByOffset(y - HEADER_SIZE);
      this.selMgr.updateDrag(row, col);
      this.scheduleRender();
    }
    /* Header hover tint ---------------------------------------------- */
if (!this.selMgr.isDragging()) {
  if (y < HEADER_SIZE && x >= HEADER_SIZE) {         // column header
    this.scheduleRender();                           // ensure repaint
    this.ctx.fillStyle = "rgba(173,205,255,0.25)";
    const { col } = this.findColumnByOffset(x - HEADER_SIZE);
    const hx = HEADER_SIZE + this.colMgr.getX(col) - scrollX;
    this.ctx.fillRect(hx, 0, this.colMgr.getWidth(col), HEADER_SIZE);
  }
  if (x < HEADER_SIZE && y >= HEADER_SIZE) {         // row header
    this.scheduleRender();
    this.ctx.fillStyle = "rgba(173,205,255,0.25)";
    const { row } = this.findRowByOffset(y - HEADER_SIZE);
    const hy = HEADER_SIZE + this.rowMgr.getY(row) - scrollY;
    this.ctx.fillRect(0, hy, HEADER_SIZE, this.rowMgr.getHeight(row));
  }
}

  }

  private onMouseDrag(evt: MouseEvent): void {
    /* Column resize */
    if (this.resizingCol !== null) {
      const dx = evt.clientX - this.dragStartX;
      const newW = Math.max(40, this.originalSize + dx);
      this.colMgr.setWidth(this.resizingCol, newW);
      this.updateEditorPosition();  
      this.scheduleRender();
    }
    /* Row resize */
    if (this.resizingRow !== null) {
      const dy = evt.clientY - this.dragStartY;
      const newH = Math.max(20, this.originalSize + dy);
      this.rowMgr.setHeight(this.resizingRow, newH);
      this.updateEditorPosition();  
      this.scheduleRender();
    }
  }

  private onMouseUp(): void {
    this.resizingCol = null;
    this.resizingRow = null;
    this.selMgr.endDrag();
  }

  private onKeyDown(_e: KeyboardEvent): void {
    /* arrow‑key navigation – future work */
  }

  /* ────────── Editing overlay helpers ─────────────────────────────── */
  private startEditingCell(row:number, col:number): void {
    if (!this.editorInput) this.createEditorInput();
  
    this.editingCell = { row, col };
    this.editorInput!.value = this.getCell(row,col).getValue();
    this.updateEditorPosition();        // ← single source of truth
    this.editorInput!.focus();
  }
  

  private createEditorInput(): void {
    this.editorInput = document.createElement("input");
    this.editorInput.className = "cell-editor";   // ← uses the CSS above
    this.editorInput.type = "text";
    this.container.appendChild(this.editorInput);
  
    this.editorInput.addEventListener("blur", () => this.finishEditing(true));
    this.editorInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter")   this.finishEditing(true);
      if (e.key === "Escape")  this.finishEditing(false);
    });
  }
  
/** Keeps the edit box glued to its underlying cell. *//** Keeps the <input> perfectly aligned with its cell */
private updateEditorPosition(): void {
  if (!this.editingCell || !this.editorInput) return;

  const { row, col } = this.editingCell;
  const scrollX = this.container.scrollLeft;
  const scrollY = this.container.scrollTop;

  const left = HEADER_SIZE + this.colMgr.getX(col) - scrollX;
  const top  = HEADER_SIZE + this.rowMgr.getY(row) - scrollY;

  Object.assign(this.editorInput.style, {
    left : `${left + 2}px`,
    top  : `${top  +56}px`,
    width : `${this.colMgr.getWidth(col)  - 2}px`,
    height: `${this.rowMgr.getHeight(row) - 2}px`,
    display: "block"
  } as CSSStyleDeclaration);
}


  private finishEditing(commit: boolean): void {
    if (!this.editorInput || !this.editingCell) return;
    const { row, col } = this.editingCell;
    if (commit) this.getCell(row, col).setValue(this.editorInput.value);
    this.editorInput.style.display = "none";
    this.editingCell = null;
    this.scheduleRender();
  }

  /* ────────── Rendering ───────────────────────────────────────────── */
  private getVisibleRange(): {
    firstRow: number; lastRow: number;
    firstCol: number; lastCol: number;
  } {
    const scrollX = this.container.scrollLeft;
    const scrollY = this.container.scrollTop;
    const viewW = this.container.clientWidth;
    const viewH = this.container.clientHeight;

    let firstRow = 0, lastRow = ROWS - 1;
    let y = 0;
    for (let r = 0; r < ROWS; r++) {
      const h = this.rowMgr.getHeight(r);
      if (y + h >= scrollY - RENDER_BUFFER_PX) {
        firstRow = r;
        break;
      }
      y += h;
    }

    let rowY = y;
    for (let r = firstRow; r < ROWS; r++) {
      const h = this.rowMgr.getHeight(r);
      if (rowY > scrollY + viewH + RENDER_BUFFER_PX) {
        lastRow = r;
        break;
      }
      rowY += h;
    }

    let firstCol = 0, lastCol = COLS - 1;
    let x = 0;
    for (let c = 0; c < COLS; c++) {
      const w = this.colMgr.getWidth(c);
      if (x + w >= scrollX - RENDER_BUFFER_PX) {
        firstCol = c;
        break;
      }
      x += w;
    }

    let colX = x;
    for (let c = firstCol; c < COLS; c++) {
      const w = this.colMgr.getWidth(c);
      if (colX > scrollX + viewW + RENDER_BUFFER_PX) {
        lastCol = c;
        break;
      }
      colX += w;
    }

    return { firstRow, lastRow, firstCol, lastCol };
  }

  private render(): void {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
    const scrollX = this.container.scrollLeft;
    const scrollY = this.container.scrollTop;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const { firstRow, lastRow, firstCol, lastCol } = this.getVisibleRange();
    // Draw headers
    let x = HEADER_SIZE + this.colMgr.getX(firstCol) - scrollX;
    for (let c = firstCol; c <= lastCol; c++) {
      const w = this.colMgr.getWidth(c);
      this.drawHeader(c, true, x, w);
      x += w;
    }
    let y = HEADER_SIZE + this.rowMgr.getY(firstRow) - scrollY;
    for (let r = firstRow; r <= lastRow; r++) {
      const h = this.rowMgr.getHeight(r);
      this.drawHeader(r, false, y, h);
      y += h;
    }
    // Top-left corner square
    this.ctx.fillStyle = "#f3f6fb";
    this.ctx.fillRect(0, 0, HEADER_SIZE, HEADER_SIZE);
    this.ctx.strokeStyle = "#d4d4d4";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, HEADER_SIZE, HEADER_SIZE);
    // Selection overlay
    this.selMgr.drawSelection(
      this.ctx, this.rowMgr, this.colMgr, HEADER_SIZE, this.canvas.width, this.canvas.height, scrollX, scrollY,
     
    );
    // Draw cells (only grid lines, not filled rectangles)
    let yPos = HEADER_SIZE + this.rowMgr.getY(firstRow) - scrollY;
    for (let r = firstRow; r <= lastRow; r++) {
      const rowH = this.rowMgr.getHeight(r);
      let xPos = HEADER_SIZE + this.colMgr.getX(firstCol) - scrollX;
      for (let c = firstCol; c <= lastCol; c++) {
        const colW = this.colMgr.getWidth(c);
        // Only fill if selected
        const active = this.selMgr.getSelectedCell();
        if (active && active.row === r && active.col === c) {
          this.ctx.fillStyle = "#107C41";
          this.ctx.fillRect(xPos, yPos, colW, rowH);
          this.ctx.strokeStyle = "#107C41";
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(xPos, yPos, colW, rowH);
        }
        // Draw grid lines (not filled rects)
        this.ctx.strokeStyle = "#d4d4d4";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(xPos, yPos);
        this.ctx.lineTo(xPos + colW, yPos);
        this.ctx.lineTo(xPos + colW, yPos + rowH);
        this.ctx.lineTo(xPos, yPos + rowH);
        this.ctx.lineTo(xPos, yPos);
        this.ctx.stroke();
        // Draw cell text
        this.ctx.fillStyle = "#222";
        this.ctx.font = "13px 'Segoe UI', sans-serif";
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "middle";
        const cellValue = this.getCell(r, c).getValue();
        const clipped = this.clipText(cellValue, colW - 16);
        this.ctx.fillText(clipped, xPos + 8, yPos + rowH / 2);
        xPos += colW;
      }
      yPos += rowH;
    }
  }

  private clipText(text: string, maxWidth: number): string {
    if (this.ctx.measureText(text).width <= maxWidth) return text;
    while (text.length > 0 && this.ctx.measureText(text + "…").width > maxWidth) {
      text = text.slice(0, -1);
    }
    return text + "…";
  }
  /* ────────── Batch‑update helpers (programmatic edits) ───────────── */
  public beginBatchUpdate() {
    this.suppressRender = true;
  }

  public endBatchUpdate() {
    this.suppressRender = false;
    this.scheduleRender();
  }

  public setCellValue(row: number, col: number, value: string): void {
    this.getCell(row, col).setValue(value);
    if (!this.suppressRender) this.scheduleRender();
  }

  private drawHeader(index: number, isColumn: boolean,
    pos: number, size: number): void {
const ctx = this.ctx;
const x = isColumn ? pos : 0;
const y = isColumn ? 0 : pos;
const w = isColumn ? size : HEADER_SIZE;
const h = isColumn ? HEADER_SIZE : size;

/* fill – subtle vertical gradient ------------------------------- */
const g = ctx.createLinearGradient(0, y, 0, y + h);
g.addColorStop(0, "#f5f7fc");
g.addColorStop(1, "#e9edf7");
ctx.fillStyle = g;
ctx.fillRect(x, y, w, h);

/* outer border --------------------------------------------------- */
ctx.strokeStyle = "#b7c6d5";
ctx.lineWidth = 1;
ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

/* text ----------------------------------------------------------- */
ctx.fillStyle = "#000";
ctx.font = "bold 12px Calibri, 'Segoe UI', sans-serif";
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
