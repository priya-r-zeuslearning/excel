import type { EventHandler } from "../EventHandler";
import { Grid } from "../../core/grid";

export class CellSelectHandler implements EventHandler {
  private grid: Grid;
  private dragStart: { row: number; col: number } | null = null;
  private dragStartMouse: { x: number; y: number } | null = null;
  private isDragging: boolean = false;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  hitTest(x: number, y: number): boolean {
    const HEADER_SIZE = 40;
    if (x >= HEADER_SIZE && y >= HEADER_SIZE) {
      const { row } = this.grid["findRowByOffset"](y - HEADER_SIZE);
      const { col } = this.grid["findColumnByOffset"](x - HEADER_SIZE);
      return true;
    }
    return false;
  }

  onPointerDown(evt: MouseEvent): void {
    const { x, y } = this.grid["getMousePos"](evt);
    if (this.grid["editorInput"] && this.grid["editingCell"]) {
      this.grid["finishEditing"](true);
    }
    const { row } = this.grid["findRowByOffset"](y - 40);
    const { col } = this.grid["findColumnByOffset"](x - 40);
    this.grid["selMgr"].clearSelectedRows();
    this.grid["selMgr"].clearSelectedColumns();
    this.grid["selMgr"].selectCell(row, col);
    this.grid["scheduleRender"]();
    this.grid["isMouseDown"] = true;
    this.grid["isColHeaderDrag"] = false;
    this.grid["isRowHeaderDrag"] = false;
    this.grid["dragStartCell"] = { row, col };
    this.dragStart = { row, col };
    this.dragStartMouse = { x: evt.clientX, y: evt.clientY };
    this.grid["pendingEditCell"] = { row, col };
  }

  onPointerMove(evt: MouseEvent): void {
    this.grid["canvas"].style.cursor = "cell";
  }

  onPointerDrag(evt: MouseEvent): void {
    const HEADER_SIZE = 40;
    const { x, y } = this.grid["getMousePos"](evt);
    if (
      this.grid["isMouseDown"] &&
      this.grid["dragStartCell"] &&
      !this.grid["isColHeaderDrag"] &&
      !this.grid["isRowHeaderDrag"] &&
      x >= HEADER_SIZE &&
      y >= HEADER_SIZE
    ) {
      // Use getMousePos for threshold calculation
      if (!this.grid["selMgr"].isDragging() && this.dragStartMouse) {
        const dx = Math.abs(x - (this.dragStartMouse.x - this.grid["canvas"].getBoundingClientRect().left));
        const dy = Math.abs(y - (this.dragStartMouse.y - this.grid["canvas"].getBoundingClientRect().top));
        if (dx > 2 || dy > 2) {
          this.grid["selMgr"].startDrag(this.grid["dragStartCell"].row, this.grid["dragStartCell"].col);
        }
      }
      if (this.grid["selMgr"].isDragging()) {
        const { col } = this.grid["findColumnByOffset"](x - HEADER_SIZE);
        const { row } = this.grid["findRowByOffset"](y - HEADER_SIZE);
        this.grid["selMgr"].updateDrag(row, col);
        // this.grid["pendingEditCell"] = { row, col };
        if (typeof this.grid["scrollToCell"] === "function") {
          this.grid["scrollToCell"](row, col);
        }
        if (typeof this.grid["scheduleRender"] === "function") {
          this.grid["scheduleRender"]();
        }
      }
    }
  }

  onPointerUp(evt: MouseEvent): void {
    this.grid["isMouseDown"] = false;
    this.grid["dragStartCell"] = null;
    this.dragStart = null;
    this.dragStartMouse = null;
    // this.grid["pendingEditCell"] = null;
    if (this.grid["selMgr"].isDragging()) {
      this.grid["selMgr"].endDrag();
      if (typeof this.grid["scheduleRender"] === "function") {
        this.grid["scheduleRender"]();
      }
      if (typeof this.grid["computeSelectionStats"] === "function") {
        this.grid["computeSelectionStats"]();
      }
      if (typeof this.grid["updateToolbarState"] === "function") {
        this.grid["updateToolbarState"]();
      }
    }
  }
}
