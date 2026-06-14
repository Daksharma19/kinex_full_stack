import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  /** Show a toast. `type` defaults to "info". */
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastType, string> = {
  success: "check_circle",
  error: "error",
  info: "info",
};

const STYLES: Record<ToastType, string> = {
  success: "border-l-green-500 text-green-900",
  error: "border-l-red-500 text-red-900",
  info: "border-l-primary text-on-surface",
};

/**
 * App-wide toast notifications. Wrap the app once; call useToast() anywhere to
 * pop a success/error/info message. Toasts auto-dismiss after a few seconds and
 * stack in the bottom-right corner.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message, type }]);
      // Errors linger a bit longer so the user can read them.
      setTimeout(() => remove(id), type === "error" ? 5000 : 3000);
    },
    [remove]
  );

  const value: ToastContextValue = {
    toast,
    success: useCallback((m: string) => toast(m, "success"), [toast]),
    error: useCallback((m: string) => toast(m, "error"), [toast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[2000] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`flex items-start gap-3 rounded-xl border-l-4 bg-surface-container-lowest px-4 py-3 shadow-xl ${STYLES[t.type]}`}
          >
            <span className="material-symbols-outlined text-xl">{ICONS[t.type]}</span>
            <p className="flex-1 text-sm font-medium text-on-surface">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              aria-label="Dismiss"
              className="text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}
