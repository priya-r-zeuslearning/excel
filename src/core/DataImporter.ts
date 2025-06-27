    import { Grid } from "./grid";

export class DataImporter {
  private grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }
/**
 * Imports data from a JSON array.
 * @param data the data to import
 */
  importFromJSON(data: any[][]): void {
    this.grid.beginBatchUpdate(); 

    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      for (let c = 0; c < row.length; c++) {
     
        const rawValue = row[c];
        if (rawValue !== null && rawValue !== undefined && rawValue !== "") {
          this.grid.setCellValue(r, c, String(rawValue));
        }
      }
    }

    this.grid.endBatchUpdate(); 
    console.log('Cells created after import:', this.grid.countCreatedCells());
  }
    
}
