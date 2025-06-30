import { SelectionManager } from "../core/Selection";
import { HEADER_SIZE } from "./GridConstants";

/**
 * Handles search functionality for the grid
 */
export class GridSearch {
  private currentSearchResults: { row: number; col: number; value: string }[] = [];
  private currentSearchIndex: number = 0;
  private selMgr: SelectionManager;
  private container: HTMLElement;
  private rowMgr: any;
  private colMgr: any;
  private rowHeaderWidth: number = 40;

  constructor(selMgr: SelectionManager, container: HTMLElement, rowMgr: any, colMgr: any) {
    this.selMgr = selMgr;
    this.container = container;
    this.rowMgr = rowMgr;
    this.colMgr = colMgr;
  }

  /**
   * Searches for cells containing the given search term
   */
  public searchCell(searchTerm: string, cells: Map<number, Map<number, any>>): void {
    if (!searchTerm.trim()) {
      // Clear search when input is empty
      this.clearSearch();
      return;
    }

    const searchResults: { row: number; col: number; value: string }[] = [];
    const term = searchTerm.toLowerCase();

    // Search through all cells
    for (const [row, rowMap] of cells.entries()) {
      for (const [col, cell] of rowMap.entries()) {
        const cellValue = cell.getValue().toLowerCase();
        if (cellValue.includes(term)) {
          searchResults.push({ row, col, value: cell.getValue() });
        }
      }
    }

    if (searchResults.length > 0) {
      // Select the first match
      const firstMatch = searchResults[0];
      this.selMgr.selectCell(firstMatch.row, firstMatch.col);
      
      // Store search results for navigation
      this.currentSearchResults = searchResults;
      this.currentSearchIndex = 0;
      
      // Update search status
      this.updateSearchStatus(searchResults.length, this.currentSearchIndex + 1);
      
      // Scroll to the selected cell
      this.scrollToCell(firstMatch.row, firstMatch.col);
    } else {
      // No matches found
      this.updateSearchStatus(0, 0);
      this.selMgr.clearSelection();
    }
  }

  /**
   * Clears the current search
   */
  public clearSearch(): void {
    this.currentSearchResults = [];
    this.currentSearchIndex = 0;
    this.updateSearchStatus(0, 0);
    this.selMgr.clearSelection();
  }

  /**
   * Navigates through search results
   */
  public navigateSearchResults(direction: 'next' | 'prev'): void {
    if (this.currentSearchResults.length === 0) return;

    if (direction === 'next') {
      this.currentSearchIndex = (this.currentSearchIndex + 1) % this.currentSearchResults.length;
    } else {
      this.currentSearchIndex = this.currentSearchIndex === 0 
        ? this.currentSearchResults.length - 1 
        : this.currentSearchIndex - 1;
    }

    const match = this.currentSearchResults[this.currentSearchIndex];
    this.selMgr.selectCell(match.row, match.col);
    this.scrollToCell(match.row, match.col);
    this.updateSearchStatus(this.currentSearchResults.length, this.currentSearchIndex + 1);
  }

  /**
   * Scrolls to a cell and ensures it is visible
   */
  private scrollToCell(row: number, col: number): void {
    const cellX = this.colMgr.getX(col);
    const cellY = this.rowMgr.getY(row);
    const cellWidth = this.colMgr.getWidth(col);
    const cellHeight = this.rowMgr.getHeight(row);

    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    // Calculate the visible area (accounting for headers)
    const visibleWidth = containerWidth - this.rowHeaderWidth;
    const visibleHeight = containerHeight - HEADER_SIZE;

    // Calculate target scroll position to ensure cell is visible
    let targetScrollX = this.container.scrollLeft;
    let targetScrollY = this.container.scrollTop;

    // Check if cell is outside visible area horizontally
    const cellRight = cellX + cellWidth;
    const cellLeft = cellX;
    const visibleRight = this.container.scrollLeft + visibleWidth;
    const visibleLeft = this.container.scrollLeft;

    if (cellRight > visibleRight) {
      // Cell is to the right of visible area
      targetScrollX = cellRight - visibleWidth + 200;
    } else if (cellLeft < visibleLeft) {
      // Cell is to the left of visible area
      targetScrollX = cellLeft - 200;
    }

    // Check if cell is outside visible area vertically
    const cellBottom = cellY + cellHeight;
    const cellTop = cellY;
    const visibleBottom = this.container.scrollTop + visibleHeight;
    const visibleTop = this.container.scrollTop;

    if (cellBottom > visibleBottom) {
      // Cell is below visible area
      targetScrollY = cellBottom - visibleHeight + 200;
    } else if (cellTop < visibleTop) {
      // Cell is above visible area
      targetScrollY = cellTop - 200;  
    }

    // Ensure scroll position is within bounds
    targetScrollX = Math.max(0, Math.min(targetScrollX, this.colMgr.getTotalWidth() - visibleWidth));
    targetScrollY = Math.max(0, Math.min(targetScrollY, this.rowMgr.getTotalHeight() - visibleHeight));

    // Only scroll if the position actually changed
    if (targetScrollX !== this.container.scrollLeft || targetScrollY !== this.container.scrollTop) {
      this.container.scrollTo({
        left: targetScrollX,
        top: targetScrollY,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Updates the search status display
   */
  private updateSearchStatus(totalMatches: number, currentMatch: number): void {
    const searchStatus = document.getElementById('searchStatus');
    if (searchStatus) {
      if (totalMatches === 0) {
        searchStatus.textContent = 'No matches found';
        searchStatus.style.color = '#d32f2f';
      } else {
        searchStatus.textContent = `${currentMatch} of ${totalMatches} matches`;
        searchStatus.style.color = '#1976d2';
      }
    }
  }

  /**
   * Checks if a cell is a search result
   */
  public isSearchResult(row: number, col: number): boolean {
    return this.currentSearchResults.some(result => result.row === row && result.col === col);
  }

  /**
   * Gets the current search results
   */
  public getSearchResults(): { row: number; col: number; value: string }[] {
    return this.currentSearchResults;
  }

  /**
   * Sets the row header width
   */
  public setRowHeaderWidth(width: number): void {
    this.rowHeaderWidth = width;
  }
} 