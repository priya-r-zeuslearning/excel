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
const COLS = 5000;

/** How many extra rows / columns to draw outside the viewport */
const RENDER_BUFFER_PX = 200;

/** Size of the header band (row numbers / column letters) */
const HEADER_SIZE = 40;

/** How many pixels near an edge counts as a "resize hotspot" */
const RESIZE_GUTTER = 5;
const dpr = window.devicePixelRatio || 1;
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
  /** @type {{x: number, y: number}|null} The position where drag selection started. */
  private dragStartMouse: { x: number; y: number } | null = null;
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

    const rect = this.canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const fakeScrollDiv = document.createElement("div");
    fakeScrollDiv.style.height = ROWS * DEFAULT_ROW_HEIGHT + "px";
    fakeScrollDiv.style.width = COLS * DEFAULT_COL_WIDTH + "px";
    this.container.appendChild(fakeScrollDiv);

    const filler = document.getElementById("scroll-filler")!;

    this.container.addEventListener("scroll", () => {
      this.updateEditorPosition();
      this.scheduleRender();
    });
    window.addEventListener("resize", () => {
      this.updateEditorPosition();
      this.resizeCanvas();
    });

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
    // Log the number of created cells at startup
    console.log("Cells created at startup:", this.countCreatedCells());
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
   *
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
    // Use event offset for header hit-testing so header resize works when scrolled
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    const { x, y } = this.getMousePos(evt);

    /* 1 Header‑edge resize checks */
    if (mouseY < HEADER_SIZE) {
      const { col, within } = this.findColumnByOffset(x - HEADER_SIZE);
      if (within >= this.colMgr.getWidth(col) - RESIZE_GUTTER) {
        this.resizingCol = col;
        this.dragStartX = evt.clientX;
        this.originalSize = this.colMgr.getWidth(col);
        return;
      }
    }
    if (mouseX < HEADER_SIZE) {
      const { row, within } = this.findRowByOffset(y - HEADER_SIZE);
      if (within >= this.rowMgr.getHeight(row) - RESIZE_GUTTER) {
        this.resizingRow = row;
        this.dragStartY = evt.clientY;
        this.originalSize = this.rowMgr.getHeight(row);
        return;
      }
    }

    /* 2 Header clicks – full row / column selection */
    if (mouseY < HEADER_SIZE && mouseX >= HEADER_SIZE) {
      const { col } = this.findColumnByOffset(x - HEADER_SIZE);
      this.selMgr.selectColumn(col);
      this.scheduleRender();
      return;
    }
    if (mouseX < HEADER_SIZE && mouseY >= HEADER_SIZE) {
      const { row } = this.findRowByOffset(y - HEADER_SIZE);
      this.selMgr.selectRow(row);
      this.scheduleRender();
      return;
    }

    /* 3 Inside grid – start drag selection (or single cell) */
    if (mouseX >= HEADER_SIZE && mouseY >= HEADER_SIZE) {
      const { col } = this.findColumnByOffset(x - HEADER_SIZE);
      const { row } = this.findRowByOffset(y - HEADER_SIZE);
      if (evt.button === 0) {
        // left click
        // Select cell immediately
        this.selMgr.selectCell(row, col);
        this.scheduleRender();
        // Prepare for possible drag selection
        this.isMouseDown = true;
        this.dragStartCell = { row, col };
        this.dragStartMouse = { x: evt.clientX, y: evt.clientY };
      }
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
    // Use event offset for header hit-testing so header resize works when scrolled
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    const { x, y } = this.getMousePos(evt);

    /* Cursor feedback for resize */
    this.canvas.style.cursor = "cell";
    if (mouseY < HEADER_SIZE && mouseX >= HEADER_SIZE) {
      const { col, within } = this.findColumnByOffset(x - HEADER_SIZE);
      if (within >= this.colMgr.getWidth(col) - RESIZE_GUTTER) {
        this.canvas.style.cursor = "col-resize";
      } else {
        this.canvas.style.cursor = "grab";
      }
    } else if (mouseX < HEADER_SIZE && mouseY >= HEADER_SIZE) {
      const { row, within } = this.findRowByOffset(y - HEADER_SIZE);
      if (within >= this.rowMgr.getHeight(row) - RESIZE_GUTTER) {
        this.canvas.style.cursor = "row-resize";
      } else {
        this.canvas.style.cursor = "grab";
      }
    }

    /* Drag‑to‑select update */
    if (
      this.isMouseDown &&
      this.dragStartCell &&
      x >= HEADER_SIZE &&
      y >= HEADER_SIZE
    ) {
      // If not already dragging, check if mouse moved enough to start drag
      if (!this.selMgr.isDragging() && this.dragStartMouse) {
        const dx = Math.abs(evt.clientX - this.dragStartMouse.x);
        const dy = Math.abs(evt.clientY - this.dragStartMouse.y);
        if (dx > 2 || dy > 2) {
          // threshold in pixels
          this.selMgr.startDrag(this.dragStartCell.row, this.dragStartCell.col);
        }
      }
      if (this.selMgr.isDragging()) {
        const { col } = this.findColumnByOffset(x - HEADER_SIZE);
        const { row } = this.findRowByOffset(y - HEADER_SIZE);
        this.selMgr.updateDrag(row, col);
        this.scheduleRender();
      }
    }

    /* Header hover tint ---------------------------------------------- */
    if (!this.selMgr.isDragging()) {
      if (y < HEADER_SIZE && x >= HEADER_SIZE) {
        // column header
        this.scheduleRender(); // ensure repaint
        this.ctx.fillStyle = "rgba(173,205,255,0.25)";
        const { col } = this.findColumnByOffset(x - HEADER_SIZE);
        const scrollX = this.container.scrollLeft;
        const hx = HEADER_SIZE + this.colMgr.getX(col) - scrollX;
        this.ctx.fillRect(hx, 0, this.colMgr.getWidth(col), HEADER_SIZE);
      }
      if (x < HEADER_SIZE && y >= HEADER_SIZE) {
        // row header
        this.scheduleRender();
        this.ctx.fillStyle = "rgba(173,205,255,0.25)";
        const { row } = this.findRowByOffset(y - HEADER_SIZE);
        const scrollY = this.container.scrollTop;
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
    this.isMouseDown = false;
    this.dragStartCell = null;
    this.dragStartMouse = null;
    // Finalize drag selection if we were dragging
    if (this.selMgr.isDragging()) {
      this.selMgr.endDrag();
      this.scheduleRender();
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Only handle navigation if not editing a cell
    if (this.editingCell) return;
    const selected = this.selMgr.getSelectedCell();
    if (!selected) return;
    let { row, col } = selected;
    let moved = false;
    switch (e.key) {
      case "ArrowRight":
        if (col < COLS - 1) {
          col++;
          moved = true;
        }
        break;
      case "ArrowLeft":
        if (col > 0) {
          col--;
          moved = true;
        }
        break;
      case "ArrowDown":
        if (row < ROWS - 1) {
          row++;
          moved = true;
        }
        break;
      case "ArrowUp":
        if (row > 0) {
          row--;
          moved = true;
        }
        break;
      default:
        return;
    }
    if (moved) {
      this.selMgr.selectCell(row, col);
      this.scheduleRender();
      e.preventDefault();
    }
  }

  /* ────────── Editing overlay helpers ─────────────────────────────── */
  private startEditingCell(row: number, col: number): void {
    if (!this.editorInput) this.createEditorInput();

    this.editingCell = { row, col };
    this.editorInput!.value = this.getCell(row, col).getValue();
    this.updateEditorPosition();
    this.editorInput!.focus();
  }

  private createEditorInput(): void {
    this.editorInput = document.createElement("input");
    this.editorInput.className = "cell-editor";
    this.editorInput.type = "text";
    this.editorInput.style.border = "none";
    this.editorInput.style.outline = "none";
    this.editorInput.style.backgroundColor = "transparent !important";
    this.container.appendChild(this.editorInput);

    this.editorInput.addEventListener("blur", () => this.finishEditing(true));
    this.editorInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.finishEditing(true);
      if (e.key === "Escape") this.finishEditing(false);
    });
  }

  private updateEditorPosition(): void {
    if (!this.editingCell || !this.editorInput) return;

    const { row, col } = this.editingCell;
    const scrollX = this.container.scrollLeft;
    const scrollY = this.container.scrollTop;

    const left = HEADER_SIZE + this.colMgr.getX(col) - scrollX;
    const top = HEADER_SIZE + this.rowMgr.getY(row) - scrollY;

    Object.assign(this.editorInput.style, {
      left: `${left + 3}px`,
      top: `${top + 59}px`,
      width: `${this.colMgr.getWidth(col) - 6}px`,
      height: `${this.rowMgr.getHeight(row) - 6}px`,
      display: "block",
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
    firstRow: number;
    lastRow: number;
    firstCol: number;
    lastCol: number;
  } {
    const scrollX = this.container.scrollLeft;
    const scrollY = this.container.scrollTop;
    const viewW = this.container.clientWidth;
    const viewH = this.container.clientHeight;

    let firstRow = 0,
      lastRow = ROWS - 1;
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

    let firstCol = 0,
      lastCol = COLS - 1;
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
    const dpr = window.devicePixelRatio || 1;
    // Set canvas size in physical pixels for crisp lines
    this.canvas.width = this.container.clientWidth * dpr;
    this.canvas.height = this.container.clientHeight * dpr;
    this.canvas.style.width = this.container.clientWidth + "px";
    this.canvas.style.height = this.container.clientHeight + "px";
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    this.ctx.scale(dpr, dpr);
    const scrollX = this.container.scrollLeft;
    const scrollY = this.container.scrollTop;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const { firstRow, lastRow, firstCol, lastCol } = this.getVisibleRange();
    // Draw cells (only grid lines, not filled rectangles)
    let yPos = HEADER_SIZE + this.rowMgr.getY(firstRow) - scrollY;
    for (let r = firstRow; r <= lastRow; r++) {
      const rowH = this.rowMgr.getHeight(r);
      let xPos = HEADER_SIZE + this.colMgr.getX(firstCol) - scrollX;
      for (let c = firstCol; c <= lastCol; c++) {
        const colW = this.colMgr.getWidth(c);
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
    // Draw vertical grid lines
    let gridX = HEADER_SIZE + this.colMgr.getX(firstCol) - scrollX;
    for (let c = firstCol; c <= lastCol + 1; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(gridX, HEADER_SIZE);
      this.ctx.lineTo(gridX, this.canvas.height / dpr);
      this.ctx.strokeStyle = "#d4d4d4";
      this.ctx.lineWidth = 1 / dpr;
      this.ctx.stroke();
      if (c <= lastCol) gridX += this.colMgr.getWidth(c);
    }
    // Draw horizontal grid lines
    let gridY = HEADER_SIZE + this.rowMgr.getY(firstRow) - scrollY;
    for (let r = firstRow; r <= lastRow + 1; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(HEADER_SIZE, gridY);
      this.ctx.lineTo(this.canvas.width / dpr, gridY);
      this.ctx.strokeStyle = "#d4d4d4";
      this.ctx.lineWidth = 1 / dpr;
      this.ctx.stroke();
      if (r <= lastRow) gridY += this.rowMgr.getHeight(r);
    }
    // Draw selection overlay BEFORE headers so headers cover selection
    this.selMgr.drawSelection(
      this.ctx,
      this.rowMgr,
      this.colMgr,
      HEADER_SIZE,
      scrollX,
      scrollY
    );
    // Draw headers LAST so they are on top
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
  }

  private clipText(text: string, maxWidth: number): string {
    if (this.ctx.measureText(text).width <= maxWidth) return text;
    while (
      text.length > 0 &&
      this.ctx.measureText(text + "…").width > maxWidth
    ) {
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

  private drawHeader(
    index: number,
    isColumn: boolean,
    pos: number,
    size: number
  ): void {
    const ctx = this.ctx;
    const x = isColumn ? pos : 0;
    const y = isColumn ? 0 : pos;
    let w = isColumn ? size : HEADER_SIZE;
    const h = isColumn ? HEADER_SIZE : size;
    ctx.font = " 14px Calibri, 'Segoe UI', sans-serif";
    // Check if this header should be highlighted based on various selection states
    let highlight = false;
    let highlightColor = "#CAEAD8"; 
    let highlightText = "#107C41";

    // Get current selection states
    const selectedCell = this.selMgr.getSelectedCell();
    const selectedRow = this.selMgr.getSelectedRow();
    const selectedCol = this.selMgr.getSelectedCol();
    const dragRect = this.selMgr.getDragRect();

    // Highlight if this header corresponds to a selected cell
    if (selectedCell) {
      const { row, col } = selectedCell;
      if ((isColumn && col === index) || (!isColumn && row === index)) {
        highlight = true;
        ctx.fillStyle = highlightColor;
        ctx.fillRect(x, y, w, h);
      }
    }
  if (index + 1 > 1000) { 
      w = HEADER_SIZE + 5
    }
 

    // Highlight if this header corresponds to a selected row/column
    if (isColumn && selectedCol === index) {
      highlight = true;
      ctx.fillStyle = highlightColor;
      ctx.fillRect(x, y, w, h);
    }
    if (!isColumn && selectedRow === index) {
      highlight = true;
      ctx.fillStyle = highlightColor;
      ctx.fillRect(x, y, w, h);
    }
    if (isColumn && this.selMgr.getSelectedRow() !== null) {
      highlight = true;
      ctx.fillStyle = highlightColor;
      ctx.fillRect(x, y, w, h);
    }
    if (!isColumn && this.selMgr.getSelectedRow() === index) {
      ctx.fillStyle = "#107C41"; // green background
      ctx.font = "bold 14px Calibri, 'Segoe UI', sans-serif";
      ctx.fillRect(x, y, w, h);
      highlightText = "#FFFFFF"; // white font
    }
    // Highlight if the whole column is selected (column header and all row headers)
    if (isColumn && this.selMgr.getSelectedCol() === index) {
      ctx.fillStyle = "#107C41"; // green background
      ctx.font = "bold 14px Calibri, 'Segoe UI', sans-serif";
      ctx.fillRect(x, y, w, h);
      highlightText = "#FFFFFF"; // white font
    }
    if (!isColumn && this.selMgr.getSelectedCol() !== null) {
      highlight = true;
      ctx.fillStyle = highlightColor;
      ctx.fillRect(x, y, w, h);
    }

    // Highlight if this header is within a drag selection range
    if (dragRect) {
      if (isColumn) {
        // For column headers, check if this column is within the drag range
        if (index >= dragRect.startCol && index <= dragRect.endCol) {
          highlight = true;
          ctx.fillStyle = highlightColor;
          ctx.fillRect(x, y, w, h);
        }
      } else {
        // For row headers, check if this row is within the drag range
        if (index >= dragRect.startRow && index <= dragRect.endRow) {
          highlight = true;
          ctx.fillStyle = highlightColor;
          ctx.fillRect(x, y, w, h);
        }
      }
    }

    // fill – subtle vertical gradient or highlight

    // outer border
    ctx.strokeStyle = "#b7c6d5";
    ctx.lineWidth = 1 / dpr;

    if (highlight) {
      ctx.save();
      ctx.strokeStyle = "#107C41";
      ctx.beginPath();
      if (isColumn) {
        // // Draw left border (thin)
        // ctx.lineWidth = 1 / dpr;
        // ctx.moveTo(x + 0.5, y);
        // ctx.lineTo(x + 0.5, y + h - 0.5);

        // // Draw right border (thin)
        // ctx.moveTo(x + w - 0.5, y);
        // ctx.lineTo(x + w - 0.5, y + h - 0.5);

        // Draw bottom border (thick)
        ctx.lineWidth = 2 / dpr;
        ctx.moveTo(x, y + h - 0.5);
        ctx.lineTo(x + w, y + h - 0.5);
      } else {
        // Row header: draw only green border at the right (no previous border)
        ctx.lineWidth = 2 / dpr;
        ctx.moveTo(x + w - 0.5, y);
        ctx.lineTo(x + w - 0.5, y + h);
      }
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = "#F5F5F5";
      ctx.fillRect(x, y, w, h);
      if (isColumn) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, y + 0.5); // left
        ctx.lineTo(x + 0.5, y + h - 0.5); // down left edge
        ctx.lineTo(x + w - 0.5, y + h - 0.5); // right along bottom edge
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x, y + h); // left bottom
        if (index + 1 > 1000) {
          ctx.lineTo(x + w + 5, y + h); // right bottom
        } else {
          ctx.lineTo(x + w, y + h); // right bottom
        }
        ctx.stroke();
      }
    }
    if (!isColumn) {
      ctx.fillStyle = "#f5f5f5";
      
    }
    // text
    ctx.fillStyle = highlight ? highlightText : "#616161";

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

  public countCreatedCells(): number {
    let count = 0;
    for (const row of this.cells) {
      if (row) {
        count += row.filter((cell) => cell !== undefined).length;
      }
    }
    return count;
  }
}
