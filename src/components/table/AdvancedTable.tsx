import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Maximize2, 
  SlidersHorizontal,
  ChevronLast,
  ChevronFirst,
  X,
  Edit2,
  Undo,
  Redo
} from 'lucide-react';
import { SheetData } from '../../services/db';
import { toast } from '../ui/Toast';

interface AdvancedTableProps {
  sheetData: SheetData;
  globalSearch: string;
  headerMappings: { [key: string]: string };
  onRenameHeader: (original: string, renamed: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function AdvancedTable({ 
  sheetData, 
  globalSearch,
  headerMappings,
  onRenameHeader,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: AdvancedTableProps) {
  const { rows, headers, columnsInfo } = sheetData;

  // State Management
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [inlineFilters, setInlineFilters] = useState<{ [colName: string]: string }>({});
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);
  const [copiedCell, setCopiedCell] = useState<{ rowIdx: number; colName: string } | null>(null);
  const [copiedRowIdx, setCopiedRowIdx] = useState<number | null>(null);

  // 1. Detect if the first Excel column is a Serial Number
  const firstCol = headers[0];
  const isExcelFirstColSerial = useMemo(() => {
    if (!firstCol) return false;
    const lf = firstCol.toLowerCase().trim().replace(/[\.\s_-]/g, '');
    return (
      lf === 'sno' || 
      lf === 'srno' || 
      lf === 'slno' || 
      lf === 'serial' || 
      lf === 'serialno' || 
      lf === 'id' || 
      lf === 'index' || 
      lf === 'rownum' || 
      lf === 'rowno' || 
      lf === '#' || 
      lf === 'no' ||
      lf === 'sr' ||
      lf === 'sl'
    );
  }, [firstCol]);

  // 2. Define the Primary Display Column (Column B / second column of the Excel sheet)
  const primaryDisplayCol = headers[1] || headers[0] || '';

  // 3. Define the list of data columns in the order they should be displayed
  const tableDataHeaders = useMemo(() => {
    if (headers.length < 2) return headers;
    
    const colB = headers[1];
    const colA = headers[0];
    const remaining = headers.slice(2);
    
    if (isExcelFirstColSerial) {
      // Excel Column A is used directly as the S.No column
      return [colB, ...remaining];
    } else {
      // Excel Column A is NOT a serial number, so we use custom generated row number as S.No.
      return [colB, colA, ...remaining];
    }
  }, [headers, isExcelFirstColSerial]);

  // Sync visible columns when headers change
  useEffect(() => {
    setVisibleColumns(tableDataHeaders);
  }, [tableDataHeaders]);

  // Renaming & History States
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [contextMenuCol, setContextMenuCol] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const closeMenu = () => {
      setContextMenuCol(null);
      setContextMenuPos(null);
      setIsDropdownOpen(false);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const startEditing = (colName: string) => {
    setEditingHeader(colName);
    setEditingValue(headerMappings[colName] || colName);
  };

  const saveHeaderRename = () => {
    if (editingHeader && editingValue.trim() !== '') {
      onRenameHeader(editingHeader, editingValue.trim());
    }
    setEditingHeader(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveHeaderRename();
    } else if (e.key === 'Escape') {
      setEditingHeader(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, colName: string) => {
    e.preventDefault();
    setContextMenuCol(colName);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // Column Resizing State
  const [columnWidths, setColumnWidths] = useState<{ [colName: string]: number }>(() => {
    const widths: { [colName: string]: number } = {};
    headers.forEach(h => {
      widths[h] = 160; // Default width
    });
    return widths;
  });

  const resizingColRef = useRef<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Column Drag and Drop for Reordering
  const [draggedCol, setDraggedCol] = useState<string | null>(null);

  // Reset page when dataset changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows(new Set());
    setVisibleColumns(headers);
    setInlineFilters({});
    setExpandedRowIndex(null);
  }, [sheetData]);

  // Handle Sort Toggle
  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  // Filter & Sort Logic (Memoized)
  const filteredAndSortedRows = useMemo(() => {
    let result = rows.map((row, index) => ({ ...row, _originalIndex: index }));

    // 1. Global Search Filter
    if (globalSearch) {
      const searchLower = globalSearch.toLowerCase();
      result = result.filter(row => {
        return headers.some(header => {
          const val = String(row[header] || '').toLowerCase();
          return val.includes(searchLower);
        });
      });
    }

    // 2. Inline Column Filters
    Object.entries(inlineFilters).forEach(([colName, filterText]) => {
      if (filterText) {
        const textLower = filterText.toLowerCase();
        result = result.filter(row => {
          const val = String(row[colName] || '').toLowerCase();
          return val.includes(textLower);
        });
      }
    });

    // 3. Sorting
    if (sortColumn && sortDirection) {
      const isDateCol = columnsInfo.find(c => c.name === sortColumn)?.type === 'date';
      const isNumCol = ['numeric', 'currency', 'percentage'].includes(
        columnsInfo.find(c => c.name === sortColumn)?.type || ''
      );

      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === '' || valA === undefined || valA === null) return 1;
        if (valB === '' || valB === undefined || valB === null) return -1;

        if (isNumCol) {
          const numA = Number(String(valA).replace(/[\$,%\s]/g, '')) || 0;
          const numB = Number(String(valB).replace(/[\$,%\s]/g, '')) || 0;
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        if (isDateCol) {
          const dateA = new Date(valA).getTime() || 0;
          const dateB = new Date(valB).getTime() || 0;
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }

        // Default string comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc' 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      });
    }

    return result;
  }, [rows, headers, globalSearch, inlineFilters, sortColumn, sortDirection, columnsInfo]);

  // Pagination bounds
  const totalPages = Math.ceil(filteredAndSortedRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedRows.slice(start, start + rowsPerPage);
  }, [filteredAndSortedRows, currentPage, rowsPerPage]);

  // Handle Multi-Select Checkboxes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIdxs = filteredAndSortedRows.map(r => r._originalIndex);
      setSelectedRows(new Set(allIdxs));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  // Toggle Column Visibility
  const toggleColumnVisibility = (colName: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(colName)) {
        if (prev.length <= 1) {
          toast.warning("At least one column must be visible");
          return prev;
        }
        return prev.filter(c => c !== colName);
      } else {
        // Maintain original order relative to headers
        return headers.filter(h => h === colName || prev.includes(h));
      }
    });
  };

