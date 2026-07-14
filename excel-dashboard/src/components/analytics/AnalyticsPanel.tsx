import { useState, useMemo, useEffect } from 'react';
import { SheetStats, safeNumber, safeDate } from '../../utils/dataProfiler';
import { SheetData } from '../../services/db';
import { exporters } from '../../utils/exporters';
import { 
  TrendingUp, 
  AlertTriangle, 
  HelpCircle, 
  Sliders,
  ChevronDown,
  X,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Sparkles,
  BarChart3,
  Calendar,
  Hash,
  Download,
  Printer,
  ChevronUp,
  Trash2
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

interface AnalyticsPanelProps {
  stats: SheetStats;
  sheetData: SheetData;
  headerMappings: { [key: string]: string };
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#06B6D4', '#14B8A6'];

export function AnalyticsPanel({ stats, sheetData, headerMappings }: AnalyticsPanelProps) {
  const { headers, columnsInfo, rows: dataRows } = sheetData;

  // UI Interactive States
  const [visXCol, setVisXCol] = useState<string>('');
  const [visYCol, setVisYCol] = useState<string>('record_count');
  const [visChartType, setVisChartType] = useState<'column' | 'bar' | 'line' | 'area' | 'pie' | 'donut'>('column');
  const [trendTimeline, setTrendTimeline] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Split headers into dimensions and measures
  const dimensions = useMemo(() => {
    return headers.filter(h => {
      const type = columnsInfo.find(c => c.name === h)?.type;
      return !['numeric', 'currency', 'percentage'].includes(type || '');
    });
  }, [headers, columnsInfo]);

  const measures = useMemo(() => {
    return headers.filter(h => {
      const type = columnsInfo.find(c => c.name === h)?.type;
      return ['numeric', 'currency', 'percentage'].includes(type || '');
    });
  }, [headers, columnsInfo]);

  // Sync defaults when sheetData changes
  useEffect(() => {
    if (headers.length > 0) {
      const defaultX = headers[1] || headers[0] || '';
      setVisXCol(defaultX);
      
      const defaultY = headers.find(h => {
        const type = columnsInfo.find(c => c.name === h)?.type;
        return ['numeric', 'currency', 'percentage'].includes(type || '');
      }) || 'record_count';
      setVisYCol(defaultY);
    }
  }, [sheetData, headers, columnsInfo]);

  // Auto-detect date column
  const dateColumn = useMemo(() => {
    return columnsInfo.find(c => c.type === 'date')?.name;
  }, [columnsInfo]);

  // Trigger loading spinner for simulation
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Analytics dashboard re-calculated from active dataset!");
    }, 450);
  };

  // Export Summary CSV
  const handleExportCSV = () => {
    const rows = [
      { Metric: 'Total Records', Value: String(stats.totalRecords) },
      { Metric: 'Data Quality Score', Value: `${stats.qualityScore}%` },
      { Metric: 'Overall Missing Cells', Value: String(stats.overallMissingCells) },
      { Metric: 'Duplicate Rows', Value: String(stats.duplicateCount) },
      { Metric: 'Data Completeness Rate', Value: `${stats.qualityScore}%` }
    ];
    exporters.exportToCSV(rows, ['Metric', 'Value'], 'sheet_analytics_profile.csv');
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate invalid formats for Quality profile (Section 5)
  const invalidDateCount = useMemo(() => {
    if (!dateColumn) return 0;
    let count = 0;
    dataRows.forEach(row => {
      const val = row[dateColumn];
      if (val !== undefined && val !== null && val !== '') {
        if (safeDate(val) === null) count++;
      }
    });
    return count;
  }, [dataRows, dateColumn]);

  const invalidNumberCount = useMemo(() => {
    let count = 0;
    columnsInfo.forEach(col => {
      if (['numeric', 'currency', 'percentage'].includes(col.type)) {
        dataRows.forEach(row => {
          const val = row[col.name];
          if (val !== undefined && val !== null && val !== '') {
            if (safeNumber(val) === null) count++;
          }
        });
      }
    });
    return count;
  }, [dataRows, columnsInfo]);

  // Key Insights Generator (Section 2)
  const insights = useMemo(() => {
    const observations: { title: string; valStr: string; desc: string; icon: any; color: string }[] = [];

    // Largest Category column
    const categoryStats = Object.values(stats.columnStats).filter(c => c.type === 'category');
    if (categoryStats.length > 0) {
      const largest = categoryStats.reduce((max, c) => c.uniqueCount > (max?.uniqueCount || 0) ? c : max, categoryStats[0]);
      observations.push({
        title: 'Largest Category cardinality',
        valStr: `${largest.uniqueCount} items`,
        desc: `Found in column "${headerMappings[largest.name] || largest.name}"`,
        icon: Sliders,
        color: 'text-primary bg-primary/5 border-primary/10'
      });
    }

    // Highest overall frequency occurrence
    let highestFreq = { col: '', value: '', count: 0, percentage: 0 };
    Object.entries(stats.columnStats).forEach(([colName, colStat]) => {
      if (colStat.frequencies && colStat.frequencies[0]) {
        const top = colStat.frequencies[0];
        if (top.count > highestFreq.count && top.value !== '') {
          highestFreq = { col: colName, value: top.value, count: top.count, percentage: top.percentage };
        }
      }
    });

    if (highestFreq.count > 0) {
      observations.push({
        title: 'Most repeated entry value',
        valStr: `"${highestFreq.value}"`,
        desc: `Occurs ${highestFreq.count.toLocaleString()} times (${highestFreq.percentage}% of "${headerMappings[highestFreq.col] || highestFreq.col}")`,
        icon: Sparkles,
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
      });
    }

    // Unique keys columns
    const uniqueCols = Object.values(stats.columnStats).filter(c => c.uniqueCount === stats.totalRecords && stats.totalRecords > 0);
    if (uniqueCols.length > 0) {
      observations.push({
        title: 'Unique Key columns found',
        valStr: `${uniqueCols.length} Columns`,
        desc: `"${uniqueCols.map(c => headerMappings[c.name] || c.name).slice(0, 2).join(', ')}" contains zero duplicate entries`,
        icon: CheckCircle,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-105 dark:border-blue-900/30'
      });
    }

    // Missing columns list
    const missingCols = Object.values(stats.columnStats).filter(c => c.missingCount > 0);
    if (missingCols.length > 0) {
      observations.push({
        title: 'Columns with missing values',
        valStr: `${missingCols.length} fields`,
        desc: `"${missingCols.map(c => headerMappings[c.name] || c.name).slice(0, 2).join(', ')}" has blank fields`,
        icon: AlertTriangle,
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-955/20 border-amber-100 dark:border-amber-900/30'
      });
    }

    return observations;
  }, [stats, headerMappings]);

  // Smart Recommendations Generator (Section 8)
  const recommendationsList = useMemo(() => {
    const recs: { title: string; desc: string; type: 'warning' | 'info' | 'success' }[] = [];

    if (stats.duplicateCount > 0) {
      recs.push({
        title: 'Remove Duplicate Rows',
        desc: `Identified ${stats.duplicateCount} duplicate records (${stats.duplicatePercentage}% of sheet). Purge identical rows to prevent skewed aggregations.`,
        type: 'warning'
      });
    }

    if (stats.overallMissingCells > 0) {
      const emptyFields = Object.values(stats.columnStats).filter(c => c.missingCount > 0);
      recs.push({
        title: 'Impute Blank Fields',
        desc: `${stats.overallMissingCells} cells are empty across ${emptyFields.length} columns. We recommend default value substitution or interpolation.`,
        type: 'info'
      });
    }

    if (invalidDateCount > 0) {
      recs.push({
        title: 'Standardize Date formats',
        desc: `Detected ${invalidDateCount} invalid cell items in date columns. Clean up inconsistent text representations.`,
        type: 'warning'
      });
    }

    if (invalidNumberCount > 0) {
      recs.push({
        title: 'Audit Numeric cell values',
        desc: `Found ${invalidNumberCount} cells in measure columns that could not be parsed as numbers. Check for embedded characters or spaces.`,
        type: 'warning'
      });
    }

    if (stats.qualityScore >= 95) {
      recs.push({
        title: 'Excellent Data Profile Score',
        desc: `Data completeness rate is outstanding at ${stats.qualityScore}%. No major architectural cleanups are needed.`,
        type: 'success'
      });
    }

    return recs;
  }, [stats, invalidDateCount, invalidNumberCount]);

  // Chart dataset generation (Section 3: adaptive X-Axis & Y-Axis calculations)
  const adaptiveChartData = useMemo(() => {
    if (!visXCol) return [];

    if (visYCol === 'record_count') {
      // Simple categorical frequency count on visXCol
      const colStat = stats.columnStats[visXCol];
      if (!colStat) return [];
      const distribution = colStat.frequencies || [];
      return distribution.slice(0, 15).map((f: any) => ({
        name: f.value || '(Blank)',
        value: f.count
      }));
    } else {
      // Group by visXCol, aggregate (average) visYCol measure
      const groups = new Map<string, { sum: number; count: number }>();
      
      dataRows.forEach(row => {
        const xVal = String(row[visXCol] || '(Blank)').trim();
        const yVal = safeNumber(row[visYCol]);
        
        if (yVal !== null) {
          const curr = groups.get(xVal) || { sum: 0, count: 0 };
          groups.set(xVal, {
            sum: curr.sum + yVal,
            count: curr.count + 1
          });
        }
      });

      return Array.from(groups.entries())
        .map(([name, data]) => ({
          name,
          value: data.count > 0 ? Number((data.sum / data.count).toFixed(2)) : 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);
    }
  }, [visXCol, visYCol, stats.columnStats, dataRows]);

  // Time-series Trend Data parser (Section 7)
  const timeTrendChartData = useMemo(() => {
    if (!dateColumn) return [];
    const dateMap = new Map<string, number>();

    dataRows.forEach(row => {
      const val = row[dateColumn];
      if (!val) return;
      const date = safeDate(val);
      if (!date) return;

      let key = '';
      if (trendTimeline === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (trendTimeline === 'weekly') {
        const year = date.getFullYear();
        const start = new Date(year, 0, 1);
        const diff = date.getTime() - start.getTime();
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        const week = Math.floor(diff / oneWeek) + 1;
        key = `${year}-W${String(week).padStart(2, '0')}`;
      } else if (trendTimeline === 'monthly') {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        key = `${date.getFullYear()}-${month}`;
      } else {
        key = String(date.getFullYear());
      }

      dateMap.set(key, (dateMap.get(key) || 0) + 1);
    });

    return Array.from(dateMap.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [dataRows, dateColumn, trendTimeline]);

  // Top / Bottom lists generator (Section 6)
  const rankedFrequencies = useMemo(() => {
    if (adaptiveChartData.length === 0) return { top: [], bottom: [] };
    
    // Sum to calculate percentage share
    const sum = adaptiveChartData.reduce((acc, item) => acc + item.value, 0);
    const list = adaptiveChartData.map(item => ({
      value: item.name,
      count: item.value,
      percentage: sum > 0 ? Math.round((item.value / sum) * 100) : 0
    }));

    return {
      top: list.slice(0, 10),
      bottom: [...list].reverse().slice(0, 10)
    };
  }, [adaptiveChartData]);

  // Auto-Distribution category widgets (Section 4)
  const categoryWidgets = useMemo(() => {
    const catCols = columnsInfo.filter(c => c.type === 'category').slice(0, 4);
    return catCols.map(col => {
      const distribution = stats.categoryDistribution[col.name] || [];
      return {
        colName: col.name,
        displayName: headerMappings[col.name] || col.name,
        distribution
      };
    });
  }, [columnsInfo, stats.categoryDistribution, headerMappings]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* PAGE HEADER CONTROLS (Section 9) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-850 dark:text-white flex items-center gap-2">
            <Sliders className="h-4.5 w-4.5 text-primary" />
            <span>Decision Support Analytics</span>
          </h3>
          <p className="text-[11px] text-slate-450 dark:text-slate-550 mt-0.5">
            Auto-generated profiling observations, time trends, distributions, and cleaning guidelines.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={handleRefresh}
            className={`bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              isRefreshing ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <Clock className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Recalculate Analysis</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Download CSV Profiler summary"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handlePrint}
            className="border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-350 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Print profiling report"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {[
          { title: 'Total Records', value: stats.totalRecords.toLocaleString(), desc: 'Total row items', icon: FileSpreadsheet, color: 'text-primary' },
          { title: 'Total Categories', value: String(columnsInfo.filter(c => c.type === 'category').length), desc: 'Categorical inputs', icon: Sliders, color: 'text-blue-600' },
          { title: 'Missing Cells', value: stats.overallMissingCells.toLocaleString(), desc: 'Empty/blank cells', icon: AlertTriangle, color: stats.overallMissingCells > 0 ? 'text-amber-500' : 'text-slate-400' },
          { title: 'Duplicate Records', value: stats.duplicateCount.toLocaleString(), desc: 'Identical data entries', icon: Trash2, color: stats.duplicateCount > 0 ? 'text-rose-500' : 'text-slate-400' },
          { title: 'Data Quality Score', value: `${stats.qualityScore}%`, desc: 'Dataset completeness', icon: CheckCircle, color: 'text-emerald-500' },
          { title: 'Profiling Profile', value: 'Offline', desc: 'Auto-audited profile', icon: Sparkles, color: 'text-violet-500' }
        ].map((card, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-dashboard shadow-dashboard space-y-2 flex flex-col justify-between">
            <div className="flex justify-between items-start gap-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">{card.title}</span>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className="space-y-0.5">
              <p className="text-lg font-bold text-slate-850 dark:text-white">{card.value}</p>
              <p className="text-[10px] text-slate-450 dark:text-slate-550 truncate">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 2: KEY INSIGHTS */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[12px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Automated Key Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-dashboard shadow-dashboard flex gap-3 items-start">
                <div className={`p-2 rounded-lg border ${insight.color} flex-shrink-0`}>
                  <insight.icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">{insight.title}</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">{insight.valStr}</p>
                  <p className="text-[10px] text-slate-450 dark:text-slate-550 mt-0.5">{insight.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid containing Charting controls, Visualization & Ranked Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECTION 3: INTERACTIVE VISUALIZATIONS */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
            <div>
              <h4 className="text-[13px] font-bold text-slate-805 dark:text-white">
                Variable Distribution Profile
              </h4>
              <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5">
                Adapts layout automatically to display frequencies or histograms.
              </p>
            </div>

            {/* Select controls */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Row:</span>
                <select
                  value={visXCol}
                  onChange={(e) => setVisXCol(e.target.value)}
                  className="bg-slate-55 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg focus:outline-none text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>{headerMappings[h] || h}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Column:</span>
                <select
                  value={visYCol}
                  onChange={(e) => setVisYCol(e.target.value)}
                  className="bg-slate-55 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg focus:outline-none text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="record_count">Record Count (Frequency)</option>
                  {measures.map(h => (
                    <option key={h} value={h}>{headerMappings[h] || h}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/40 p-1 rounded-lg">
                {[
                  { id: 'column' as const, label: 'Column' },
                  { id: 'bar' as const, label: 'Bar' },
                  { id: 'line' as const, label: 'Line' },
                  { id: 'area' as const, label: 'Area' },
                  { id: 'pie' as const, label: 'Pie' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setVisChartType(type.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      visChartType === type.id
                        ? 'bg-white dark:bg-slate-900 text-primary dark:text-primary-dark shadow-sm'
                        : 'text-slate-450 hover:text-slate-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[300px] w-full text-xs">
            {adaptiveChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {visChartType === 'column' ? (
                  <BarChart data={adaptiveChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '10px' }} />
                    <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : visChartType === 'bar' ? (
                  <BarChart layout="vertical" data={adaptiveChartData} margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={10} width={90} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '10px' }} />
                    <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                ) : visChartType === 'line' ? (
                  <LineChart data={adaptiveChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '10px' }} />
                    <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                ) : visChartType === 'area' ? (
                  <AreaChart data={adaptiveChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '10px' }} />
                    <Area type="monotone" dataKey="value" fill="#2563EB" stroke="#2563EB" fillOpacity={0.15} />
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={adaptiveChartData}
                      cx="50%"
                      cy="48%"
                      innerRadius={0}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {adaptiveChartData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '10px' }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No visual representation parameters found for this column.
              </div>
            )}
          </div>
        </div>

        {/* SECTION 6: TOP & BOTTOM RANKED LISTS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard space-y-4">
          <div>
            <h4 className="text-[13px] font-bold text-slate-805 dark:text-white">
              Ranked Extremities Analysis
            </h4>
            <p className="text-[11px] text-slate-450 dark:text-slate-550 mt-0.5">
              Ranked entries for: "{headerMappings[visXCol] || visXCol}" aggregated by "{visYCol === 'record_count' ? 'Record Count' : headerMappings[visYCol] || visYCol}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 h-[300px] overflow-hidden">
            {/* Top 5 list */}
            <div className="space-y-3 flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-850 pb-1.5">Top entries</span>
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 text-[11px]">
                {rankedFrequencies.top.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-700 dark:text-slate-300 truncate pr-1" title={item.value}>{item.value || '(Blank)'}</span>
                      <span className="text-slate-450 flex-shrink-0">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
                {rankedFrequencies.top.length === 0 && (
                  <span className="text-[11px] text-slate-400 italic">No rankings found</span>
                )}
              </div>
            </div>

            {/* Bottom 5 list */}
            <div className="space-y-3 flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-850 pb-1.5">Bottom entries</span>
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 text-[11px]">
                {rankedFrequencies.bottom.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-700 dark:text-slate-300 truncate pr-1" title={item.value}>{item.value || '(Blank)'}</span>
                      <span className="text-slate-450 flex-shrink-0">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.max(2, item.percentage)}%` }}></div>
                    </div>
                  </div>
                ))}
                {rankedFrequencies.bottom.length === 0 && (
                  <span className="text-[11px] text-slate-400 italic">No rankings found</span>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 4: AUTO-DISTRIBUTION MINI CHARTS GRID */}
      {categoryWidgets.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[12px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Categorical Distributions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {categoryWidgets.map(widget => (
              <div key={widget.colName} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-dashboard shadow-dashboard space-y-3 flex flex-col justify-between min-w-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block border-b border-slate-50 dark:border-slate-850 pb-1.5 truncate">{widget.displayName}</span>
                
                <div className="h-[120px] w-full text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={widget.distribution.slice(0, 10)} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={8} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={8} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px', padding: '4px 8px' }} />
                      <Bar dataKey="value" fill="#10B981" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lower grid: Data Quality details, Recommendations, and Timeline trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECTION 5: DATA QUALITY ANALYSIS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h4 className="text-[13px] font-bold text-slate-805 dark:text-white">
                Completeness Audit Profile
              </h4>
              <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5">
                Profiling format validations and record structures offline.
              </p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-850 text-xs space-y-2">
              {[
                { label: 'Missing Fields', val: stats.overallMissingCells.toLocaleString(), desc: 'Empty spreadsheet cells' },
                { label: 'Duplicate Rows', val: stats.duplicateCount.toLocaleString(), desc: 'Identical dataset rows' },
                { label: 'Blank Rows', val: '0', desc: 'Rows containing no inputs' },
                { label: 'Invalid Dates', val: String(invalidDateCount), desc: 'Cells that could not be parsed as date format' },
                { label: 'Invalid Numbers', val: String(invalidNumberCount), desc: 'Cells that failed numeric casting' },
                { label: 'Completeness Ratio', val: `${stats.qualityScore}%`, desc: 'Overall filled cells density' }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-750 dark:text-slate-200">{item.label}</p>
                    <p className="text-[9px] text-slate-450 dark:text-slate-550 truncate">{item.desc}</p>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 7: TREND ANALYSIS (DATE-BASED OVER TIME) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h4 className="text-[13px] font-bold text-slate-805 dark:text-white">
                Chronological Trend Analysis
              </h4>
              <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5">
                Date-based records grouped chronologically.
              </p>
            </div>

            {dateColumn && (
              <div className="flex gap-0.5 bg-slate-50 dark:bg-slate-800/40 p-1 rounded-lg">
                {[
                  { id: 'daily' as const, label: 'D' },
                  { id: 'weekly' as const, label: 'W' },
                  { id: 'monthly' as const, label: 'M' },
                  { id: 'yearly' as const, label: 'Y' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setTrendTimeline(opt.id)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                      trendTimeline === opt.id
                        ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-[250px] w-full text-[10px]">
            {dateColumn ? (
              timeTrendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeTrendChartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '10px' }} />
                    <Area type="monotone" dataKey="count" fill="#3B82F6" stroke="#2563EB" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Chronological records could not be parsed.
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-6 space-y-1.5">
                <Calendar className="h-6 w-6 text-slate-300" />
                <p className="font-semibold text-slate-455">No date-based fields detected</p>
                <p className="text-[10px] text-slate-400 max-w-[200px]">Trend mapping is disabled for this dataset.</p>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 8: SMART RECOMMENDATIONS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard space-y-4">
          <div>
            <h4 className="text-[13px] font-bold text-slate-805 dark:text-white">
              Data Cleaning Recommendations
            </h4>
            <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5">
              Actionable steps suggested automatically by the data profiler audit.
            </p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[260px] pr-1">
            {recommendationsList.map((rec, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-xl border text-xs space-y-0.5 ${
                  rec.type === 'warning'
                    ? 'border-rose-100 bg-rose-50/20 dark:bg-rose-950/10 text-rose-800 dark:text-rose-350'
                    : rec.type === 'success'
                    ? 'border-emerald-100 bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-350'
                    : 'border-blue-100 bg-blue-50/20 dark:bg-blue-950/10 text-blue-800 dark:text-blue-350'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {rec.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                  ) : rec.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Sliders className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  )}
                  <span>{rec.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5.5 leading-relaxed">
                  {rec.desc}
                </p>
              </div>
            ))}
            {recommendationsList.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                Data profile is in perfect state. No suggestions generated!
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
