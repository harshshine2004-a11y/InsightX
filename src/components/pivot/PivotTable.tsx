import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SheetData, dbService, SavedPivot } from '../../services/db';
import { buildPivotTable, PivotValueField, PivotRowNode } from '../../utils/pivotEngine';
import { exporters } from '../../utils/exporters';
import { 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Save, 
  FolderOpen, 
  Activity, 
  Printer, 
  X, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  Eye, 
  Download,
  BarChart3, 
  LineChart as LineIcon, 
  PieChart as PieIcon, 
  AreaChart as AreaIcon,
  Search,
  Hash,
  Calendar,
  Type,
  ListFilter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { toast } from '../ui/Toast';

interface PivotTableProps {
  sheetData: SheetData;
  workbookId: string;
  activeSheetName: string;
}

type DragTarget = 'rows' | 'columns' | 'values' | 'filters';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#06B6D4', '#14B8A6'];

export function PivotTable({ sheetData, workbookId, activeSheetName }: PivotTableProps) {
  const { rows: dataRows, headers } = sheetData;

  // Pivot Builder Configurations State
  const [rowFields, setRowFields] = useState<string[]>([]);
  const [colFields, setColFields] = useState<string[]>([]);
  const [valueFields, setValueFields] = useState<PivotValueField[]>([]);
  const [totalsSettings, setTotalsSettings] = useState({
    grandTotal: true,
    rowTotals: true,
    colTotals: true,
    subtotals: true
  });

  // Filter States
  const [filterFieldValues, setFilterFieldValues] = useState<{ [field: string]: string[] }>({});
  const [activeFilters, setActiveFilters] = useState<{ [field: string]: string[] }>({});
  const [selectedFilterField, setSelectedFilterField] = useState<string | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');

  // Available Fields Search & Category Sorting
  const [fieldSearch, setFieldSearch] = useState('');

  // UI Interactive States
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  const [savedConfigs, setSavedConfigs] = useState<SavedPivot[]>([]);
  const [configName, setConfigName] = useState('');
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [pivotChartType, setPivotChartType] = useState<'bar' | 'line' | 'area' | 'donut' | 'pie' | 'column'>('column');

  // Drag State Tracker
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<DragTarget | null>(null);

  // Sorting Configuration
  const [sortSettings, setSortSettings] = useState<{
    type: 'label' | 'value';
    colKey?: string;
    order: 'asc' | 'desc';
  }>({ type: 'label', order: 'asc' });

  // Load saved pivot templates on sheet / workbook change
  useEffect(() => {
    loadSavedPivots();
    resetPivotBuilder();
  }, [workbookId, activeSheetName]);

  const loadSavedPivots = async () => {
    try {
      const pivots = await dbService.getPivotsForWorkbook(workbookId);
      setSavedConfigs(pivots.filter(p => p.sheetName === activeSheetName));
    } catch (err) {
      console.error(err);
    }
  };

  const resetPivotBuilder = () => {
    // Default configuration to make the pivot table useful on load
    const catCol = sheetData.columnsInfo.find(c => c.type === 'category')?.name || headers[0];
    const numCol = sheetData.columnsInfo.find(c => ['numeric', 'currency'].includes(c.type))?.name;
    
    if (catCol) setRowFields([catCol]);
    if (numCol) {
      setValueFields([{ field: numCol, aggType: 'sum' }]);
    } else if (headers[0]) {
      setValueFields([{ field: headers[0], aggType: 'count' }]);
    }
    setColFields([]);
    setCollapsedRows(new Set());
    setActiveConfigId(null);
    setActiveFilters({});
    setFilterFieldValues({});
  };

  // Drag & Drop Handlers
  const handleDragStart = (field: string) => {
    setDraggingField(field);
  };

  const handleDragOver = (e: React.DragEvent, zone: DragTarget) => {
    e.preventDefault();
    setDragOverZone(zone);
  };

  const handleDragLeave = () => {
    setDragOverZone(null);
  };

  const handleFieldDrop = (target: DragTarget) => {
    if (!draggingField) return;

    if (target === 'rows') {
      if (!rowFields.includes(draggingField)) {
        setRowFields(prev => [...prev, draggingField]);
        setColFields(prev => prev.filter(f => f !== draggingField));
      }
    } else if (target === 'columns') {
      if (!colFields.includes(draggingField)) {
        setColFields(prev => [...prev, draggingField]);
        setRowFields(prev => prev.filter(f => f !== draggingField));
      }
    } else if (target === 'values') {
      setValueFields(prev => [...prev, { field: draggingField, aggType: 'sum' }]);
    } else if (target === 'filters') {
      if (!activeFilters[draggingField]) {
        const uniqueValues = Array.from(new Set(dataRows.map(r => String(r[draggingField] || '(Blank)'))));
        setFilterFieldValues(prev => ({ ...prev, [draggingField]: uniqueValues }));
        setActiveFilters(prev => ({ ...prev, [draggingField]: uniqueValues }));
      }
    }

    setDraggingField(null);
    setDragOverZone(null);
  };

  const removeField = (field: string, target: DragTarget, idx?: number) => {
    if (target === 'rows') {
      setRowFields(prev => prev.filter(f => f !== field));
    } else if (target === 'columns') {
      setColFields(prev => prev.filter(f => f !== field));
    } else if (target === 'values') {
      if (idx !== undefined) {
        setValueFields(prev => prev.filter((_, i) => i !== idx));
      }
    } else if (target === 'filters') {
      setActiveFilters(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      setFilterFieldValues(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateValueAggregation = (idx: number, aggType: PivotValueField['aggType']) => {
    setValueFields(prev => prev.map((vf, i) => i === idx ? { ...vf, aggType } : vf));
  };

  // Reordering Arrow buttons helpers
  const moveField = (target: DragTarget, idx: number, direction: 'up' | 'down') => {
    const swap = (arr: any[], i: number, j: number) => {
      const copy = [...arr];
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
      return copy;
    };

    if (target === 'rows') {
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx >= 0 && targetIdx < rowFields.length) {
        setRowFields(prev => swap(prev, idx, targetIdx));
      }
    } else if (target === 'columns') {
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx >= 0 && targetIdx < colFields.length) {
        setColFields(prev => swap(prev, idx, targetIdx));
      }
    } else if (target === 'values') {
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx >= 0 && targetIdx < valueFields.length) {
        setValueFields(prev => swap(prev, idx, targetIdx));
      }
    }
  };

  // Filter raw data rows by active Pivot Filters
  const filteredRows = useMemo(() => {
    return dataRows.filter(row => {
      return Object.entries(activeFilters).every(([field, selectedVals]) => {
        const val = String(row[field] || '(Blank)');
        return selectedVals.includes(val);
      });
    });
  }, [dataRows, activeFilters]);

  // Compute Pivot table dataset matrix (Memoized)
  const pivotResult = useMemo(() => {
    return buildPivotTable(filteredRows, rowFields, colFields, valueFields, totalsSettings);
  }, [filteredRows, rowFields, colFields, valueFields, totalsSettings]);

  // Recursive Tree-Sort helper to preserve hierarchy
  const sortTreeNodes = (nodes: PivotRowNode[], parentId: string | null): PivotRowNode[] => {
    const children = nodes.filter(n => {
      if (parentId === null) {
        return n.path.length === 1 && !n.isGrandTotal && !n.isSubtotal;
      }
      const parentPath = parentId.split('|||');
      return (
        n.path.length === parentPath.length + 1 && 
        n.path.slice(0, parentPath.length).join('|||') === parentId && 
        !n.isSubtotal && 
        !n.isGrandTotal
      );
    });

    children.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortSettings.type === 'label') {
        valA = a.label;
        valB = b.label;
      } else if (sortSettings.colKey) {
        valA = a.cells[sortSettings.colKey];
        valB = b.cells[sortSettings.colKey];
      }

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortSettings.order === 'asc' ? valA - valB : valB - valA;
      }
      
      return sortSettings.order === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    const result: PivotRowNode[] = [];
    children.forEach(child => {
      result.push(child);
      const childId = child.path.join('|||');
      
      // Find subtotal node for this group if it exists
      const subtotalNode = nodes.find(n => n.isSubtotal && n.id === `${childId}|||_subtotal`);
      
      // Recursively fetch children
      const subTree = sortTreeNodes(nodes, childId);
      result.push(...subTree);
      
      if (subtotalNode) {
        result.push(subtotalNode);
      }
    });

    return result;
  };

  // Filter matrix to hide children of collapsed rows & apply sorting
  const visibleRowMatrix = useMemo(() => {
    const rawMatrix = pivotResult.matrix;
    if (rawMatrix.length === 0) return [];

    // Apply recursive sorting
    const sortedMatrix = sortTreeNodes(rawMatrix, null);

    // Re-append Grand Total at the bottom
    const grandTotalNode = rawMatrix.find(n => n.isGrandTotal);
    if (grandTotalNode) {
      sortedMatrix.push(grandTotalNode);
    }

    return sortedMatrix.filter(node => {
      if (node.isGrandTotal) return true;

      const pathParts = node.path;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const ancestorPath = pathParts.slice(0, i + 1).join('|||');
        if (collapsedRows.has(ancestorPath)) {
          return false;
        }
      }
      return true;
    });
  }, [pivotResult.matrix, collapsedRows, sortSettings]);

  const toggleRowCollapse = (rowPathId: string) => {
    setCollapsedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowPathId)) {
        next.delete(rowPathId);
      } else {
        next.add(rowPathId);
      }
      return next;
    });
  };

  const collapseAll = () => {
    const next = new Set<string>();
    pivotResult.matrix.forEach(node => {
      if (node.path.length > 0 && !node.isSubtotal && !node.isGrandTotal) {
        next.add(node.path.join('|||'));
      }
    });
    setCollapsedRows(next);
  };

  const expandAll = () => {
    setCollapsedRows(new Set());
  };

  // Save Config offline
  const handleSaveConfig = async () => {
    if (!configName.trim()) {
      toast.warning("Please enter a name for this pivot configuration");
      return;
    }

    try {
      const newConfig: SavedPivot = {
        id: activeConfigId || Math.random().toString(36).substring(2, 9),
        name: configName.trim(),
        workbookId,
        sheetName: activeSheetName,
        rows: rowFields,
        columns: colFields,
        values: valueFields,
        totalsSettings
      };

      await dbService.savePivot(newConfig);
      toast.success(`Saved configuration "${newConfig.name}"`);
      setConfigName('');
      loadSavedPivots();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save configuration locally");
    }
  };

  const handleLoadConfig = (config: SavedPivot) => {
    setRowFields(config.rows);
    setColFields(config.columns);
    setValueFields(config.values as PivotValueField[]);
    setTotalsSettings(config.totalsSettings);
    setActiveConfigId(config.id);
    toast.info(`Loaded Pivot Layout: "${config.name}"`);
  };

  const handleDeleteConfig = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this pivot configuration from local storage?")) return;
    try {
      await dbService.deletePivot(id);
      toast.success("Configuration deleted");
      loadSavedPivots();
      if (activeConfigId === id) setActiveConfigId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Export flat list structure
  const getFlatExportData = () => {
    const { matrix, colKeys, colLabelMap } = pivotResult;
    const exportHeaders = [...rowFields, ...colKeys.map(c => colLabelMap[c])];

    const exportRows = matrix.map(node => {
      const rowObj: any = {};
      rowFields.forEach((rf, idx) => {
        rowObj[rf] = node.path[idx] || '';
      });

      if (node.isSubtotal) {
        rowObj[rowFields[0]] = `${node.label}`;
      }
      if (node.isGrandTotal) {
        rowObj[rowFields[0]] = 'Grand Total';
      }

      colKeys.forEach(col => {
        const val = node.cells[col];
        rowObj[colLabelMap[col]] = val !== undefined && val !== null ? val : '';
      });

      return rowObj;
    });

    return { exportHeaders, exportRows };
  };

  const handleExportCSV = () => {
    const { exportHeaders, exportRows } = getFlatExportData();
    exporters.exportToCSV(exportRows, exportHeaders, `${activeSheetName}_pivot_export.csv`);
  };

  const handleExportExcel = () => {
    const { exportHeaders, exportRows } = getFlatExportData();
    exporters.exportToExcel(exportRows, activeSheetName, `${activeSheetName}_pivot_export.xlsx`, exportHeaders);
  };

  const handleExportPDF = () => {
    const { exportHeaders, exportRows } = getFlatExportData();
    exporters.exportToPDF(exportRows, exportHeaders, activeSheetName, `${activeSheetName}_pivot_export.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Available Fields Sorting & Search
  const categorizedFields = useMemo(() => {
    const searched = headers.filter(f => f.toLowerCase().includes(fieldSearch.toLowerCase()));
    const dimensionsList: string[] = [];
    const measuresList: string[] = [];

    searched.forEach(f => {
      const type = sheetData.columnsInfo.find(c => c.name === f)?.type;
      if (['numeric', 'currency', 'percentage'].includes(type || '')) {
        measuresList.push(f);
      } else {
        dimensionsList.push(f);
      }
    });

    return { dimensions: dimensionsList, measures: measuresList };
  }, [headers, fieldSearch, sheetData.columnsInfo]);

  // Checkbox state calculator
  const isFieldInConfig = (field: string) => {
    return (
      rowFields.includes(field) ||
      colFields.includes(field) ||
      valueFields.some(v => v.field === field) ||
      Object.keys(activeFilters).includes(field)
    );
  };

  const handleCheckboxToggle = (field: string) => {
    const isActive = isFieldInConfig(field);
    if (isActive) {
      // Remove from all configurations
      setRowFields(prev => prev.filter(f => f !== field));
      setColFields(prev => prev.filter(f => f !== field));
      setValueFields(prev => prev.filter(v => v.field !== field));
      setActiveFilters(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
      setFilterFieldValues(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    } else {
      // Auto-categorize to Values if numeric, else to Rows
      const isNum = ['numeric', 'currency', 'percentage'].includes(
        sheetData.columnsInfo.find(c => c.name === field)?.type || ''
      );
      if (isNum) {
        setValueFields(prev => [...prev, { field, aggType: 'sum' }]);
      } else {
        setRowFields(prev => [...prev, field]);
      }
    }
  };

  // Dynamic filter values checklist actions
  const openFilterModal = (field: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFilterField(field);
    setFilterSearchQuery('');
  };

  const handleToggleAllFilterValues = (field: string, checked: boolean) => {
    if (checked) {
      setActiveFilters(prev => ({ ...prev, [field]: filterFieldValues[field] }));
    } else {
      setActiveFilters(prev => ({ ...prev, [field]: [] }));
    }
  };

  const handleToggleSingleFilterValue = (field: string, value: string) => {
    setActiveFilters(prev => {
      const current = prev[field] || [];
      const next = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  // Recharts visualizer data prep (Top 15 rows)
  const chartData = useMemo(() => {
    const { colKeys } = pivotResult;
    if (colKeys.length === 0) return [];
    
    const cleanRows = visibleRowMatrix.filter(r => !r.isSubtotal && !r.isGrandTotal);
    return cleanRows.slice(0, 15).map(node => {
      const dataPoint: any = { name: node.path.join(' › ') || node.label };
      colKeys.forEach(col => {
        dataPoint[col] = node.cells[col] || 0;
      });
      return dataPoint;
    });
  }, [visibleRowMatrix, pivotResult]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* 1. Saved presets header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-850 dark:text-white flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-primary" />
              <span>Interactive Pivot Table</span>
            </h3>
            <p className="text-[11px] text-slate-450 dark:text-slate-550 mt-0.5">
              Replicate Excel workflows: drag fields to builder zones, expand/collapse groups, toggle aggregation math, and render charts.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="text"
              placeholder="Layout Name..."
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary w-36 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
            <button
              onClick={handleSaveConfig}
              className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Layout</span>
            </button>
            <button
              onClick={resetPivotBuilder}
              className="border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {savedConfigs.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center pt-2.5 border-t border-slate-100 dark:border-slate-850">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider flex items-center gap-1 mr-1">
              <FolderOpen className="h-3.5 w-3.5" /> Saved Layouts:
            </span>
            {savedConfigs.map(cfg => (
              <div 
                key={cfg.id}
                onClick={() => handleLoadConfig(cfg)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all ${
                  activeConfigId === cfg.id
                    ? 'bg-primary/5 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-dark'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cfg.name}</span>
                <button
                  onClick={(e) => handleDeleteConfig(cfg.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-500 p-0.5 rounded transition-all"
                  title="Delete Layout"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Main three-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* PANEL A (LEFT): Available Fields Checklist */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard flex flex-col h-[600px]">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-450 dark:text-slate-555 uppercase tracking-wider flex items-center gap-1">
              <Eye className="h-4 w-4 text-primary" /> Pivot Fields list
            </h4>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search columns..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
              {fieldSearch && (
                <button onClick={() => setFieldSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
            {/* Dimensions (Text/Date) */}
            {categorizedFields.dimensions.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Dimensions</span>
                {categorizedFields.dimensions.map(field => {
                  const active = isFieldInConfig(field);
                  const isDate = sheetData.columnsInfo.find(c => c.name === field)?.type === 'date';
                  return (
                    <div
                      key={field}
                      draggable
                      onDragStart={() => handleDragStart(field)}
                      className={`group flex items-center justify-between p-2 rounded-xl border transition-all cursor-grab active:cursor-grabbing shadow-sm hover:border-slate-350 dark:hover:border-slate-700 ${
                        active 
                          ? 'border-primary/20 bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary-dark' 
                          : 'border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => handleCheckboxToggle(field)}
                          className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5 flex-shrink-0 cursor-pointer"
                        />
                        {isDate ? <Calendar className="h-3.5 w-3.5 text-slate-400" /> : <Type className="h-3.5 w-3.5 text-slate-400" />}
                        <span className="text-xs font-semibold truncate select-none">{field}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Measures (Numerics) */}
            {categorizedFields.measures.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">Measures</span>
                {categorizedFields.measures.map(field => {
                  const active = isFieldInConfig(field);
                  return (
                    <div
                      key={field}
                      draggable
                      onDragStart={() => handleDragStart(field)}
                      className={`group flex items-center justify-between p-2 rounded-xl border transition-all cursor-grab active:cursor-grabbing shadow-sm hover:border-slate-350 dark:hover:border-slate-700 ${
                        active 
                          ? 'border-primary/20 bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary-dark' 
                          : 'border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => handleCheckboxToggle(field)}
                          className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5 flex-shrink-0 cursor-pointer"
                        />
                        <Hash className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-semibold truncate select-none">{field}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* PANEL B (CENTER): Generated Pivot Table & Visualizer */}
        <div className="lg:col-span-2 space-y-6 flex flex-col min-w-0">
          
          {/* Main Table Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-dashboard shadow-dashboard overflow-hidden">
            {/* Toolbar exports */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800 dark:text-white block">
                  Generated Pivot Grid
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                  Matrix size: {visibleRowMatrix.length.toLocaleString()} nodes
                </span>
              </div>
              
              {/* Sorting toolbar controls */}
              {pivotResult.colKeys.length > 0 && (
                <div className="flex items-center gap-2 text-[11px] bg-slate-100/55 dark:bg-slate-805 p-1.5 rounded-lg">
                  <span className="text-slate-400 font-semibold">Sort:</span>
                  <select
                    value={sortSettings.type}
                    onChange={(e) => setSortSettings(prev => ({ ...prev, type: e.target.value as any }))}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 text-[10px] focus:outline-none text-slate-700 dark:text-slate-350"
                  >
                    <option value="label">Row Labels</option>
                    {pivotResult.colKeys.map(k => (
                      <option key={k} value="value">{pivotResult.colLabelMap[k]}</option>
                    ))}
                  </select>
                  <select
                    value={sortSettings.order}
                    onChange={(e) => setSortSettings(prev => ({ ...prev, order: e.target.value as any }))}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 text-[10px] focus:outline-none text-slate-700 dark:text-slate-350"
                  >
                    <option value="asc">A-Z / Ascending</option>
                    <option value="desc">Z-A / Descending</option>
                  </select>
                </div>
              )}

              <div className="flex gap-1.5">
                <button
                  onClick={handlePrint}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:bg-slate-55 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  title="Print Layout"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  onClick={handleExportCSV}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:bg-slate-55 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  title="Export CSV"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={handleExportExcel}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:bg-slate-55 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  title="Export Excel"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
                <button
                  onClick={handleExportPDF}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:bg-slate-55 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  title="Export PDF"
                >
                  <ListFilter className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Pivot table scroll container */}
            {pivotResult.colKeys.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full border-collapse text-left text-xs border-b border-slate-200 dark:border-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-100">
                    <tr>
                      {rowFields.map((rf, idx) => (
                        <th 
                          key={rf} 
                          style={{ left: `${idx * 120}px` }}
                          className="p-3 border-r border-slate-200/50 dark:border-slate-800/50 sticky bg-slate-50 dark:bg-slate-800 z-21 min-w-[120px]"
                        >
                          {rf}
                        </th>
                      ))}
                      {pivotResult.colKeys.map(colKey => (
                        <th key={colKey} className="p-3 text-right border-r border-slate-200/50 dark:border-slate-800/50 truncate max-w-[180px]" title={pivotResult.colLabelMap[colKey]}>
                          {pivotResult.colLabelMap[colKey]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {visibleRowMatrix.map((node) => {
                      const isCollapsed = collapsedRows.has(node.id);
                      const isParent = node.path.length < rowFields.length && !node.isSubtotal && !node.isGrandTotal;
                      
                      let rowStyle = "hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group";
                      if (node.isGrandTotal) {
                        rowStyle = "bg-slate-50/80 dark:bg-slate-800/60 font-bold border-t-2 border-slate-200 dark:border-slate-800 group";
                      } else if (node.isSubtotal) {
                        rowStyle = "bg-slate-50/30 dark:bg-slate-900/40 font-semibold text-slate-605 dark:text-slate-400 italic group";
                      }

                      return (
                        <tr key={node.id} className={rowStyle}>
                          {/* Sticky hierarchy row headers */}
                          {rowFields.map((_, colIdx) => {
                            const isValueHeader = colIdx === node.level;
                            const isAncestor = colIdx < node.level;

                            if (isAncestor && !node.isSubtotal && !node.isGrandTotal) {
                              return (
                                <td 
                                  key={colIdx} 
                                  style={{ left: `${colIdx * 120}px` }}
                                  className="p-3 border-r border-slate-200/30 dark:border-slate-800/20 sticky bg-white dark:bg-slate-900 group-hover:bg-slate-100/50 dark:group-hover:bg-slate-800/50 group-even:bg-slate-50 dark:group-even:bg-[#0f172a] z-10"
                                ></td>
                              );
                            }

                            if (isValueHeader || node.isSubtotal || node.isGrandTotal) {
                              const showChevron = isParent && colIdx === node.level;
                              
                              let text = node.label;
                              if (node.isGrandTotal && colIdx === 0) text = 'Grand Total';
                              else if (node.isGrandTotal) text = '';
                              else if (node.isSubtotal && colIdx > node.level) text = '';

                              return (
                                <td 
                                  key={colIdx} 
                                  style={{ left: `${colIdx * 120}px` }}
                                  className={`p-3 border-r border-slate-200/30 dark:border-slate-800/20 sticky bg-white dark:bg-slate-900 group-hover:bg-slate-100/50 dark:group-hover:bg-slate-800/50 group-even:bg-slate-50 dark:group-even:bg-[#0f172a] z-10 align-middle ${
                                    node.isGrandTotal ? 'font-bold' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5" style={{ paddingLeft: `${node.isSubtotal ? 10 : 0}px` }}>
                                    {showChevron && (
                                      <button
                                        onClick={() => toggleRowCollapse(node.id)}
                                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                                      >
                                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                      </button>
                                    )}
                                    <span className={isParent ? 'font-bold text-slate-850 dark:text-slate-200' : 'text-slate-700 dark:text-slate-300'}>
                                      {text}
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td 
                                key={colIdx} 
                                style={{ left: `${colIdx * 120}px` }}
                                className="p-3 border-r border-slate-200/30 dark:border-slate-800/20 sticky bg-white dark:bg-slate-900 group-hover:bg-slate-100/50 dark:group-hover:bg-slate-800/50 group-even:bg-slate-50 dark:group-even:bg-[#0f172a] z-10"
                              ></td>
                            );
                          })}

                          {/* Cell aggregates */}
                          {pivotResult.colKeys.map(colKey => {
                            const val = node.cells[colKey];
                            return (
                              <td 
                                key={colKey} 
                                className="p-3 text-right font-medium border-r border-slate-200/20 dark:border-slate-800/10 text-slate-700 dark:text-slate-300"
                              >
                                {val !== null && val !== undefined
                                  ? typeof val === 'number' 
                                    ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                                    : val
                                  : '-'
                                }
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                Drag fields from left/right panels to display a working pivot data table layout.
              </div>
            )}
          </div>

          {/* Pivot Chart visualization */}
          {chartData.length > 0 && pivotResult.colKeys.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div>
                  <h4 className="text-[13px] font-bold text-slate-805 dark:text-white">
                    Pivot Visual Charts
                  </h4>
                  <p className="text-[11px] text-slate-450 dark:text-slate-500">
                    Auto-generated chart trends representing your active pivot matrix.
                  </p>
                </div>

                {/* Chart selector controls */}
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/40 p-1 rounded-xl">
                  {[
                    { id: 'column' as const, icon: BarChart3, label: 'Column' },
                    { id: 'bar' as const, icon: BarChart3, label: 'Bar' },
                    { id: 'line' as const, icon: LineIcon, label: 'Line' },
                    { id: 'area' as const, icon: AreaIcon, label: 'Area' },
                    { id: 'pie' as const, icon: PieIcon, label: 'Pie' },
                    { id: 'donut' as const, icon: PieIcon, label: 'Donut' }
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setPivotChartType(type.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        pivotChartType === type.id
                          ? 'bg-white dark:bg-slate-800 shadow-sm text-primary dark:text-primary-dark'
                          : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      <type.icon className="h-3 w-3" />
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[320px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  {pivotChartType === 'column' ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      {pivotResult.colKeys.map((colKey, colIdx) => (
                        <Bar key={colKey} dataKey={colKey} fill={COLORS[colIdx % COLORS.length]} radius={[4, 4, 0, 0]} name={pivotResult.colLabelMap[colKey]} />
                      ))}
                    </BarChart>
                  ) : pivotChartType === 'bar' ? (
                    <BarChart layout="vertical" data={chartData} margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={10} width={90} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      {pivotResult.colKeys.map((colKey, colIdx) => (
                        <Bar key={colKey} dataKey={colKey} fill={COLORS[colIdx % COLORS.length]} radius={[0, 4, 4, 0]} name={pivotResult.colLabelMap[colKey]} />
                      ))}
                    </BarChart>
                  ) : pivotChartType === 'line' ? (
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      {pivotResult.colKeys.map((colKey, colIdx) => (
                        <Line key={colKey} type="monotone" dataKey={colKey} stroke={COLORS[colIdx % COLORS.length]} strokeWidth={2} name={pivotResult.colLabelMap[colKey]} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  ) : pivotChartType === 'area' ? (
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      {pivotResult.colKeys.map((colKey, colIdx) => (
                        <Area key={colKey} type="monotone" dataKey={colKey} fill={COLORS[colIdx % COLORS.length]} stroke={COLORS[colIdx % COLORS.length]} fillOpacity={0.15} name={pivotResult.colLabelMap[colKey]} />
                      ))}
                    </AreaChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={pivotChartType === 'donut' ? 55 : 0}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey={pivotResult.colKeys[0]}
                      >
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center" 
                        iconSize={8} 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                      />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* PANEL C (RIGHT): Configuration Drop Builder Zones */}
        <div className="lg:col-span-1 space-y-5">
          {/* Subtotals Grand Totals Configurations */}
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-4 rounded-dashboard shadow-dashboard space-y-3">
            <span className="text-[10px] font-bold text-slate-455 dark:text-slate-555 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-2">Layout Settings</span>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-350 text-xs">
                <input
                  type="checkbox"
                  checked={totalsSettings.grandTotal}
                  onChange={(e) => setTotalsSettings(prev => ({ ...prev, grandTotal: e.target.checked }))}
                  className="rounded border-slate-300 text-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Show Grand Totals</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-350 text-xs">
                <input
                  type="checkbox"
                  checked={totalsSettings.subtotals}
                  onChange={(e) => setTotalsSettings(prev => ({ ...prev, subtotals: e.target.checked }))}
                  className="rounded border-slate-300 text-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Show Row Subtotals</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-350 text-xs">
                <input
                  type="checkbox"
                  checked={totalsSettings.rowTotals}
                  onChange={(e) => setTotalsSettings(prev => ({ ...prev, rowTotals: e.target.checked }))}
                  className="rounded border-slate-300 text-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Show Row Totals</span>
              </label>
            </div>
            
            {rowFields.length > 1 && (
              <div className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={expandAll}
                  className="flex-1 py-1 text-[10px] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="flex-1 py-1 text-[10px] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            )}
          </div>

          {/* Builder zones list */}
          <div className="space-y-4">
            
            {/* Zone 1: Filters */}
            <div
              onDragOver={(e) => handleDragOver(e, 'filters')}
              onDragLeave={handleDragLeave}
              onDrop={() => handleFieldDrop('filters')}
              className={`bg-white dark:bg-slate-900 border rounded-dashboard p-4 min-h-[120px] transition-colors relative flex flex-col justify-between ${
                dragOverZone === 'filters' 
                  ? 'border-primary border-dashed bg-primary/5 dark:bg-primary/10' 
                  : 'border-slate-205 dark:border-slate-800 shadow-dashboard'
              }`}
            >
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block mb-2">Filters</span>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.keys(activeFilters).map(field => (
                    <span 
                      key={field} 
                      onClick={(e) => openFilterModal(field, e)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-55 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-250 cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <Filter className="h-3 w-3 text-primary" />
                      <span className="truncate max-w-[80px]">{field}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeField(field, 'filters'); }} className="text-slate-400 hover:text-rose-500 p-0.5 rounded">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {Object.keys(activeFilters).length === 0 && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 italic block py-4">Drag/drop fields here to filter</span>
                  )}
                </div>
              </div>
            </div>

            {/* Zone 2: Columns */}
            <div
              onDragOver={(e) => handleDragOver(e, 'columns')}
              onDragLeave={handleDragLeave}
              onDrop={() => handleFieldDrop('columns')}
              className={`bg-white dark:bg-slate-900 border rounded-dashboard p-4 min-h-[120px] transition-colors relative flex flex-col justify-between ${
                dragOverZone === 'columns' 
                  ? 'border-primary border-dashed bg-primary/5 dark:bg-primary/10' 
                  : 'border-slate-205 dark:border-slate-800 shadow-dashboard'
              }`}
            >
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block mb-2">Columns</span>
                <div className="space-y-1.5">
                  {colFields.map((field, idx) => (
                    <div key={field} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-250">
                      <span className="truncate pr-1">{field}</span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => moveField('columns', idx, 'up')} disabled={idx === 0} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20">
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => moveField('columns', idx, 'down')} disabled={idx === colFields.length - 1} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20">
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button onClick={() => removeField(field, 'columns')} className="text-slate-400 hover:text-rose-500 p-0.5 rounded ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {colFields.length === 0 && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 italic block py-4">Drag/drop fields here for columns</span>
                  )}
                </div>
              </div>
            </div>

            {/* Zone 3: Rows */}
            <div
              onDragOver={(e) => handleDragOver(e, 'rows')}
              onDragLeave={handleDragLeave}
              onDrop={() => handleFieldDrop('rows')}
              className={`bg-white dark:bg-slate-900 border rounded-dashboard p-4 min-h-[140px] transition-colors relative flex flex-col justify-between ${
                dragOverZone === 'rows' 
                  ? 'border-primary border-dashed bg-primary/5 dark:bg-primary/10' 
                  : 'border-slate-205 dark:border-slate-800 shadow-dashboard'
              }`}
            >
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block mb-2">Rows</span>
                <div className="space-y-1.5">
                  {rowFields.map((field, idx) => (
                    <div key={field} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-250">
                      <span className="truncate pr-1">{field}</span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => moveField('rows', idx, 'up')} disabled={idx === 0} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20">
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => moveField('rows', idx, 'down')} disabled={idx === rowFields.length - 1} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20">
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button onClick={() => removeField(field, 'rows')} className="text-slate-400 hover:text-rose-500 p-0.5 rounded ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {rowFields.length === 0 && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 italic block py-4">Drag/drop fields here for rows</span>
                  )}
                </div>
              </div>
            </div>

            {/* Zone 4: Values */}
            <div
              onDragOver={(e) => handleDragOver(e, 'values')}
              onDragLeave={handleDragLeave}
              onDrop={() => handleFieldDrop('values')}
              className={`bg-white dark:bg-slate-900 border rounded-dashboard p-4 min-h-[160px] transition-colors relative flex flex-col justify-between ${
                dragOverZone === 'values' 
                  ? 'border-primary border-dashed bg-primary/5 dark:bg-primary/10' 
                  : 'border-slate-205 dark:border-slate-800 shadow-dashboard'
              }`}
            >
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block mb-2">Values</span>
                <div className="space-y-2">
                  {valueFields.map((field, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-805 border border-slate-200 dark:border-slate-700 flex flex-col gap-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-705 dark:text-slate-255 truncate pr-1">{field.field}</span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => moveField('values', idx, 'up')} disabled={idx === 0} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20">
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button onClick={() => moveField('values', idx, 'down')} disabled={idx === valueFields.length - 1} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20">
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button onClick={() => removeField(field.field, 'values', idx)} className="text-slate-400 hover:text-rose-500 p-0.5 rounded ml-1">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <select
                        value={field.aggType}
                        onChange={(e) => updateValueAggregation(idx, e.target.value as any)}
                        className="bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-700 text-[10px] px-1.5 py-0.5 rounded focus:outline-none text-slate-700 dark:text-slate-350 cursor-pointer"
                      >
                        <option value="sum">SUM</option>
                        <option value="count">COUNT</option>
                        <option value="avg">AVERAGE</option>
                        <option value="min">MIN</option>
                        <option value="max">MAX</option>
                        <option value="median">MEDIAN</option>
                        <option value="distinct_count">DISTINCT COUNT</option>
                        <option value="pct_total">% OF TOTAL</option>
                        <option value="running_total">RUNNING TOTAL</option>
                      </select>
                    </div>
                  ))}
                  {valueFields.length === 0 && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-550 italic block py-4">Drag/drop fields here for values</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 3. Filter Options Popover/Modal */}
      {selectedFilterField && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 animate-fade-in" onClick={() => setSelectedFilterField(null)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-dashboard shadow-2xl p-5 w-80 max-h-[480px] flex flex-col space-y-4"
          >
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-105 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Filter className="h-4.5 w-4.5 text-primary" />
                <span>Filter: {selectedFilterField}</span>
              </h4>
              <button onClick={() => setSelectedFilterField(null)} className="text-slate-450 hover:text-slate-700 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search filter values..."
                value={filterSearchQuery}
                onChange={(e) => setFilterSearchQuery(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-405"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => handleToggleAllFilterValues(selectedFilterField, true)}
                className="flex-1 py-1 text-[10px] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-300 font-bold rounded cursor-pointer"
              >
                Select All
              </button>
              <button 
                onClick={() => handleToggleAllFilterValues(selectedFilterField, false)}
                className="flex-1 py-1 text-[10px] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-300 font-bold rounded cursor-pointer"
              >
                Clear All
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-56">
              {(filterFieldValues[selectedFilterField] || [])
                .filter(val => val.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                .map(val => {
                  const isChecked = (activeFilters[selectedFilterField] || []).includes(val);
                  return (
                    <label key={val} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-250">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSingleFilterValue(selectedFilterField, val)}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="truncate">{val}</span>
                    </label>
                  );
                })}
            </div>

            <div className="pt-3 border-t border-slate-105 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setSelectedFilterField(null)}
                className="bg-primary hover:bg-primary-dark text-white text-xs font-bold px-4 py-1.5 rounded-lg cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline spreadsheet type resolver helper
function FileSpreadsheet(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M8 13h2" />
      <path d="M14 13h2" />
      <path d="M8 17h2" />
      <path d="M14 17h2" />
    </svg>
  );
}