  // Column Resizing Mouse Handlers
  const handleResizeStart = (e: React.MouseEvent, colName: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColRef.current = colName;
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[colName] || 160;

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingColRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    const newWidth = Math.max(60, startWidthRef.current + deltaX);
    setColumnWidths(prev => ({
      ...prev,
      [resizingColRef.current!]: newWidth
    }));
  };

  const handleResizeEnd = () => {
    resizingColRef.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // Drag & Drop for columns
  const handleDragStart = (e: React.DragEvent, colName: string) => {
    setDraggedCol(colName);
  };

  const handleDragOver = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetCol: string) => {
    if (!draggedCol || draggedCol === targetCol) return;

    setVisibleColumns(prev => {
      const next = [...prev];
      const draggedIdx = next.indexOf(draggedCol);
      const targetIdx = next.indexOf(targetCol);
      
      if (draggedIdx !== -1 && targetIdx !== -1) {
        next.splice(draggedIdx, 1);
        next.splice(targetIdx, 0, draggedCol);
      }
      return next;
    });

    setDraggedCol(null);
  };

  // Copy Helpers
  const handleCopyCell = (value: any, rowIdx: number, colName: string) => {
    const valStr = value !== undefined && value !== null ? String(value) : '';
    navigator.clipboard.writeText(valStr).then(() => {
      setCopiedCell({ rowIdx, colName });
      setTimeout(() => setCopiedCell(null), 1500);
      toast.info(`Copied cell: "${valStr.slice(0, 20)}"`);
    });
  };

  const handleCopyRow = (row: any, rowIdx: number) => {
    const cleanRow = { ...row };
    delete cleanRow._originalIndex;
    navigator.clipboard.writeText(JSON.stringify(cleanRow, null, 2)).then(() => {
      setCopiedRowIdx(rowIdx);
      setTimeout(() => setCopiedRowIdx(null), 1500);
      toast.info("Copied entire row values as JSON");
    });
  };

