import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Check } from "lucide-react";

import { cn } from "./lib.js";

/**
 * Cool hues carry the ordered spine (01 → 03); warm hues carry the three guides that share
 * step 04, so the temperature shift marks where the single order stops and the branches begin.
 */
const ROADMAP_ACCENTS = {
  cyan: { border: "border-cyan-400/70 hover:border-cyan-300 focus-visible:ring-cyan-300", text: "text-cyan-300", dot: "bg-cyan-400" },
  blue: { border: "border-blue-400/70 hover:border-blue-300 focus-visible:ring-blue-300", text: "text-blue-300", dot: "bg-blue-400" },
  violet: { border: "border-violet-400/70 hover:border-violet-300 focus-visible:ring-violet-300", text: "text-violet-300", dot: "bg-violet-400" },
  rose: { border: "border-rose-400/70 hover:border-rose-300 focus-visible:ring-rose-300", text: "text-rose-300", dot: "bg-rose-400" },
  orange: { border: "border-orange-400/70 hover:border-orange-300 focus-visible:ring-orange-300", text: "text-orange-300", dot: "bg-orange-400" },
  amber: { border: "border-amber-400/70 hover:border-amber-300 focus-visible:ring-amber-300", text: "text-amber-300", dot: "bg-amber-400" }
} as const;

export type RoadmapAccent = keyof typeof ROADMAP_ACCENTS;

export function RoadmapNode({
  to,
  step,
  title,
  status,
  completed,
  accent,
  className
}: {
  to: string;
  step: string;
  title: string;
  status: string;
  completed: boolean;
  accent: RoadmapAccent;
  className?: string;
}): React.JSX.Element {
  const tone = ROADMAP_ACCENTS[accent];

  return (
    <Link
      to={to}
      className={cn(
        "group mx-auto flex w-full max-w-[21rem] flex-col rounded-lg border bg-zinc-900 px-4 py-3.5 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 xl:max-w-none",
        tone.border,
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("font-mono text-[10px] tracking-[0.14em]", completed ? "text-emerald-300/80" : tone.text)}>{step}</span>
        {completed ? (
          <Check className="size-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
        ) : (
          <ArrowRight
            className={cn("size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none", tone.text)}
            aria-hidden="true"
          />
        )}
      </div>
      <h2 className="mt-2 text-[15px] font-semibold leading-tight tracking-[-0.01em] text-zinc-50">{title}</h2>
      <p
        className={cn(
          "mt-auto inline-flex items-center gap-1.5 pt-3 font-mono text-[10px] uppercase tracking-[0.14em]",
          completed ? "text-emerald-300" : tone.text
        )}
      >
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", completed ? "bg-emerald-400" : tone.dot)} />
        {status}
      </p>
    </Link>
  );
}

/** Straight link between two ordered steps: horizontal on wide screens, vertical when the roadmap stacks. */
export function RoadmapConnector(): React.JSX.Element {
  return (
    <div className="flex min-h-9 items-center justify-center text-zinc-600" aria-hidden="true">
      <div className="hidden w-full items-center xl:flex">
        <span className="flex-1 border-t border-dashed border-zinc-700" />
        <ArrowRight className="-ml-px size-4 shrink-0" strokeWidth={1.5} />
      </div>
      <div className="flex h-full flex-col items-center xl:hidden">
        <span className="flex-1 border-l border-dashed border-zinc-700" />
        <ArrowDown className="-mt-px size-4 shrink-0" strokeWidth={1.5} />
      </div>
    </div>
  );
}

/**
 * Splits the spine into the three step 04 guides, all of which need only complexity theory.
 * The arms sit at the row centres of the three equal-height rows it spans. With row height h
 * and a 1rem gap g, the outer centres land h/2 from each edge, which is H/6 − g/3; the middle
 * centre is exactly H/2.
 */
export function RoadmapFork(): React.JSX.Element {
  const outerArm = "calc(16.6667% - 0.3333rem)";

  return (
    <div className="relative hidden text-zinc-600 xl:block xl:col-start-1 xl:row-start-1 xl:row-end-4" aria-hidden="true">
      <span className="absolute left-0 top-1/2 w-1/2 border-t border-dashed border-zinc-700" />
      <span className="absolute left-1/2 border-l border-dashed border-zinc-700" style={{ top: outerArm, bottom: outerArm }} />
      <span className="absolute left-1/2 right-3 border-t border-dashed border-zinc-700" style={{ top: outerArm }} />
      <span className="absolute left-1/2 right-3 top-1/2 border-t border-dashed border-zinc-700" />
      <span className="absolute left-1/2 right-3 border-t border-dashed border-zinc-700" style={{ bottom: outerArm }} />
      <ArrowRight className="absolute right-0 size-4 -translate-y-1/2" strokeWidth={1.5} style={{ top: outerArm }} />
      <ArrowRight className="absolute right-0 top-1/2 size-4 -translate-y-1/2" strokeWidth={1.5} />
      <ArrowRight className="absolute right-0 size-4 translate-y-1/2" strokeWidth={1.5} style={{ bottom: outerArm }} />
    </div>
  );
}
