import { RowManager } from "./RowManager";
import { ColumnManager } from "./ColumnManager";
import { ROWS, COLS } from "./grid";

/**
 * Interface for the drag rectangle
 */
export interface DragRect {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}


/**
 * Centralises **all** selection‑related state (active cell, full row/col, drag rectangle)
 * so that `Grid` doesn't need to know internal details.
 */
export class SelectionManager {
  private selectedCell: { row: number; col: number } | null = null;
  
  private selectedColumns: number[] = []; // Array to track selected columns
  private selectedRows: number[] = []; // Array to track selected rows

  private dragStart: { row: number | null; col: number } | null = null;
  private dragEnd: { row: number | null; col: number|null } | null = null;
  private dragging = false;
  private dragRect: DragRect | null = null; // Store the final drag rectangle
 
  private dragRange: { startRow: number | null; endRow: number ; startCol: number | null; endCol: number | null; } | null = null;
  private wasHeaderDrag: boolean = false; // Track if the current drag was a header drag
  /**
   * Clears all selection and drag state.
   */
  public clear(): void {
    this.selectedCell = null;

    this.selectedColumns = [];
    this.dragStart = null;
    this.dragEnd = null;
    this.dragging = false;
    this.dragRect = null;
    this.selectedRows = [];
    this.wasHeaderDrag = false;
  }

  /**
   * Clears all selection and drag state.
   */
  public clearSelection(): void {
    this.clear();
  }
  /**
   * Checks if the selection is dragging.
   * @returns true if the selection is dragging, false otherwise
   */
  public isDragging(): boolean {
    return this.dragging;
  }
  /**
   * Checks if the selection is dragging a header.
   * @returns true if the selection is dragging a header, false otherwise
   */
  public isDraggingHeader(): boolean {
    return this.wasHeaderDrag;
  }
  /**
   * Selects all cells in the grid.
   */
public selectAll(): void {
  this.clear();
  // Limit select all to a reasonable range to avoid performance issues
  // Select first 1000 rows and 1000 columns instead of the entire grid
  const maxSelectRows = Math.min(1000, ROWS);
  const maxSelectCols = Math.min(1000, COLS);
 
  this.dragRect = {
    startRow: 0,
    endRow: maxSelectRows - 1,
    startCol: 0,
    endCol: maxSelectCols - 1,
  };
}

/**
 * Selects only cells that contain data (more efficient than selectAll)
 * This should be called from the Grid class which has access to the cells data
 */
public selectAllWithData(grid: any): void {
  this.clear();
  
  // Find the bounds of cells that actually contain data
  let minRow = ROWS - 1;
  let maxRow = 0;
  let minCol = COLS - 1;
  let maxCol = 0;
  let hasData = false;
  
  for (const [row, rowMap] of grid.cells.entries()) {
    if (rowMap.size > 0) {
      hasData = true;
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      
      for (const [col] of rowMap.entries()) {
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
      }
    }
  }
  
  if (hasData) {
    this.dragRect = {
      startRow: minRow,
      endRow: maxRow,
      startCol: minCol,
      endCol: maxCol,
    };
  } else {
    // If no data, select a small default range
    this.dragRect = {
      startRow: 0,
      endRow: 9,
      startCol: 0,
      endCol: 9,
    };
  }
}

/**
 * Selects the entire grid (use with caution - may cause performance issues)
 * This method should only be used when absolutely necessary
 */
public selectEntireGrid(): void {
  this.clear();
  this.dragRect = {
    startRow: 0,
    endRow: ROWS - 1,
    startCol: 0,
    endCol: COLS - 1,
  };
  
  // Show a warning in the console
  console.warn("Entire grid selected - this may cause performance issues with large grids");
}

  /**
   * Selects a cell.
   * @param row the row of the cell
   * @param col the column of the cell
   */
  public selectCell(row: number, col: number): void {
    this.clear();
    this.selectedCell = { row, col };
  }

  /**
   * Selects a range of columns.
   * @param startCol the start column of the range
   * @param endCol the end column of the range
   */
  selectColumns(startCol: number, endCol: number): void {
    this.selectedCell = null;

    this.selectedColumns = [];
    this.selectedRows = [];
    for (let c = startCol; c <= endCol; c++) {
      this.selectedColumns.push(c);
    }
  }
  /**
   * Selects a range of rows.
   * @param startRow the start row of the range
   * @param endRow the end row of the range
   */
  selectRows(startRow: number, endRow: number): void {
    this.selectedCell = null;
    this.selectedColumns = [];
    this.selectedRows = [];
    for (let r = startRow; r <= endRow; r++) {
      this.selectedRows.push(r);
    }
  }
  /**
   * Selects a column.
   * @param col the column to select
   */
  public selectColumn(col: number): void {
    this.clear();
    this.selectedColumns = [col];
  }

