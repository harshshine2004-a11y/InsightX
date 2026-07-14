import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastCallback = (toast: ToastItem) => void;
const listeners = new Set<ToastCallback>();

export const toast = {
  show(message: string, type: ToastType = 'info', duration = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    const toastItem: ToastItem = { id, message, type, duration };
    listeners.forEach(cb => cb(toastItem));
  },
  success(message: string, duration = 4000) {
    this.show(message, 'success', duration);
  },
  error(message: string, duration = 4000) {
    this.show(message, 'error', duration);
  },
  warning(message: string, duration = 4000) {
    this.show(message, 'warning', duration);
  },
  info(message: string, duration = 4000) {
    this.show(message, 'info', duration);
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleNewToast = (newToast: ToastItem) => {
      setToasts(prev => [...prev, newToast]);

      if (newToast.duration !== Infinity) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, newToast.duration || 4000);
      }
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => {
        let bgColor = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';
        let icon = <Info className="h-5 w-5 text-blue-500" />;
        
        switch (t.type) {
          case 'success':
            icon = <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            bgColor = 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-950/30 shadow-[0_4px_12px_rgba(16,185,129,0.08)]';
            break;
          case 'error':
            icon = <XCircle className="h-5 w-5 text-rose-500" />;
            bgColor = 'bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-950/30 shadow-[0_4px_12px_rgba(244,63,94,0.08)]';
            break;
          case 'warning':
            icon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
            bgColor = 'bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-950/30 shadow-[0_4px_12px_rgba(245,158,11,0.08)]';
            break;
        }

        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 p-4 rounded-xl border shadow-dashboard pointer-events-auto animate-fade-in ${bgColor}`}
            role="alert"
          >
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 break-words leading-snug">
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
