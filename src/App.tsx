import { useState, useEffect, useMemo } from 'react';
import { Sidebar, SidebarTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { UploadScreen } from './components/dashboard/UploadScreen';
import { DashboardView } from './components/dashboard/DashboardView';
import { AdvancedTable } from './components/table/AdvancedTable';
import { AnalyticsPanel } from './components/analytics/AnalyticsPanel';
import { ChartsPanel } from './components/charts/ChartsPanel';
import { ReportsPanel } from './components/dashboard/ReportsPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { HelpPanel } from './components/help/HelpPanel';
import { PivotTable } from './components/pivot/PivotTable';
import { dbService, WorkbookFile } from './services/db';
import { profileSheet, SheetStats } from './utils/dataProfiler';
import { ToastContainer, toast } from './components/ui/Toast';
import { useKeyPress } from './hooks/useKeyPress';
import confetti from 'canvas-confetti';

export default function App() {
  // Navigation & Theme States
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'emerald'>('light');
  const [globalSearch, setGlobalSearch] = useState('');

  // Active Workbook & Sheet States
  const [activeWorkbook, setActiveWorkbook] = useState<WorkbookFile | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState(true);

  // Column Header Mapping States
  const [headerMappings, setHeaderMappings] = useState<{ [key: string]: string }>({});
  const [pastRenameStates, setPastRenameStates] = useState<{ [key: string]: string }[]>([]);
  const [futureRenameStates, setFutureRenameStates] = useState<{ [key: string]: string }[]>([]);

  // Sync state on sheet change
  useEffect(() => {
    if (activeWorkbook && activeSheetName) {
      const sheet = activeWorkbook.sheets[activeSheetName];
      setHeaderMappings(sheet.headerMappings || {});
      setPastRenameStates([]);
      setFutureRenameStates([]);
    } else {
      setHeaderMappings({});
      setPastRenameStates([]);
      setFutureRenameStates([]);
    }
  }, [activeWorkbook, activeSheetName]);

  const updateHeaderMappingsInDB = async (nextMappings: { [key: string]: string }) => {
    if (!activeWorkbook || !activeSheetName) return;

    setHeaderMappings(nextMappings);

    const updatedWorkbook = {
      ...activeWorkbook,
      sheets: {
        ...activeWorkbook.sheets,
        [activeSheetName]: {
          ...activeWorkbook.sheets[activeSheetName],
          headerMappings: nextMappings
        }
      }
    };
    
    setActiveWorkbook(updatedWorkbook);
    await dbService.saveWorkbook(updatedWorkbook);
  };

  const handleRenameHeader = (original: string, renamed: string) => {
    if (!activeWorkbook || !activeSheetName) return;
    
    setPastRenameStates(prev => [...prev, { ...headerMappings }]);
    setFutureRenameStates([]); // clear redo stack

    const nextMappings = {
      ...headerMappings,
      [original]: renamed.trim()
    };
    
    updateHeaderMappingsInDB(nextMappings);
    toast.success(`Renamed column "${original}" to "${renamed}"`);
  };

  const handleUndoRename = () => {
    if (pastRenameStates.length === 0) {
      toast.warning("Nothing to undo");
      return;
    }
    const previous = pastRenameStates[pastRenameStates.length - 1];
    setPastRenameStates(prev => prev.slice(0, -1));
    setFutureRenameStates(prev => [...prev, { ...headerMappings }]);
    updateHeaderMappingsInDB(previous);
    toast.success("Undo applied");
  };

  const handleRedoRename = () => {
    if (futureRenameStates.length === 0) {
      toast.warning("Nothing to redo");
      return;
    }
    const next = futureRenameStates[futureRenameStates.length - 1];
    setFutureRenameStates(prev => prev.slice(0, -1));
    setPastRenameStates(prev => [...prev, { ...headerMappings }]);
    updateHeaderMappingsInDB(next);
    toast.success("Redo applied");
  };

  const handleResetHeader = (col: string) => {
    setPastRenameStates(prev => [...prev, { ...headerMappings }]);
    setFutureRenameStates([]);
    const nextMappings = { ...headerMappings };
    delete nextMappings[col];
    updateHeaderMappingsInDB(nextMappings);
    toast.success(`Reset header: ${col}`);
  };

  const handleResetAllHeaders = () => {
    if (Object.keys(headerMappings).length === 0) return;
    setPastRenameStates(prev => [...prev, { ...headerMappings }]);
    setFutureRenameStates([]);
    updateHeaderMappingsInDB({});
    toast.success("Reset all headers");
  };

  // Load preferences and restore last session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      setIsLoadingFile(true);
      const savedTheme = await dbService.getPreference<string>('appTheme');
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'emerald') {
        setTheme(savedTheme);
      } else {
        const legacyDark = await dbService.getPreference<boolean>('darkMode');
        setTheme(legacyDark ? 'dark' : 'light');
      }

      const lastFileId = await dbService.getPreference<string>('lastOpenedWorkbookId');
      if (lastFileId) {
        const file = await dbService.getWorkbook(lastFileId);
        if (file) {
          setActiveWorkbook(file);
          // Set first sheet name
          const sheetNames = Object.keys(file.sheets);
          if (sheetNames.length > 0) {
            setActiveSheetName(sheetNames[0]);
          }
          toast.success(`Restored last active session: ${file.filename}`, 3000);
        }
      }
    } catch (err) {
      console.error("Error restoring session:", err);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Sync theme class on both html root and body
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'emerald-theme');
    document.body.classList.remove('dark', 'emerald-theme');
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else if (theme === 'emerald') {
      document.documentElement.classList.add('dark', 'emerald-theme');
      document.body.classList.add('dark', 'emerald-theme');
    }
    
    dbService.savePreference('appTheme', theme);
    dbService.savePreference('darkMode', theme !== 'light');
  }, [theme]);

  // Compute stats on active sheet selection (Memoized)
  const activeSheetStats = useMemo<SheetStats | null>(() => {
    if (!activeWorkbook || !activeSheetName) return null;
    const sheetData = activeWorkbook.sheets[activeSheetName];
    if (!sheetData) return null;
    return profileSheet(sheetData);
  }, [activeWorkbook, activeSheetName]);

  // Handle successful file upload
  const handleUploadSuccess = (workbook: WorkbookFile) => {
    setActiveWorkbook(workbook);
    const sheets = Object.keys(workbook.sheets);
    if (sheets.length > 0) {
      setActiveSheetName(sheets[0]);
    }
    setActiveTab('dashboard');
    
    // Celebrate success visually
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Refresh current sheet profile
  const handleRefreshSheet = () => {
    if (!activeWorkbook || !activeSheetName) return;
    toast.info(`Refreshed statistical indices for sheet: ${activeSheetName}`);
  };

  // Close active workbook and show upload page
  const handleUploadNewWorkbook = () => {
    if (confirm("Are you sure you want to return to the upload screen? Your current parsed workbook can be re-opened from history.")) {
      setActiveWorkbook(null);
      setActiveSheetName('');
      setGlobalSearch('');
      dbService.savePreference('lastOpenedWorkbookId', '');
      setActiveTab('dashboard');
    }
  };

  const handleExportWorkbook = () => {
    setActiveTab('reports');
  };

  const handleFilterToggle = () => {
    // Scroll to filters or focus input
    const filterInput = document.querySelector('input[placeholder="Filter..."]') as HTMLInputElement;
    if (filterInput) {
      filterInput.focus();
      toast.info("Inline column filters focused. Type query to filter records.");
    } else {
      setActiveTab('table');
      toast.info("Switched to table view. Enter column filters on any header.");
    }
  };

  // Define Hotkey Combos
  const keyCombos = useMemo(() => [
    { key: 'd', altKey: true, callback: () => setActiveTab('dashboard') },
    { key: 't', altKey: true, callback: () => setActiveTab('table') },
    { key: 'a', altKey: true, callback: () => setActiveTab('analytics') },
    { key: 'c', altKey: true, callback: () => setActiveTab('charts') },
    { key: 'r', altKey: true, callback: () => setActiveTab('reports') },
    { key: 's', altKey: true, callback: () => setActiveTab('settings') },
    { key: 'h', altKey: true, callback: () => setActiveTab('help') },
    { key: 'f', altKey: true, callback: () => {
      const searchEl = document.getElementById('global-search');
      searchEl?.focus();
    }},
    { key: 'u', altKey: true, callback: handleUploadNewWorkbook },
    { key: 'n', altKey: true, callback: () => setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'emerald' : 'light') },
  ], [activeWorkbook]);

  useKeyPress(keyCombos);

  // Active view rendering logic
  const renderActiveView = () => {
    if (!activeWorkbook || !activeSheetName || !activeSheetStats) {
      return (
        <UploadScreen 
          onUploadSuccess={handleUploadSuccess} 
          activeWorkbook={activeWorkbook}
        />
      );
    }

    const sheetData = activeWorkbook.sheets[activeSheetName];

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            stats={activeSheetStats} 
            sheetData={sheetData} 
            setActiveTab={setActiveTab}
            onFilterToggle={handleFilterToggle}
            headerMappings={headerMappings}
          />
        );
      case 'table':
        return (
          <AdvancedTable 
            sheetData={sheetData} 
            globalSearch={globalSearch} 
            headerMappings={headerMappings}
            onRenameHeader={handleRenameHeader}
            onUndo={handleUndoRename}
            onRedo={handleRedoRename}
            canUndo={pastRenameStates.length > 0}
            canRedo={futureRenameStates.length > 0}
          />
        );
      case 'pivot':
        return (
          <PivotTable 
            sheetData={sheetData}
            workbookId={activeWorkbook.id}
            activeSheetName={activeSheetName}
          />
        );
      case 'analytics':
        return (
          <AnalyticsPanel 
            stats={activeSheetStats} 
            sheetData={sheetData} 
            headerMappings={headerMappings}
          />
        );
      case 'charts':
        return <ChartsPanel sheetData={sheetData} headerMappings={headerMappings} />;
      case 'reports':
        return (
          <ReportsPanel 
            sheetData={sheetData} 
            filename={activeWorkbook.filename} 
            activeSheet={activeSheetName}
            headerMappings={headerMappings}
          />
        );
      case 'settings':
        return (
          <SettingsPanel 
            theme={theme} 
            setTheme={setTheme}
            onClearCache={handleUploadNewWorkbook}
            sheetData={sheetData}
            headerMappings={headerMappings}
            onRenameHeader={handleRenameHeader}
            onResetHeader={handleResetHeader}
            onResetAllHeaders={handleResetAllHeaders}
            onUndo={handleUndoRename}
            onRedo={handleRedoRename}
            canUndo={pastRenameStates.length > 0}
            canRedo={futureRenameStates.length > 0}
          />
        );
      case 'help':
        return <HelpPanel />;
      default:
        return null;
    }
  };

  const sheetsList = activeWorkbook ? Object.keys(activeWorkbook.sheets) : [];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-250">
      
      {/* Sidebar - Collapsible */}
      {activeWorkbook && (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Header */}
        <Header 
          fileName={activeWorkbook?.filename}
          sheets={sheetsList}
          activeSheet={activeSheetName}
          onSheetChange={setActiveSheetName}
          searchQuery={globalSearch}
          setSearchQuery={setGlobalSearch}
          theme={theme}
          setTheme={setTheme}
          onRefresh={handleRefreshSheet}
          onUploadNew={handleUploadNewWorkbook}
          onExportCurrent={handleExportWorkbook}
          onFilterToggle={handleFilterToggle}
          filtersCount={0} // Can count active filters if needed
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-slate-50 dark:bg-slate-950/20">
          {isLoadingFile ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading Session...</p>
            </div>
          ) : (
            renderActiveView()
          )}
        </main>
      </div>

      {/* Floating global components */}
      <ToastContainer />
    </div>
  );
}
