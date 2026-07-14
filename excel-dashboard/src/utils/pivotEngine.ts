import { safeNumber } from './dataProfiler';

export interface PivotValueField {
  field: string;
  aggType: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'median' | 'distinct_count' | 'pct_total' | 'running_total';
}

export interface PivotRowNode {
  id: string; // unique path signature, e.g. "Sales|||Male"
  label: string; // display value, e.g. "Male" or "Sales (Subtotal)"
  level: number; // nesting level (0-indexed)
  path: string[]; // e.g. ["Sales", "Male"]
  isSubtotal: boolean;
  isGrandTotal: boolean;
  cells: { [colKey: string]: number | null }; // Key: colGroupValue|||valueFieldIndex
}

export interface PivotResult {
  rowFields: string[];
  colFields: string[];
  colKeys: string[]; // List of column keys to render, e.g. ["Active|||0", "Inactive|||0"]
  colLabelMap: { [colKey: string]: string }; // Map key to header label, e.g. {"Active|||0": "Active - Sum of Salary"}
  matrix: PivotRowNode[]; // Flat list of row nodes (including subtotals and grand total) for easy rendering
}

function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Compute aggregate values for a list of raw rows
function aggregateRows(
  rows: any[],
  valueFields: PivotValueField[],
  allRowsGrandTotals?: { [field: string]: number }
): (number | null)[] {
  return valueFields.map(vf => {
    const field = vf.field;
    const type = vf.aggType;

    const values = rows
      .map(r => safeNumber(r[field]))
      .filter((v): v is number => v !== null);

    if (type === 'count') {
      // Counts all row items (even non-numeric ones)
      return rows.filter(r => r[field] !== undefined && r[field] !== null && r[field] !== '').length;
    }

    if (values.length === 0) return null;

    switch (type) {
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      case 'avg':
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'median':
        return getMedian(values);
      case 'distinct_count':
        return new Set(rows.map(r => String(r[field] || '')).filter(Boolean)).size;
      case 'pct_total':
        const sumVal = values.reduce((sum, v) => sum + v, 0);
        const grandSum = allRowsGrandTotals?.[field] || sumVal || 1;
        return parseFloat(((sumVal / grandSum) * 100).toFixed(2));
      case 'running_total':
        // Sum values; cumulative addition is resolved on post-pass of row nodes
        return values.reduce((sum, v) => sum + v, 0);
      default:
        return null;
    }
  });
}