  // Text highlighting matching search terms
  const renderHighlighted = (value: any, search: string) => {
    const valStr = value !== undefined && value !== null ? String(value) : '';
    if (!search) return <span>{valStr}</span>;

    const parts = valStr.split(new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-yellow-250 dark:bg-yellow-950/70 dark:text-yellow-100 rounded-[2px] px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Inline filter change handler
  const handleFilterChange = (colName: string, val: string) => {
    setInlineFilters(prev => ({
      ...prev,
      [colName]: val
    }));
    setCurrentPage(1);
  };

  const handleExportSelected = () => {
    if (selectedRows.size === 0) {
      toast.warning("Please select at least one row to export");
      return;
    }
    const selectedData = rows.filter((_, idx) => selectedRows.has(idx));
    
    // Standard CSV Export
    const csvContent = [
      headers.join(','),
      ...selectedData.map(row => 
        headers.map(h => {
          const val = String(row[h] || '').replace(/"/g, '""');
          return `"${val}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'selected_records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${selectedData.length} selected rows`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Table Actions Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-dashboard shadow-sm">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4.5 w-4.5 text-slate-400" />
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-350">
            Showing {filteredAndSortedRows.length.toLocaleString()} of {rows.length.toLocaleString()} records
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Undo / Redo Toolbar */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-850 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 rounded hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-205 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Undo Rename (Ctrl+Z)"
            >
              <Undo className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 rounded hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-205 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Redo Rename"
            >
              <Redo className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Column visibility dropdown toggle */}
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(prev => !prev);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-205 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-650 dark:text-slate-300 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Columns</span>
            </button>
            {isDropdownOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-xl p-3 z-30 max-h-60 overflow-y-auto"
              >
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">Show/Hide Columns</p>
                <div className="space-y-1.5">
                  {headers.filter(h => !(isExcelFirstColSerial && h === headers[0])).map(h => (
                    <label key={h} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(h)}
                        onChange={() => toggleColumnVisibility(h)}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="truncate">{headerMappings[h] || h}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export button */}
          {selectedRows.size > 0 && (
            <button
              onClick={handleExportSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Selected ({selectedRows.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-dashboard shadow-dashboard overflow-hidden">
        
        {/* Table wrapper with scroll */}
        <div className="overflow-x-auto max-h-[580px] table-container">
          <table className="w-full border-collapse text-left text-xs text-slate-700 dark:text-slate-300">
            {/* Headers */}
            <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-20 border-b border-slate-250 dark:border-slate-800">
              <tr>
                {/* Checkbox Header */}
                <th className="p-3 w-10 sticky left-0 bg-slate-50 dark:bg-slate-800 z-35 border-r border-slate-200/50 dark:border-slate-800/50">
                  <input
                    type="checkbox"
                    checked={filteredAndSortedRows.length > 0 && selectedRows.size === filteredAndSortedRows.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                </th>

                {/* Column Headers */}
                {visibleColumns.map((colName, index) => {
                  const isSorted = sortColumn === colName;
                  const width = columnWidths[colName] || 160;

                  return (
                    <th
                      key={colName}
                      draggable
                      onDragStart={(e) => handleDragStart(e, colName)}
                      onDragOver={(e) => handleDragOver(e, colName)}
                      onDrop={(e) => handleDrop(e, colName)}
                      onContextMenu={(e) => handleContextMenu(e, colName)}
                      style={{ width }}
                      className={`p-3 font-semibold relative text-slate-800 dark:text-slate-200 border-r border-slate-200/40 dark:border-slate-800/40 cursor-grab active:cursor-grabbing hover:bg-slate-100/50 dark:hover:bg-slate-800 select-none group/header ${
                        index === 0 ? 'sticky left-10 z-25 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] bg-slate-50 dark:bg-slate-800' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        {editingHeader === colName ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveHeaderRename}
                            onKeyDown={handleEditKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 border border-primary px-1.5 py-0.5 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary cursor-text font-normal text-slate-800 dark:text-slate-200"
                            autoFocus
                          />
                        ) : (
                          <div 
                            className="flex items-center gap-1 cursor-pointer truncate max-w-[85%] pr-4" 
                            onClick={() => handleSort(colName)}
                            onDoubleClick={() => startEditing(colName)}
                          >
                            <span className="truncate">
                              {headerMappings[colName] || colName}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(colName);
                              }}
                              className="opacity-0 group-hover/header:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-650 transition-all ml-1 flex-shrink-0"
                              title="Double click to Rename"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        
                        {/* Sort Indicator */}
                        <div className="flex flex-col text-slate-400 dark:text-slate-550 flex-shrink-0" onClick={() => handleSort(colName)}>
                          {isSorted && sortDirection === 'asc' ? (
                            <ChevronUp className="h-3 w-3 text-primary" />
                          ) : isSorted && sortDirection === 'desc' ? (
                            <ChevronDown className="h-3 w-3 text-primary" />
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <ChevronUp className="h-2 w-2 opacity-30" />
                              <ChevronDown className="h-2 w-2 opacity-30" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Inline Column Filter box */}
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={inlineFilters[colName] || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleFilterChange(colName, e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] px-1.5 py-1 rounded placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>

                      {/* Resize Handle */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, colName)}
                        className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
                      />
                    </th>
                  );
                })}
                <th className="p-3 w-16 text-center">Actions</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, rIdx) => {
                  const oIdx = row._originalIndex;
                  const isSelected = selectedRows.has(oIdx);
                  const isExpanded = expandedRowIndex === oIdx;
                  const rowNum = (currentPage - 1) * rowsPerPage + rIdx + 1;

                  return (
                    <React.Fragment key={oIdx}>
                      <tr
                        onDoubleClick={() => setExpandedRowIndex(isExpanded ? null : oIdx)}
                        className={`group border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 even:bg-slate-50/20 dark:even:bg-slate-800/10 transition-colors ${
                          isSelected ? 'bg-primary/5 dark:bg-primary/15' : ''
                        }`}
                      >
                        {/* Checkbox Cell */}
                        <td className={`p-3 border-r border-slate-200/50 dark:border-slate-800/50 sticky left-0 z-10 transition-colors ${
                          isSelected 
                            ? 'bg-blue-50/70 dark:bg-slate-800' 
                            : 'bg-white dark:bg-slate-900 group-hover:bg-slate-100/50 dark:group-hover:bg-slate-800 group-even:bg-slate-50 group-even:dark:bg-[#131b2e]'
                        }`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(oIdx, e.target.checked)}
                            className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                        </td>

                        {/* Serial Number Cell */}
                        {/* Data Cells */}
                        {visibleColumns.map((colName, cIdx) => {
                          const val = row[colName];
                          const width = columnWidths[colName] || 160;

                          return (
                            <td
                              key={colName}
                              style={{ width }}
                              className={`p-3 truncate align-middle border-r border-slate-200/40 dark:border-slate-800/40 relative group ${
                                cIdx === 0 
                                  ? `sticky left-10 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] font-semibold transition-colors ${
                                      isSelected 
                                        ? 'bg-blue-50/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200' 
                                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 group-hover:bg-slate-100/50 dark:group-hover:bg-slate-800 group-even:bg-slate-50 group-even:dark:bg-[#131b2e]'
                                    }`
                                  : 'transition-colors'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 group">
                                <span className="truncate">
                                  {renderHighlighted(val, globalSearch)}
                                </span>
                                
                                {/* Quick copy cell option */}
                                <button
                                  onClick={() => handleCopyCell(val, oIdx, colName)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-opacity ml-1.5"
                                  title="Copy Cell"
                                >
                                  {copiedCell?.rowIdx === oIdx && copiedCell?.colName === colName ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          );
                        })}

                        {/* Actions Cell */}
                        <td className="p-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setExpandedRowIndex(isExpanded ? null : oIdx)}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors"
                              title="Double click to Expand"
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleCopyRow(row, oIdx)}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors"
                              title="Copy Row JSON"
                            >
                              {copiedRowIdx === oIdx ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded View Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                          <td colSpan={visibleColumns.length + 2} className="p-4 border-b border-slate-205 dark:border-slate-800">
                            <div className="bg-white dark:bg-slate-950/80 border border-slate-150 dark:border-slate-800 p-4 rounded-xl space-y-3 relative">
                              <button 
                                onClick={() => setExpandedRowIndex(null)}
                                className="absolute right-3 top-3 text-slate-450 hover:text-slate-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <h5 className="font-bold text-[13px] text-slate-800 dark:text-slate-200">
                                Detailed Row View: {row[primaryDisplayCol] !== undefined && row[primaryDisplayCol] !== null ? String(row[primaryDisplayCol]) : `Record #${oIdx + 1}`}
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                {headers.map(h => (
                                  <div key={h} className="p-2.5 border border-slate-100 dark:border-slate-800 rounded-lg">
                                    <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] block">
                                      {h}
                                    </span>
                                    <span className="text-slate-700 dark:text-slate-300 font-semibold block mt-1 break-words">
                                      {row[h] !== undefined && row[h] !== null ? String(row[h]) : '(Blank)'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length + 3} className="text-center py-12 text-slate-400">
                    No matching records found. Try resetting filters or changing your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-50/50 dark:bg-slate-800/10">
          {/* Rows Per Page */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-xs cursor-pointer focus:outline-none"
            >
              {[10, 25, 50, 100, 250].map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg text-slate-550 dark:text-slate-400 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
            >
              <ChevronFirst className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg text-slate-550 dark:text-slate-400 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="text-xs font-bold text-slate-600 dark:text-slate-350 px-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg text-slate-550 dark:text-slate-400 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg text-slate-550 dark:text-slate-400 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
            >
              <ChevronLast className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Custom Context Menu for Renaming */}
      {contextMenuPos && contextMenuCol && (
        <div
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          className="fixed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1.5 z-[100] w-40 text-xs text-slate-700 dark:text-slate-350 animate-fade-in"
        >
          <button
            onClick={() => {
              startEditing(contextMenuCol);
              setContextMenuCol(null);
              setContextMenuPos(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-2 font-semibold"
          >
            <Edit2 className="h-3.5 w-3.5 text-slate-400" />
            <span>Rename Column</span>
          </button>
        </div>
      )}
    </div>
  );
}
