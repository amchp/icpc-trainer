import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib.js";
import { GuideCodeBlock } from "./GuideCodeBlock.js";
import { defineGuideTrace } from "./guideTrace.js";

function DemoPanel({ label, accent, children }: { readonly label: string; readonly accent: string; readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="relative my-10 rounded-lg border border-zinc-800 bg-zinc-900/25 p-4 sm:p-6">
      <span className={cn("absolute -top-2 left-5 bg-[#09090b] px-2 font-mono text-[10px] uppercase tracking-[0.18em]", accent)}>{label}</span>
      {children}
    </div>
  );
}

const BYTE_SIZE = 8;

export function integerToBits(value: number): string {
  return (Math.trunc(value) >>> 0).toString(2).padStart(32, "0");
}

export function doubleToBits(value: number): string {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setFloat64(0, value, false);
  return Array.from(bytes, (byte) => byte.toString(2).padStart(BYTE_SIZE, "0")).join("");
}

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitBytes(bits: string): string[] {
  return bits.match(new RegExp(`.{1,${BYTE_SIZE}}`, "g")) ?? [];
}

export function TypeExplorer(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const [booleanValue, setBooleanValue] = useState(true);
  const [integerValue, setIntegerValue] = useState("42");
  const [doubleValue, setDoubleValue] = useState("3.1416");
  const [characterValue, setCharacterValue] = useState("A");
  const integer = Math.min(2_147_483_647, Math.max(-2_147_483_648, Math.trunc(parseNumber(integerValue))));
  const decimal = parseNumber(doubleValue);
  const characterCode = characterValue.length === 0 ? 0 : (characterValue.codePointAt(0) ?? 0) & 0xff;

  return (
    <DemoPanel label={t("demos.explore")} accent="text-cyan-300">
      <p className="mb-5 mt-1 text-sm leading-6 text-zinc-400">{t("demos.instructions")}</p>
      <div className="grid divide-y divide-zinc-800">
        <ValueInspector
          type="bool"
          description={t("demos.bool")}
          size={t("demos.sizes.bool")}
          bits={(booleanValue ? 1 : 0).toString(2).padStart(8, "0")}
          control={(
            <button
              type="button"
              role="switch"
              aria-checked={booleanValue}
              onClick={() => setBooleanValue((current) => !current)}
              className="inline-flex h-10 min-w-24 items-center justify-between gap-3 rounded-md border border-zinc-700 bg-zinc-950 px-3 font-mono text-sm text-cyan-200 transition-colors hover:border-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              {String(booleanValue)}
              <span aria-hidden="true" className={cn("relative h-4 w-7 rounded-full transition-colors", booleanValue ? "bg-cyan-400" : "bg-zinc-700")}>
                <span className={cn("absolute top-0.5 size-3 rounded-full bg-zinc-950 transition-transform", booleanValue ? "translate-x-3.5" : "translate-x-0.5")} />
              </span>
            </button>
          )}
        />
        <ValueInspector
          type="int"
          description={t("demos.integer")}
          size={t("demos.sizes.int")}
          bits={integerToBits(integer)}
          control={<ValueInput label={t("demos.valueLabel", { type: "int" })} type="number" value={integerValue} min={-2_147_483_648} max={2_147_483_647} onChange={setIntegerValue} />}
        />
        <ValueInspector
          type="double"
          description={t("demos.decimal")}
          size={t("demos.sizes.double")}
          bits={doubleToBits(decimal)}
          control={<ValueInput label={t("demos.valueLabel", { type: "double" })} type="number" value={doubleValue} step="any" onChange={setDoubleValue} />}
        />
        <ValueInspector
          type="char"
          description={t("demos.character")}
          size={t("demos.sizes.char")}
          bits={characterCode.toString(2).padStart(8, "0")}
          conversion={t("demos.integerConversion", { value: characterCode })}
          control={<ValueInput label={t("demos.valueLabel", { type: "char" })} type="text" value={characterValue} maxLength={1} onChange={setCharacterValue} />}
        />
      </div>
    </DemoPanel>
  );
}

