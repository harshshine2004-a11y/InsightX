import { Database, Trash2, ShieldCheck, Sun, Moon, Keyboard, Sparkles } from 'lucide-react';
import { dbService, SheetData } from '../../services/db';
import { toast } from '../ui/Toast';
import { HeaderManager } from './HeaderManager';

interface SettingsPanelProps {
  theme: 'light' | 'dark' | 'emerald';
  setTheme: (theme: 'light' | 'dark' | 'emerald') => void;
  onClearCache: () => void;
  sheetData: SheetData;
  headerMappings: { [key: string]: string };
  onRenameHeader: (original: string, renamed: string) => void;
  onResetHeader: (col: string) => void;
  onResetAllHeaders: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function SettingsPanel({ 
  theme, 
  setTheme, 
  onClearCache,
  sheetData,
  headerMappings,
  onRenameHeader,
  onResetHeader,
  onResetAllHeaders,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: SettingsPanelProps) {
  const shortcuts = [
    { keys: ["Alt + D"], desc: "Navigate to Dashboard view" },
    { keys: ["Alt + T"], desc: "Navigate to Data Table view" },
    { keys: ["Alt + A"], desc: "Navigate to Analytics view" },
    { keys: ["Alt + C"], desc: "Navigate to Charts view" },
    { keys: ["Alt + R"], desc: "Navigate to Reports view" },
    { keys: ["Alt + S"], desc: "Navigate to Settings view" },
    { keys: ["Alt + H"], desc: "Navigate to Help/FAQ view" },
    { keys: ["Alt + F"], desc: "Focus Global Search bar" },
    { keys: ["Alt + U"], desc: "Launch New File Upload" },
    { keys: ["Alt + N"], desc: "Toggle Light/Dark Theme" },
  ];

  const handleClearDatabase = async () => {
    if (!confirm("Caution: This will delete all uploaded Excel datasets and user settings from this browser. Are you sure?")) return;
    
    try {
      await dbService.clearAll();
      toast.success("IndexedDB and Local preferences cleared successfully!");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear browser storage");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header mapping controls */}
      <HeaderManager
        sheetData={sheetData}
        headerMappings={headerMappings}
        onRenameHeader={onRenameHeader}
        onResetHeader={onResetHeader}
        onResetAllHeaders={onResetAllHeaders}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Preferences */}
        <div className="space-y-6">
          
          {/* Appearance Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-6 rounded-dashboard shadow-dashboard space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Sun className="h-4.5 w-4.5 text-primary" />
              <h4 className="text-[13px] font-bold text-slate-850 dark:text-white">
                Application Theme
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                  theme === 'light' 
                    ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                    : 'border-slate-205 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-500'
                }`}
              >
                <Sun className="h-4 w-4" />
                <span>Light</span>
              </button>
              
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                  theme === 'dark' 
                    ? 'border-primary bg-primary/5 text-primary dark:bg-primary/20 dark:text-primary-dark shadow-sm' 
                    : 'border-slate-205 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-500'
                }`}
              >
                <Moon className="h-4 w-4" />
                <span>Dark Navy</span>
              </button>

              <button
                onClick={() => setTheme('emerald')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                  theme === 'emerald' 
                    ? 'border-emerald-550 bg-emerald-500/5 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-sm' 
                    : 'border-slate-205 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-500'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>Forest Green</span>
              </button>
            </div>
          </div>

          {/* Database Cleanups */}
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-6 rounded-dashboard shadow-dashboard space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Database className="h-4.5 w-4.5 text-primary" />
              <h4 className="text-[13px] font-bold text-slate-850 dark:text-white">
                Database Workspace
              </h4>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  Your data is stored sandboxed in an IndexedDB database within your local browser profile. No cookies, trackers, or backend pipelines are used.
                </p>
              </div>
              <button
                onClick={handleClearDatabase}
                className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100/70 border border-rose-150 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-450 p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Local Cache & Reset Application</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Shortcuts Map */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-6 rounded-dashboard shadow-dashboard space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Keyboard className="h-4.5 w-4.5 text-primary" />
            <h4 className="text-[13px] font-bold text-slate-850 dark:text-white">
              Keyboard Shortcuts
            </h4>
          </div>
          <div className="grid gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {shortcuts.map((sh, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs p-2 border border-slate-100 dark:border-slate-800/80 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <span className="text-slate-700 dark:text-slate-200 font-semibold">{sh.desc}</span>
                <div className="flex gap-1">
                  {sh.keys.map((k, kIdx) => (
                    <kbd key={kIdx} className="bg-slate-100 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
