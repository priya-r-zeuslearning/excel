import type { Command } from "./Command";


export class CommandManager{
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];

    /**
     * Executes a command.
     * @param command the command to execute
     */
    execute(command: Command): void {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = [];
    }
    /**
     * Undoes the last command.
     */
    undo(): void {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
        }
    }
    /**
     * Redoes the last command.
     */
    redo(): void {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);
        }
    }
    /**
     * Clears the undo and redo stacks.
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
   }
}