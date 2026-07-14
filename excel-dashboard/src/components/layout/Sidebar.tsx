import { 
  LayoutDashboard, 
  Table, 
  BarChart3, 
  TrendingUp, 
  FileDown, 
  Settings, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Layers
} from 'lucide-react';

export type SidebarTab = 'dashboard' | 'table' | 'pivot' | 'analytics' | 'charts' | 'reports' | 'settings' | 'help';

interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isCollapsed, 
  setIsCollapsed 
}: SidebarProps) {

  const menuItems = [
    { id: 'dashboard' as SidebarTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'table' as SidebarTab, label: 'Data Table', icon: Table },
    { id: 'pivot' as SidebarTab, label: 'Pivot Table', icon: Layers },
    { id: 'analytics' as SidebarTab, label: 'Analytics', icon: TrendingUp },
    { id: 'charts' as SidebarTab, label: 'Charts', icon: BarChart3 },
    { id: 'reports' as SidebarTab, label: 'Reports', icon: FileDown },
    { id: 'settings' as SidebarTab, label: 'Settings', icon: Settings },
    { id: 'help' as SidebarTab, label: 'Help', icon: HelpCircle },
  ];

  return (
    <aside 
      className={`flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out z-20 ${
        isCollapsed ? 'w-[70px]' : 'w-[240px]'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 h-16 px-4 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-white flex-shrink-0">
          <Database className="h-5 w-5" />
        </div>
        {!isCollapsed && (
          <span className="font-bold text-slate-800 dark:text-white tracking-wide text-[15px] truncate">
            InsightX
          </span>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group font-semibold text-[13px] relative ${
                isActive 
                  ? 'bg-primary/10 text-slate-900 dark:text-primary-dark' 
                  : 'text-slate-700 hover:text-black hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-850/50'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-md bg-primary" />
              )}
              <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${isActive ? 'text-primary dark:text-primary-dark' : 'text-slate-450 group-hover:text-slate-650 dark:group-hover:text-slate-300'}`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse button at bottom */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[12px] font-semibold">Collapse Menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
