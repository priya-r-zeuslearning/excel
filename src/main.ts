import { Grid } from "./core/grid";
import { DataImporter } from "./core/DataImporter";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("excelCanvas") as HTMLCanvasElement;
  const grid = new Grid(canvas);
  
  // Expose grid globally for console access
  (window as any).grid = grid;
  
  const importer = new DataImporter(grid);
  const importBtn = document.getElementById("importBtn") as HTMLButtonElement;
  const fileInput = document.getElementById("fileInput") as HTMLInputElement; 
  importBtn.addEventListener("click", () => fileInput.click());
  function convertObjectArrayTo2D(jsonData: any[]): string[][] {
    if (jsonData.length === 0) return [];
  
    const headers = Object.keys(jsonData[0]);
    const rows: string[][] = [headers];
  
    for (const obj of jsonData) {
      const row = headers.map(key => String(obj[key] ?? ""));
      rows.push(row);
    }
  
    return rows;
  }
  
  fileInput.addEventListener("change", async () => {
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const text = await file.text();
      
      try {
        const jsondata = JSON.parse(text);
        const data = convertObjectArrayTo2D(jsondata);
        if (Array.isArray(data)) {
          importer.importFromJSON(data);
        } else {
          alert("Invalid JSON format. Expected an array of arrays.");
        }
      } catch (e) {
        alert("Failed to parse JSON file.");
      }
    }
  });
});
