    import { Grid } from "./grid";

export class DataImporter {
  private grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  importFromJSON(data: any[][]): void {
    this.grid.beginBatchUpdate(); // 🚀 disable intermediate renders

    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      for (let c = 0; c < row.length; c++) {
        const value = row[c];
        this.grid.setCellValue(r, c, String(value ?? ""));
      }
    }

    this.grid.endBatchUpdate(); // ✅ re-render once at the end
    }
    
}
