// DEPRECATED: This file is now replaced by the modular event handler system (see src/handlers/)
// Use EventHandler, ResizeHandler, DragSelectHandler, and InputManager for new code.
//
// This file is retained for reference during refactor.
const HEADER_SIZE = 40;
const RESIZE_GUTTER = 5;
export class MouseEventHandler {
  private grid: import('../core/grid').Grid;
  private lastTapTime: number = 0;
  private touchStartPos: { x: number, y: number } | null = null;
  private touchMoved: boolean = false;
  private lastTouchY: number | null = null;
  private lastTouchX: number | null = null;

  constructor(grid: import('../core/grid').Grid) {
    this.grid = grid;
  }

  onPointerDown(evt: PointerEvent) {
    // Touch-specific logic
    if (evt.pointerType === 'touch') {
      this.touchStartPos = { x: evt.clientX, y: evt.clientY };
      this.touchMoved = false;
      this.lastTouchY = evt.clientY;
      this.lastTouchX = evt.clientX;
      // Double-tap detection
      const now = Date.now();
      if (now - this.lastTapTime < 300) {
        this.onDoubleClick(evt as any as MouseEvent); // treat as double-tap
        evt.preventDefault();
        this.lastTapTime = 0;
        return;
      }
      this.lastTapTime = now;
    }
    if (this.grid['editorInput'] && this.grid['editingCell']) {
      this.grid['finishEditing'](true);
    }
    this.grid['columnSelectionAnchor'] = null;
    this.grid['columnSelectionFocus'] = null;
    this.grid['rowSelectionAnchor'] = null;
    this.grid['rowSelectionFocus'] = null;
    const rect = this.grid['canvas'].getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    if (mouseX >= 0 && mouseX < this.grid['rowHeaderWidth'] && mouseY >= 0 && mouseY < HEADER_SIZE) {
      this.grid['selMgr'].selectAll();
      this.grid['scheduleRender']();
      return;
    }
    (this.grid['canvas'] as HTMLElement).setPointerCapture(evt.pointerId);
    this.onMouseDown(evt as unknown as MouseEvent);
  }

  onPointerMove(evt: PointerEvent) {
    // Touch-specific logic: allow scrolling if user is swiping and not interacting with grid
    if (
      evt.pointerType === 'touch' &&
      this.lastTouchY !== null &&
      this.lastTouchX !== null &&
      !this.grid['isMouseDown'] &&
      !this.grid['isColHeaderDrag'] &&
      !this.grid['isRowHeaderDrag'] &&
      !this.grid['isResizing']
    ) {
      const deltaY = this.lastTouchY - evt.clientY;
      const deltaX = this.lastTouchX - evt.clientX;
      this.grid['container'].scrollTop += deltaY;
      this.grid['container'].scrollLeft += deltaX;
      this.lastTouchY = evt.clientY;
      this.lastTouchX = evt.clientX;
      evt.preventDefault();
      return;
    }
    if (evt.pointerType === 'touch' && this.touchStartPos) {
      const dx = Math.abs(evt.clientX - this.touchStartPos.x);
      const dy = Math.abs(evt.clientY - this.touchStartPos.y);
      if (dx > 10 || dy > 10) {
        this.touchMoved = true;
      }
      // Only start selection if movement is small (otherwise, let user scroll)
      if (this.touchMoved) {
        // Let the container scroll, don't do selection
        return;
      }
    }
    const rect = this.grid['canvas'].getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    const wasHovered = this.grid['_isTopLeftHovered'];
    this.grid['_isTopLeftHovered'] = mouseX >= 0 && mouseX < this.grid['rowHeaderWidth'] && mouseY >= 0 && mouseY < HEADER_SIZE;
    if (wasHovered !== this.grid['_isTopLeftHovered']) {
      this.grid['scheduleRender']();
    }
    this.onMouseMove(evt as unknown as MouseEvent);
  }

  onPointerUp(evt: PointerEvent) {
    if (evt.pointerType === 'touch') {
      this.touchStartPos = null;
      this.touchMoved = false;
      this.lastTouchY = null;
      this.lastTouchX = null;
    }
    (this.grid['canvas'] as HTMLElement).releasePointerCapture(evt.pointerId);
    this.onMouseUp();
  }

  onDoubleClick(evt: MouseEvent) {
    const rect = this.grid['canvas'].getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    if (mouseX < HEADER_SIZE || mouseY < HEADER_SIZE) return;
    const { x, y } = this.grid['getMousePos'](evt);
    const { col } = this.grid['findColumnByOffset'](x - HEADER_SIZE);
    const { row } = this.grid['findRowByOffset'](y - HEADER_SIZE);
    this.grid['startEditingCell'](row, col);
  }

  onMouseDown(evt: MouseEvent) {
    const rect = this.grid['canvas'].getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    const { x, y } = this.grid['getMousePos'](evt);
    if (mouseY < HEADER_SIZE && mouseX >= HEADER_SIZE) {
      this.handleColumnHeader(evt, x);
      return;
    }
    if (mouseX < HEADER_SIZE && mouseY >= HEADER_SIZE) {
      this.handleRowHeader(evt, y);
      return;
    }
    if (mouseX >= HEADER_SIZE && mouseY >= HEADER_SIZE) {
      this.handleDataArea(evt, x, y);
      return;
    }
    this.grid['computeSelectionStats']();
    this.grid['updateToolbarState']();
  }

