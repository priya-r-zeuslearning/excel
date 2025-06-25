// src/core/Aggregator.ts

export interface Aggregates {
    sum: number;
    count: number;
    average: number;
    min: number;
    max: number;
  }
  
  export class Aggregator {
    /**
     * Given a 2D range of cell values, returns sum, count, avg, min, max.
     */
    static compute(cells: (string | number)[][]): Aggregates {
      let values: number[] = [];
  
      for (let row of cells) {
        for (let val of row) {
          const num = typeof val === "number" ? val : parseFloat(val);
          if (!isNaN(num)) values.push(num);
        }
      }
  
      const sum = values.reduce((acc, n) => acc + n, 0);
      const count = values.length;
      const average = count ? sum / count : 0;
      const min = count ? Math.min(...values) : 0;
      const max = count ? Math.max(...values) : 0;
  
      return { sum, count, average, min, max };
    }
  }
  