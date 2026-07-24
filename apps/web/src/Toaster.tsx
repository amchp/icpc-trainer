import { TOAST_VARIANTS, type ToastVariant } from "@icpc-trainer/shared";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "./lib.js";

interface ToastInput {
  readonly title: string;
  readonly description?: string;
}

interface Toast extends ToastInput {
  readonly id: number;
  readonly variant: ToastVariant;
}

interface ToastContextValue {
  readonly error: (toast: ToastInput) => void;
  readonly warning: (toast: ToastInput) => void;
  readonly success: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const MAX_VISIBLE_TOASTS = 6;
const TOAST_DURATION_MS = 20_000;
let nextToastId = 1;

export function ToasterProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { t } = useTranslation("common");
  const [toasts, setToasts] = useState<ReadonlyArray<Toast>>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((variant: Toast["variant"], toast: ToastInput) => {
    const id = nextToastId++;
    const nextToast: Toast = { ...toast, id, variant };
    setToasts((current) => [...current, nextToast].slice(-MAX_VISIBLE_TOASTS));
    window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }, [dismiss]);

  const error = useCallback((toast: ToastInput) => showToast(TOAST_VARIANTS.Error, toast), [showToast]);
  const warning = useCallback((toast: ToastInput) => showToast(TOAST_VARIANTS.Warning, toast), [showToast]);
  const success = useCallback((toast: ToastInput) => showToast(TOAST_VARIANTS.Success, toast), [showToast]);

  const value = useMemo<ToastContextValue>(() => ({ error, warning, success }), [error, success, warning]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="assertive"
        className="fixed right-4 top-4 z-50 flex max-h-[calc(100vh-2rem)] w-[min(calc(100vw-2rem),26rem)] flex-col gap-3 overflow-hidden"
      >
        {toasts.map((toast) => {
          const Icon = toast.variant === TOAST_VARIANTS.Success ? CheckCircle2 : AlertTriangle;

          return (
            <div
              key={toast.id}
              role="alert"
              className={cn(
                "rounded-lg border bg-zinc-950 p-4 text-sm shadow-xl",
                toast.variant === TOAST_VARIANTS.Error && "border-red-500/40 text-zinc-100 shadow-red-950/20",
                toast.variant === TOAST_VARIANTS.Warning && "border-amber-500/40 text-zinc-100 shadow-amber-950/20",
                toast.variant === TOAST_VARIANTS.Success && "border-emerald-500/40 text-zinc-100 shadow-emerald-950/20",
              )}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    toast.variant === TOAST_VARIANTS.Error && "text-red-300",
                    toast.variant === TOAST_VARIANTS.Warning && "text-amber-300",
                    toast.variant === TOAST_VARIANTS.Success && "text-emerald-300",
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "font-medium",
                    toast.variant === TOAST_VARIANTS.Error && "text-red-100",
                    toast.variant === TOAST_VARIANTS.Warning && "text-amber-100",
                    toast.variant === TOAST_VARIANTS.Success && "text-emerald-100",
                  )}>
                    {toast.title}
                  </p>
                  {toast.description ? (
                    <p className="mt-1 leading-5 text-zinc-400">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  aria-label={t("close")}
                  onClick={() => dismiss(toast.id)}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
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
