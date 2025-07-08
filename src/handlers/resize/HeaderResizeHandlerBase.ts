import type { EventHandler } from '../EventHandler';
import { Grid } from '../../core/grid';

export abstract class HeaderResizeHandlerBase implements EventHandler {
  protected grid: Grid;
  protected resizingIdx: number | null = null;
  protected dragStartCoord: number = 0;
  protected originalSize: number = 0;
  protected isResizing: boolean = false;
  protected currentResizeCommand: any = null;

  constructor(grid: Grid) { this.grid = grid; }

  abstract hitTest(x: number, y: number): boolean;
  protected abstract getIndex(evt: MouseEvent): number;
  protected abstract getWithin(x: number, y: number): number;
  protected abstract getHeaderSize(): number;
  protected abstract getResizeGutter(): number;
  protected abstract getManager(): any;
  protected abstract getSelected(): number[];
  protected abstract getResizeCommand(idx: number, from: number, to: number): any;
  protected abstract getCompositeCommand(cmds: any[]): any;
  protected abstract getMinSize(): number;
  protected abstract getCursor(): string;
  protected abstract getDragDelta(evt: MouseEvent): number;
  protected abstract setSize(idx: number, size: number): void;
  protected abstract updateEditorPosition(): void;

  onPointerDown(evt: MouseEvent): void {
    const idx = this.getIndex(evt);
    const within = this.getWithin(evt.clientX, evt.clientY);
    if (within >= this.getManager().getSize(idx) - this.getResizeGutter()) {
      this.resizingIdx = idx;
      this.dragStartCoord = this.getDragStartCoord(evt);
      this.originalSize = this.getManager().getSize(idx);
      this.isResizing = true;
      const selected = this.getSelected();
      if (selected.length > 1 && selected.includes(idx)) {
        const commands = selected.map((i: number) =>
          this.getResizeCommand(i, this.getManager().getSize(i), this.getManager().getSize(i))
        );
        this.currentResizeCommand = this.getCompositeCommand(commands);
      } else {
        this.currentResizeCommand = this.getResizeCommand(idx, this.originalSize, this.originalSize);
      }
      this.setResizeCursor();
    }
  }

  onPointerMove(evt: MouseEvent): void {
    this.grid['canvas'].style.cursor = 'cell';
    const idx = this.getIndex(evt);
    const within = this.getWithin(evt.clientX, evt.clientY);
    if (within >= this.getManager().getSize(idx) - this.getResizeGutter()) {
      this.grid['canvas'].style.cursor = this.getCursor();
    }
  }

  onPointerDrag(evt: MouseEvent): void {
    if (this.resizingIdx !== null && this.isResizing && this.currentResizeCommand) {
      const d = this.getDragDelta(evt);
      const newSize = Math.max(this.getMinSize(), this.originalSize + d);
      const selected = this.getSelected();
      if (
        selected.length > 1 &&
        selected.includes(this.resizingIdx) &&
        this.isCompositeCommand(this.currentResizeCommand)
      ) {
        for (let i = 0; i < selected.length; i++) {
          this.setSize(selected[i], newSize);
          const cmd = this.currentResizeCommand.commands[i];
          if ('updateNewSize' in cmd && typeof cmd.updateNewSize === 'function') {
            cmd.updateNewSize(newSize);
          }
        }
      } else {
        this.setSize(this.resizingIdx, newSize);
        this.currentResizeCommand.updateNewSize(newSize);
      }
      this.updateEditorPosition();
      this.grid['scheduleRender']();
    }
  }

  onPointerUp(evt: MouseEvent): void {
    if (this.isResizing && this.currentResizeCommand) {
      this.grid['commandManager'].execute(this.currentResizeCommand);
      this.currentResizeCommand = null;
      this.isResizing = false;
    }
    this.resizingIdx = null;
  }

  protected abstract getDragStartCoord(evt: MouseEvent): number;
  protected isCompositeCommand(cmd: any): boolean {
    return cmd && Array.isArray(cmd.commands);
  }
  protected setResizeCursor(): void {
    this.grid['ctx'].strokeStyle = '#107C41';
    this.grid['ctx'].lineWidth = 2 / window.devicePixelRatio;
  }
} 