// src/core/Grid.ts
import { Cell } from "./cell";
import { RowManager } from "./RowManager";
import { ColumnManager } from "./ColumnManager";
import { SelectionManager } from "./Selection";
import { CommandManager } from "../commands/CommandManager";
import { EditCellCommand } from "../commands/EditCellCommand";
import { ResizeColumnCommand } from "../commands/ResizeColumnCommand";
import { ResizeRowCommand } from "../commands/ResizeRowCommand";
import { FontSizeCommand } from "../commands/FontSizeCommand";
import { BoldCommand } from "../commands/BoldCommand";
import { ItalicCommand } from "../commands/ItalicCommand";
import { Aggregator } from './Aggregator';

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
let HEADER_SIZE = 40;

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
  public readonly rowMgr: RowManager;
  /** @type {ColumnManager} Manages column widths and operations. */
  public readonly colMgr: ColumnManager;
  /** @type {SelectionManager} Manages selection state and drawing. */
  private readonly selMgr: SelectionManager;
  /** @type {Cell[][]} Stores all cell objects. */
  private cells: Map<number, Map<number, Cell>> = new Map();
  /** @type {HTMLInputElement|null} The input element for cell editing. */
  private editorInput: HTMLInputElement | null = null;
  /** @type {{row: number, col: number}|null} The currently editing cell. */
  private editingCell: { row: number; col: number } | null = null;
  /** @type {HTMLElement} The scrollable container for the grid. */
  private container: HTMLElement;
  /** @type {boolean} Suppresses rendering during batch updates. */
  private suppressRender: boolean = false;
  /** @type {boolean} Whether a render is scheduled. */
  private renderScheduled: boolean = false;
  /** @type {boolean} Whether the mouse is currently down for drag selection. */
  private isMouseDown: boolean = false;
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
  private commandManager: CommandManager = new CommandManager();
  // Add these properties to track resize operations
  private currentResizeCommand: any = null;
  private isResizing: boolean = false;
 
