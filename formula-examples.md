# Formula Usage Guide

Your Excel-like grid now supports formulas! Here's how to use them:

## Formula Syntax

All formulas must start with `=` (equals sign).

## Supported Functions

### 1. Single Cell Reference
Reference a single cell to display its value:
```
=A1    (displays the value from cell A1)
=B5    (displays the value from cell B5)
```

### 2. SUM Function
Add up all numbers in a range:
```
=SUM(A1:A5)    (adds up values from A1 through A5)
=SUM(B1:B10)   (adds up values from B1 through B10)
```

### 3. COUNT Function
Count the number of cells in a range:
```
=COUNT(A1:A5)  (counts cells from A1 through A5)
=COUNT(B1:B10) (counts cells from B1 through B10)
```

### 4. MAX Function
Find the maximum value in a range:
```
=MAX(A1:A5)    (finds the highest value from A1 through A5)
=MAX(B1:B10)   (finds the highest value from B1 through B10)
```

### 5. MIN Function
Find the minimum value in a range:
```
=MIN(A1:A5)    (finds the lowest value from A1 through A5)
=MIN(B1:B10)   (finds the lowest value from B1 through B10)
```

### 6. AVG Function
Calculate the average of values in a range:
```
=AVG(A1:A5)    (calculates average of values from A1 through A5)
=AVG(B1:B10)   (calculates average of values from B1 through B10)
```

## How to Use

1. **Double-click** on any cell to start editing
2. **Type your formula** starting with `=`
3. **Press Enter** to apply the formula
4. The cell will display the calculated result

## Example Setup

Try this example:

1. Enter numbers in cells A1 through A5:
   - A1: 10
   - A2: 20
   - A3: 30
   - A4: 40
   - A5: 50

2. In cell A6, enter: `=SUM(A1:A5)`
   - Result: 150

3. In cell A7, enter: `=AVG(A1:A5)`
   - Result: 30.00

4. In cell A8, enter: `=MAX(A1:A5)`
   - Result: 50

5. In cell A9, enter: `=MIN(A1:A5)`
   - Result: 10

6. In cell A10, enter: `=COUNT(A1:A5)`
   - Result: 5

## Important Notes

- **Auto-recalculation**: When you change any cell value, all formulas automatically recalculate
- **Error handling**: Invalid formulas will show `#ERROR`
- **Undo/Redo**: Formulas work with the undo/redo system
- **Only numeric values** in ranges are considered for calculations
- **Empty cells** are ignored in calculations

## Tips

- Use the **status bar** at the bottom to see statistics for selected cells
- **Select ranges** by dragging to see the selection statistics
- **Column and row selections** also work with the status bar
- Formulas are **case-insensitive** (SUM, sum, Sum all work the same) 