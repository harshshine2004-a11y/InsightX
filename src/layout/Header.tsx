import { useState } from 'react';
import { 
  Search, 
  Sun, 
  Moon, 
  RefreshCw, 
  Download, 
  Bell, 
  User, 
  UploadCloud, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  fileName?: string;
  sheets: string[];
  activeSheet: string;
  onSheetChange: (sheetName: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onRefresh: () => void;
  onUploadNew: () => void;
  onExportCurrent: () => void;
  onFilterToggle: () => void;
  filtersCount: number;
}

export function Header({
  fileName,
  sheets,
  activeSheet,
  onSheetChange,
  searchQuery,
  setSearchQuery,
  darkMode,
  setDarkMode,
  onRefresh,
  onUploadNew,
  onExportCurrent,
  onFilterToggle,
  filtersCount
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between z-10">
      {/* Workbook / Sheet Info */}
      <div className="flex items-center gap-4">
        {fileName ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-white max-w-[200px] truncate">
              {fileName}
            </span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            
            {/* Sheet Selector */}
            {sheets.length > 0 && (
              <div className="relative group">
                <select
                  value={activeSheet}
                  onChange={(e) => onSheetChange(e.target.value)}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-[13px] font-medium text-slate-700 dark:text-slate-300 pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-750 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
                >
                  {sheets.map(sheet => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        ) : (
          <span className="text-[15px] font-semibold text-slate-500 dark:text-slate-400">
            No File Loaded
          </span>
        )}
      </div>

      {/* Global Search and Tools */}
      <div className="flex items-center gap-3 flex-1 justify-end max-w-4xl">
        {/* Search Bar */}
        {fileName && (
          <div className="relative w-full max-w-xs md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search table by any column... (Alt+F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white dark:bg-slate-800/60 dark:focus:bg-slate-800/90 text-[13px] text-slate-800 dark:text-slate-200 pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-750 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder-slate-400 dark:placeholder-slate-500"
              id="global-search"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-650"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Global Filter Trigger */}
        {fileName && (
          <button
            onClick={onFilterToggle}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[13px] font-semibold transition-all duration-150 ${
              filtersCount > 0 
                ? 'bg-primary/5 text-primary border-primary/25 dark:bg-primary/20 dark:text-primary-dark dark:border-primary/30' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
            title="Filter Columns"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden md:inline">Filters</span>
            {filtersCount > 0 && (
              <span className="flex items-center justify-center bg-primary text-white text-[10px] h-4.5 min-w-4.5 px-1 rounded-full font-bold">
                {filtersCount}
              </span>
            )}
          </button>
        )}

        {/* Action Controls */}
        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block" />

        <div className="flex items-center gap-2">
          {/* Refresh */}
          {fileName && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Refresh sheet data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}

          {/* Quick Upload */}
          <button
            onClick={onUploadNew}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Upload new file"
          >
            <UploadCloud className="h-4.5 w-4.5" />
          </button>

          {/* Export */}
          {fileName && (
            <button
              onClick={onExportCurrent}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Export Options"
            >
              <Download className="h-4 w-4" />
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-xl py-3 z-50 animate-fade-in">
                <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-800 dark:text-white">Notifications</span>
                  <span className="text-[10px] text-primary font-semibold hover:underline cursor-pointer">Mark all read</span>
                </div>
                <div className="max-h-60 overflow-y-auto px-4 py-2 space-y-2 mt-2">
                  <div className="text-xs py-1.5 border-b border-slate-50 dark:border-slate-850/40">
                    <p className="font-semibold text-slate-700 dark:text-slate-350">System Offline First Mode</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">All parsed spreadsheets are stored locally inside your browser's IndexedDB storage.</p>
                  </div>
                  <div className="text-xs py-1.5">
                    <p className="font-semibold text-slate-700 dark:text-slate-350">Data parsing complete</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Columns are auto-profiled. Go to Charts and Analytics to view insights.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Profile widget */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-250 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:border-slate-700 text-slate-600 dark:text-slate-350 transition-colors cursor-pointer"
              title="Profile"
            >
              <User className="h-4 w-4" />
            </button>
            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-xl py-2 z-50 animate-fade-in text-[13px] text-slate-750 dark:text-slate-300">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-850">
                  <p className="font-bold text-slate-800 dark:text-white">Offline Operator</p>
                  <p className="text-[10px] text-slate-400">admin@local.host</p>
                </div>
                <button
                  onClick={onUploadNew}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  Upload New Sheet
                </button>
                <div className="border-t border-slate-100 dark:border-slate-850 my-1" />
                <div className="px-4 py-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  OS: Windows Offline
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
