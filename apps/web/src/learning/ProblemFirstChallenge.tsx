import { ChevronDown, ExternalLink } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "../lib.js";

export interface ProblemFirstChallengeProps {
  readonly accent?: "orange" | "violet" | "cyan" | "emerald";
  readonly eyebrow: string;
  readonly problemStageLabel: string;
  readonly title: string;
  readonly description: string;
  readonly constraintsLabel: string;
  readonly constraints: string;
  readonly sampleLabel: string;
  readonly sample: string;
  readonly sourceUrl: string;
  readonly sourceLabel: string;
  readonly attemptPrompt: string;
  readonly attemptStageLabel: string;
  readonly revealLabel: string;
  readonly hideLabel: string;
  readonly toolTitle: string;
  readonly applicationPrompt: string;
  readonly applicationRevealLabel: string;
  readonly applicationHideLabel: string;
  readonly applicationTitle: string;
  readonly toolStageLabel: string;
  readonly applicationStageLabel: string;
  readonly application: React.ReactNode;
  readonly children: React.ReactNode;
}

const accentStyles = {
  orange: {
    border: "border-orange-400/45",
    bar: "bg-orange-400",
    text: "text-orange-300",
    ring: "focus-visible:ring-orange-300"
  },
  violet: {
    border: "border-violet-400/45",
    bar: "bg-violet-400",
    text: "text-violet-300",
    ring: "focus-visible:ring-violet-300"
  },
  cyan: {
    border: "border-cyan-400/45",
    bar: "bg-cyan-400",
    text: "text-cyan-300",
    ring: "focus-visible:ring-cyan-300"
  },
  emerald: {
    border: "border-emerald-400/45",
    bar: "bg-emerald-400",
    text: "text-emerald-300",
    ring: "focus-visible:ring-emerald-300"
  }
} as const;

export function ProblemFirstChallenge({
  accent = "orange",
  eyebrow,
  problemStageLabel,
  title,
  description,
  constraintsLabel,
  constraints,
  sampleLabel,
  sample,
  sourceUrl,
  sourceLabel,
  attemptPrompt,
  attemptStageLabel,
  revealLabel,
  hideLabel,
  toolTitle,
  applicationPrompt,
  applicationRevealLabel,
  applicationHideLabel,
  applicationTitle,
  toolStageLabel,
  applicationStageLabel,
  application,
  children
}: ProblemFirstChallengeProps): React.JSX.Element {
  const [toolRevealed, setToolRevealed] = useState(false);
  const [applicationRevealed, setApplicationRevealed] = useState(false);
  const generatedId = useId();
  const toolPanelId = `problem-tool-${generatedId.replace(/:/g, "")}`;
  const applicationPanelId = `problem-application-${generatedId.replace(/:/g, "")}`;
  const toolHeadingRef = useRef<HTMLHeadingElement>(null);
  const applicationHeadingRef = useRef<HTMLHeadingElement>(null);
  const styles = accentStyles[accent];

  useEffect(() => {
    if (toolRevealed) toolHeadingRef.current?.focus();
  }, [toolRevealed]);

  useEffect(() => {
    if (applicationRevealed) applicationHeadingRef.current?.focus();
  }, [applicationRevealed]);

  const toggleTool = (): void => {
    setToolRevealed((current) => {
      if (current) setApplicationRevealed(false);
      return !current;
    });
  };

  return (
    <article className="my-10">
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
        <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.18em]", styles.text)}>00 · {problemStageLabel}</p>
          <span className="text-zinc-700" aria-hidden="true">/</span>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{eyebrow}</p>
        </div>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">{title}</h3>
        <p className="mt-4 max-w-3xl leading-7 text-zinc-300">{description}</p>
        <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2">
          <div className="min-w-0 bg-zinc-900/90 p-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">{constraintsLabel}</span>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{constraints}</p>
          </div>
          <div className="min-w-0 bg-zinc-900/90 p-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">{sampleLabel}</span>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-zinc-300">{sample}</pre>
          </div>
        </div>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className={cn("mt-5 inline-flex items-center gap-2 text-sm font-semibold underline decoration-zinc-700 underline-offset-4", styles.text)}
        >
          {sourceLabel}<ExternalLink className="size-4" aria-hidden="true" />
        </a>
        </div>
      </div>

      <aside className="mt-10">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="h-px flex-1 bg-zinc-800" />
          <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.18em]", styles.text)}>
            {attemptStageLabel}
          </p>
          <span aria-hidden="true" className="h-px flex-1 bg-zinc-800" />
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-zinc-400">{attemptPrompt}</p>
      </aside>

      <div className="mt-7 border-t border-zinc-800">
        <button
          type="button"
          aria-label={toolRevealed ? hideLabel : revealLabel}
          aria-expanded={toolRevealed}
          aria-controls={toolPanelId}
          className={cn(
            "group flex min-h-14 w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold text-zinc-200 transition-colors hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2",
            styles.ring
          )}
          onClick={toggleTool}
        >
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className={cn("h-4 w-px", styles.bar)} />
            <span className={cn("font-mono text-[10px] uppercase tracking-[0.14em]", styles.text)}>
              01 · {toolStageLabel}
            </span>
            <span>{toolRevealed ? hideLabel : revealLabel}</span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-zinc-500 transition-transform motion-reduce:transition-none group-hover:text-zinc-300",
              toolRevealed && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {toolRevealed ? (
        <section id={toolPanelId} className="pb-2">
          <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.18em]", styles.text)}>{toolStageLabel}</p>
          <h4 ref={toolHeadingRef} tabIndex={-1} className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 outline-none">
            {toolTitle}
          </h4>
          <div className="guide-copy mt-5 space-y-5 leading-8 text-zinc-300">{children}</div>

          <div className="mt-9 border-t border-zinc-800">
            <button
              type="button"
              aria-label={applicationRevealed ? applicationHideLabel : applicationRevealLabel}
              aria-expanded={applicationRevealed}
              aria-controls={applicationPanelId}
              className={cn(
                "group flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2",
                styles.ring
              )}
              onClick={() => setApplicationRevealed((current) => !current)}
            >
              <span className="flex items-center gap-3">
                <span className={cn("font-mono text-[10px] uppercase tracking-[0.14em]", styles.text)}>
                  02 · {applicationStageLabel}
                </span>
                <span>{applicationRevealed ? applicationHideLabel : applicationRevealLabel}</span>
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-zinc-500 transition-transform motion-reduce:transition-none group-hover:text-zinc-300",
                  applicationRevealed && "rotate-180"
                )}
                aria-hidden="true"
              />
            </button>
          </div>

          {applicationRevealed ? (
            <section id={applicationPanelId} className={cn("mb-2 border-l-2 pb-2 pl-5 sm:pl-7", styles.border)}>
              <h5 ref={applicationHeadingRef} tabIndex={-1} className={cn("text-xl font-semibold tracking-tight outline-none", styles.text)}>
                {applicationTitle}
              </h5>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{applicationPrompt}</p>
              <div className="guide-copy mt-5 space-y-5 leading-8 text-zinc-300">{application}</div>
            </section>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
