import { Cell } from "../core/cell";
import { SelectionManager } from "../core/Selection";
import { FontSizeCommand } from "../commands/FontSizeCommand";
import { BoldCommand } from "../commands/BoldCommand";
import { ItalicCommand } from "../commands/ItalicCommand";
import { MAX_CELLS_TO_PROCESS, ROWS, COLS } from "./GridConstants";

/**
 * Handles toolbar operations and cell formatting
 */
export class GridToolbar {
  private selMgr: SelectionManager;
  private commandManager: any;
  private cells: Map<number, Map<number, Cell>>;

  constructor(selMgr: SelectionManager, commandManager: any, cells: Map<number, Map<number, Cell>>) {
    this.selMgr = selMgr;
    this.commandManager = commandManager;
    this.cells = cells;
  }

  /**
   * Applies font size to the selected cells
   */
  public applyFontSizeToSelection(newSize: number): void {
    const selectedCells = this.getSelectedCells();
    if (selectedCells.length === 0) return;

    // Create and execute command for each selected cell
    for (const cell of selectedCells) {
      const command = new FontSizeCommand(cell, newSize);
      this.commandManager.execute(command);
    }
  }

  /**
   * Applies bold formatting to the selected cells
   */
  public applyBoldToSelection(isBold: boolean): void {
    const selectedCells = this.getSelectedCells();
    if (selectedCells.length === 0) return;

    // Create and execute command for each selected cell
    for (const cell of selectedCells) {
      const command = new BoldCommand(cell, isBold);
      this.commandManager.execute(command);
    }

    this.updateToolbarState();
  }

  /**
   * Applies italic formatting to the selected cells
   */
  public applyItalicToSelection(isItalic: boolean): void {
    const selectedCells = this.getSelectedCells();
    if (selectedCells.length === 0) return;

    // Create and execute command for each selected cell
    for (const cell of selectedCells) {
      const command = new ItalicCommand(cell, isItalic);
      this.commandManager.execute(command);
    }

    this.updateToolbarState();
  }

  /**
   * Gets the selected cells
   */
  private getSelectedCells(): Cell[] {
    const cells: Cell[] = [];

    // Check for drag selection
    const rect = this.selMgr.getDragRect();
    if (rect) {
      console.log("getSelectedCells drag rect:", rect);
      
      // Limit the number of cells processed to avoid performance issues
      let cellsProcessed = 0;
      
      // Multi-column selection by dragging column headers
      if (
        rect.startRow === 0 &&
        rect.endRow === 0 &&
        rect.startCol !== rect.endCol
      ) {
        for (let c = rect.startCol; c <= rect.endCol && cellsProcessed < MAX_CELLS_TO_PROCESS; c++) {
          for (let r = 0; r < ROWS && cellsProcessed < MAX_CELLS_TO_PROCESS; r++) {
            const cell = this.getCellIfExists(r, c);
            if (cell) {
              cells.push(cell);
              cellsProcessed++;
            }
          }
        }
        return cells;
      }
      // Multi-row selection by dragging row headers
      if (
        rect.startCol === 0 &&
        rect.endCol === 0 &&
        rect.startRow !== rect.endRow
      ) {
        for (let r = rect.startRow; r <= rect.endRow && cellsProcessed < MAX_CELLS_TO_PROCESS; r++) {
          for (let c = 0; c < COLS && cellsProcessed < MAX_CELLS_TO_PROCESS; c++) {
            const cell = this.getCellIfExists(r, c);
            if (cell) {
              cells.push(cell);
              cellsProcessed++;
            }
          }
        }
        return cells;
      }
      // Normal rectangle selection
      for (let r = rect.startRow; r <= rect.endRow && cellsProcessed < MAX_CELLS_TO_PROCESS; r++) {
        for (let c = rect.startCol; c <= rect.endCol && cellsProcessed < MAX_CELLS_TO_PROCESS; c++) {
          const cell = this.getCellIfExists(r, c);
          if (cell) {
            cells.push(cell);
            cellsProcessed++;
          }
        }
      }
      return cells;
    }

    // Check for row selection
    const selectedRow = this.selMgr.getSelectedRow();
    if (selectedRow !== null) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.getCellIfExists(selectedRow, c);
        if (cell) cells.push(cell);
      }
      return cells;
    }

    // Check for column selection
    const selectedCol = this.selMgr.getSelectedCol();
    if (selectedCol !== null) {
      for (let r = 0; r < ROWS; r++) {
        const cell = this.getCellIfExists(r, selectedCol);
        if (cell) cells.push(cell);
      }
      return cells;
    }

    // Check for single cell selection
    const selectedCell = this.selMgr.getSelectedCell();
    if (selectedCell) {
      const cell = this.getCellIfExists(selectedCell.row, selectedCell.col);
      if (cell) cells.push(cell);
      return cells;
    }

    return cells;
  }

  /**
   * Gets a cell if it exists, or null if it doesn't
   */
  private getCellIfExists(row: number, col: number): Cell | null {
    const rowMap = this.cells.get(row);
    if (!rowMap) return null;
    return rowMap.get(col) || null;
  }

  /**
   * Updates the toolbar state based on the selected cells
   */
  public updateToolbarState(): void {
    const selectedCells = this.getSelectedCells();
    if (selectedCells.length === 0) {
      // Reset toolbar to default state
      const fontSizeSelect = document.getElementById(
        "fontSizeSelect"
      ) as HTMLSelectElement;
      const boldBtn = document.getElementById("boldBtn")!;
      const italicBtn = document.getElementById("italicBtn")!;

      fontSizeSelect.value = "14";
      boldBtn.classList.remove("active");
      italicBtn.classList.remove("active");
      return;
    }

    // Check if all selected cells have the same formatting
    const firstCell = selectedCells[0];
    const allSameSize = selectedCells.every(
      (cell) => cell.getFontSize() === firstCell.getFontSize()
    );
    const allSameBold = selectedCells.every(
      (cell) => cell.getIsBold() === firstCell.getIsBold()
    );
    const allSameItalic = selectedCells.every(
      (cell) => cell.getIsItalic() === firstCell.getIsItalic()
    );

    // Update toolbar state
    const fontSizeSelect = document.getElementById(
      "fontSizeSelect"
    ) as HTMLSelectElement;
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