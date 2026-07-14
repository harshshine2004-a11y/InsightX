import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { SheetStats } from '../../utils/dataProfiler';
import { SheetData } from '../../services/db';
import { ChartContainer } from '../charts/ChartContainer';
import { 
  ShieldCheck, 
  SlidersHorizontal, 
  Table, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  XCircle 
} from 'lucide-react';

interface DashboardViewProps {
  stats: SheetStats;
  sheetData: SheetData;
  setActiveTab: (tab: any) => void;
  onFilterToggle: () => void;
  headerMappings: { [key: string]: string };
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#06B6D4', '#14B8A6'];

export function DashboardView({ stats, sheetData, setActiveTab, onFilterToggle, headerMappings }: DashboardViewProps) {
  const { rows: dataRows, headers } = sheetData;

  // 1. Calculate KPI Metrics dynamically from the Excel rows
  const metrics = useMemo(() => {
    const totalRecords = dataRows.length;
    let fitCount = 0;
    let partiallyFitCount = 0;
    let notFitCount = 0;

    // Search for a column whose name suggests status or fitness
    const statusCol = headers.find(h => {
      const lh = h.toLowerCase();
      return lh.includes('status') || lh.includes('fit') || lh.includes('health') || lh.includes('result') || lh.includes('condition');
    });

    if (statusCol) {
      dataRows.forEach(row => {
        const val = String(row[statusCol] || '').toLowerCase().trim();
        if (val === 'fit' || val === 'fitness' || val === 'healthy') {
          fitCount++;
        } else if (val.includes('partially') || val.includes('partial')) {
          partiallyFitCount++;
        } else if (val.includes('not') || val.includes('unfit') || val.includes('fail') || val.includes('unhealthy')) {
          notFitCount++;
        }
      });
    } else {
      // Fallback: search the text values of all columns
      dataRows.forEach(row => {
        const rowText = Object.values(row).map(v => String(v).toLowerCase()).join(' ');
        if (rowText.includes('partially fit') || rowText.includes('partially')) {
          partiallyFitCount++;
        } else if (rowText.includes('not fit') || rowText.includes('unfit') || (rowText.includes('not') && rowText.includes('fit'))) {
          notFitCount++;
        } else if (rowText.includes('fit')) {
          fitCount++;
        }
      });
    }

    // Secondary fallback: If the dataset has no fitness data, count top 3 categories of the first column
    const categoryCols = sheetData.columnsInfo.filter(c => c.type === 'category');
    const primaryCatCol = categoryCols[0]?.name || sheetData.columnsInfo.find(c => c.type === 'text')?.name;
    
    let isUsingFallback = false;
    let labels = ['Fit', 'Partially Fit', 'Not Fit'];
    let values = [fitCount, partiallyFitCount, notFitCount];

    if (fitCount === 0 && partiallyFitCount === 0 && notFitCount === 0 && primaryCatCol) {
      isUsingFallback = true;
      const freqDist = stats.categoryDistribution[primaryCatCol] || [];
      const sortedFreq = [...freqDist].sort((a, b) => b.value - a.value);
      labels = [
        sortedFreq[0]?.name || 'Category A',
        sortedFreq[1]?.name || 'Category B',
        sortedFreq[2]?.name || 'Category C'
      ];
      values = [
        sortedFreq[0]?.value || 0,
        sortedFreq[1]?.value || 0,
        sortedFreq[2]?.value || 0
      ];
    }

    return {
      totalRecords,
      fitCount: values[0],
      partiallyFitCount: values[1],
      notFitCount: values[2],
      fitLabel: labels[0],
      partiallyFitLabel: labels[1],
      notFitLabel: labels[2],
      isUsingFallback,
      fallbackCol: primaryCatCol
    };
  }, [dataRows, headers, sheetData.columnsInfo, stats]);

  // 2. Regular vs DT calculations
  const regularVsDtData = useMemo(() => {
    let regularCount = 0;
    let dtCount = 0;

    // Search for a column whose name contains Type, Mode, Category, Regular, or DT
    const regCol = headers.find(h => {
      const lh = h.toLowerCase();
      return lh.includes('type') || lh.includes('mode') || lh.includes('regular') || lh.includes('dt') || lh.includes('category');
    });

    if (regCol) {
      dataRows.forEach(row => {
        const val = String(row[regCol] || '').toLowerCase().trim();
        if (val.includes('regular') || val === 'r') {
          regularCount++;
        } else if (val.includes('dt') || val === 'detained' || val === 'detain') {
          dtCount++;
        }
      });
    } else {
      // Fallback: search row values
      dataRows.forEach(row => {
        const rowText = Object.values(row).map(v => String(v).toLowerCase()).join(' ');
        if (rowText.includes('regular')) {
          regularCount++;
        } else if (rowText.includes('dt')) {
          dtCount++;
        }
      });
    }

    // If still 0, count top 2 classes from the primary category column
    let labels = ['Regular', 'DT'];
    let values = [regularCount, dtCount];

    if (regularCount === 0 && dtCount === 0) {
      const categoryCols = sheetData.columnsInfo.filter(c => c.type === 'category');
      const primaryCatCol = categoryCols[0]?.name || sheetData.columnsInfo.find(c => c.type === 'text')?.name;
      if (primaryCatCol) {
        const freqDist = stats.categoryDistribution[primaryCatCol] || [];
        const sortedFreq = [...freqDist].sort((a, b) => b.value - a.value);
        labels = [
          sortedFreq[0]?.name || 'Group A',
          sortedFreq[1]?.name || 'Group B'
        ];
        values = [
          sortedFreq[0]?.value || 0,
          sortedFreq[1]?.value || 0
        ];
      }
    }

    return [
      { name: labels[0], value: values[0] },
      { name: labels[1], value: values[1] }
    ];
  }, [dataRows, headers, sheetData.columnsInfo, stats]);

  // 3. Pie distribution (distribution of categories)
  const pieData = useMemo(() => {
    // If we have actual fitness data, plot that
    if (!metrics.isUsingFallback && (metrics.fitCount > 0 || metrics.partiallyFitCount > 0 || metrics.notFitCount > 0)) {
      return [
        { name: 'Fit', value: metrics.fitCount },
        { name: 'Partially Fit', value: metrics.partiallyFitCount },
        { name: 'Not Fit', value: metrics.notFitCount }
      ].filter(d => d.value > 0);
    }
    
    // Otherwise fallback to the active sheet's first category column distribution
    const categoryCols = sheetData.columnsInfo.filter(c => c.type === 'category');
    const primaryCatCol = categoryCols[0]?.name || sheetData.columnsInfo.find(c => c.type === 'text')?.name;
    if (primaryCatCol) {
      return (stats.categoryDistribution[primaryCatCol] || []).slice(0, 6);
    }
    
    return [];
  }, [metrics, sheetData.columnsInfo, stats]);

  // 4. Full-width overall distribution (Total Students Distribution)
  const overallDistData = useMemo(() => {
    const categoryCols = sheetData.columnsInfo.filter(c => c.type === 'category');
    const primaryCatCol = categoryCols[0]?.name || sheetData.columnsInfo.find(c => c.type === 'text')?.name;
    if (primaryCatCol) {
      return {
        colName: primaryCatCol,
        data: stats.categoryDistribution[primaryCatCol] || []
      };
    }
    return null;
  }, [sheetData.columnsInfo, stats]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Welcome Banner */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 p-6 rounded-dashboard text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-dashboard">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-450" />
            <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
              Offline First Secured
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Welcome to Antigravity Analytics
          </h2>
          <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
            Your dataset is fully parsed, typed, and cached locally. You can sort columns, filter rows, and visualize fields safely without network connections.
          </p>
        </div>
        <div className="flex items-center gap-3 z-10">
          <button
            onClick={() => setActiveTab('table')}
            className="bg-white/10 hover:bg-white/15 text-white border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Table className="h-4 w-4" />
            <span>Browse Records</span>
          </button>
          <button
            onClick={onFilterToggle}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Apply Filters</span>
          </button>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>

      {/* 2. KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Total Records */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider truncate">
              Total Records
            </p>
            <h4 className="text-2xl font-bold text-slate-800 dark:text-white truncate">
              {metrics.totalRecords.toLocaleString()}
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              Total rows in active worksheet
            </p>
          </div>
          <div className="p-3 rounded-xl flex-shrink-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20 text-blue-500">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 2: Fit Students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider truncate">
              Fit Students
            </p>
            <h4 className="text-2xl font-bold text-slate-800 dark:text-white truncate">
              {metrics.fitCount.toLocaleString()}
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={metrics.fitLabel}>
              {metrics.isUsingFallback ? `Category: ${metrics.fitLabel}` : "Fit condition students count"}
            </p>
          </div>
          <div className="p-3 rounded-xl flex-shrink-0 flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 3: Partially Fit Students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider truncate">
              Partially Fit
            </p>
            <h4 className="text-2xl font-bold text-slate-800 dark:text-white truncate">
              {metrics.partiallyFitCount.toLocaleString()}
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={metrics.partiallyFitLabel}>
              {metrics.isUsingFallback ? `Category: ${metrics.partiallyFitLabel}` : "Partially fit condition count"}
            </p>
          </div>
          <div className="p-3 rounded-xl flex-shrink-0 flex items-center justify-center bg-amber-50 dark:bg-amber-950/20 text-amber-500">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 4: Not Fit Students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider truncate">
              Not Fit Students
            </p>
            <h4 className="text-2xl font-bold text-slate-800 dark:text-white truncate">
              {metrics.notFitCount.toLocaleString()}
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={metrics.notFitLabel}>
              {metrics.isUsingFallback ? `Category: ${metrics.notFitLabel}` : "Not fit condition count"}
            </p>
          </div>
          <div className="p-3 rounded-xl flex-shrink-0 flex items-center justify-center bg-rose-50 dark:bg-rose-950/20 text-rose-550">
            <XCircle className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* 3. Middle Charts: Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Chart: Regular vs DT Students */}
        <ChartContainer 
          title="Regular vs DT Students" 
          subtitle="Breakdown of student type counts"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={regularVsDtData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                labelClassName="font-bold text-slate-800"
              />
              <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]}>
                {regularVsDtData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Right Chart: Student Category Distribution */}
        <ChartContainer 
          title="Student Distribution" 
          subtitle="Percentage breakout across dataset categories"
        >
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                <Legend 
                  verticalAlign="bottom" 
                  align="center" 
                  iconSize={10} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              No distribution data available.
            </div>
          )}
        </ChartContainer>

      </div>

      {/* 4. Third Section: Full-width Distribution */}
      {overallDistData && (
        <div className="grid grid-cols-1 gap-6">
          <ChartContainer 
            title="Total Students Distribution" 
            subtitle={`Distribution chart sorted by values of column: "${headerMappings[overallDistData.colName] || overallDistData.colName}"`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overallDistData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {overallDistData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}

    </div>
  );
}