export function BooleanExpressionPlayground(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const [solved, setSolved] = useState(4);
  const [penalty, setPenalty] = useState(260);
  const [verdict, setVerdict] = useState("A");
  const [disqualified, setDisqualified] = useState(false);
  const [invited, setInvited] = useState(false);
  const accepted = verdict === "A";
  const judged = verdict !== "P";
  const advances = (accepted && solved >= 3 && penalty < 300 && !disqualified) || invited;
  const keepsCompeting = !advances && judged && solved > 0 && !disqualified;
  const outcome = advances
    ? t("conditionals.playgroundAdvance")
    : keepsCompeting
      ? t("conditionals.playgroundContinue")
      : t("conditionals.playgroundReview");
  const code = t("conditionals.logicCode", {
    solved,
    penalty,
    verdict,
    disqualified: String(disqualified),
    invited: String(invited)
  });
  const trace = useMemo(() => defineGuideTrace({
    code,
    language: "cpp",
    label: t("conditionals.playgroundTraceLabel"),
    inputs: {},
    build: (_inputs, recorder) => {
      const inputVariables = [
        { name: t("conditionals.playgroundSolvedVariable"), typeLabel: "int", value: solved },
        { name: t("conditionals.playgroundPenaltyVariable"), typeLabel: "int", value: penalty },
        { name: t("conditionals.playgroundVerdictVariable"), typeLabel: "char", value: verdict },
        { name: t("conditionals.playgroundDisqualifiedVariable"), typeLabel: "bool", value: disqualified },
        { name: t("conditionals.playgroundInvitedVariable"), typeLabel: "bool", value: invited }
      ] as const;
      const computedVariables = [
        { name: t("conditionals.playgroundAcceptedVariable"), typeLabel: "bool", value: accepted },
        { name: t("conditionals.playgroundJudgedVariable"), typeLabel: "bool", value: judged }
      ] as const;

      recorder.frame({
        line: 7,
        narration: t("conditionals.playgroundTraceAccepted", { verdict, accepted: String(accepted) }),
        variables: [...inputVariables, computedVariables[0]]
      });
      recorder.frame({
        line: 8,
        narration: t("conditionals.playgroundTraceJudged", { verdict, judged: String(judged) }),
        variables: [...inputVariables, ...computedVariables]
      });
      recorder.frame({
        line: 10,
        narration: t("conditionals.playgroundTracePrimary", { result: String(advances) }),
        variables: [
          ...computedVariables,
          { name: `${t("conditionals.playgroundSolvedVariable")} >= 3`, typeLabel: "bool", value: solved >= 3 },
          { name: `${t("conditionals.playgroundPenaltyVariable")} < 300`, typeLabel: "bool", value: penalty < 300 },
          { name: `!${t("conditionals.playgroundDisqualifiedVariable")}`, typeLabel: "bool", value: !disqualified },
          { name: t("conditionals.playgroundInvitedVariable"), typeLabel: "bool", value: invited }
        ],
        visuals: [{ kind: "branch", label: t("trace.visuals.branch"), condition: t("conditionals.playgroundPrimaryCondition"), outcome: String(advances) }]
      });
      if (advances) {
        recorder.frame({
          line: 11,
          narration: t("conditionals.playgroundTraceAdvance"),
          variables: computedVariables,
          visuals: [{ kind: "output", label: t("trace.visuals.output"), lines: [outcome] }]
        });
        return;
      }

      recorder.frame({
        line: 12,
        narration: t("conditionals.playgroundTraceSecondary", { result: String(keepsCompeting) }),
        variables: [
          ...computedVariables,
          { name: `${t("conditionals.playgroundSolvedVariable")} > 0`, typeLabel: "bool", value: solved > 0 },
          { name: `!${t("conditionals.playgroundDisqualifiedVariable")}`, typeLabel: "bool", value: !disqualified }
        ],
        visuals: [{ kind: "branch", label: t("trace.visuals.branch"), condition: t("conditionals.playgroundSecondaryCondition"), outcome: String(keepsCompeting) }]
      });
      if (keepsCompeting) {
        recorder.frame({
          line: 13,
          narration: t("conditionals.playgroundTraceContinue"),
          variables: computedVariables,
          visuals: [{ kind: "output", label: t("trace.visuals.output"), lines: [outcome] }]
        });
        return;
      }

      recorder.frame({
        line: 14,
        narration: t("conditionals.playgroundTraceElse"),
        variables: computedVariables,
        visuals: [{ kind: "branch", label: t("trace.visuals.branch"), condition: "else", outcome: t("conditionals.playgroundSelected") }]
      });
      recorder.frame({
        line: 15,
        narration: t("conditionals.playgroundTraceReview"),
        variables: computedVariables,
        visuals: [{ kind: "output", label: t("trace.visuals.output"), lines: [outcome] }]
      });
    }
  }), [accepted, advances, code, disqualified, invited, judged, keepsCompeting, outcome, penalty, solved, t, verdict]);

  return (
    <div className="my-8 border-y border-zinc-800 py-6">
      <fieldset>
        <legend className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400">
          {t("conditionals.playgroundLegend")}
        </legend>
        <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
          <PlaygroundNumberInput label={t("conditionals.playgroundSolved")} value={solved} onChange={setSolved} />
          <PlaygroundNumberInput label={t("conditionals.playgroundPenalty")} value={penalty} onChange={setPenalty} />
          <label className="grid gap-1.5 text-sm text-zinc-300">
            <span>{t("conditionals.playgroundVerdict")}</span>
            <select
              value={verdict}
              className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 font-mono text-amber-200 outline-none transition-colors hover:border-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              onChange={(event) => setVerdict(event.target.value)}
            >
              <option value="A">A</option>
              <option value="W">W</option>
              <option value="P">P</option>
            </select>
          </label>
          <PlaygroundBooleanInput label={t("conditionals.playgroundDisqualified")} checked={disqualified} onChange={setDisqualified} />
          <PlaygroundBooleanInput label={t("conditionals.playgroundInvited")} checked={invited} onChange={setInvited} />
        </div>
      </fieldset>

      <GuideCodeBlock trace={trace} />
    </div>
  );
}

