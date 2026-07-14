import { useState } from 'react';
import { SheetData } from '../../services/db';
import { getSmartSuggestion } from '../../utils/headerSuggestions';
import { 
  Search, 
  RotateCcw, 
  Sparkles, 
  Undo, 
  Redo, 
  ArrowUpDown,
  Check,
  Edit2
} from 'lucide-react';
import { toast } from '../ui/Toast';

interface HeaderManagerProps {
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

export function HeaderManager({
  sheetData,
  headerMappings,
  onRenameHeader,
  onResetHeader,
  onResetAllHeaders,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: HeaderManagerProps) {
  const { headers } = sheetData;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAlphabetically, setSortAlphabetically] = useState(false);

  // Filter & Sort headers
  const processedHeaders = headers
    .filter(h => h.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (!sortAlphabetically) return 0; // retain original excel sheet order
      return a.localeCompare(b);
    });

  const handleApplySuggestions = () => {
    let count = 0;
    headers.forEach(h => {
      const suggestion = getSmartSuggestion(h);
      if (suggestion !== h && headerMappings[h] !== suggestion) {
        onRenameHeader(h, suggestion);
        count++;
      }
    });

    if (count > 0) {
      toast.success(`Automatically suggested and renamed ${count} shorthand headers!`);
    } else {
      toast.info("All headers are already matching smart suggestions.");
    }
  };

  const handleApplySingleSuggestion = (col: string) => {
    const suggestion = getSmartSuggestion(col);
    if (suggestion !== col) {
      onRenameHeader(col, suggestion);
    } else {
      toast.info("No shorthand abbreviation found; header capitalized.");
      onRenameHeader(col, col.charAt(0).toUpperCase() + col.slice(1));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-6 rounded-dashboard shadow-dashboard space-y-5">
      
      {/* Header controls & undo / redo */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="text-[14px] font-bold text-slate-800 dark:text-white">
            Column Header Manager
          </h4>
          <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5">
            Rename headings for presentation; underlying Excel data is kept safe.
          </p>
        </div>

        {/* Undo / Redo Toolbar */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/40 p-1 rounded-xl">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-lg text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Undo Rename"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-lg text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Redo Rename"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Actions Panel */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        {/* Search & Sort */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 bg-slate-50 dark:bg-slate-800 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary dark:text-slate-100"
            />
          </div>
          <button
            onClick={() => setSortAlphabetically(!sortAlphabetically)}
            className={`p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center ${
              sortAlphabetically ? 'border-primary text-primary bg-primary/5' : 'border-slate-200 text-slate-500'
            }`}
            title="Sort headers A-Z"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>

        {/* Global Presets */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleApplySuggestions}
            className="flex-1 sm:flex-initial bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary dark:bg-primary/20 dark:text-primary-dark text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Auto-Suggest All</span>
          </button>
          <button
            onClick={onResetAllHeaders}
            disabled={Object.keys(headerMappings).length === 0}
            className="flex-1 sm:flex-initial bg-rose-50 hover:bg-rose-100/70 border border-rose-150 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-450 text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All</span>
          </button>
        </div>
      </div>

      {/* Headers Mapping Grid */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-500 dark:text-slate-400 text-[11px] border-b border-slate-200 dark:border-slate-800">
          <span>Excel Header (Original)</span>
          <span>Display Header (Renamed)</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {processedHeaders.length > 0 ? (
            processedHeaders.map((header) => {
              const displayName = headerMappings[header] || '';
              
              return (
                <div key={header} className="grid grid-cols-2 gap-4 p-3 items-center text-xs">
                  <span className="font-semibold text-slate-650 dark:text-slate-350 truncate pr-3" title={header}>
                    {header}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={displayName}
                      placeholder={header}
                      onChange={(e) => onRenameHeader(header, e.target.value)}
                      className="flex-1 bg-slate-50 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-205 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary font-semibold text-slate-800 dark:text-slate-100"
                    />
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleApplySingleSuggestion(header)}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors"
                        title="Suggest professional name"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      {displayName && (
                        <button
                          onClick={() => onResetHeader(header)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Reset to original"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              No columns match your search filter.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