export function buildPivotTable(
  dataRows: any[],
  rowFields: string[],
  colFields: string[],
  valueFields: PivotValueField[],
  totalsSettings: {
    grandTotal: boolean;
    rowTotals: boolean;
    colTotals: boolean;
    subtotals: boolean;
  }
): PivotResult {
  // Guard empty selection
  if (valueFields.length === 0) {
    return { rowFields: [], colFields: [], colKeys: [], colLabelMap: {}, matrix: [] };
  }

  // Pre-calculate grand totals for percent of total calculations
  const allRowsGrandTotals: { [field: string]: number } = {};
  valueFields.forEach(vf => {
    if (vf.aggType === 'pct_total') {
      const values = dataRows
        .map(r => safeNumber(r[vf.field]))
        .filter((v): v is number => v !== null);
      allRowsGrandTotals[vf.field] = values.reduce((sum, v) => sum + v, 0) || 1;
    }
  });

  // 1. Gather all unique column combinations in the dataset
  const colCombinationsSet = new Set<string>();
  dataRows.forEach(row => {
    const path = colFields.map(f => String(row[f] || '(Blank)')).join('|||');
    colCombinationsSet.add(path);
  });

  // Sorted column keys
  const sortedColPaths = Array.from(colCombinationsSet).sort();

  // Create columns list (colKey = "colGroupPath|||valueFieldIndex")
  const colKeys: string[] = [];
  const colLabelMap: { [colKey: string]: string } = {};

  sortedColPaths.forEach(colPath => {
    valueFields.forEach((vf, vfIdx) => {
      const key = colPath ? `${colPath}|||${vfIdx}` : `|||${vfIdx}`;
      colKeys.push(key);
      
      const valLabel = `${vf.aggType.toUpperCase()} of ${vf.field}`;
      const groupLabel = colPath ? colPath.replace(/\|\|\|/g, ' › ') : '';
      colLabelMap[key] = groupLabel ? `${groupLabel} (${valLabel})` : valLabel;
    });
  });

  // Calculate Row Grand Totals column keys if enabled
  const rowTotalsColKeys: string[] = [];
  if (totalsSettings.rowTotals) {
    valueFields.forEach((vf, vfIdx) => {
      const key = `Total|||${vfIdx}`;
      rowTotalsColKeys.push(key);
      colKeys.push(key);
      colLabelMap[key] = `Grand Total (${vf.aggType.toUpperCase()} of ${vf.field})`;
    });
  }

  // 2. Build recursive hierarchical row tree
  interface RawNode {
    path: string[];
    rows: any[];
    children: Map<string, RawNode>;
  }

  const rootNode: RawNode = { path: [], rows: dataRows, children: new Map() };

  // Recursively insert rows into nodes
  dataRows.forEach(row => {
    let curr = rootNode;
    rowFields.forEach((rf, depth) => {
      const val = String(row[rf] || '(Blank)');
      if (!curr.children.has(val)) {
        curr.children.set(val, {
          path: [...curr.path, val],
          rows: [],
          children: new Map()
        });
      }
      curr = curr.children.get(val)!;
      curr.rows.push(row);
    });
  });

  // 3. Flatten Tree to ordered list of Row Nodes (matrix)
  const matrix: PivotRowNode[] = [];

  // Helper to filter rows matching a specific column path combination
  const filterRowsByColPath = (rows: any[], colPath: string): any[] => {
    if (!colPath) return rows;
    const parts = colPath.split('|||');
    return rows.filter(r => 
      colFields.every((cf, idx) => String(r[cf] || '(Blank)') === parts[idx])
    );
  };

  const processNode = (node: RawNode, level: number) => {
    // Sort keys alphabetically
    const keys = Array.from(node.children.keys()).sort();
    
    keys.forEach(key => {
      const childNode = node.children.get(key)!;
      const pathSignature = childNode.path.join('|||');

      // Create row node
      const rowNode: PivotRowNode = {
        id: pathSignature,
        label: key,
        level,
        path: childNode.path,
        isSubtotal: false,
        isGrandTotal: false,
        cells: {}
      };

      // Populate cell values for each column combination
      sortedColPaths.forEach(colPath => {
        const matchingRows = filterRowsByColPath(childNode.rows, colPath);
        const aggValues = aggregateRows(matchingRows, valueFields, allRowsGrandTotals);
        
        valueFields.forEach((_, vfIdx) => {
          const key = colPath ? `${colPath}|||${vfIdx}` : `|||${vfIdx}`;
          rowNode.cells[key] = aggValues[vfIdx];
        });
      });

      // Calculate row grand totals (across column groups) if enabled
      if (totalsSettings.rowTotals) {
        const aggValues = aggregateRows(childNode.rows, valueFields, allRowsGrandTotals);
        valueFields.forEach((_, vfIdx) => {
          rowNode.cells[`Total|||${vfIdx}`] = aggValues[vfIdx];
        });
      }

      // Add to matrix
      matrix.push(rowNode);

      // If child has nested children, recurse
      if (childNode.children.size > 0) {
        processNode(childNode, level + 1);

        // Append Subtotal row for parent if enabled
        if (totalsSettings.subtotals && level < rowFields.length - 1) {
          const subtotalNode: PivotRowNode = {
            id: `${pathSignature}|||__subtotal`,
            label: `${key} (Total)`,
            level,
            path: childNode.path,
            isSubtotal: true,
            isGrandTotal: false,
            cells: { ...rowNode.cells } // inherits same aggregates calculated on parent childNode.rows
          };
          matrix.push(subtotalNode);
        }
      }
    });
  };

  // Start recursion
  processNode(rootNode, 0);

  // 4. Add Grand Total Row at bottom if enabled
  if (totalsSettings.grandTotal) {
    const grandNode: PivotRowNode = {
      id: '__grandtotal',
      label: 'Grand Total',
      level: 0,
      path: [],
      isSubtotal: false,
      isGrandTotal: true,
      cells: {}
    };

    // Aggregate col combinations on allRows
    sortedColPaths.forEach(colPath => {
      const matchingRows = filterRowsByColPath(dataRows, colPath);
      const aggValues = aggregateRows(matchingRows, valueFields, allRowsGrandTotals);
      
      valueFields.forEach((_, vfIdx) => {
        const key = colPath ? `${colPath}|||${vfIdx}` : `|||${vfIdx}`;
        grandNode.cells[key] = aggValues[vfIdx];
      });
    });

    // Row grand totals on allRows
    if (totalsSettings.rowTotals) {
      const aggValues = aggregateRows(dataRows, valueFields, allRowsGrandTotals);
      valueFields.forEach((_, vfIdx) => {
        grandNode.cells[`Total|||${vfIdx}`] = aggValues[vfIdx];
      });
    }

    matrix.push(grandNode);
  }

  // 5. Post-pass: Resolve Running Totals if configured
  valueFields.forEach((vf, vfIdx) => {
    if (vf.aggType === 'running_total') {
      // Keep a cumulative tracker per column group
      const colCumulativeMap: { [colKey: string]: number } = {};

      matrix.forEach(rowNode => {
        // Skip subtotal rows to prevent double counting running totals
        if (rowNode.isSubtotal) return;

        colKeys.forEach(colKey => {
          const keySuffix = `|||${vfIdx}`;
          if (colKey.endsWith(keySuffix)) {
            const val = Number(rowNode.cells[colKey]) || 0;
            colCumulativeMap[colKey] = (colCumulativeMap[colKey] || 0) + val;
            rowNode.cells[colKey] = colCumulativeMap[colKey];
          }
        });
      });
    }
  });

  return {
    rowFields,
    colFields,
    colKeys,
    colLabelMap,
    matrix
  };
}