export function LogicalOperatorGuide(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);

  return (
    <div className="my-8 border-y border-zinc-800 py-6" aria-label={t("conditionals.evaluationGuideTitle")}>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h4 className="font-mono text-sm font-semibold text-amber-300">{t("conditionals.evaluationGuideTitle")}</h4>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{t("conditionals.evaluationGuideDescription")}</p>
        </div>
        <div className="flex gap-2">
          <LogicToggle label="A" value={a} accessibleLabel={t("conditionals.toggleA")} onChange={setA} />
          <LogicToggle label="B" value={b} accessibleLabel={t("conditionals.toggleB")} onChange={setB} />
        </div>
      </div>

      <div className="mt-6 divide-y divide-zinc-800 border-y border-zinc-800">
        <EvaluationPath
          label="A && B"
          accessibleLabel={t("conditionals.andEvaluation")}
          a={a}
          b={b}
          evaluateB={a}
          result={a && b}
          explanation={a ? t("conditionals.andNeedsB") : t("conditionals.andStopsAtA")}
        />
        <EvaluationPath
          label="A || B"
          accessibleLabel={t("conditionals.orEvaluation")}
          a={a}
          b={b}
          evaluateB={!a}
          result={a || b}
          explanation={a ? t("conditionals.orStopsAtA") : t("conditionals.orNeedsB")}
        />
      </div>
    </div>
  );
}

function LogicToggle({ label, value, accessibleLabel, onChange }: {
  readonly label: string;
  readonly value: boolean;
  readonly accessibleLabel: string;
  readonly onChange: (value: boolean) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-label={accessibleLabel}
      aria-checked={value}
      className="flex h-10 min-w-24 items-center justify-between gap-3 rounded-md border border-zinc-700 bg-zinc-950 px-3 font-mono text-sm text-zinc-300 transition-colors hover:border-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
      onClick={() => onChange(!value)}
    >
      {label}
      <LogicValue value={value} />
    </button>
  );
}

function EvaluationPath({ label, accessibleLabel, a, b, evaluateB, result, explanation }: {
  readonly label: string;
  readonly accessibleLabel: string;
  readonly a: boolean;
  readonly b: boolean;
  readonly evaluateB: boolean;
  readonly result: boolean;
  readonly explanation: string;
}): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  return (
    <div className="grid gap-4 py-5 lg:grid-cols-[7rem_minmax(0,1fr)] lg:items-center" role="group" aria-label={accessibleLabel}>
      <code className="text-base font-semibold text-amber-200">{label}</code>
      <div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <EvaluationStep label={t("conditionals.evaluateA")}><LogicValue value={a} /></EvaluationStep>
          <span className="text-zinc-700" aria-hidden="true">→</span>
          {evaluateB ? (
            <EvaluationStep label={t("conditionals.evaluateB")}><LogicValue value={b} /></EvaluationStep>
          ) : (
            <EvaluationStep label={t("conditionals.skipB")} muted><span className="text-zinc-600">—</span></EvaluationStep>
          )}
          <span className="text-zinc-700" aria-hidden="true">→</span>
          <EvaluationStep label={t("conditionals.evaluationResult")}><LogicValue value={result} /></EvaluationStep>
        </div>
        <p className="mt-2 text-xs leading-5 text-zinc-500">{explanation}</p>
      </div>
    </div>
  );
}