  /**
   * Selects a row.
   * @param row the row to select
   */
public selectRow(row: number): void {
  this.clear();
  this.selectedRows = [row];
}
  /**
   * Starts a drag operation.
   * @param row the row of the drag start
   * @param col the column of the drag start
   */
  public startDrag(row: number | null, col: number): void {
    this.clear();
    this.dragging = true;
    this.dragStart = { row, col };
    this.dragEnd = { row, col };

 
  }

  /**
   * Updates the drag operation.
   * @param row the row of the drag end
   * @param col the column of the drag end
   */
  public updateDrag(row: number | null, col: number | null): void {
    if (!this.dragging || !this.dragStart) return;
    this.dragEnd = { row, col };

 
  }

  /**
   * Ends a drag operation.
   */
  public endDrag(): void {
    this.dragging = false;
    // Keep the drag rectangle for header highlighting
    if (this.dragStart && this.dragEnd) {
      const startRow = this.dragStart.row ;
      const endRow = this.dragEnd.row;
      const startCol = this.dragStart.col;
      const endCol = this.dragEnd.col;

      this.dragRect = {
        startRow: Math.min(startRow!, endRow!),
        endRow: Math.max(startRow!, endRow!),
        startCol: Math.min(startCol!, endCol!),
        endCol: Math.max(startCol!, endCol!),
      };
    }

    // Reset the header drag flag when drag ends
    this.wasHeaderDrag = false;
  }

  /**
   * Gets the selected cell.
   * @returns the selected cell
   */
  public getSelectedCell() {
    return this.selectedCell;
  }

  /**
   * Gets the selected row.
   * @returns the selected row
   */
  public getSelectedRow() {
    return this.selectedRows.length > 0 ? this.selectedRows[0] : null;
  }

  /**
   * Gets the selected column.
   * @returns the selected column
   */
  public getSelectedCol() {
    return this.selectedColumns.length > 0 ? this.selectedColumns[0] : null;
  }

