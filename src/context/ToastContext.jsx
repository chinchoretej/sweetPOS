import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  error: <XCircle className="w-5 h-5 text-rose-500" />,
  info: <Info className="w-5 h-5 text-sky-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback(
    (id) => setToasts((arr) => arr.filter((t) => t.id !== id)),
    []
  );

  const push = useCallback(
    (toast) => {
      const id = Date.now() + Math.random();
      const next = { id, type: 'info', duration: 3500, ...toast };
      setToasts((arr) => [...arr, next]);
      if (next.duration > 0) setTimeout(() => dismiss(id), next.duration);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      toast: push,
      success: (message, opts = {}) => push({ type: 'success', message, ...opts }),
      error: (message, opts = {}) => push({ type: 'error', message, ...opts }),
      info: (message, opts = {}) => push({ type: 'info', message, ...opts }),
      warning: (message, opts = {}) => push({ type: 'warning', message, ...opts }),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[100] top-4 right-4 flex flex-col gap-2 w-[92vw] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="card flex items-start gap-3 p-3 animate-slide-up shadow-lg"
            role="status"
          >
            {ICONS[t.type]}
            <div className="flex-1">
              {t.title && <div className="font-semibold text-sm">{t.title}</div>}
              <div className="text-sm text-slate-700 dark:text-slate-200">{t.message}</div>
            </div>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
