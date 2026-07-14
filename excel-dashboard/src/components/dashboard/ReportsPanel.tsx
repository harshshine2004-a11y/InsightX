import { exporters } from '../../utils/exporters';
import { SheetData } from '../../services/db';
import { 
  FileSpreadsheet, 
  FileText, 
  File, 
  Printer, 
  Download, 
  Info,
  Layers
} from 'lucide-react';
import { toast } from '../ui/Toast';

import { useState } from 'react';

interface ReportsPanelProps {
  sheetData: SheetData;
  filename: string;
  activeSheet: string;
  headerMappings: { [key: string]: string };
}

export function ReportsPanel({ sheetData, filename, activeSheet, headerMappings }: ReportsPanelProps) {
  const { rows, headers } = sheetData;
  const [useDisplayHeaders, setUseDisplayHeaders] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    exporters.exportToCSV(rows, headers, filename, headerMappings, useDisplayHeaders);
  };

  const handleExportExcel = () => {
    exporters.exportToExcel(rows, activeSheet, filename, headers, headerMappings, useDisplayHeaders);
  };

  const handleExportPDF = () => {
    exporters.exportToPDF(rows, headers, activeSheet, filename, headerMappings, useDisplayHeaders);
  };

  const reportCards = [
    {
      title: "Export to Microsoft Excel",
      desc: "Download complete parsed records as a clean .xlsx spreadsheet format.",
      icon: FileSpreadsheet,
      action: handleExportExcel,
      btnText: "Export Excel",
      colorClass: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/20"
    },
    {
      title: "Export to CSV Format",
      desc: "Save the current sheet as a raw comma-separated values file.",
      icon: FileText,
      action: handleExportCSV,
      btnText: "Export CSV",
      colorClass: "text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/20"
    },
    {
      title: "Export to Adobe PDF Document",
      desc: "Generate a beautifully styled tabular document suitable for printing.",
      icon: File,
      action: handleExportPDF,
      btnText: "Generate PDF",
      colorClass: "text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/20"
    },
    {
      title: "Print Active Sheet Layout",
      desc: "Send the current browser visualization layout to a local printer.",
      icon: Printer,
      action: handlePrint,
      btnText: "Print Sheet",
      colorClass: "text-purple-500 bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/20"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Overview stats info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/5 text-primary dark:bg-primary/20 rounded-xl flex-shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-slate-800 dark:text-white">
              Export Workbook: <span className="text-primary font-bold lowercase">{filename}</span>
            </h4>
            <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5">
              Preparing export assets for sheet: "{activeSheet}" with {rows.length.toLocaleString()} rows and {headers.length} columns.
            </p>
          </div>
        </div>
      </div>

      {/* Export Header Choice */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard space-y-3.5">
        <h5 className="text-[12px] font-bold text-slate-800 dark:text-white uppercase tracking-wider">
          Export Heading Preferences
        </h5>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
            <input
              type="radio"
              name="headerMode"
              checked={useDisplayHeaders}
              onChange={() => setUseDisplayHeaders(true)}
              className="text-primary focus:ring-primary h-4 w-4"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-750 dark:text-slate-200">Use Custom Display Names</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Exports using custom titles renamed in settings/table.</p>
            </div>
          </label>
          <label className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
            <input
              type="radio"
              name="headerMode"
              checked={!useDisplayHeaders}
              onChange={() => setUseDisplayHeaders(false)}
              className="text-primary focus:ring-primary h-4 w-4"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-750 dark:text-slate-200">Use Original Excel Headings</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Exports matching original column names from the source workbook.</p>
            </div>
          </label>
        </div>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div 
              key={i} 
              className={`bg-white dark:bg-slate-900 border p-5 rounded-dashboard shadow-dashboard flex flex-col justify-between h-[180px] hover:border-slate-300 dark:hover:border-slate-700 transition-all`}
            >
              <div className="flex gap-4">
                <div className={`p-3 rounded-xl flex-shrink-0 flex items-center justify-center border h-11 w-11 ${card.colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-[13px] font-bold text-slate-800 dark:text-white">
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-slate-450 dark:text-slate-500 leading-relaxed pr-2">
                    {card.desc}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={card.action}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{card.btnText}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Screenshot note card */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 p-4 rounded-xl flex items-start gap-3">
        <Info className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <p className="font-bold text-slate-700 dark:text-slate-300">Tip: Saving Dashboard Screenshots</p>
          <p className="mt-0.5">
            To export screenshots of individual charts, you can use the built-in download controls located on each chart header. To capture the full dashboard layout, use your operating system screenshot hotkeys (<kbd className="bg-white dark:bg-slate-800 border px-1 rounded">Win + Shift + S</kbd> on Windows).
          </p>
        </div>
      </div>

    </div>
  );
}
