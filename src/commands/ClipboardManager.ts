

export class ClipboardManager  {
    private data: any[][] = [];
    setData(data: any[][]): void {
        this.data = data.map(row=> row.slice());
    }
    getData(): any[][] {
        return this.data.map(row=> row.slice());
    }
   isEmpty(): boolean {
    return this.data.length === 0;
   }
 
}