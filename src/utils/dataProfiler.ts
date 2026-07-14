import { SheetData, ColumnInfo } from '../services/db';

export interface ColumnStats {
  name: string;
  type: string;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  // Numeric stats
  min?: number;
  max?: number;
  avg?: number;
  sum?: number;
  // Date stats
  oldest?: string;
  latest?: string;
  // Category / Freq stats
  frequencies?: { value: string; count: number; percentage: number }[];
}

export interface SheetStats {
  totalRecords: number;
  duplicateCount: number;
  duplicatePercentage: number;
  overallMissingCells: number;
  overallCells: number;
  qualityScore: number;
  columnStats: { [colName: string]: ColumnStats };
  categoryDistribution: { [colName: string]: { name: string; value: number }[] };
}

// Convert a cell value to number safely
export function safeNumber(val: any): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (!val) return null;
  const cleaned = String(val).replace(/[\$,%\s]/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

// Convert a cell value to Date safely
export function safeDate(val: any): Date | null {
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (!val) return null;
  const parsed = Date.parse(String(val));
  return isNaN(parsed) ? null : new Date(parsed);
}

export function profileSheet(sheetData: SheetData): SheetStats {
  const { rows, headers, columnsInfo } = sheetData;
  const totalRecords = rows.length;

  // 1. Detect duplicates
  let duplicateCount = 0;
  const rowSignatures = new Set<string>();

  rows.forEach(row => {
    // Construct simple signature by joining row values
    const sig = headers.map(h => String(row[h])).join('|||');
    if (rowSignatures.has(sig)) {
      duplicateCount++;
    } else {
      rowSignatures.add(sig);
    }
  });

  const duplicatePercentage = totalRecords > 0 ? Math.round((duplicateCount / totalRecords) * 100) : 0;

  // 2. Profile individual columns
  const columnStats: { [colName: string]: ColumnStats } = {};
  const categoryDistribution: { [colName: string]: { name: string; value: number }[] } = {};
  let overallMissingCells = 0;
  const overallCells = totalRecords * headers.length;

  columnsInfo.forEach(col => {
    const colName = col.name;
    const type = col.type;

    let missingCount = 0;
    const uniqueValuesMap = new Map<string, number>();
    
    // Numeric stats
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let validNumCount = 0;

    // Date stats
    let oldestDate: Date | null = null;
    let latestDate: Date | null = null;

    rows.forEach(row => {
      const val = row[colName];
      if (val === undefined || val === null || val === '') {
        missingCount++;
        overallMissingCells++;
        return;
      }

      const valStr = String(val).trim();
      uniqueValuesMap.set(valStr, (uniqueValuesMap.get(valStr) || 0) + 1);

      // Numeric parsing
      if (type === 'numeric' || type === 'currency' || type === 'percentage') {
        const num = safeNumber(val);
        if (num !== null) {
          if (num < min) min = num;
          if (num > max) max = num;
          sum += num;
          validNumCount++;
        }
      }

      // Date parsing
      if (type === 'date') {
        const date = safeDate(val);
        if (date !== null) {
          if (!oldestDate || date < oldestDate) oldestDate = date;
          if (!latestDate || date > latestDate) latestDate = date;
        }
      }
    });

    const uniqueCount = uniqueValuesMap.size;
    const missingPercentage = totalRecords > 0 ? Math.round((missingCount / totalRecords) * 100) : 0;

    const stats: ColumnStats = {
      name: colName,
      type,
      missingCount,
      missingPercentage,
      uniqueCount
    };

    // Fill numerical details
    if (validNumCount > 0) {
      stats.min = min === Infinity ? 0 : min;
      stats.max = max === -Infinity ? 0 : max;
      stats.sum = sum;
      stats.avg = sum / validNumCount;
    }

    // Fill date details
    if (oldestDate) {
      stats.oldest = (oldestDate as Date).toLocaleDateString();
    }
    if (latestDate) {
      stats.latest = (latestDate as Date).toLocaleDateString();
    }

    // Compute frequencies (sort by frequency descending)
    const sortedFreqs = Array.from(uniqueValuesMap.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    stats.frequencies = sortedFreqs.slice(0, 50); // limit to top 50 for stats representation

    columnStats[colName] = stats;

    // Categorical distribution for charting (Top 10 + "Others")
    if (type === 'category' || sortedFreqs.length < 15) {
      const top10 = sortedFreqs.slice(0, 10);
      const dataPoints = top10.map(f => ({ name: f.value || '(Blank)', value: f.count }));
      if (sortedFreqs.length > 10) {
        const othersCount = sortedFreqs.slice(10).reduce((acc, f) => acc + f.count, 0);
        dataPoints.push({ name: 'Others', value: othersCount });
      }
      categoryDistribution[colName] = dataPoints;
    }
  });

  const qualityScore = overallCells > 0 ? Math.round(((overallCells - overallMissingCells) / overallCells) * 100) : 100;

  return {
    totalRecords,
    duplicateCount,
    duplicatePercentage,
    overallMissingCells,
    overallCells,
    qualityScore,
    columnStats,
    categoryDistribution
  };
}
