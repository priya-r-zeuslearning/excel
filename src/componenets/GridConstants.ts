/**
 * Grid Constants and Configuration
 * Contains all the default values and configuration constants used by the grid.
 */

/**
 * Default sizes used by managers on first construction.
 */
export const DEFAULT_COL_WIDTH = 100;
export const DEFAULT_ROW_HEIGHT = 30;

export const ROWS = 100_000;
export const COLS = 5000;

/** How many extra rows / columns to draw outside the viewport */
export const RENDER_BUFFER_PX = 200;

/** Size of the header band (row numbers / column letters) */
export const HEADER_SIZE = 40;

/** How many pixels near an edge counts as a "resize hotspot" */
export const RESIZE_GUTTER = 10;

export const dpr = window.devicePixelRatio || 1;

/**
 * Performance limits for large selections
 */
export const MAX_SELECT_ROWS = 1000;
export const MAX_SELECT_COLS = 1000;
export const MAX_CELLS_TO_PROCESS = 10000;
export const MAX_ROWS_FOR_STATS = 1000;
export const MAX_COLS_FOR_STATS = 1000;

/**
 * Search configuration
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Animation configuration
 */
export const MARCHING_ANTS_DASH_PATTERN = [4, 2];
export const MARCHING_ANTS_SPEED = 1; 