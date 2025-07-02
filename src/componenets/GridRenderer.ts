import { Cell } from "../core/cell";
import { RowManager } from "../core/RowManager";
import { ColumnManager } from "../core/ColumnManager";
import { SelectionManager } from "../core/Selection";
import { HEADER_SIZE, RENDER_BUFFER_PX, dpr, ROWS, COLS } from "./GridConstants";

/**
 * Handles all rendering operations for the grid
 */
export class GridRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly rowMgr: RowManager;
  private readonly colMgr: ColumnManager;
  private readonly selMgr: SelectionManager;
  private readonly container: HTMLElement;
  private rowHeaderWidth: number = 40;

  constructor(
    canvas: HTMLCanvasElement,
    rowMgr: RowManager,
    colMgr: ColumnManager,
    selMgr: SelectionManager,
    container: HTMLElement
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.rowMgr = rowMgr;
    this.colMgr = colMgr;
    this.selMgr = selMgr;
    this.container = container;
  }

  /**
   * Resizes the canvas to match the container's client width and height.
   */
  public resizeCanvas(): void {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
  }

  /**
   * Gets the visible range of the grid.
   */
  public getVisibleRange(): {
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

  /**
   * Renders the grid.
   */
  public render(
    cells: Map<number, Map<number, Cell>>,
    formulaRange: { startRow: number; startCol: number; endRow: number; endCol: number } | null,
    searchResults: { row: number; col: number; value: string }[],
    dashOffset: number
  ): void {
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
    
    // Draw marching ants for formula range if active
    if (formulaRange) {
      this.drawMarchingAnts(formulaRange.startRow, formulaRange.startCol, formulaRange.endRow, formulaRange.endCol, dashOffset);
    }
    
    // Draw cells (only grid lines, not filled rectangles)
    let yPos = HEADER_SIZE + this.rowMgr.getY(firstRow) - scrollY;
    for (let r = firstRow; r <= lastRow; r++) {
      const rowH = this.rowMgr.getHeight(r);
      let xPos = this.rowHeaderWidth + this.colMgr.getX(firstCol) - scrollX;
      const rowMap = cells.get(r);
      for (let c = firstCol; c <= lastCol; c++) {
        const colW = this.colMgr.getWidth(c);
        
        // Draw search highlight if this cell is a search result
        if (this.isSearchResult(r, c, searchResults)) {
          this.ctx.fillStyle = "rgba(34, 168, 0, 0.12)";
          this.ctx.fillRect(xPos, yPos, colW, rowH);
        }
        
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
        
        const cellValue = rowMap?.get(c)?.getValue() || "";
        const isNumeric = this.isNumericValue(cellValue);
        
        // Set text alignment based on content type
        if (isNumeric) {
          this.ctx.textAlign = "right";
        } else {
          this.ctx.textAlign = "left";
        }
        
        this.ctx.textBaseline = "middle";
        const clipped = this.clipText(cellValue, colW - 16);
        
        // Calculate x position based on alignment
        let textX: number;
        if (isNumeric) {
          textX = xPos + colW - 8; // Right-aligned with 8px padding from right edge
        } else {
          textX = xPos + 8; // Left-aligned with 8px padding from left edge
        }
        
        this.ctx.fillText(clipped, textX, yPos + rowH - 10);
        xPos += colW;
      }
      yPos += rowH;
    }
    
    // Draw vertical grid lines
    let gridX = this.rowHeaderWidth + this.colMgr.getX(firstCol) - scrollX;
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
      this.rowHeaderWidth,
      scrollX,
      scrollY
    );
    
    // Draw headers LAST so they are on top
    let x = this.rowHeaderWidth + this.colMgr.getX(firstCol) - scrollX;
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
  }

  public drawMarchingAnts(startRow: number, startCol: number, endRow: number, endCol: number, dashOffset: number): void {
    const x1 = this.rowHeaderWidth + this.colMgr.getX(startCol) - this.container.scrollLeft;
    const y1 = HEADER_SIZE + this.rowMgr.getY(startRow) - this.container.scrollTop;
    const x2 = this.rowHeaderWidth + this.colMgr.getX(endCol) + this.colMgr.getWidth(endCol) - this.container.scrollLeft;
    const y2 = HEADER_SIZE + this.rowMgr.getY(endRow) + this.rowMgr.getHeight(endRow) - this.container.scrollTop;
  
    this.ctx.save();
    this.ctx.setLineDash([4, 2]); // Dash pattern
    this.ctx.lineDashOffset = dashOffset;
    this.ctx.strokeStyle = "#217346";
    this.ctx.lineWidth = 3/dpr;
    this.ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    this.ctx.restore();
  }

  private isSearchResult(row: number, col: number, searchResults: { row: number; col: number; value: string }[]): boolean {
    return searchResults.some(result => result.row === row && result.col === col);
  }

  /**
   * Clips text to a maximum width.
   */
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

  /**
   * Checks if a cell value contains only digits, decimals, or percentages.
   * @param value the cell value to check
   * @returns true if the value contains only digits, decimals, or percentages, false otherwise
   */
  private isNumericValue(value: string): boolean {
    const cleanValue = value.trim();
    return /^\d+$|^\d+\.\d+$|^\d+%$/.test(cleanValue);
  }

  /**
   * Draws a header.
   */
  private drawHeader(
    index: number,
    isColumn: boolean,
    pos: number,
    size: number
  ): void {
    const ctx = this.ctx;
    const label = isColumn ? this.columnName(index) : (index + 1).toString();

    const x = isColumn ? pos : 0;
    const y = isColumn ? 0 : pos;
    let w = isColumn ? size : this.rowHeaderWidth;
    const h = isColumn ? HEADER_SIZE : size;
    ctx.font = "14px Calibri, 'Segoe UI', sans-serif";

    // Dynamically adjust row header width for large row numbers
    if (!isColumn) {
      const rowLabel = (index + 1).toString();
      const textWidth = ctx.measureText(rowLabel).width;
      const padding = 16;
      w = Math.max(this.rowHeaderWidth, textWidth + padding);
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
    if (
      selectedCell &&
      ((isColumn && selectedCell.col === index) ||
        (!isColumn && selectedCell.row === index))
    ) {
      highlight = true;
    }
    if (
      (isColumn && selectedCol === index) ||
      (!isColumn && selectedRow === index)
    ) {
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
    this.ctx.fillStyle = "#f3f6fb";
    this.ctx.fillRect(0, 0, this.rowHeaderWidth, HEADER_SIZE);
    this.ctx.strokeStyle = "#d4d4d4";
    this.ctx.lineWidth = 1 / dpr;
    this.ctx.strokeRect(0, 0, this.rowHeaderWidth, HEADER_SIZE);

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
    ctx.lineWidth = highlight ? 2 / dpr : 1 / dpr;
    ctx.beginPath();

    if (isColumn) {
      ctx.moveTo(x, y + h - 0.5);
      ctx.lineTo(x + w, y + h - 0.5);
      if (!highlight) {
        ctx.moveTo(x + 0.5, y);
        ctx.lineTo(x, y + h);
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

    ctx.textBaseline = "middle";

    if (isColumn) {
      ctx.textAlign = "center";
      ctx.fillText(label, x + w / 2, y + h / 2);
    } else {
      ctx.textAlign = "right";
      ctx.fillText(label, x + w - 4, y + h / 2);
    }
    
    if (dragRect) {
      const inRange = isColumn
        ? index >= dragRect.startCol && index <= dragRect.endCol
        : index >= dragRect.startRow && index <= dragRect.endRow;
      if (inRange) {
        ctx.fillStyle = "#107C41";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#fff"
        if (isColumn) {
          ctx.textAlign = "center";
          ctx.fillText(label, x + w / 2, y + h / 2);
        } else {
          ctx.textAlign = "right";
          ctx.fillText(label, x + w - 4, y + h / 2);
        }
      }
    }
    ctx.textBaseline = "middle";
  }

  /**
   * Gets the name of a column.
   */
  private columnName(idx: number): string {
    let name = "";
    let n = idx;
    do {
      name = String.fromCharCode(65 + (n % 26)) + name;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return name;
  }

  public setRowHeaderWidth(width: number): void {
    this.rowHeaderWidth = width;
  }

  public getRowHeaderWidth(): number {
    return this.rowHeaderWidth;
  }
} 