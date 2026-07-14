import { useState, useMemo, useEffect } from 'react';
import { SheetData } from '../../services/db';
import { safeDate, safeNumber } from '../../utils/dataProfiler';
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
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  Treemap
} from 'recharts';
import { 
  Sparkles, 
  RefreshCw, 
  Download, 
  Printer, 
  Maximize2, 
  Minimize2, 
  FileText, 
  Activity, 
  TrendingUp, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { toast } from '../ui/Toast';

interface ChartsPanelProps {
  sheetData: SheetData;
  headerMappings: { [key: string]: string };
}

interface CardConfig {
  id: string;
  title: string;
  mode: 'single' | 'relationship';
  xCol: string;
  yCol: string;
  chartType: 'column' | 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'treemap';
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#06B6D4', '#14B8A6'];

export function ChartsPanel({ sheetData, headerMappings }: ChartsPanelProps) {
  const { rows, headers, columnsInfo } = sheetData;

  const [fullscreenCard, setFullscreenCard] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  // Card Configurations
  const [cardConfigs, setCardConfigs] = useState<CardConfig[]>([
    { id: 'card_1', title: 'Chart Card 1', mode: 'single', xCol: '', yCol: 'record_count', chartType: 'column' },
    { id: 'card_2', title: 'Chart Card 2', mode: 'single', xCol: '', yCol: 'record_count', chartType: 'bar' },
    { id: 'card_3', title: 'Chart Card 3', mode: 'relationship', xCol: '', yCol: 'record_count', chartType: 'line' },
    { id: 'card_4', title: 'Chart Card 4', mode: 'single', xCol: '', yCol: 'record_count', chartType: 'donut' },
    { id: 'card_5', title: 'Chart Card 5', mode: 'relationship', xCol: '', yCol: 'record_count', chartType: 'area' },
    { id: 'card_6', title: 'Chart Card 6', mode: 'single', xCol: '', yCol: 'record_count', chartType: 'treemap' }
  ]);

  // Sync and initialize defaults when sheetData changes
  useEffect(() => {
    if (headers.length > 0) {
      const defaultX = headers[1] || headers[0] || '';
      const defaultNumeric = headers.find(h => {
        const type = columnsInfo.find(c => c.name === h)?.type;
        return ['numeric', 'currency', 'percentage'].includes(type || '');
      }) || 'record_count';

      setCardConfigs([
        { id: 'card_1', title: 'Enrollment Distribution', mode: 'single', xCol: defaultX, yCol: 'record_count', chartType: 'column' },
        { id: 'card_2', title: 'Student Categories', mode: 'single', xCol: headers[2] || defaultX, yCol: 'record_count', chartType: 'bar' },
        { id: 'card_3', title: 'Performance Matrix', mode: 'relationship', xCol: defaultX, yCol: defaultNumeric, chartType: 'line' },
        { id: 'card_4', title: 'Sub-group Analysis', mode: 'single', xCol: headers[3] || defaultX, yCol: 'record_count', chartType: 'donut' },
        { id: 'card_5', title: 'Trend & Projections', mode: 'relationship', xCol: defaultX, yCol: defaultNumeric, chartType: 'area' },
        { id: 'card_6', title: 'Segmentation Density', mode: 'single', xCol: defaultX, yCol: 'record_count', chartType: 'treemap' }
      ]);
    }
  }, [sheetData, headers, columnsInfo]);

  // Handler to refresh all counts/render
  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
    toast.success("All custom charts refreshed successfully!");
  };

  // Compile dataset based on config mode
  const compileCardData = (config: CardConfig) => {
    const { mode, xCol, yCol } = config;
    if (!xCol) return [];

    if (mode === 'single' || yCol === 'record_count') {
      const counts: { [key: string]: number } = {};
      rows.forEach(r => {
        const val = String(r[xCol] || '(Blank)').trim();
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);
    } else {
      // Group by X-Axis, Average of Y-Axis
      const groups = new Map<string, { sum: number; count: number }>();
      rows.forEach(r => {
        const xVal = String(r[xCol] || '(Blank)').trim();
        const yVal = safeNumber(r[yCol]);
        
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
  };

  // Generate Insights dynamically
  const generateInsights = (config: CardConfig, data: { name: string; value: number }[]) => {
    if (data.length === 0) return "Select variable fields to produce dynamic insights summary.";
    const top = data[0];
    const bottom = data[data.length - 1];

    if (config.mode === 'single' || config.yCol === 'record_count') {
      return `"${top.name}" has the highest representation with ${top.value.toLocaleString()} records, while "${bottom.name}" is the lowest at ${bottom.value.toLocaleString()} records.`;
    } else {
      return `"${top.name}" has the highest average of ${top.value} in "${headerMappings[config.yCol] || config.yCol}", whereas "${bottom.name}" has the lowest average of ${bottom.value}.`;
    }
  };

  // Export card PNG helper
  const handleExportPNG = (cardId: string, title: string) => {
    try {
      const el = document.getElementById(cardId);
      const svgElement = el?.querySelector('svg');
      if (!svgElement) {
        toast.error("Could not find chart element to export");
        return;
      }
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = URL.createObjectURL(svgBlob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const width = svgElement.getBoundingClientRect().width || 500;
        const height = svgElement.getBoundingClientRect().height || 300;
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);
          const pngURL = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngURL;
          link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_chart.png`;
          link.click();
        }
        URL.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
      toast.success("Downloading PNG chart image...");
    } catch (err) {
      toast.error("Export failed.");
    }
  };

  const handlePrintCard = (cardId: string) => {
    const el = document.getElementById(cardId);
    if (!el) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Chart</title>
            <style>
              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .chart-print { width: 90%; }
            </style>
          </head>
          <body>
            <div class="chart-print">${el.innerHTML}</div>
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* PAGE HEADER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-855 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="h-4.5 w-4.5 text-primary" />
            <span>Interactive Visualization Center</span>
          </h3>
          <p className="text-[11px] text-slate-450 dark:text-slate-550 mt-0.5">
            Configure row groups, column aggregations, and chart styles independently for each card.
          </p>
        </div>

        <button
          onClick={handleRefreshAll}
          className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Visuals</span>
        </button>
      </div>

      {/* RECOMMENDED VISUALIZATIONS BANNER */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-4 rounded-dashboard flex items-start gap-3 relative">
        <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-xs font-medium">
          <h4 className="font-bold text-slate-850 dark:text-blue-200">
            Recommended Visualizations
          </h4>
          <p className="text-slate-600 dark:text-blue-300 leading-relaxed max-w-4xl font-normal mt-0.5">
            Select one constraint (Frequency Mode) to count categories, or select two constraints (Relationship Mode) to compare a category against averages in a numeric column.
          </p>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cardConfigs.map((config) => {
          const chartData = compileCardData(config);
          const insights = generateInsights(config, chartData);

          const updateConfig = (updated: Partial<CardConfig>) => {
            setCardConfigs(prev => prev.map(c => c.id === config.id ? { ...c, ...updated } : c));
          };

          return (
            <div 
              key={config.id}
              id={config.id}
              className={`bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard flex flex-col justify-between transition-all relative ${
                fullscreenCard === config.id ? 'fixed inset-4 z-[9999] border-none' : 'h-[480px]'
              }`}
            >
              {/* Header and Controls */}
              <div className="space-y-3 mb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-805 dark:text-white truncate max-w-[240px]">
                      {config.title}
                    </h4>
                    <p className="text-[10px] text-slate-450 mt-0.5">
                      {config.mode === 'single'
                        ? `Frequencies of ${headerMappings[config.xCol] || config.xCol}`
                        : `${headerMappings[config.xCol] || config.xCol} by average ${headerMappings[config.yCol] || config.yCol}`
                      }
                    </p>
                  </div>
                  
                  {/* Export / Fullscreen Action Buttons */}
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/40 p-1 rounded-lg text-slate-400">
                    <button onClick={() => handleExportPNG(config.id, config.title)} title="Export PNG"><Download className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handlePrintCard(config.id)} title="Print"><Printer className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setFullscreenCard(fullscreenCard === config.id ? null : config.id)}>
                      {fullscreenCard === config.id ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* VISUAL CONTROLS PANEL */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] border-b border-slate-50 dark:border-slate-850 pb-2">
                  {/* Mode Selector */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Mode</span>
                    <select
                      value={config.mode}
                      onChange={(e) => updateConfig({ mode: e.target.value as any, yCol: e.target.value === 'single' ? 'record_count' : measures[0] || '' })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded p-1 focus:outline-none font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <option value="single">Frequency (1 Var)</option>
                      <option value="relationship">Relationship (2 Var)</option>
                    </select>
                  </div>

                  {/* X-Axis (Row / Category) */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Row (X-Axis)</span>
                    <select
                      value={config.xCol}
                      onChange={(e) => updateConfig({ xCol: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded p-1 focus:outline-none font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {headers.map(h => (
                        <option key={h} value={h}>{headerMappings[h] || h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Y-Axis (Column / Measure) */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Column (Y-Axis)</span>
                    {config.mode === 'single' ? (
                      <select disabled className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-750 opacity-60 rounded p-1 text-slate-400 font-semibold cursor-not-allowed">
                        <option value="record_count">Record Count</option>
                      </select>
                    ) : (
                      <select
                        value={config.yCol}
                        onChange={(e) => updateConfig({ yCol: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded p-1 focus:outline-none font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {measures.map(h => (
                          <option key={h} value={h}>{headerMappings[h] || h}</option>
                        ))}
                        {measures.length === 0 && <option value="record_count">Record Count</option>}
                      </select>
                    )}
                  </div>

                  {/* Chart Style */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Chart Type</span>
                    <select
                      value={config.chartType}
                      onChange={(e) => updateConfig({ chartType: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded p-1 focus:outline-none font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <option value="column">Column</option>
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="pie">Pie</option>
                      <option value="donut">Donut</option>
                      <option value="treemap">Treemap</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Chart Visualization Area */}
              <div className="flex-1 min-h-0 w-full text-[10px] py-1">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="95%">
                    {config.chartType === 'column' ? (
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '10px' }} />
                        <Bar dataKey="value" fill="#2563EB" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    ) : config.chartType === 'bar' ? (
                      <BarChart layout="vertical" data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                        <XAxis type="number" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={8} width={60} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '10px' }} />
                        <Bar dataKey="value" fill="#10B981" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    ) : config.chartType === 'line' ? (
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '10px' }} />
                        <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    ) : config.chartType === 'area' ? (
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '10px' }} />
                        <Area type="monotone" dataKey="value" fill="#3B82F6" stroke="#2563EB" fillOpacity={0.15} />
                      </AreaChart>
                    ) : config.chartType === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="48%"
                          innerRadius={0}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '10px' }} />
                        <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '9px' }} />
                      </PieChart>
                    ) : config.chartType === 'donut' ? (
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="48%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '10px' }} />
                        <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '9px' }} />
                      </PieChart>
                    ) : (
                      <Treemap
                        data={chartData.map(d => ({ name: d.name, size: d.value }))}
                        dataKey="size"
                        stroke="#fff"
                        fill="#3B82F6"
                      >
                        <Tooltip contentStyle={{ borderRadius: '10px' }} />
                      </Treemap>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">
                    Select X-Axis fields to visualize graph.
                  </div>
                )}
              </div>

              {/* Insights footer panel */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-start gap-1.5 text-[10px]">
                <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-slate-500 dark:text-slate-400 italic leading-snug">{insights}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
