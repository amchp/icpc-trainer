import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib.js";
import type { Player } from "./gameModels.js";

export const playerTone = (player: Player): string => player === 1 ? "text-cyan-200" : "text-fuchsia-200";

export function GameFrame({ title, status, statusClassName, announcement, children }: {
  readonly title: string;
  readonly status: string;
  readonly statusClassName: string;
  readonly announcement: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="my-10 overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-950/80 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/70 px-4 py-3 sm:px-6">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        <p className={cn("font-mono text-[11px] uppercase tracking-[0.12em]", statusClassName)}>{status}</p>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </div>
  );
}

export function StrategyDisclosure({ open, onToggle, regionId, children }: {
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly regionId: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const { t } = useTranslation("introduction");
  return (
    <div className="mt-6 border-t border-dashed border-zinc-700 pt-5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={onToggle}
        className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        {open ? t("games.hideStrategy") : t("games.showStrategy")}
      </button>
      {open ? <div id={regionId} className="mt-4 max-w-3xl border-l-2 border-cyan-400 pl-4 text-sm leading-7 text-zinc-300">{children}</div> : null}
    </div>
  );
}

export function ResetButton({ onClick }: { readonly onClick: () => void }): React.JSX.Element {
  const { t } = useTranslation("introduction");
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
      <RotateCcw className="size-3.5" aria-hidden="true" /> {t("games.reset")}
    </button>
  );
}
