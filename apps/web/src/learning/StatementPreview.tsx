import { useTranslation } from "react-i18next";

import { ScenarioPlayer, type ScenarioFrame } from "./ScenarioPlayer.js";
import { IllustratedStatementPlayer } from "./statements/illustrated/IllustratedStatementPlayer.js";
import type { IllustratedExample } from "./statements/illustrated/types.js";

/** Statement previews may demonstrate a concrete result, without teaching a solving algorithm. */
export interface StatementDefinition {
  readonly description: string;
  readonly input: string;
  readonly output: string;
  readonly exampleInput: string;
  readonly exampleOutput: string;
  readonly frames: readonly ScenarioFrame[];
  readonly illustration?: IllustratedExample;
}

export function StatementPreview({ statement, title, showDescription = true, animation }: {
  readonly statement: StatementDefinition;
  readonly title: string;
  readonly showDescription?: boolean;
  readonly animation?: React.ReactNode;
}): React.JSX.Element {
  const { t, i18n } = useTranslation("resources");
  return (
    <div data-statement-preview className="min-w-0">
      {showDescription ? <p className="mt-4 max-w-3xl leading-7 text-zinc-300">{statement.description}</p> : null}
      <dl className="mt-5 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2">
        <StatementField label={t("statement.input")}>{statement.input}</StatementField>
        <StatementField label={t("statement.output")}>{statement.output}</StatementField>
        <StatementField label={t("statement.exampleInput")} example>{statement.exampleInput}</StatementField>
        <StatementField label={t("statement.exampleOutput")} example>{statement.exampleOutput}</StatementField>
      </dl>
      {animation ?? (statement.illustration ? <IllustratedStatementPlayer
        key={`${i18n.resolvedLanguage ?? i18n.language}-${title}`}
        example={statement.illustration}
        title={title}
      /> : <ScenarioPlayer
        key={`${i18n.resolvedLanguage ?? i18n.language}-${title}`}
        label={t("statement.animationLabel", { title })}
        intervalMs={2200}
        accent="cyan"
        presets={[{
          id: "statement",
          label: t("statement.animation"),
          description: t("statement.animationDescription"),
          frames: statement.frames
        }]}
      />)}
    </div>
  );
}

function StatementField({ label, example = false, children }: {
  readonly label: string;
  readonly example?: boolean;
  readonly children: string;
}): React.JSX.Element {
  return (
    <div className="min-w-0 bg-zinc-950 p-4">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">{label}</dt>
      <dd className="mt-2 text-sm leading-6 text-zinc-300">
        {example ? <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">{children}</pre> : children}
      </dd>
    </div>
  );
}
