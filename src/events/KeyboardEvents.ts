export class KeyboardEventHandler {
  private grid: import('../core/grid').Grid;
  constructor(grid: import('../core/grid').Grid) {
    this.grid = grid;
  }

  onKeyDown(e: KeyboardEvent) {
    // Prevent grid key handling if an input, textarea, or contenteditable is focused
    const target = e.target as HTMLElement;
    if (target && (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.getAttribute("contenteditable") === "true"
    )) {
      return;
    }
    // Only handle navigation if not editing a cell
    if (e.ctrlKey && e.key === "c") {
      const selectedCells = this.grid['getSelectedCells']();
      if (selectedCells.length > 0) {
        const minRow = Math.min(...selectedCells.map((cell: any) => cell.row));
        const minCol = Math.min(...selectedCells.map((cell: any) => cell.col));
        const maxRow = Math.max(...selectedCells.map((cell: any) => cell.row));
        const maxCol = Math.max(...selectedCells.map((cell: any) => cell.col));
        this.grid['drawMarchingAnts'](minRow, minCol, maxRow, maxCol);
        this.grid['startMarchingAntsAnimation']();
        const clipboardData: string[][] = [];
        for (let r = minRow; r <= maxRow; r++) {
          const row: string[] = [];
          for (let c = minCol; c <= maxCol; c++) {
            const cell = this.grid['getCellIfExists'](r, c);
            row.push(cell ? cell.getValue() : "");
          }
          clipboardData.push(row);
        }
        this.grid['clipboard'] = clipboardData;
        this.grid['formulaRange'] = { startRow: minRow, startCol: minCol, endRow: maxRow, endCol: maxCol };
      }
      return;
    }
    if (e.ctrlKey && e.key === "v") {
      const selectedCell = this.grid['selMgr'].getSelectedCell();
      if (!selectedCell || !this.grid['clipboard']) return;
      const { row, col } = selectedCell;
      const clipboardManager = new (window as any).ClipboardManager();
      clipboardManager.setData(this.grid['clipboard']);
      const command = new (window as any).PasteCommand(row, col, this.grid, clipboardManager);
      this.grid['commandManager'].execute(command);
      this.grid['stopMarchingAntsAnimation']();
      this.grid['formulaRange'] = null;
      this.grid['scheduleRender']();
      return;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      const selected = this.grid['selMgr'].getSelectedCell();
      if (!selected) return;
      const { row, col } = selected;
      let targetRow = row;
      if (e.key === "ArrowDown") {
        for (let r = row + 1; r < (window as any).ROWS; r++) {
          if (this.grid['getCellValueIfExists'](r, col) !== "") {
            targetRow = r;
            break;
          }
        }
        if (targetRow === row) targetRow = (window as any).ROWS - 1;
      } else if (e.key === "ArrowUp") {
        for (let r = row - 1; r >= 0; r--) {
          if (this.grid['getCellValueIfExists'](r, col) !== "") {
            targetRow = r;
            break;
          }
        }
        if (targetRow === row) targetRow = 0;
      }
      this.grid['selMgr'].clearSelection();
      this.grid['selMgr'].selectCell(targetRow, col);
      this.grid['scrollToCell'](targetRow, col);
      this.grid['scheduleRender']();
      return;
    }
    if (this.grid['editingCell']) return;
    // For row selection
    const selectedRow = this.grid['selMgr'].getSelectedRow();
    if (typeof selectedRow === "number") {
      if (e.shiftKey) {
        if (this.grid['rowSelectionAnchor'] === null) {
          const selRows = this.grid['selMgr'].getSelectedRows();
          this.grid['rowSelectionAnchor'] = selRows.length > 0 ? selRows[0] : selectedRow;
        }
        if (this.grid['rowSelectionFocus'] === null) {
          const selRows = this.grid['selMgr'].getSelectedRows();
          this.grid['rowSelectionFocus'] = selRows.length > 0 ? selRows[selRows.length - 1] : selectedRow;
        }
        let anchor = this.grid['rowSelectionAnchor'];
        this.grid['pendingEditCell'] = { row: this.grid['rowSelectionAnchor'], col: 0 };
        let focus = this.grid['rowSelectionFocus'];
        if (e.key === "ArrowDown" && focus < (window as any).ROWS - 1) {
          focus = focus + 1;
        } else if (e.key === "ArrowUp" && focus > 0) {
          focus = focus - 1;
        }
        this.grid['rowSelectionFocus'] = focus;
        const startRow = Math.min(anchor, focus);
        const endRow = Math.max(anchor, focus);
        const newRows: number[] = [];
        for (let r = startRow; r <= endRow; r++) newRows.push(r);
        this.grid['selMgr'].setSelectedRows(newRows);
        this.grid['scrollToCell'](focus, 0);
        this.grid['scheduleRender']();
        this.grid['computeSelectionStats']();
        this.grid['updateToolbarState']();
        return;
      }
    }
    // For column selection
    const selectedCol = this.grid['selMgr'].getSelectedCol();
    if (typeof selectedCol === "number") {
      if (e.shiftKey) {
        if (this.grid['columnSelectionAnchor'] === null) {
          const selCols = this.grid['selMgr'].getSelectedColumns();
          this.grid['columnSelectionAnchor'] = selCols.length > 0 ? selCols[0] : selectedCol;
        }
        if (this.grid['columnSelectionFocus'] === null) {
          const selCols = this.grid['selMgr'].getSelectedColumns();
          this.grid['columnSelectionFocus'] = selCols.length > 0 ? selCols[selCols.length - 1] : selectedCol;
        }
        let anchor = this.grid['columnSelectionAnchor'];
        this.grid['pendingEditCell'] = { row: 0, col: this.grid['columnSelectionAnchor'] };
        let focus = this.grid['columnSelectionFocus'];
        if (e.key === "ArrowRight" && focus < (window as any).COLS - 1) {
          focus = focus + 1;
        } else if (e.key === "ArrowLeft" && focus > 0) {
          focus = focus - 1;
        }
        this.grid['columnSelectionFocus'] = focus;
        const startCol = Math.min(anchor, focus);
        const endCol = Math.max(anchor, focus);
        const newCols: number[] = [];
        for (let c = startCol; c <= endCol; c++) newCols.push(c);
        this.grid['selMgr'].setSelectedColumns(newCols);
        this.grid['scrollToCell'](0, focus);
        this.grid['scheduleRender']();
        this.grid['computeSelectionStats']();
        this.grid['updateToolbarState']();
        return;
      }
    } else {
      this.grid['columnSelectionAnchor'] = null;
      this.grid['columnSelectionFocus'] = null;
      this.grid['rowSelectionAnchor'] = null;
      this.grid['rowSelectionFocus'] = null;
    }
    if (
      e.key === "ArrowRight" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowUp"
    ) {
      e.preventDefault();
      const selected = this.grid['selMgr'].getSelectedCell();
      let anchorRow: number, anchorCol: number;
      if (this.grid['selMgr'].isDragging() && this.grid['selMgr']['dragStart']) {
        anchorRow = this.grid['selMgr']['dragStart'].row!;
        anchorCol = this.grid['selMgr']['dragStart'].col!;
      } else if (selected) {
        anchorRow = selected.row;
        anchorCol = selected.col;
      } else {
        return;
      }
      if (typeof anchorRow !== "number" && selected) anchorRow = selected.row;
      if (typeof anchorCol !== "number" && selected) anchorCol = selected.col;
      let focusRow =
        this.grid['selMgr'].isDragging() &&
          this.grid['selMgr']['dragEnd'] &&
          typeof this.grid['selMgr']['dragEnd'].row === "number"
          ? this.grid['selMgr']['dragEnd'].row
          : anchorRow;
      let focusCol =
        this.grid['selMgr'].isDragging() &&
          this.grid['selMgr']['dragEnd'] &&
          typeof this.grid['selMgr']['dragEnd'].col === "number"
          ? this.grid['selMgr']['dragEnd'].col
          : anchorCol;
      if (typeof focusRow !== "number") focusRow = anchorRow;
      if (typeof focusCol !== "number") focusCol = anchorCol;
      switch (e.key) {
        case "ArrowRight":
          if (focusCol < (window as any).COLS - 1) focusCol++;
          break;
        case "ArrowLeft":
          if (focusCol > 0) focusCol--;
          break;
        case "ArrowDown":
          if (focusRow < (window as any).ROWS - 1) focusRow++;
          break;
        case "ArrowUp":
          if (focusRow > 0) focusRow--;
          break;
      }
      if (e.shiftKey) {
        if (!this.grid['selMgr'].isDragging()) {
          this.grid['selMgr'].startDrag(anchorRow, anchorCol);
          this.grid['pendingEditCell'] = { row: anchorRow, col: anchorCol };
        }
        this.grid['selMgr'].updateDrag(focusRow, focusCol);
        this.grid['scrollToCell'](focusRow, focusCol);
        this.grid['scheduleRender']();
        return;
      } else {
        this.grid['selMgr'].clearSelection();
        this.grid['selMgr'].selectCell(focusRow, focusCol);
        this.grid['scrollToCell'](focusRow, focusCol);
        this.grid['scheduleRender']();
        this.grid['computeSelectionStats']();
      }
    }
    if (e.ctrlKey && e.key === "a") {
      this.grid['selMgr'].selectAll();
      this.grid['editingCell'] = null;
      this.grid['pendingEditCell'] = null;
      this.grid['scheduleRender']();
      return;
    }
    if (e.ctrlKey && e.key === "b") {
      this.grid['onBoldToggle']();
      return;
    }
    if (e.ctrlKey && e.key === "i") {
      this.grid['onItalicToggle']();
      return;
    }
    if (e.key === "Backspace") {
      if (this.grid['selMgr'].getSelectedCell() !== null) {
        const cell = this.grid['getCell'](
          this.grid['selMgr'].getSelectedCell()!.row,
          this.grid['selMgr'].getSelectedCell()!.col
        );
        const command = new (window as any).EditCellCommand(this.grid, cell, cell.getValue(), "");
        this.grid['commandManager'].execute(command);
      }
      if (this.grid['selMgr'].getSelectedRow() !== null) {
        this.grid['onDeleteRow']();
      }
      if (this.grid['selMgr'].getSelectedCol() !== null) {
        this.grid['onDeleteColumn']();
      }
      this.grid['scheduleRender']();
      return;
    }
    if (e.key === "Delete") {
      if (this.grid['selMgr'].getSelectedCell() !== null) {
        const cell = this.grid['getCell'](
          this.grid['selMgr'].getSelectedCell()!.row,
          this.grid['selMgr'].getSelectedCell()!.col
        );
        const command = new (window as any).EditCellCommand(this.grid, cell, cell.getValue(), "");
        this.grid['commandManager'].execute(command);
      }
      if (this.grid['selMgr'].getSelectedRow() !== null) {
        this.grid['onDeleteRow']();
      }
      if (this.grid['selMgr'].getSelectedCol() !== null) {
        this.grid['onDeleteColumn']();
      }
      this.grid['scheduleRender']();
      return;
    }
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      this.grid['commandManager'].undo();
      this.grid['scheduleRender']();
      return;
    }
    if (e.ctrlKey && e.key === "y") {
      e.preventDefault();
      this.grid['commandManager'].redo();
      this.grid['scheduleRender']();
      return;
    }
    const active = document.activeElement;
    if (
      this.grid['selMgr'].getSelectedCell() !== null &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      (!active || (
        active.tagName !== "INPUT" &&
        active.tagName !== "TEXTAREA" &&
        active.getAttribute("contenteditable") !== "true"
      ))
    ) {
      e.preventDefault();
    
      const selectedCell = this.grid['selMgr'].getSelectedCell()!;
      this.grid['startEditingCell'](selectedCell.row, selectedCell.col, e.key);
      return;
    }
    if (
      this.grid['pendingEditCell'] &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      (!target || (
        target.tagName !== "INPUT" &&
        target.tagName !== "TEXTAREA" &&
        target.getAttribute("contenteditable") !== "true"
      ))
    ) {
      e.preventDefault();
      const { row, col } = this.grid['pendingEditCell'];
      this.grid['ctx'].restore();
      this.grid['startEditingCell'](row, col, e.key);
      this.grid['pendingEditCell'] = null;
      return;
    }
    this.grid['computeSelectionStats']();
    this.grid['updateToolbarState']();
    if (this.grid['editingCell'] && e.key === "Enter") {
      const rect = this.grid['selMgr'].getDragRect();
      if (rect && (rect.endRow > rect.startRow || rect.endCol > rect.startCol)) {
        const { row, col } = this.grid['editingCell'];
        let nextRow = row + 1;
        if (nextRow > rect.endRow) nextRow = rect.startRow;
        this.grid['pendingEditCell'] = { row: nextRow, col };
      } else {
        this.grid['pendingEditCell'] = null;
      }
      if (this.grid['pendingEditCell']) {
        const { row, col } = this.grid['pendingEditCell'];
        this.grid['startEditingCell'](row, col);
        this.grid['pendingEditCell'] = null;
      }
      return;
    }
    if (e.key === "Enter" || e.key === "Escape") {
      this.grid['finishEditing'](true);
      return;
    }
  }
}
