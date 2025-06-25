import type { Command } from "./Command";


export class CommandManager{
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];

    execute(command: Command): void {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = [];
    }
    undo(): void {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
        }
    }
    redo(): void {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);
        }
    }
    clear() {
        this.undoStack = [];
        this.redoStack = [];
   }
}