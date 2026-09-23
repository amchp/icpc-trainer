import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../components/ui.js";
import { cn } from "../lib.js";
import type { AnimationGroupId } from "./catalog.js";
import { lessonExamples, type LessonExample } from "./lessonExamples.js";

export function AnimationLessonIntro({ groupId }: { readonly groupId: AnimationGroupId }): React.JSX.Element {
  const { t } = useTranslation("animations");
  const [showOutcome, setShowOutcome] = useState(false);
  const example: LessonExample = lessonExamples[groupId];
  const headingId = useId();
  const prefix = `introductions.${groupId}` as const;

  return (
    <section aria-labelledby={headingId} data-animation-introduction={groupId} className="mb-10 border-y border-zinc-800 py-8 sm:py-10">
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-blue-300">01 · {t(`lesson.${example.kind}`)}</p>
      <h2 id={headingId} className="text-2xl font-semibold tracking-tight sm:text-3xl">{t(`${prefix}.title`)}</h2>
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="min-w-0 text-base leading-7 text-zinc-300">
          <p>{t(`${prefix}.statement`)}</p>
          <dl className="mt-6 space-y-5">
            <div><dt className="text-sm font-semibold text-zinc-100">{t("lesson.given")}</dt><dd className="mt-1 text-zinc-400">{t(`${prefix}.input`)}</dd></div>
            <div><dt className="text-sm font-semibold text-zinc-100">{t("lesson.goal")}</dt><dd className="mt-1 text-zinc-400">{t(`${prefix}.output`)}</dd></div>
          </dl>
        </div>
        <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
          <p className="text-xs font-medium text-zinc-400">{t("lesson.example")}</p>
          <div className="my-5 min-h-40 content-center">
            <ExampleDiagram groupId={groupId} example={example} showOutcome={showOutcome} label={t(`${prefix}.${showOutcome ? "output" : "input"}`)} />
          </div>
          <Button variant="secondary" aria-pressed={showOutcome} onClick={() => setShowOutcome((current) => !current)}>
            {showOutcome ? t("lesson.hide") : t("lesson.show")}
          </Button>
          <p role="status" className="mt-4 text-sm leading-6 text-zinc-300">{t(`${prefix}.${showOutcome ? "output" : "input"}`)}</p>
          <p className="mt-3 text-xs leading-5 text-zinc-500">{t("lesson.exampleNote")}</p>
        </div>
      </div>
    </section>
  );
}

function ExampleDiagram({ groupId, example, showOutcome, label }: {
  readonly groupId: AnimationGroupId;
  readonly example: LessonExample;
  readonly showOutcome: boolean;
  readonly label: string;
}): React.JSX.Element {
  const arrowId = useId().replace(/:/g, "");
  const values = showOutcome ? example.output : example.input;
  if (example.diagram === "graph") {
    const positions = [[45, 95], [170, 40], [170, 150], [295, 95]] as const;
    const edges = [[0, 1], [0, 2], [1, 3], [2, 3]] as const;
    const directed = groupId === "topological-sort";
    return (
      <svg role="img" aria-label={label} viewBox="0 0 340 195" className="mx-auto w-full max-w-md">
        <defs><marker id={arrowId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#71717a" /></marker></defs>
        {edges.map(([from, to], index) => {
          const [x1, y1] = positions[from]; const [x2, y2] = positions[to];
          const length = Math.hypot(x2 - x1, y2 - y1);
          const dx = (x2 - x1) / length; const dy = (y2 - y1) / length;
          return <g key={`${from}-${to}`}><line x1={x1 + dx * 27} y1={y1 + dy * 27} x2={x2 - dx * 30} y2={y2 - dy * 30} stroke="#71717a" strokeWidth="2" markerEnd={directed ? `url(#${arrowId})` : undefined} />{groupId === "dijkstra" ? <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 9} fill="#e4e4e7" textAnchor="middle" fontSize="14">{[4, 1, 2, 5][index]}</text> : null}</g>;
        })}
        {positions.map(([x, y], index) => <g key={index}>
          <circle cx={x} cy={y} r="27" className={cn("transition-colors motion-reduce:transition-none", showOutcome ? groupId === "bipartite-dfs" && (index === 1 || index === 2) ? "fill-violet-950 stroke-violet-400" : "fill-blue-950 stroke-blue-400" : "fill-zinc-900 stroke-zinc-600")} strokeWidth="2" />
          <text x={x} y={y + 5} textAnchor="middle" fill="#e4e4e7" fontSize="14">{values[index]}</text>
        </g>)}
      </svg>
    );
  }
  if (example.diagram === "intervals") return (
    <svg role="img" aria-label={label} viewBox="0 0 340 185" className="mx-auto w-full max-w-md">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((time) => <g key={time}><line x1={35 + time * 40} y1="18" x2={35 + time * 40} y2="148" stroke="#27272a" /><text x={35 + time * 40} y="173" textAnchor="middle" fill="#a1a1aa" fontSize="12">{time}</text></g>)}
      {[[1, 4], [3, 5], [5, 7]].map(([start = 0, end = 0], i) => <g key={i}><text x="12" y={42 + i * 43} fill="#e4e4e7" fontSize="14">{["A", "B", "C"][i]}</text><rect x={35 + start * 40} y={23 + i * 43} width={(end - start) * 40} height="28" rx="5" fill={showOutcome ? i === 1 ? "#3f3f46" : "#1d4ed8" : "#3f3f46"} stroke={showOutcome && i !== 1 ? "#93c5fd" : "#71717a"} /><text x={35 + (start + end) * 20} y={42 + i * 43} textAnchor="middle" fill="#e4e4e7" fontSize="13">{showOutcome ? i === 1 ? "×" : "✓" : `${start}–${end}`}</text></g>)}
    </svg>
  );
  return (
    <div role="img" aria-label={label} className={cn("flex flex-wrap items-center justify-center gap-2", example.diagram === "stack" && "mx-auto max-w-48 flex-col")}>
      {values.map((value, index) => (
        <span key={index} className={cn("flex min-h-14 min-w-12 max-w-full items-center justify-center rounded-lg border px-3 py-3 text-center font-mono text-base break-words transition-colors motion-reduce:transition-none sm:text-lg", example.diagram === "stack" && "w-full", showOutcome ? "border-blue-400/50 bg-blue-400/10 text-blue-100" : "border-zinc-600 bg-zinc-950 text-zinc-200")}>
          {value}
        </span>
      ))}
    </div>
  );
}
