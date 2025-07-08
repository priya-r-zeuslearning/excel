import type { EventHandler } from './EventHandler';

export class EventRouter {
  private handlers: EventHandler[];
  private activeHandler: EventHandler | null = null;

  constructor(handlers: EventHandler[]) {
    this.handlers = handlers;
  }

  onPointerDown(evt: MouseEvent) {
    const { x, y } = this.getEventPos(evt);
    for (const handler of this.handlers) {
      if (handler.hitTest(x, y)) {
        this.activeHandler = handler;
        handler.onPointerDown(evt);
        return;
      }
    }
    this.activeHandler = null;
  }

  onPointerMove(evt: MouseEvent) {
    const { x, y } = this.getEventPos(evt);
    for (const handler of this.handlers) {
      if (handler.hitTest(x, y)) {
        handler.onPointerMove(evt);
        return;
      }
    }
  }

  onPointerDrag(evt: MouseEvent) {
    if (this.activeHandler) {
      this.activeHandler.onPointerDrag(evt);
    }
  }

  onPointerUp(evt: MouseEvent) {
    if (this.activeHandler) {
      this.activeHandler.onPointerUp(evt);
      this.activeHandler = null;
    }
  }

  private getEventPos(evt: MouseEvent) {
    const rect = (evt.target as HTMLElement).getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }
} 