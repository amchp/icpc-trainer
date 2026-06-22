import { AlertTriangle, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { cn } from "./lib.js";

interface ToastInput {
  readonly title: string;
  readonly description?: string;
}

interface Toast extends ToastInput {
  readonly id: number;
  readonly variant: "error";
}

interface ToastContextValue {
  readonly error: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 1;

export function ToasterProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ReadonlyArray<Toast>>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const error = useCallback((toast: ToastInput) => {
    const id = nextToastId++;
    const nextToast: Toast = { ...toast, id, variant: "error" };
    setToasts((current) => [...current, nextToast].slice(-3));
    window.setTimeout(() => dismiss(id), 8000);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({ error }), [error]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="assertive"
        className="fixed right-4 top-4 z-50 flex w-[min(calc(100vw-2rem),24rem)] flex-col gap-3"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={cn(
              "rounded-lg border bg-zinc-950 p-4 text-sm shadow-xl",
              toast.variant === "error" && "border-red-500/40 text-zinc-100 shadow-red-950/20",
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-300" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-red-100">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 leading-5 text-zinc-400">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToaster(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToaster must be used inside ToasterProvider.");
  }
  return context;
}