function EvaluationStep({ label, muted = false, children }: {
  readonly label: string;
  readonly muted?: boolean;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <span className={cn("inline-flex items-center gap-2 border-l pl-2", muted ? "border-zinc-800 text-zinc-600" : "border-zinc-700 text-zinc-400")}>
      {label} {children}
    </span>
  );
}

function LogicValue({ value }: { readonly value: boolean }): React.JSX.Element {
  return <strong className={value ? "text-emerald-300" : "text-zinc-500"}>{String(value)}</strong>;
}

function PlaygroundNumberInput({ label, value, onChange }: {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <label className="grid gap-1.5 text-sm text-zinc-300">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        className="h-10 min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-3 font-mono text-amber-200 outline-none transition-colors hover:border-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        onChange={(event) => onChange(Math.max(0, event.target.valueAsNumber || 0))}
      />
    </label>
  );
}

function PlaygroundBooleanInput({ label, checked, onChange }: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (value: boolean) => void;
}): React.JSX.Element {
  return (
    <label className="flex h-10 cursor-pointer items-center justify-between gap-3 self-end rounded-md border border-zinc-800 px-3 text-sm text-zinc-300 transition-colors hover:border-zinc-600">
      <span>{label}</span>
      <input type="checkbox" checked={checked} className="size-4 accent-amber-400" onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function ValueInput({ label, value, onChange, ...props }: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type: "number" | "text";
  readonly min?: number;
  readonly max?: number;
  readonly maxLength?: number;
  readonly step?: string;
}): React.JSX.Element {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        {...props}
        id={id}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-32 rounded-md border border-zinc-700 bg-zinc-950 px-3 font-mono text-sm text-cyan-200 outline-none transition-colors hover:border-zinc-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
      />
    </div>
  );
}

function ValueInspector({ type, description, size, bits, control, conversion }: {
  readonly type: string;
  readonly description: string;
  readonly size: string;
  readonly bits: string;
  readonly control: React.ReactNode;
  readonly conversion?: string;
}): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  return (
    <section className="min-w-0 overflow-hidden py-6 first:pt-2 last:pb-1" aria-labelledby={`type-${type}`}>
      <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
        <div>
          <h3 id={`type-${type}`} className="font-mono text-lg font-semibold text-cyan-300">{type}</h3>
          <p className="mt-0.5 text-xs leading-5 text-zinc-500">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {control}
          <div className="flex flex-wrap items-center gap-3">
            {conversion ? <output className="rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-300">{conversion}</output> : null}
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{size}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-zinc-800 pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{t("demos.binary")}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">{t("demos.byteOrder")}</span>
          <output className="sr-only" aria-label={t("demos.binaryValue", { type })}>{bits}</output>
        </div>
        <ByteGrid bits={bits} />
      </div>
    </section>
  );
}

function ByteGrid({ bits }: { readonly bits: string }): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const bytes = splitBytes(bits);
  return (
    <div
      className={cn(
        "grid gap-2.5",
        bytes.length === 1 ? "max-w-72" : "min-[460px]:grid-cols-2 lg:grid-cols-4"
      )}
      aria-hidden="true"
    >
      {bytes.map((byte, byteIndex) => {
        const byteNumber = bytes.length - byteIndex - 1;
        const highBit = bits.length - byteIndex * BYTE_SIZE - 1;
        const lowBit = highBit - (BYTE_SIZE - 1);
        const hex = Number.parseInt(byte, 2).toString(16).toUpperCase().padStart(2, "0");
        return (
          <div key={`${byte}-${byteIndex}`} className="min-w-0 py-1">
            <div className="mb-2 flex items-center gap-2 font-mono uppercase">
              <span className="text-[9px] font-semibold tracking-[0.14em] text-zinc-400">{t("demos.byteLabel", { index: byteNumber })}</span>
              <span className="text-[9px] tracking-[0.1em] text-zinc-600">{t("demos.bitRange", { high: highBit, low: lowBit })}</span>
              <span className="ml-auto text-[9px] normal-case tracking-[0.12em] text-zinc-500">0x{hex}</span>
            </div>
            <div className="grid grid-cols-8 gap-px overflow-hidden rounded-sm border border-zinc-800 bg-zinc-800">
              {Array.from(byte, (bit, bitIndex) => (
                <span
                  key={`${bit}-${bitIndex}`}
                  className={cn(
                    "grid aspect-square min-w-0 place-items-center font-mono text-[10px]",
                    bit === "1" ? "bg-cyan-400/15 font-semibold text-cyan-100" : "bg-zinc-950 text-zinc-600"
                  )}
                >
                  {bit}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
