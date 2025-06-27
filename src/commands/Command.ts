// src/commands/Command.ts

/**
 * Interface for all command types.
 * Each command must define how to execute and undo itself.
 */
export interface Command {
    /**
     * Executes the command.
     */
    execute(): void;
    /**
     * Undoes the command.
     */
    undo(): void;
  }
  