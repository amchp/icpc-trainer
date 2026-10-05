import * as ProgressPrimitive from "@radix-ui/react-progress";
import type { ButtonVariant } from "@icpc-trainer/shared";
import * as React from "react";

import { cn } from "../lib.js";
import { formatNumber } from "../i18n/format.js";
import { useLocale } from "../i18n/LocaleProvider.js";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
}

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          "border border-blue-500 bg-blue-500 text-white hover:border-blue-400 hover:bg-blue-400",
        variant === "secondary" &&
          "border border-zinc-800 bg-zinc-950 text-zinc-100 hover:border-blue-500/70 hover:bg-zinc-900",
        variant === "ghost" && "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100",
        className,
      )}
      {...props}
    />
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({
  className,
  ...props
}, ref): React.JSX.Element {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-600 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref): React.JSX.Element {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-20 w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>): React.JSX.Element {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>): React.JSX.Element {
  return <label className={cn("block", className)} {...props} />;
}

export function FieldLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
  return (
    <span
      className={cn("mb-1.5 block text-xs font-medium uppercase text-zinc-500", className)}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <section
      className={cn("rounded-lg border border-zinc-800 bg-zinc-950/72 shadow-sm", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-300",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = menu?.parentElement?.querySelector<HTMLElement>('[aria-haspopup="menu"]');
    if (!menu || !trigger) {
      return;
    }

    // The top layer escapes overflow clipping while preserving DOM containment
    // for the dropdowns' existing outside-click handlers.
    menu.showPopover?.();
    const positionMenu = () => {
      const anchor = trigger.getBoundingClientRect();
      const gap = 8;
      const margin = 8;
      const below = Math.max(0, window.innerHeight - anchor.bottom - gap - margin);
      const above = Math.max(0, anchor.top - gap - margin);
      const desiredHeight = Math.min(menu.scrollHeight + 2, 320);
      const opensAbove = desiredHeight > below && above > below;
      menu.style.maxHeight = `${Math.min(320, opensAbove ? above : below)}px`;
      const bounds = menu.getBoundingClientRect();
      menu.style.left = `${Math.max(margin, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - margin))}px`;
      menu.style.top = `${opensAbove ? anchor.top - bounds.height - gap : anchor.bottom + gap}px`;
    };

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(positionMenu);
    observer?.observe(trigger);
    observer?.observe(menu);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
      observer?.disconnect();
      menu.hidePopover?.();
    };
  }, []);

  return (
    <div
      ref={menuRef}
      popover={typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype.showPopover === "function" ? "manual" : undefined}
      className={cn(
        "fixed inset-auto z-50 m-0 min-w-[min(14rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-[0_16px_48px_rgba(0,0,0,0.4)]",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 min-w-52 items-center justify-between gap-3 whitespace-nowrap rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-700 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownItem({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-zinc-300 outline-none transition-colors hover:bg-zinc-900 hover:text-zinc-100 focus-visible:bg-zinc-900 focus-visible:text-zinc-100",
        className,
      )}
      {...props}
    />
  );
}

export function Separator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("h-px w-full bg-zinc-800", className)} {...props} />;
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("animate-pulse rounded-md bg-zinc-800", className)} {...props} />;
}

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  readonly indicatorClassName?: string;
}

export function Progress({
  className,
  indicatorClassName,
  value = 0,
  ...props
}: ProgressProps): React.JSX.Element {
  const safeValue = Math.max(0, Math.min(Number(value ?? 0), 100));

  return (
    <ProgressPrimitive.Root
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-zinc-800", className)}
      value={safeValue}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 bg-blue-500 transition-transform", indicatorClassName)}
        style={{ transform: `translateX(-${100 - safeValue}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>): React.JSX.Element {
  return <table className={cn("w-full caption-bottom text-sm", className)} {...props} />;
}

export function TableCount({
  className,
  count,
  itemName,
  pluralItemName = `${itemName}s`
}: {
  readonly className?: string;
  readonly count: number;
  readonly itemName: string;
  readonly pluralItemName?: string;
}): React.JSX.Element {
  const { locale } = useLocale();
  const countLabel = count === 1 ? itemName : pluralItemName;
  const formattedCount = formatNumber(count, locale);

  return (
    <div
      aria-label={`${formattedCount} ${countLabel}`}
      className={cn(
        "inline-flex h-9 min-w-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-900/70 px-3 text-xs font-medium tabular-nums text-zinc-300",
        className
      )}
    >
      {formattedCount}
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-zinc-800", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>): React.JSX.Element {
  return (
    <tr
      className={cn("border-b border-zinc-800 transition-colors hover:bg-zinc-900/60", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>): React.JSX.Element {
  return (
    <th
      className={cn("h-10 px-3 text-left align-middle text-xs font-medium text-zinc-500", className)}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>): React.JSX.Element {
  return <td className={cn("px-3 py-3 align-middle text-zinc-300", className)} {...props} />;
}
