import { Cell } from "../core/cell";
import { evaluateFormula } from "../formulas/FormulaEvaluator";
import { getCoordinates } from "../utils/CellRange";
import { HEADER_SIZE, dpr } from "./GridConstants";
import { EditCellCommand } from "../commands/EditCellCommand";

/**
 * Handles cell editing functionality including input element and formula processing
 */
export class GridEditor {
  private editorInput: HTMLInputElement | null = null;
  private editingCell: { row: number; col: number } | null = null;
  private editingCellInstance: Cell | null = null;
  private container: HTMLElement;
  private rowMgr: any;
  private colMgr: any;
  private rowHeaderWidth: number = 40;
  private commandManager: any;
  private grid: any;

  // Formula-related properties
  private dashOffset: number = 0;
  private formulaRange: { startRow: number; startCol: number; endRow: number; endCol: number } | null = null;
  private animationId: number | null = null;

  constructor(container: HTMLElement, rowMgr: any, colMgr: any, commandManager: any, grid: any) {
    this.container = container;
    this.rowMgr = rowMgr;
    this.colMgr = colMgr;
    this.commandManager = commandManager;
    this.grid = grid;
  }

  /**
   * Starts editing a cell at the specified position
   */
  public startEditingCell(row: number, col: number, cell: Cell): void {
    this.editingCellInstance = cell;

    if (!this.editorInput) this.createEditorInput();
    
    // Check if cell has a formula (either in value or formula property)
    const cellValue = cell.getValue();
    if (cellValue.startsWith("=") || cell.hasFormula()) {
      this.formulaRange = this.extractRangeFromFormula(cellValue);
      this.startMarchingAntsAnimation();
    } else {
      this.formulaRange = null;
      this.stopMarchingAntsAnimation();
    }

    this.editingCell = { row, col };
    
    // Always show the formula if the cell has one, otherwise show the value
    if (cell.hasFormula()) {
      this.editorInput!.value = cell.getFormula();
    } else {
      this.editorInput!.value = cell.getValue();
    }
    
    this.updateEditorPosition();
    this.editorInput!.focus();
  }

  /**
   * Creates the editor input element
   */
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
    this.editorInput.style.paddingLeft = "5px";
    this.editorInput.style.backgroundColor = "transparent !important";
    this.container.appendChild(this.editorInput);

