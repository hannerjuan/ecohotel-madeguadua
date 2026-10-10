import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

/** Avisos breves en pantalla, en lugar de los alert() del navegador. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed top-24 inset-x-4 sm:left-auto sm:right-6 sm:w-96 z-[60] flex flex-col gap-3" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-3 rounded-2xl p-4 shadow-xl border text-sm ${
                t.kind === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-olive/15 text-ink'
              }`}
            >
              {t.kind === 'error' ? (
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-olive" />
              )}
              <p className="flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="opacity-50 hover:opacity-100">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
