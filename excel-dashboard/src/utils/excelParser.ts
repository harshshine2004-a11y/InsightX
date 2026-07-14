import * as XLSX from 'xlsx';
import { SheetData, ColumnInfo } from '../services/db';

// Helper to check if a value is a date
function isDate(val: any): boolean {
  if (val instanceof Date) return !isNaN(val.getTime());
  if (typeof val === 'string') {
    // Simple date regex for YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, etc.
    const dateRegex = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}(\s\d{1,2}:\d{2}(:\d{2})?)?$/;
    if (dateRegex.test(val)) {
      const parsed = Date.parse(val);
      return !isNaN(parsed);
    }
  }
  return false;
}

// Helper to check if value looks like currency
function isCurrency(val: any): boolean {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Currency symbols: $, €, £, ¥, ₹, etc.
    return /^[\$\u20AC\u00A3\u00A5\u20B9]\s?\-?\d+/.test(trimmed) || /\-?\d+\s?[\$\u20AC\u00A3\u00A5\u20B9]/.test(trimmed);
  }
  return false;
}

// Helper to check if value is percentage
function isPercentage(val: any): boolean {
  if (typeof val === 'string') {
    return /^\-?\d+(\.\d+)?%$/.test(val.trim());
  }
  return false;
}

// Infer column types based on sample rows
export function inferColumnTypes(rows: any[], headers: string[]): ColumnInfo[] {
  if (rows.length === 0) {
    return headers.map(h => ({ name: h, type: 'text' }));
  }

  // Sample up to 1000 rows representing the dataset
  const sampleSize = Math.min(rows.length, 1000);
  const step = Math.max(1, Math.floor(rows.length / sampleSize));
  const sampleRows: any[] = [];
  for (let i = 0; i < rows.length; i += step) {
    sampleRows.push(rows[i]);
    if (sampleRows.length >= sampleSize) break;
  }

  return headers.map(header => {
    let numericCount = 0;
    let dateCount = 0;
    let currencyCount = 0;
    let percentageCount = 0;
    let emptyCount = 0;
    const uniqueValues = new Set<any>();

    sampleRows.forEach(row => {
      const val = row[header];
      if (val === undefined || val === null || val === '') {
        emptyCount++;
        return;
      }

      uniqueValues.add(val);

      if (typeof val === 'number') {
        numericCount++;
      } else {
        const valStr = String(val).trim();
        if (isCurrency(valStr)) {
          currencyCount++;
        } else if (isPercentage(valStr)) {
          percentageCount++;
        } else if (!isNaN(Number(valStr.replace(/[\$,%]/g, '')))) {
          numericCount++;
        } else if (isDate(val)) {
          dateCount++;
        }
      }
    });

    const nonSpecs = sampleRows.length - emptyCount;
    if (nonSpecs === 0) {
      return { name: header, type: 'empty' };
    }

    // Determine primary type
    if (dateCount / nonSpecs > 0.7) {
      return { name: header, type: 'date' };
    }
    if (currencyCount / nonSpecs > 0.7) {
      return { name: header, type: 'currency' };
    }
    if (percentageCount / nonSpecs > 0.7) {
      return { name: header, type: 'percentage' };
    }
    if (numericCount / nonSpecs > 0.7) {
      return { name: header, type: 'numeric' };
    }

    // If cardinality is low, classify as category
    const cardinality = uniqueValues.size / nonSpecs;
    if (uniqueValues.size < 40 && cardinality < 0.25) {
      return { name: header, type: 'category' };
    }

    return { name: header, type: 'text' };
  });
}

export interface ParseResult {
  filename: string;
  size: number;
  sheets: { [sheetName: string]: SheetData };
  totalSheets: number;
  totalRecords: number;
  qualityScore: number;
  dateColumnsCount: number;
  numericColumnsCount: number;
  categoryColumnsCount: number;
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Could not read file data');
        }

        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetNames = workbook.SheetNames;
        const parsedSheets: { [sheetName: string]: SheetData } = {};
        
        let totalRecords = 0;
        let dateCols = 0;
        let numCols = 0;
        let catCols = 0;
        let totalEmptyCells = 0;
        let totalCells = 0;

        sheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          // Use defval: '' to ensure missing values are empty strings rather than undefined
          const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
          
          // Determine headers from rows or from sheet ref range if possible
          let headers: string[] = [];
          if (rows.length > 0) {
            headers = Object.keys(rows[0]);
          } else {
            // Empty sheet
            headers = [];
          }

          const columnsInfo = inferColumnTypes(rows, headers);

          // Update metrics
          totalRecords += rows.length;
          columnsInfo.forEach(col => {
            if (col.type === 'date') dateCols++;
            else if (col.type === 'numeric' || col.type === 'currency' || col.type === 'percentage') numCols++;
            else if (col.type === 'category') catCols++;
          });

          // Calculate empty cells
          rows.forEach(row => {
            headers.forEach(h => {
              totalCells++;
              const val = row[h];
              if (val === undefined || val === null || val === '') {
                totalEmptyCells++;
              }
            });
          });

          parsedSheets[sheetName] = {
            rows,
            headers,
            columnsInfo
          };
        });

        // Compute data quality score (percentage of non-empty cells)
        const qualityScore = totalCells > 0 ? Math.round(((totalCells - totalEmptyCells) / totalCells) * 100) : 100;

        resolve({
          filename: file.name,
          size: file.size,
          sheets: parsedSheets,
          totalSheets: sheetNames.length,
          totalRecords,
          qualityScore,
          dateColumnsCount: dateCols,
          numericColumnsCount: numCols,
          categoryColumnsCount: catCols
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('File reading error'));
    };

    reader.readAsArrayBuffer(file);
  });
}
