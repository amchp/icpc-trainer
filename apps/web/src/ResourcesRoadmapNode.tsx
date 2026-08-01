import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Check } from "lucide-react";

import { cn } from "./lib.js";

/**
 * Cool hues carry the ordered spine (01 → 03); warm/cool accents distinguish the four
 * step-04 branches, while Graph Theory continues from Data Structures as step 05.
 */
const ROADMAP_ACCENTS = {
  cyan: { border: "border-cyan-400/70 hover:border-cyan-300 focus-visible:ring-cyan-300", text: "text-cyan-300", dot: "bg-cyan-400" },
  blue: { border: "border-blue-400/70 hover:border-blue-300 focus-visible:ring-blue-300", text: "text-blue-300", dot: "bg-blue-400" },
  violet: { border: "border-violet-400/70 hover:border-violet-300 focus-visible:ring-violet-300", text: "text-violet-300", dot: "bg-violet-400" },
  rose: { border: "border-rose-400/70 hover:border-rose-300 focus-visible:ring-rose-300", text: "text-rose-300", dot: "bg-rose-400" },
  orange: { border: "border-orange-400/70 hover:border-orange-300 focus-visible:ring-orange-300", text: "text-orange-300", dot: "bg-orange-400" },
  amber: { border: "border-amber-400/70 hover:border-amber-300 focus-visible:ring-amber-300", text: "text-amber-300", dot: "bg-amber-400" },
  emerald: { border: "border-emerald-400/70 hover:border-emerald-300 focus-visible:ring-emerald-300", text: "text-emerald-300", dot: "bg-emerald-400" }
} as const;

export type RoadmapAccent = keyof typeof ROADMAP_ACCENTS;

/**
 * Two fixed lines — step with title, then status — so every card is the same height whatever
 * the guide is called. A long title truncates rather than wrapping into a taller card.
 */
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
        "group flex w-full flex-col rounded-lg border bg-zinc-900 px-3 py-2 transition-colors motion-reduce:transition-none hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2",
        tone.border,
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("shrink-0 font-mono text-[10px] tracking-[0.14em]", completed ? "text-emerald-300/80" : tone.text)}>{step}</span>
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight tracking-[-0.01em] text-zinc-50">{title}</h2>
        {completed ? (
          <Check className="size-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
        ) : (
          <ArrowRight
            className={cn("size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none", tone.text)}
            aria-hidden="true"
          />
        )}
      </div>
      <p
        className={cn(
          "mt-1 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em]",
          completed ? "text-emerald-300" : tone.text
        )}
      >
        <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", completed ? "bg-emerald-400" : tone.dot)} />
        {status}
      </p>
    </Link>
  );
}

/** Vertical link between a guide and the one that follows it. */
export function RoadmapConnector(): React.JSX.Element {
  return (
    <div className="flex h-5 flex-col items-center text-zinc-600" aria-hidden="true">
      <span className="flex-1 border-l border-dashed border-zinc-700" />
      <ArrowDown className="-mt-px size-3.5 shrink-0" strokeWidth={1.5} />
    </div>
  );
}

/**
 * Horizontal reach of each branch's rail: from its own column centre out across the grid gap,
 * so the four segments join into one continuous line. Negative insets bridge the `gap-3`
 * between columns, keeping every drop on its column's true centre instead of approximate
 * quarter positions.
 */
const BRANCH_RAILS = ["left-1/2 -right-1.5", "-left-1.5 -right-1.5", "-left-1.5 -right-1.5", "-left-1.5 right-1/2"] as const;

/**
 * Fans the stacked spine out to the four step-04 guides. At xl the branch is a four-column
 * row, so the fan mirrors that grid exactly: a drop from the spine, a rail across, and four
 * drops landing on the column centres. Below xl the branch stacks and a plain connector is used.
 */
export function RoadmapBranchFan(): React.JSX.Element {
  return (
    <div className="hidden h-9 text-zinc-600 xl:block" aria-hidden="true">
      <div className="relative grid h-full grid-cols-4 gap-3">
        <span className="absolute left-1/2 top-0 h-4 border-l border-dashed border-zinc-700" />
        {BRANCH_RAILS.map((rail, index) => (
          <div key={index} className="relative">
            <span className={cn("absolute top-4 border-t border-dashed border-zinc-700", rail)} />
            <span className="absolute left-1/2 top-4 h-3 border-l border-dashed border-zinc-700" />
            <ArrowDown className="absolute left-1/2 top-5 size-3.5 -translate-x-1/2" strokeWidth={1.5} />
          </div>
        ))}
      </div>
    </div>
  );
}
