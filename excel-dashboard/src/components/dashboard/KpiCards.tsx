import { 
  Database, 
  Layers, 
  Copy, 
  AlertCircle, 
  TrendingUp, 
  Calendar,
  DollarSign,
  TrendingDown
} from 'lucide-react';
import { SheetStats } from '../../utils/dataProfiler';
import { SheetData } from '../../services/db';

interface KpiCardsProps {
  stats: SheetStats;
  sheetData: SheetData;
}

export function KpiCards({ stats, sheetData }: KpiCardsProps) {
  // Find first numeric column for displaying min/max/avg
  const numericCol = sheetData.columnsInfo.find(
    c => c.type === 'numeric' || c.type === 'currency' || c.type === 'percentage'
  );
  const numericStats = numericCol ? stats.columnStats[numericCol.name] : null;

  // Find first date column for oldest/latest
  const dateCol = sheetData.columnsInfo.find(c => c.type === 'date');
  const dateStats = dateCol ? stats.columnStats[dateCol.name] : null;

  // Find first category column for breakdown
  const categoryCol = sheetData.columnsInfo.find(c => c.type === 'category');
  const categoryStats = categoryCol ? stats.columnStats[categoryCol.name] : null;

  const cardItems = [
    {
      title: "Total Records",
      value: stats.totalRecords.toLocaleString(),
      desc: "Total row count in active sheet",
      icon: Database,
      iconColor: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Quality Score",
      value: `${stats.qualityScore}%`,
      desc: `${(stats.overallCells - stats.overallMissingCells).toLocaleString()} / ${stats.overallCells.toLocaleString()} cells populated`,
      icon: Layers,
      iconColor: stats.qualityScore > 85 ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "text-amber-500 bg-amber-50 dark:bg-amber-950/20",
    },
    {
      title: "Duplicate Rows",
      value: stats.duplicateCount.toLocaleString(),
      desc: `${stats.duplicatePercentage}% of total dataset`,
      icon: Copy,
      iconColor: stats.duplicateCount > 0 ? "text-rose-500 bg-rose-50 dark:bg-rose-950/20" : "text-slate-400 bg-slate-50 dark:bg-slate-800",
    },
    {
      title: "Missing Cells",
      value: stats.overallMissingCells.toLocaleString(),
      desc: "Total blank/empty inputs found",
      icon: AlertCircle,
      iconColor: stats.overallMissingCells > 0 ? "text-amber-500 bg-amber-55 text-amber-500 bg-amber-50 dark:bg-amber-950/20" : "text-slate-400 bg-slate-50 dark:bg-slate-800",
    }
  ];

  return (
    <div className="space-y-6">
      {/* Primary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cardItems.map((card, i) => {
          const Icon = card.icon;
          return (
            <div 
              key={i} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard flex items-center justify-between"
            >
              <div className="space-y-1.5 min-w-0">
                <p className="text-[11px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider truncate">
                  {card.title}
                </p>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white truncate">
                  {card.value}
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {card.desc}
                </p>
              </div>
              <div className={`p-3 rounded-xl flex-shrink-0 flex items-center justify-center ${card.iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Conditional Numerical and Date stats row */}
      {(numericStats || dateStats) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Numeric Column Quick Insight */}
          {numericStats && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Summary stats: <span className="text-primary font-bold lowercase">{numericStats.name}</span>
                </span>
                <div className="p-2 rounded-lg bg-primary/5 text-primary dark:bg-primary/20">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/40 dark:bg-slate-900/40 text-center">
                  <p className="text-[9px] font-semibold text-slate-450 dark:text-slate-500 uppercase">Average</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-250 mt-1 truncate">
                    {numericStats.avg ? numericStats.avg.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                  </p>
                </div>
                <div className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/40 dark:bg-slate-900/40 text-center">
                  <p className="text-[9px] font-semibold text-slate-450 dark:text-slate-500 uppercase">Maximum</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-250 mt-1 flex items-center justify-center gap-0.5 truncate text-emerald-500">
                    <TrendingUp className="h-3 w-3" />
                    {numericStats.max ? numericStats.max.toLocaleString() : '-'}
                  </p>
                </div>
                <div className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/40 dark:bg-slate-900/40 text-center">
                  <p className="text-[9px] font-semibold text-slate-450 dark:text-slate-500 uppercase">Minimum</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-250 mt-1 flex items-center justify-center gap-0.5 truncate text-rose-500">
                    <TrendingDown className="h-3 w-3" />
                    {numericStats.min ? numericStats.min.toLocaleString() : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Date Column Quick Insight */}
          {dateStats && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Timeline stats: <span className="text-primary font-bold lowercase">{dateStats.name}</span>
                </span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/40 dark:bg-slate-900/40">
                  <p className="text-[9px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Oldest Entry</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 truncate">{dateStats.oldest || '-'}</p>
                </div>
                <div className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/40 dark:bg-slate-900/40">
                  <p className="text-[9px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Latest Entry</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 truncate">{dateStats.latest || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