    this.editorInput.addEventListener("blur", () => this.finishEditing(true));
    this.editorInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.finishEditing(true);
      if (e.key === "Escape") this.finishEditing(false);
    });
    
    // Add real-time formula range detection
    this.editorInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;
      
      if (value.startsWith("=")) {
        try {
          this.formulaRange = this.extractRangeFromFormula(value);
          this.startMarchingAntsAnimation();
        } catch (error) {
          // If formula is invalid, clear the range
          this.formulaRange = null;
          this.stopMarchingAntsAnimation();
        }
      } else {
        // Not a formula, clear the range
        this.formulaRange = null;
        this.stopMarchingAntsAnimation();
      }
    });
  }

  /**
   * Extracts range information from a formula string
   */
  private extractRangeFromFormula(formula: string): { startRow: number, startCol: number, endRow: number, endCol: number } | null {
    // Remove the = sign if present
    const cleanFormula = formula.startsWith("=") ? formula.substring(1) : formula;
    
    // Match single cell reference like A1, B5, etc.
    const singleCellMatch = cleanFormula.match(/^([A-Z]+[0-9]+)$/i);
    if (singleCellMatch) {
      const cellRef = singleCellMatch[1];
      const { row, col } = getCoordinates(cellRef);
      return { startRow: row, startCol: col, endRow: row, endCol: col };
    }
    
    // Match function with range like SUM(A1:B5), COUNT(A1:A10), etc.
    const functionMatch = cleanFormula.match(/^\w+\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)$/i);
    if (functionMatch) {
      const [, start, end] = functionMatch;
      const { row: startRow, col: startCol } = getCoordinates(start);
      const { row: endRow, col: endCol } = getCoordinates(end);
      return { startRow, startCol, endRow, endCol };
    }
    
    // If no valid pattern found, return null
    return null;
  }

  /**
   * Updates the position of the editor input element
   */
  public updateEditorPosition(): void {
    if (!this.editingCell || !this.editorInput) return;

    const { row, col } = this.editingCell;
    const scrollX = this.container.scrollLeft;
    const scrollY = this.container.scrollTop;

    const left = this.rowHeaderWidth + this.colMgr.getX(col) - scrollX;
    const top = HEADER_SIZE + this.rowMgr.getY(row) - scrollY;

    Object.assign(this.editorInput.style, {
      left: `${left + 3}px`,
      top: `${top + 112}px`,
      width: `${this.colMgr.getWidth(col) - 6}px`,
      height: `${this.rowMgr.getHeight(row) - 9}px`,
      zIndex: "8",
      display: "block",
    } as CSSStyleDeclaration);
  }

  /**
   * Finishes editing the current cell
   */
  public finishEditing(commit: boolean): void {
    if (!this.editorInput || !this.editingCell || !this.editingCellInstance)
      return;

    const cell = this.editingCellInstance;
    const oldValue = cell.getValue();
    const newValue = this.editorInput.value;

    if (commit && newValue !== oldValue) {
      // Check if the new value is a formula
      if (Cell.isFormula(newValue)) {
        // Store the formula and evaluate it
        cell.setFormula(newValue);
        try {
          const result = this.evaluateCellFormula(cell);
          cell.setValue(result);
        } catch (error) {
          cell.setValue("#ERROR");
          console.error("Formula error:", error);
        }
      } else {
        // Regular value - remove any existing formula
        cell.removeFormula();
        cell.setValue(newValue);
      }
      this.formulaRange = null;
      this.stopMarchingAntsAnimation();
      
      // Execute command if command manager is provided
      if (this.commandManager) {
        const command = new EditCellCommand(this.grid, cell, oldValue, cell.getValue());
        this.commandManager.execute(command);
      }
    } else {
      // Even if not committing, stop animation when editing ends
      this.formulaRange = null;
      this.stopMarchingAntsAnimation();
    }

    this.editorInput.style.display = "none";
    this.editingCell = null;
    this.editingCellInstance = null;
  }

  /**
   * Evaluates a formula for a given cell
   */
  private evaluateCellFormula(cell: Cell): string {
    const formula = cell.getFormula();
    if (!formula || !Cell.isFormula(formula)) {
      return cell.getValue();
    }

    // Extract the formula part (remove the = sign)
    const formulaText = formula.substring(1);

    try {
      return evaluateFormula(formulaText, this.grid);
    } catch (error) {
      console.error("Formula evaluation error:", error);
      return "#ERROR";
    }
  }

  /**
   * Starts the marching ants animation for formula range highlighting
   */
  private startMarchingAntsAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    const animate = () => {
      this.dashOffset += 1;
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Stops the marching ants animation
   */
  private stopMarchingAntsAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Gets the current formula range
   */
  public getFormulaRange(): { startRow: number; startCol: number; endRow: number; endCol: number } | null {
    return this.formulaRange;
  }

  /**
   * Gets the current dash offset for marching ants
   */
  public getDashOffset(): number {
    return this.dashOffset;
  }

  /**
   * Checks if a cell is currently being edited
   */
  public isEditing(): boolean {
    return this.editingCell !== null;
  }

  /**
   * Gets the currently editing cell
   */
  public getEditingCell(): { row: number; col: number } | null {
    return this.editingCell;
  }

  /**
   * Sets the row header width
   */
  public setRowHeaderWidth(width: number): void {
    this.rowHeaderWidth = width;
  }

  /**
   * Cleanup method to stop animations and clear resources
   */
  public destroy(): void {
    this.stopMarchingAntsAnimation();
    if (this.editorInput) {
      this.editorInput.remove();
      this.editorInput = null;
    }
  }
} 