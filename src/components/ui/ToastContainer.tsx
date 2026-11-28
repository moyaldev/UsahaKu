import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const iconMap = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
          error: <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
          info: <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />,
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-lg"
          >
            {iconMap[toast.type]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Tutup notifikasi"
              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