  private handleColumnHeader(evt: MouseEvent, x: number) {
    const { col, within } = this.grid['findColumnByOffset'](x - HEADER_SIZE);
    if (within >= this.grid['colMgr'].getWidth(col) - RESIZE_GUTTER) {
      this.handleColumnHeaderResize(evt, col);
    } else {
      this.handleColumnHeaderDrag(evt, col);
    }
  }

  private handleColumnHeaderResize(evt: MouseEvent, col: number) {
    this.grid['resizingCol'] = col;
    this.grid['dragStartX'] = evt.clientX;
    this.grid['originalSize'] = this.grid['colMgr'].getWidth(col);
    this.grid['isResizing'] = true;
    const selectedCols = this.grid['selMgr'].getSelectedColumns();
    if (selectedCols.length > 1 && selectedCols.includes(col)) {
      const commands = selectedCols.map((c: number) => new (window as any).ResizeColumnCommand(this.grid, c, this.grid['colMgr'].getWidth(c), this.grid['colMgr'].getWidth(c)));
      this.grid['currentResizeCommand'] = new (window as any).CompositeCommand(commands);
    } else {
      this.grid['currentResizeCommand'] = new (window as any).ResizeColumnCommand(
        this.grid,
        this.grid['resizingCol'],
        this.grid['originalSize'],
        this.grid['originalSize']
      );
    }
    this.grid['ctx'].strokeStyle = "#107C41";
    this.grid['ctx'].lineWidth = 2 / ((window as any).dpr || 1);
  }

  private handleColumnHeaderDrag(evt: MouseEvent, colIndex: number) {
    this.grid['isColHeaderDrag'] = true;
    this.grid['isMouseDown'] = true;
    this.grid['dragStartColHeader'] = colIndex;
    this.grid['columnSelectionAnchor'] = colIndex;
    this.grid['columnSelectionFocus'] = colIndex;
    this.grid['pendingEditCell'] = { row: 0, col: colIndex };
    this.grid['dragStartMouse'] = { x: evt.clientX, y: evt.clientY };
    this.grid['_colHeaderDragHasDragged'] = false;
    this.grid['selMgr'].clearSelectedRows();
  }

  private handleRowHeader(evt: MouseEvent, y: number) {
    const { row, within } = this.grid['findRowByOffset'](y - HEADER_SIZE);
    if (within >= this.grid['rowMgr'].getHeight(row) - RESIZE_GUTTER) {
      this.handleRowHeaderResize(evt, row);
    } else {
      this.handleRowHeaderDrag(evt, row);
    }
  }

  private handleRowHeaderResize(evt: MouseEvent, row: number) {
    this.grid['resizingRow'] = row;
    this.grid['dragStartY'] = evt.clientY;
    this.grid['originalSize'] = this.grid['rowMgr'].getHeight(row);
    this.grid['isResizing'] = true;
    const selectedRows = this.grid['selMgr'].getSelectedRows();
    if (selectedRows.length > 1 && selectedRows.includes(row)) {
      const commands = selectedRows.map((r: number) => new (window as any).ResizeRowCommand(this.grid, r, this.grid['rowMgr'].getHeight(r), this.grid['rowMgr'].getHeight(r)));
      this.grid['currentResizeCommand'] = new (window as any).CompositeCommand(commands);
    } else {
      this.grid['currentResizeCommand'] = new (window as any).ResizeRowCommand(
        this.grid,
        this.grid['resizingRow'],
        this.grid['originalSize'],
        this.grid['originalSize']
      );
    }
  }

  private handleRowHeaderDrag(evt: MouseEvent, row: number) {
    this.grid['isRowHeaderDrag'] = true;
    this.grid['isMouseDown'] = true;
    this.grid['dragStartRowHeader'] = row;
    this.grid['rowSelectionAnchor'] = row;
    this.grid['rowSelectionFocus'] = row;
    this.grid['dragStartMouse'] = { x: evt.clientX, y: evt.clientY };
    this.grid['_rowHeaderDragHasDragged'] = false;
    this.grid['pendingEditCell'] = { row: row, col: 0 };
    this.grid['selMgr'].clearSelectedColumns();
  }

  private handleDataArea(evt: MouseEvent, x: number, y: number) {
    const { col } = this.grid['findColumnByOffset'](x - HEADER_SIZE);
    const { row } = this.grid['findRowByOffset'](y - HEADER_SIZE);
    if (evt.button === 0) {
      this.grid['selMgr'].clearSelectedColumns();
      this.grid['selMgr'].clearSelectedRows();
      this.grid['selMgr'].selectCell(row, col);
      this.grid['scrollToCell'](row, col);
      this.grid['scheduleRender']();
      this.grid['isMouseDown'] = true;
      this.grid['isColHeaderDrag'] = false;
      this.grid['isRowHeaderDrag'] = false;
      this.grid['dragStartCell'] = { row, col };
      this.grid['pendingEditCell'] = { row, col };
      this.grid['dragStartMouse'] = { x: evt.clientX, y: evt.clientY };
    }
  }

  onMouseMove(evt: MouseEvent) {
      // ... break up logic as in grid.ts, using private helpers if needed ...
      
  }
  onMouseDrag(evt: MouseEvent) {
    // ... break up logic as in grid.ts, using private helpers if needed ...
  }
  onMouseUp() {
    // ... break up logic as in grid.ts, using private helpers if needed ...
  }
} 