private editingCellInstance: Cell | null = null;

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

  /**
   * Gets the cell object at the specified row and column.
   * @param {number} row The row index.
   * @param {number} col The column index.
   * @returns {Cell} The cell object.
   */
  public getCell(row: number, col: number): Cell {
    let rowMap = this.cells.get(row);
    if (!rowMap) {
      rowMap = new Map();
      this.cells.set(row, rowMap);
    }
    // @ts-ignore
    if (!rowMap.has(col)) {
      // @ts-ignore
      if (window._lastCreatedCell && window._lastCreatedCell.row === row && window._lastCreatedCell.col === col) {
        console.warn("⚠️ Same cell created twice in a row:", row, col);
      }
      // @ts-ignore
      window._lastCreatedCell = { row, col };
      // console.log("✅ Creating cell at row:", row, "col:", col);
      // console.trace();
      rowMap.set(col, new Cell(row, col));
      // console.log("Cells created:", this.countCreatedCells());
    }
    return rowMap.get(col)!;
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
    const undoButton = document.getElementById("undoBtn")!;
    undoButton.addEventListener("click", this.onUndo.bind(this));
    const redoButton = document.getElementById("redoBtn")!;
    redoButton.addEventListener("click", this.onRedo.bind(this));
    
    // Toolbar buttons
    const insertRowBtn = document.getElementById("insertRowBtn")!;
    insertRowBtn.addEventListener("click", this.onInsertRow.bind(this));
    const insertColBtn = document.getElementById("insertColBtn")!;
    insertColBtn.addEventListener("click", this.onInsertColumn.bind(this));
    const deleteRowBtn = document.getElementById("deleteRowBtn")!;
    deleteRowBtn.addEventListener("click", this.onDeleteRow.bind(this));
    const deleteColBtn = document.getElementById("deleteColBtn")!;
    deleteColBtn.addEventListener("click", this.onDeleteColumn.bind(this));
    
    // Font controls
    const fontSizeSelect = document.getElementById("fontSizeSelect") as HTMLSelectElement;
    fontSizeSelect.addEventListener("change", this.onFontSizeChange.bind(this));
    const boldBtn = document.getElementById("boldBtn")!;
    boldBtn.addEventListener("click", this.onBoldToggle.bind(this));
    const italicBtn = document.getElementById("italicBtn")!;
    italicBtn.addEventListener("click", this.onItalicToggle.bind(this));
  }

  private onUndo(): void {
    this.commandManager.undo();
    this.scheduleRender();
  }

  private onRedo(): void {
    this.commandManager.redo();
    this.scheduleRender();
  }

  private onInsertRow(): void {
    const selectedRow = this.selMgr.getSelectedRow();
    const selectedCell = this.selMgr.getSelectedCell();
    const insertAt = selectedRow !== null ? selectedRow : (selectedCell ? selectedCell.row : 0);
    
    // Insert a new row at the selected position
    this.rowMgr.insertRow(insertAt);
    
    // Shift cells down
    this.shiftCellsDown(insertAt);
    
    this.scheduleRender();
  }

  private onInsertColumn(): void {
    const selectedCol = this.selMgr.getSelectedCol();
    const selectedCell = this.selMgr.getSelectedCell();
    const insertAt = selectedCol !== null ? selectedCol : (selectedCell ? selectedCell.col : 0);
    
    // Insert a new column at the selected position
    this.colMgr.insertColumn(insertAt);
    
    // Shift cells right
    this.shiftCellsRight(insertAt);
    
    this.scheduleRender();
  }

  private onDeleteRow(): void {
    const selectedRow = this.selMgr.getSelectedRow();
    
    // Only delete if a row is specifically selected
    if (selectedRow === null) {
      return;
    }
    
    // Ask for confirmation
    const confirmed = confirm(`Are you sure you want to delete row ${selectedRow + 1}?`);
    if (!confirmed) {
      return;
    }
    
    if (selectedRow >= 0 && selectedRow < ROWS) {
      // Remove the row
      this.rowMgr.deleteRow(selectedRow);
      
      // Shift cells up
      this.shiftCellsUp(selectedRow);
      
      // Clear selection
      this.selMgr.clearSelection();
      
      this.scheduleRender();
    }
  }

  private onDeleteColumn(): void {
    const selectedCol = this.selMgr.getSelectedCol();
    const selectedCell = this.selMgr.getSelectedCell();
    if (selectedCol === null) {
      return;
    }
    const deleteAt = selectedCol !== null ? selectedCol : (selectedCell ? selectedCell.col : 0);
    const confirmed = confirm(`Are you sure you want to delete column ${deleteAt + 1}?`);
    if (!confirmed) {
      return;
    }
    if (deleteAt >= 0 && deleteAt < COLS) {
      // Remove the column
      this.colMgr.deleteColumn(deleteAt);
      
      // Shift cells left
      this.shiftCellsLeft(deleteAt);
      
      // Clear selection
      this.selMgr.clearSelection();
      
      this.scheduleRender();
    }
  }

  private shiftCellsDown(insertAt: number): void {
    // Move all cells from insertAt onwards down by one row
    for (let row = ROWS - 2; row >= insertAt; row--) {
      const rowMap = this.cells.get(row);
      if (rowMap) {
        const newRowMap = new Map();
        for (const [col, cell] of rowMap) {
          const newCell = new Cell(row + 1, col);
          newCell.setValue(cell.getValue());
          newRowMap.set(col, newCell);
        }
        this.cells.set(row + 1, newRowMap);
      }
    }
    // Clear the inserted row
    this.cells.delete(insertAt);
  }

  private shiftCellsRight(insertAt: number): void {
    // Move all cells from insertAt onwards right by one column
    for (const rowMap of this.cells.values()) {
      const newRowMap = new Map();
      for (let col = COLS - 2; col >= insertAt; col--) {
        const cell = rowMap.get(col);
        if (cell) {
          const newCell = new Cell(cell.row, col + 1);
          newCell.setValue(cell.getValue());
          newRowMap.set(col + 1, newCell);
        }
      }
      // Copy cells before insertAt
      for (let col = 0; col < insertAt; col++) {
        const cell = rowMap.get(col);
        if (cell) {
          newRowMap.set(col, cell);
        }
      }
      // Clear the original rowMap and set the new one
      rowMap.clear();
      for (const [col, cell] of newRowMap) {
        rowMap.set(col, cell);
      }
    }
  }

  private shiftCellsUp(deleteAt: number): void {
    // Move all cells from deleteAt + 1 onwards up by one row
    for (let row = deleteAt; row < ROWS - 1; row++) {
      const rowMap = this.cells.get(row + 1);
      if (rowMap) {
        const newRowMap = new Map();
        for (const [col, cell] of rowMap) {
          const newCell = new Cell(row, col);
          newCell.setValue(cell.getValue());
          newRowMap.set(col, newCell);
        }
        this.cells.set(row, newRowMap);
      } else {
        this.cells.delete(row);
      }
    }
    // Clear the last row
    this.cells.delete(ROWS - 1);
  }

  private shiftCellsLeft(deleteAt: number): void {
    // Move all cells from deleteAt + 1 onwards left by one column
    for (const rowMap of this.cells.values()) {
      const newRowMap = new Map();
      for (let col = 0; col < deleteAt; col++) {
        const cell = rowMap.get(col);
        if (cell) {
          newRowMap.set(col, cell);
        }
      }
      for (let col = deleteAt + 1; col < COLS; col++) {
        const cell = rowMap.get(col);
        if (cell) {
          const newCell = new Cell(cell.row, col - 1);
          newCell.setValue(cell.getValue());
          newRowMap.set(col - 1, newCell);
        }
      }
      // Clear the original rowMap and set the new one
      rowMap.clear();
      for (const [col, cell] of newRowMap) {
        rowMap.set(col, cell);
      }
    }
  }

  /* ────────── Coordinate helpers ────────────────────────────────{ x: number; y: number } {
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
        this.isResizing = true;
        this.currentResizeCommand = new ResizeColumnCommand(this, this.resizingCol, this.originalSize, this.originalSize);
        this.ctx.strokeStyle = "#107C41";
        this.ctx.lineWidth = 2 / dpr;
      
        return;
      }
    }
    if (mouseX < HEADER_SIZE) {
      const { row, within } = this.findRowByOffset(y - HEADER_SIZE);
      if (within >= this.rowMgr.getHeight(row) - RESIZE_GUTTER) {
        this.resizingRow = row;
        this.dragStartY = evt.clientY;
        this.originalSize = this.rowMgr.getHeight(row);
        this.isResizing = true;
        this.currentResizeCommand = new ResizeRowCommand(this, this.resizingRow, this.originalSize, this.originalSize);
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

    this.computeSelectionStats();
    this.updateToolbarState();
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
    if (this.resizingCol !== null && this.isResizing && this.currentResizeCommand) {
      const dx = evt.clientX - this.dragStartX;
      const newW = Math.max(40, this.originalSize + dx);
      this.colMgr.setWidth(this.resizingCol, newW);
      this.currentResizeCommand.updateNewSize(newW);
      this.updateEditorPosition();
      this.scheduleRender();
    }
    /* Row resize */
    if (this.resizingRow !== null && this.isResizing && this.currentResizeCommand) {
      const dy = evt.clientY - this.dragStartY;
      const newH = Math.max(20, this.originalSize + dy);
      this.rowMgr.setHeight(this.resizingRow, newH);
      this.currentResizeCommand.updateNewSize(newH);
      this.updateEditorPosition();
      this.scheduleRender();
    }
  }

  private onMouseUp(): void {
    // Execute the resize command if we were resizing
    if (this.isResizing && this.currentResizeCommand) {
      this.commandManager.execute(this.currentResizeCommand);
      this.currentResizeCommand = null;
      this.isResizing = false;
    }
    
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

    this.computeSelectionStats();
    this.updateToolbarState();
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Only handle navigation if not editing a cell
    if (this.editingCell) return;
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      this.commandManager.undo();
      this.scheduleRender();
      return;
    }

    if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "z")) {
      e.preventDefault();
      this.commandManager.redo();
      this.scheduleRender();
      return;
    }

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
      this.computeSelectionStats();
      e.preventDefault();
    }

    this.computeSelectionStats();
    this.updateToolbarState();
  }

  /* ────────── Editing overlay helpers ─────────────────────────────── */
  private startEditingCell(row: number, col: number): void {
    const cell = this.getCell(row, col); // Creates only once
    this.editingCellInstance = cell;
  
    if (!this.editorInput) this.createEditorInput();
  
    this.editingCell = { row, col };
    this.editorInput!.value = cell.getValue();
    this.updateEditorPosition();
    this.editorInput!.focus();
  }
  

  private createEditorInput(): void {
    this.editorInput = document.createElement("input");
    this.editorInput.className = "cell-editor";
    this.editorInput.type = "text";
    this.editorInput.style.border = "none";
    this.editorInput.style.outline = "none";
    this.editorInput.style.fontSize = "14px";
    this.editorInput.style.fontFamily = "Arial, sans-serif";
    this.editorInput.style.color = "#222";
    this.editorInput.style.textAlign = "left";
    this.editorInput.style.padding = "5px";
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
      top: `${top + 106}px`,
      width: `${this.colMgr.getWidth(col) - 6}px`,
      height: `${this.rowMgr.getHeight(row) - 6}px`,
      display: "block",
    } as CSSStyleDeclaration);
  }

  private finishEditing(commit: boolean): void {
    if (!this.editorInput || !this.editingCell || !this.editingCellInstance) return;
  
    const cell = this.editingCellInstance; // ← Use the cached one
    const oldValue = cell.getValue();
    const newValue = this.editorInput.value;
  
    if (commit && newValue !== oldValue) {
      const command = new EditCellCommand(this, cell, oldValue, newValue);
      this.commandManager.execute(command);
    }
  
    this.editorInput.style.display = "none";
    this.editingCell = null;
    this.editingCellInstance = null;
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
        // if (lastRow > 1000) {
        //   HEADER_SIZE = HEADER_SIZE + 5;
        // }
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
      const rowMap = this.cells.get(r);
      for (let c = firstCol; c <= lastCol; c++) {
        const colW = this.colMgr.getWidth(c);
        // Draw cell text
        this.ctx.fillStyle = "#222";
        const cell = rowMap?.get(c);
        if (cell) {
          const fontSize = cell.getFontSize();
          const isBold = cell.getIsBold();
          const isItalic = cell.getIsItalic();
          
          let fontStyle = "";
          if (isBold && isItalic) {
            fontStyle = "bold italic";
          } else if (isBold) {
            fontStyle = "bold";
          } else if (isItalic) {
            fontStyle = "italic";
          } else {
            fontStyle = "normal";
          }
          
          this.ctx.font = `${fontStyle} ${fontSize}px 'Arial', sans-serif`;
        } else {
          this.ctx.font = "14px 'Arial', sans-serif";
        }
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "middle";
        const cellValue = rowMap?.get(c)?.getValue() || "";
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
    this.ctx.lineWidth = 1/dpr;
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
    if (value.trim() === "") return;
    const cell = this.getCell(row, col);
    cell.setValue(value);
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
    ctx.font = "14px Calibri, 'Segoe UI', sans-serif";

    // Dynamically adjust row header width for large row numbers
    if (!isColumn) {
      const rowLabel = (index + 1).toString();
      const textWidth = ctx.measureText(rowLabel).width;
      const padding = 16;
      w = Math.max(HEADER_SIZE, textWidth + padding);
      if (index + 1 > 1000) {
        w = HEADER_SIZE + 5;
      }
    }

    // Get selection states
    const selectedCell = this.selMgr.getSelectedCell();
    const selectedRow = this.selMgr.getSelectedRow();
    const selectedCol = this.selMgr.getSelectedCol();
    const dragRect = this.selMgr.getDragRect();

    // Determine highlight state
    let highlight = false;
    let highlightColor = "#CAEAD8";
    let highlightText = "#107C41";
    let isBold = false;

    // Check various selection conditions
    if (selectedCell && ((isColumn && selectedCell.col === index) || (!isColumn && selectedCell.row === index))) {
      highlight = true;
    }
    if ((isColumn && selectedCol === index) || (!isColumn && selectedRow === index)) {
      highlight = true;
    }
    if (isColumn && selectedRow !== null) {
      highlight = true;
    }
    if (!isColumn && selectedRow === index) {
      highlight = true;
      highlightColor = "#107C41";
      highlightText = "#FFFFFF";
      isBold = true;
    }
    if (isColumn && selectedCol === index) {
      highlight = true;
      highlightColor = "#107C41";
      highlightText = "#FFFFFF";
      isBold = true;
    }
    if (!isColumn && selectedCol !== null) {
      highlight = true;
    }

    // Check drag selection
    if (dragRect) {
      const inRange = isColumn 
        ? (index >= dragRect.startCol && index <= dragRect.endCol)
        : (index >= dragRect.startRow && index <= dragRect.endRow);
      if (inRange) {
        highlight = true;
      }
    }

    // Draw background
    if (highlight) {
      ctx.fillStyle = highlightColor;
      ctx.fillRect(x, y, w, h);
    } else {
      ctx.fillStyle = "#F5F5F5";
      ctx.fillRect(x, y, w, h);
    }

    // Draw borders
    ctx.strokeStyle = highlight ? "#107C41" : "#b7c6d5";
    ctx.lineWidth = highlight ? 2 / dpr : 1/ dpr;
    ctx.beginPath();
    
    if (isColumn) {
      ctx.moveTo(x, y + h - 0.5);
      ctx.lineTo(x + w, y + h - 0.5);
      if (!highlight) {
          ctx.moveTo(x + 0.5, y);
      ctx.lineTo(x , y + h);
        
      }   

    } else {
      ctx.moveTo(x + w - 0.5, y);
      ctx.lineTo(x + w - 0.5, y + h);
      if (!highlight) {
        ctx.moveTo(x, y + h - 0.5);
        ctx.lineTo(x + w, y + h - 0.5);
      }
    }
    ctx.stroke();

    // Draw text
    ctx.fillStyle = highlight ? highlightText : "#616161";
    if (isBold) {
      ctx.font = "bold 14px Calibri, 'Segoe UI', sans-serif";
    }
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
    for (const rowMap of this.cells.values()) {
      count += rowMap.size;
    }
    return count;
  }

  // Add getMousePos method
  private getMousePos(evt: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left + this.container.scrollLeft;
    const y = evt.clientY - rect.top + this.container.scrollTop;
    return { x, y };
  }

  // Add findColumnByOffset method
  private findColumnByOffset(offsetX: number): { col: number; within: number } {
    let x = 0;
    for (let c = 0; c < COLS; c++) {
      const w = this.colMgr.getWidth(c);
      if (offsetX < x + w) return { col: c, within: offsetX - x };
      x += w;
    }
    return { col: COLS - 1, within: 0 };
  }

  // Add findRowByOffset method
  private findRowByOffset(offsetY: number): { row: number; within: number } {
    let y = 0;
    for (let r = 0; r < ROWS; r++) {
      const h = this.rowMgr.getHeight(r);
      if (offsetY < y + h) return { row: r, within: offsetY - y };
      y += h;
    }
    return { row: ROWS - 1, within: 0 };
  }

  private computeSelectionStats(): void {
    // Drag rectangle (range selection)
    const rect = this.selMgr.getDragRect();
    if (rect) {
      const { startRow, endRow, startCol, endCol } = rect;
      const cells: (string | number)[][] = [];
      for (let r = startRow; r <= endRow; r++) {
        const row: (string | number)[] = [];
        for (let c = startCol; c <= endCol; c++) {
          row.push(this.getCell(r, c).getValue());
        }
        cells.push(row);
      }
      const stats = Aggregator.compute(cells);
      this.updateStatusBar(stats);
      return;
    }
    // Whole row selection
    const selectedRow = this.selMgr.getSelectedRow();
    if (selectedRow !== null) {
      const row: (string | number)[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push(this.getCell(selectedRow, c).getValue());
      }
      const stats = Aggregator.compute([row]);
      this.updateStatusBar(stats);
      return;
    }
    // Whole column selection
    const selectedCol = this.selMgr.getSelectedCol();
    if (selectedCol !== null) {
      const col: (string | number)[] = [];
      for (let r = 0; r < ROWS; r++) {
        col.push(this.getCell(r, selectedCol).getValue());
      }
      // Aggregator expects 2D array
      const stats = Aggregator.compute(col.map(v => [v]));
      this.updateStatusBar(stats);
      return;
    }
    // Single cell selection
    const selectedCell = this.selMgr.getSelectedCell();
    if (selectedCell) {
      const { row, col } = selectedCell;
      const value = this.getCell(row, col).getValue();
      const stats = Aggregator.compute([[value]]);
      this.updateStatusBar(stats);
      return;
    }
    // If nothing is selected, clear status bar
    this.updateStatusBar({ sum: '', count: '', average: '', min: '', max: '' });
  }

  private updateStatusBar(stats: any): void {
    // TODO: Replace with real UI update
    const summaryBar = document.getElementById("summaryBar")!;
    summaryBar.innerHTML = ` <span><strong>SUM:</strong> ${stats.sum}</span>
      <span><strong>COUNT:</strong> ${stats.count}</span>
      <span><strong>AVERAGE:</strong> ${stats.average}</span>
      <span><strong>MIN:</strong> ${stats.min}</span>
      <span><strong>MAX:</strong> ${stats.max}</span>
      `
  }

  private onFontSizeChange(): void {
    const fontSizeSelect = document.getElementById("fontSizeSelect") as HTMLSelectElement;
    const newSize = parseInt(fontSizeSelect.value);
    this.applyFontSizeToSelection(newSize);
  }

  private onBoldToggle(): void {
    const boldBtn = document.getElementById("boldBtn")!;
    const isCurrentlyBold = boldBtn.classList.contains("active");
    this.applyBoldToSelection(!isCurrentlyBold);
  }

  private onItalicToggle(): void {
    const italicBtn = document.getElementById("italicBtn")!;
    const isCurrentlyItalic = italicBtn.classList.contains("active");
    this.applyItalicToSelection(!isCurrentlyItalic);
  }

  private applyFontSizeToSelection(newSize: number): void {
    const selectedCells = this.getSelectedCells();
    if (selectedCells.length === 0) return;

    // Create and execute command for each selected cell
    for (const cell of selectedCells) {
      const command = new FontSizeCommand(cell, newSize);
      this.commandManager.execute(command);
    }
    
    this.scheduleRender();
  }

  private applyBoldToSelection(isBold: boolean): void {
    const selectedCells = this.getSelectedCells();
    if (selectedCells.length === 0) return;

    // Create and execute command for each selected cell
    for (const cell of selectedCells) {
      const command = new BoldCommand(cell, isBold);
      this.commandManager.execute(command);
    }
    
    this.updateToolbarState();
    this.scheduleRender();
  }

  private applyItalicToSelection(isItalic: boolean): void {
    const selectedCells = this.getSelectedCells();
    if (selectedCells.length === 0) return;

    // Create and execute command for each selected cell
    for (const cell of selectedCells) {
      const command = new ItalicCommand(cell, isItalic);
      this.commandManager.execute(command);
    }
    
    this.updateToolbarState();
    this.scheduleRender();
  }

  private getSelectedCells(): Cell[] {
    const cells: Cell[] = [];
    
    // Check for drag selection
    const rect = this.selMgr.getDragRect();
    if (rect) {
      for (let r = rect.startRow; r <= rect.endRow; r++) {
        for (let c = rect.startCol; c <= rect.endCol; c++) {
          cells.push(this.getCell(r, c));
        }
      }
      return cells;
    }
    
    // Check for row selection
    const selectedRow = this.selMgr.getSelectedRow();
    if (selectedRow !== null) {
      for (let c = 0; c < COLS; c++) {
        cells.push(this.getCell(selectedRow, c));
      }
      return cells;
    }
    
    // Check for column selection
    const selectedCol = this.selMgr.getSelectedCol();
    if (selectedCol !== null) {
      for (let r = 0; r < ROWS; r++) {
        cells.push(this.getCell(r, selectedCol));
      }
      return cells;
    }
    
    // Check for single cell selection
    const selectedCell = this.selMgr.getSelectedCell();
    if (selectedCell) {
      cells.push(this.getCell(selectedCell.row, selectedCell.col));
      return cells;
    }
    
    return cells;
  }

  private updateToolbarState(): void {
    const selectedCells = this.getSelectedCells();
    if (selectedCells.length === 0) {
      // Reset toolbar to default state
      const fontSizeSelect = document.getElementById("fontSizeSelect") as HTMLSelectElement;
      const boldBtn = document.getElementById("boldBtn")!;
      const italicBtn = document.getElementById("italicBtn")!;
      
      fontSizeSelect.value = "14";
      boldBtn.classList.remove("active");
      italicBtn.classList.remove("active");
      return;
    }
    
    // Check if all selected cells have the same formatting
    const firstCell = selectedCells[0];
    const allSameSize = selectedCells.every(cell => cell.getFontSize() === firstCell.getFontSize());
    const allSameBold = selectedCells.every(cell => cell.getIsBold() === firstCell.getIsBold());
    const allSameItalic = selectedCells.every(cell => cell.getIsItalic() === firstCell.getIsItalic());
    
    // Update toolbar state
    const fontSizeSelect = document.getElementById("fontSizeSelect") as HTMLSelectElement;
    const boldBtn = document.getElementById("boldBtn")!;
    const italicBtn = document.getElementById("italicBtn")!;
    
    if (allSameSize) {
      fontSizeSelect.value = firstCell.getFontSize().toString();
    } else {
      fontSizeSelect.value = "14"; // Default if mixed
    }
    
    if (allSameBold) {
      if (firstCell.getIsBold()) {
        boldBtn.classList.add("active");
      } else {
        boldBtn.classList.remove("active");
      }
    } else {
      boldBtn.classList.remove("active"); // Mixed state
    }
    
    if (allSameItalic) {
      if (firstCell.getIsItalic()) {
        italicBtn.classList.add("active");
      } else {
        italicBtn.classList.remove("active");
      }
    } else {
      italicBtn.classList.remove("active"); // Mixed state
    }
  }
}