  /**
   * Gets the drag rectangle.
   * @returns the drag rectangle
   */
  public getDragRect(): DragRect | null {
    // Return the stored drag rectangle if not currently dragging
    if (!this.dragging && this.dragRect) {
      return this.dragRect;
    }
  
    // Return current drag rectangle if dragging
    if (!this.dragStart || !this.dragEnd) return null;
    
    const startRow = this.dragStart.row ?? 0;
    const endRow = this.dragEnd.row ?? 0;
    const startCol = this.dragStart.col ?? 0;
    const endCol = this.dragEnd.col ?? 0;
    
    return {
      startRow: Math.min(startRow, endRow),
      endRow: Math.max(startRow, endRow),
      startCol: Math.min(startCol, endCol),
      endCol: Math.max(startCol, endCol),
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
    if (this.selectedColumns.length === 1) {
      const col = this.selectedColumns[0];
      const x = rowHeaderWidth + colMgr.getX(col) - scrollX;
      const w = colMgr.getWidth(col);
      const y = 0;
      const h = rowMgr.getTotalHeight() + HEADER_SIZE;
      ctx.save();
      ctx.strokeStyle = "#107C41";
      ctx.fillStyle = "#107C4110";
      ctx.fillRect(x + 0.5, y, w - 1, h);
      ctx.lineWidth = 1/ window.devicePixelRatio;
      ctx.strokeRect(x + 0.5, y, w - 1, h);
      ctx.restore();
    }

    // Highlight selected columns from the array (same styling as single column)
    //for whole column selection
    if (this.selectedColumns.length > 0) {
      // Draw a single rectangle covering the whole selected columns area
      const leftCol = Math.min(...this.selectedColumns);
      const rightCol = Math.max(...this.selectedColumns);
      const x = rowHeaderWidth + colMgr.getX(leftCol) - scrollX;
      const y = 0;
      const w = colMgr.getX(rightCol) + colMgr.getWidth(rightCol) - colMgr.getX(leftCol);
      const h = rowMgr.getTotalHeight() + HEADER_SIZE;
      ctx.save();
      ctx.strokeStyle = "#107C41";
      ctx.fillStyle = "#107C4110";
      ctx.fillRect(x + 0.5, y, w - 1, h);
      ctx.lineWidth = 1 / window.devicePixelRatio;
      ctx.strokeRect(x + 0.5, y, w - 1, h);
      ctx.restore();
    }
    //for whole row selection
    if (this.selectedRows.length > 0) {
      const leftRow = Math.min(...this.selectedRows);
      const rightRow = Math.max(...this.selectedRows);
      const x = 0;
      const y = HEADER_SIZE + rowMgr.getY(leftRow) - scrollY;
      const w = colMgr.getTotalWidth();
      const h = rowMgr.getY(rightRow) - rowMgr.getY(leftRow) + rowMgr.getHeight(rightRow);
      ctx.save();
      ctx.strokeStyle = "#107C41";
      ctx.fillStyle = "#107C4110";
      ctx.fillRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.lineWidth = 1 / window.devicePixelRatio;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.restore();
    }
    // Highlight entire row (border only, full width)
    if (this.selectedRows.length === 1) {
      const row = this.selectedRows[0];
      const x = rowHeaderWidth ;
      const y = HEADER_SIZE + rowMgr.getY(row) - scrollY;
      const w = colMgr.getTotalWidth();
      const h = rowMgr.getHeight(row);
      ctx.save();
      ctx.strokeStyle = "#107C41";
      ctx.fillStyle = "#107C4110";
      ctx.fillRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.lineWidth = 1/window.devicePixelRatio;
      ctx.strokeRect(x+0.5, y + .5, w +0.5, h - 0.5);
      ctx.restore();
    }
 
    // Drag rectangle (range selection, with fill and border)
    const rect = this.getDragRect();

    if (rect) {
   
      // Normal rectangle selection
    
      if ((!this.selectedColumns.includes(rect.startCol) && !this.selectedColumns.includes(rect.endCol)) && (!this.selectedRows.includes(rect.startRow) && !this.selectedRows.includes(rect.endRow))) {
        let x1 = rowHeaderWidth + colMgr.getX(rect.startCol) - scrollX;
        let y1 = HEADER_SIZE + rowMgr.getY(rect.startRow) - scrollY;
        let x2 = rowHeaderWidth + colMgr.getX(rect.endCol) - scrollX + colMgr.getWidth(rect.endCol);
        let y2 = HEADER_SIZE + rowMgr.getY(rect.endRow) - scrollY + rowMgr.getHeight(rect.endRow);
        // Clamp to HEADER_SIZE so selection never goes into header
        x1 = Math.max(x1, rowHeaderWidth);
        y1 = Math.max(y1, HEADER_SIZE);
      
        ctx.save();
        ctx.fillStyle = "#107C4110";
        ctx.fillRect(x1 + 0.5, y1 + 0.5, x2 - x1 - 1, y2 - y1 - 1);
        ctx.strokeStyle = "#107C41";
        ctx.lineWidth = 2 / window.devicePixelRatio;
        ctx.strokeRect(x1 - 0.5, y1 - 0.5, x2 - x1 + 2, y2 - y1 + 2);
        ctx.restore();
    
      }

    }
    // Selected cell border only (Excel style, no fill)
    if (this.selectedCell) {
      const { row, col } = this.selectedCell;
      const x = rowHeaderWidth + colMgr.getX(col) - scrollX ;
      const y = HEADER_SIZE + rowMgr.getY(row) - scrollY ;
      const w = colMgr.getWidth(col) ;
      const h = rowMgr.getHeight(row) ;
      ctx.save();
      ctx.strokeStyle = "#107C41"; //checked
      ctx.lineWidth = 2 / window.devicePixelRatio;
 
      ctx.strokeRect(x-0.5 , y-0.5 , w + 2, h + 2);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Gets the array of selected columns.
   * @returns array of selected column indices
   */
  public getSelectedColumns(): number[] {
    return [...this.selectedColumns];
    
  }
  /**
   * Gets the array of selected rows.
   * @returns array of selected row indices
   */
  public getSelectedRows(): number[] {
    return [...this.selectedRows];
  }


  /**
   * Adds a column to the selected columns array.
   * @param col the column index to add
   */
  public addSelectedColumn(col: number): void {
    if (!this.selectedColumns.includes(col)) {
      this.selectedColumns.push(col);
    }
  }
  /**
   * Adds a row to the selected rows array.
   * @param row the row index to add
   */
  public addSelectedRow(row: number): void {
    if (!this.selectedRows.includes(row)) {
      this.selectedRows.push(row);
    }
  }
  /**
   * Removes a row from the selected rows array.
   * @param row the row index to remove
   */
  public removeSelectedRow(row: number): void {
    const index = this.selectedRows.indexOf(row);
    if (index > -1) {
      this.selectedRows.splice(index, 1);
    }
  }
  /**
   * Removes a column from the selected columns array.
   * @param col the column index to remove
   */
  public removeSelectedColumn(col: number): void {
    const index = this.selectedColumns.indexOf(col);
    if (index > -1) {
      this.selectedColumns.splice(index, 1);
    }
  }

  /**
   * Sets the selected columns array.
   * @param columns array of column indices to select
   */
  public setSelectedColumns(columns: number[]): void {
    this.selectedColumns = [...columns];
  }
  /**
   * Sets the selected rows array.
   * @param rows array of row indices to select
   */
  public setSelectedRows(rows: number[]): void {
    this.selectedRows = [...rows];
  }
  /**
   * Clears the selected rows array.
   */
  public clearSelectedRows(): void {
    this.selectedRows = [];
  }
  /**
   * Clears the selected columns array.
   */
  public clearSelectedColumns(): void {
    this.selectedColumns = [];
  }
}