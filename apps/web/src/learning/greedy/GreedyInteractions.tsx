import type { TFunction } from "i18next";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib.js";
import {
  BalanceTotals,
  CoinChip,
  CoinLane,
  GreedyErrorText,
  greedyFieldClass,
  GreedyLabShell,
  GreedyStepControls,
  IntervalTimeline,
  SignBlockStrip,
  StringScanner,
  useStepPlayer
} from "./GreedyAnimation.js";
import {
  ACTIVITY_START_SENTINEL,
  CHAT_TARGET,
  parseActivityRows,
  parseGreedyIntegers,
  parseGreedyTarget,
  parseLowercaseWord,
  traceActivitySelection,
  traceAlternatingSubsequence,
  traceChatRoom,
  traceCoinRace,
  traceGreedyCoins,
  traceTwins,
  type Activity,
  type ActivityFrame,
  type AlternatingFrame,
  type ChatFrame,
  type CoinFrame,
  type TwinFrame
} from "./greedyModels.js";

const COINS = [1, 5, 10, 25, 50] as const;
const DEFAULT_ACTIVITIES: readonly Activity[] = [
  { id: "A", start: 1, finish: 4 },
  { id: "B", start: 3, finish: 5 },
  { id: "C", start: 0, finish: 6 },
  { id: "D", start: 5, finish: 7 },
  { id: "E", start: 5, finish: 9 },
  { id: "F", start: 6, finish: 10 },
  { id: "G", start: 8, finish: 11 },
  { id: "H", start: 12, finish: 16 }
];
const DEFAULT_ROWS = DEFAULT_ACTIVITIES.map(({ id, start, finish }) => ({ id, start: String(start), finish: String(finish) }));

function RuleNotes({ rule, safety, complexity }: { readonly rule: string; readonly safety: string; readonly complexity: string }): React.JSX.Element {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {[rule, safety, complexity].map((text, index) => <p key={text} className={cn("min-w-0 rounded-lg border bg-zinc-950/70 p-3 text-xs leading-6", index === 0 ? "border-amber-400/25 text-amber-100" : "border-zinc-800 text-zinc-400")}>{text}</p>)}
    </div>
  );
}

function coinNarration(t: TFunction<"greedy">, frame: CoinFrame): string {
  if (frame.step === "done") return t("coins.narration.done", { remaining: frame.remainingAfter, count: frame.picked.length });
  if (frame.step === "consider") return t("coins.narration.consider", { remaining: frame.remainingBefore, coin: frame.candidate ?? 0 });
  if (frame.step === "take") return t("coins.narration.take", { remaining: frame.remainingBefore, coin: frame.candidate ?? 0, after: frame.remainingAfter });
  return t("coins.narration.skip", { remaining: frame.remainingBefore, coin: frame.candidate ?? 0 });
}

function CoinVisual({ frame, target }: { readonly frame: CoinFrame; readonly target: number }): React.JSX.Element {
  const { t } = useTranslation("greedy");
  return (
    <div className="space-y-4">
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-1" aria-label={t("coins.denominationsLabel")}>
        {COINS.map((coin) => <CoinChip key={coin} value={coin} tone={frame.candidate === coin ? frame.step === "skip" ? "rejected" : "candidate" : "idle"} />)}
      </div>
      <CoinLane label={t("coins.pickedLabel", { target })} coins={frame.picked} remaining={frame.remainingAfter} remainingLabel={t("coins.remainingLabel")} tone="emerald" />
    </div>
  );
}

export function GreedyRecipeLab(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const frames = ["state", "choices", "rule", "update", "safety"] as const;
  const player = useStepPlayer(frames.length);
  const frame = frames[player.index] ?? "state";
  return (
    <GreedyLabShell label={t("recognize.recipeLabel")}>
      <ol className="mb-5 grid gap-2 sm:grid-cols-5">
        {frames.map((item, index) => <li key={item} className={cn("rounded-lg border px-3 py-3 text-xs transition-colors motion-reduce:transition-none", index === player.index ? "border-amber-300 bg-amber-300/10 text-amber-100" : index < player.index ? "border-emerald-400/35 text-emerald-200" : "border-zinc-800 text-zinc-500")}>{index + 1}. {t(`recognize.recipe.${item}`)}</li>)}
      </ol>
      <GreedyStepControls total={frames.length} player={player} narration={t(`recognize.recipeNarration.${frame}`)} />
    </GreedyLabShell>
  );
}

export function CoinChangeTool(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const trace = useMemo(() => traceGreedyCoins(68, COINS), []);
  const player = useStepPlayer(trace.frames.length);
  const frame = trace.frames[player.index] ?? trace.frames[0];
  if (frame === undefined) return <GreedyLabShell label={t("coins.toolLabel")}><p>{t("controls.noSteps")}</p></GreedyLabShell>;
  return (
    <GreedyLabShell label={t("coins.toolLabel")}>
      <CoinVisual frame={frame} target={trace.target} />
      <p className="mt-4 font-mono text-sm text-emerald-200">{t("coins.result", { coins: trace.coins.join(", "), count: trace.coins.length })}</p>
      <RuleNotes rule={t("coins.rule")} safety={t("coins.safety")} complexity={t("coins.complexity")} />
      <div className="mt-5"><GreedyStepControls total={trace.frames.length} player={player} narration={coinNarration(t, frame)} /></div>
    </GreedyLabShell>
  );
}

export function CoinChangeLab(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const [raw, setRaw] = useState("68");
  const target = parseGreedyTarget(raw, 1, 500);
  const trace = useMemo(() => target === null ? null : traceGreedyCoins(target, COINS), [target]);
  const player = useStepPlayer(trace?.frames.length ?? 0);
  useEffect(() => player.move(0), [raw]);
  const frame = trace?.frames[player.index];
  return (
    <GreedyLabShell label={t("coins.applicationLabel")}>
      <label className="grid max-w-xs gap-1.5 text-sm text-zinc-300"><span>{t("coins.targetLabel")}</span><input aria-label={t("coins.targetLabel")} className={greedyFieldClass} value={raw} onChange={(event) => setRaw(event.target.value)} /></label>
      {target === null || trace === null || frame === undefined ? <GreedyErrorText>{t("coins.invalidTarget")}</GreedyErrorText> : (
        <>
          <div className="mt-5"><CoinVisual frame={frame} target={trace.target} /></div>
          <p className="mt-4 font-mono text-sm text-emerald-200">{t("coins.result", { coins: trace.coins.join(", "), count: trace.coins.length })}</p>
          <div className="mt-5"><GreedyStepControls total={trace.frames.length} player={player} narration={coinNarration(t, frame)} /></div>
        </>
      )}
    </GreedyLabShell>
  );
}

export function CoinCounterexampleLab(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const trace = useMemo(() => traceCoinRace(6, [1, 3, 4]), []);
  const player = useStepPlayer(trace.frames.length);
  const frame = trace.frames[player.index] ?? trace.frames[0];
  if (frame === undefined) return <GreedyLabShell label={t("fails.labLabel")}><p>{t("controls.noSteps")}</p></GreedyLabShell>;
  const narration = frame.step === "start"
    ? t("fails.narration.start", { target: trace.target })
    : frame.step === "done"
      ? t("fails.narration.done", { local: trace.greedyCount, optimal: trace.optimalCount })
      : t("fails.narration.step", {
          index: frame.index,
          localRemaining: frame.greedyRemaining,
          optimalRemaining: frame.optimalRemaining,
          localChoice: frame.greedyPicked.at(-1) ?? t("activities.none"),
          optimalChoice: frame.optimalPicked.at(-1) ?? t("activities.none")
        });
  return (
    <GreedyLabShell label={t("fails.labLabel")}>
      <div className="space-y-3">
        <CoinLane label={t("fails.localLane")} coins={frame.greedyPicked} remaining={frame.greedyRemaining} remainingLabel={t("coins.remainingLabel")} tone="rose" />
        <CoinLane label={t("fails.optimalLane")} coins={frame.optimalPicked} remaining={frame.optimalRemaining} remainingLabel={t("coins.remainingLabel")} tone="emerald" />
      </div>
      <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-400/[0.04] p-3 font-semibold text-rose-200">{t("fails.verdict", { local: trace.greedyCount, optimal: trace.optimalCount })}</p>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{t("fails.scope")}</p>
      <div className="mt-5"><GreedyStepControls total={trace.frames.length} player={player} narration={narration} /></div>
    </GreedyLabShell>
  );
}

function activityNarration(t: TFunction<"greedy">, frame: ActivityFrame): string {
  if (frame.step === "sort") return t("activities.narration.sort");
  if (frame.step === "done") return t("activities.narration.done", { accepted: frame.accepted.map(({ id }) => id).join(", ") });
  const candidate = frame.candidate;
  if (candidate === null) return t("activities.narration.sort");
  if (frame.step === "consider") return t("activities.narration.consider", { id: candidate.id, start: candidate.start, finish: candidate.finish, last: frame.lastFinish === ACTIVITY_START_SENTINEL ? t("activities.none") : frame.lastFinish });
  if (frame.step === "take") return t("activities.narration.take", { id: candidate.id, start: candidate.start, finish: candidate.finish });
  return t("activities.narration.skip", { id: candidate.id, start: candidate.start, last: frame.lastFinish });
}

function ActivityVisual({ ordered, frame }: { readonly ordered: readonly Activity[]; readonly frame: ActivityFrame }): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const accepted = new Set(frame.accepted.map(({ id }) => id));
  const rejected = new Set(frame.rejected.map(({ id }) => id));
  const rows = ordered.map((row) => ({ ...row, tone: frame.candidate?.id === row.id && frame.step === "consider" ? "candidate" as const : accepted.has(row.id) ? "accepted" as const : rejected.has(row.id) ? "rejected" as const : "idle" as const }));
  const max = Math.max(1, ...ordered.map(({ finish }) => finish));
  return <IntervalTimeline rows={rows} min={0} max={max} cursor={frame.lastFinish === ACTIVITY_START_SENTINEL ? null : frame.lastFinish} label={t("activities.timelineLabel")} />;
}

export function ActivitySelectionTool(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const trace = useMemo(() => traceActivitySelection(DEFAULT_ACTIVITIES), []);
  const player = useStepPlayer(trace.frames.length);
  const frame = trace.frames[player.index] ?? trace.frames[0];
  if (frame === undefined) return <GreedyLabShell label={t("activities.toolLabel")}><p>{t("controls.noSteps")}</p></GreedyLabShell>;
  return (
    <GreedyLabShell label={t("activities.toolLabel")}>
      <ActivityVisual ordered={trace.ordered} frame={frame} />
      <p className="mt-4 font-mono text-sm text-emerald-200">{t("activities.result", { ids: trace.accepted.map(({ id }) => id).join(", ") })}</p>
      <RuleNotes rule={t("activities.rule")} safety={t("activities.safety")} complexity={t("activities.complexity")} />
      <div className="mt-5"><GreedyStepControls total={trace.frames.length} player={player} narration={activityNarration(t, frame)} /></div>
    </GreedyLabShell>
  );
}

export function ActivitySelectionLab(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const [rows, setRows] = useState(DEFAULT_ROWS.slice(0, 4));
  const parsed = parseActivityRows(rows);
  const trace = useMemo(() => parsed === null ? null : traceActivitySelection(parsed), [parsed]);
  const player = useStepPlayer(trace?.frames.length ?? 0);
  const rowsKey = JSON.stringify(rows);
  useEffect(() => player.move(0), [rowsKey]);
  const frame = trace?.frames[player.index];
  const update = (index: number, field: "start" | "finish", value: string): void => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  return (
    <GreedyLabShell label={t("activities.applicationLabel")}>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
            <strong className="pb-2 font-mono text-sm text-emerald-200">{row.id}</strong>
            <label className="grid min-w-0 gap-1 text-xs text-zinc-400"><span>{t("activities.startLabel", { id: row.id })}</span><input aria-label={t("activities.startLabel", { id: row.id })} className={greedyFieldClass} value={row.start} onChange={(event) => update(index, "start", event.target.value)} /></label>
            <label className="grid min-w-0 gap-1 text-xs text-zinc-400"><span>{t("activities.finishLabel", { id: row.id })}</span><input aria-label={t("activities.finishLabel", { id: row.id })} className={greedyFieldClass} value={row.finish} onChange={(event) => update(index, "finish", event.target.value)} /></label>
            <button type="button" aria-label={t("controls.removeRow", { id: row.id })} disabled={rows.length === 1} className="min-h-10 rounded-md border border-zinc-700 px-2 text-xs text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-40" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index).map((item, rowIndex) => ({ ...item, id: String.fromCharCode(65 + rowIndex) })))}>{t("activities.remove")}</button>
          </div>
        ))}
      </div>
      <button type="button" aria-label={t("controls.addRow")} disabled={rows.length === 8} className="mt-3 rounded-md border border-emerald-400/40 px-3 py-2 text-xs text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-40" onClick={() => setRows((current) => [...current, { id: String.fromCharCode(65 + current.length), start: "0", finish: "1" }])}>{t("activities.add")}</button>
      {parsed === null || trace === null || frame === undefined ? <GreedyErrorText>{t("activities.invalidRows")}</GreedyErrorText> : (
        <>
          <div className="mt-5"><ActivityVisual ordered={trace.ordered} frame={frame} /></div>
          <p className="mt-4 font-mono text-sm text-emerald-200">{t("activities.result", { ids: trace.accepted.map(({ id }) => id).join(", ") })}</p>
          <div className="mt-5"><GreedyStepControls total={trace.frames.length} player={player} narration={activityNarration(t, frame)} /></div>
        </>
      )}
    </GreedyLabShell>
  );
}

function twinNarration(t: TFunction<"greedy">, frame: TwinFrame): string {
  if (frame.step === "sort") return t("twins.narration.sort", { theirs: frame.theirs });
  if (frame.step === "done") return t("twins.narration.done", { mine: frame.mine, theirs: frame.theirs, count: frame.taken.length });
  return frame.strictlyGreater
    ? t("twins.narration.takeEnough", { coin: frame.taken.at(-1) ?? 0, mine: frame.mine, theirs: frame.theirs })
    : t("twins.narration.takeMore", { coin: frame.taken.at(-1) ?? 0, mine: frame.mine, theirs: frame.theirs });
}

function TwinsVisual({ frame }: { readonly frame: TwinFrame }): React.JSX.Element {
  const { t } = useTranslation("greedy");
  return <BalanceTotals mineLabel={t("twins.mineLabel")} theirsLabel={t("twins.theirsLabel")} mine={frame.mine} theirs={frame.theirs} strictlyGreater={frame.strictlyGreater} />;
}

export function TwinsTool(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const trace = useMemo(() => traceTwins([2, 1, 2]), []);
  const player = useStepPlayer(trace.frames.length);
  const frame = trace.frames[player.index] ?? trace.frames[0];
  if (frame === undefined) return <GreedyLabShell label={t("twins.toolLabel")}><p>{t("controls.noSteps")}</p></GreedyLabShell>;
  return (
    <GreedyLabShell label={t("twins.toolLabel")}>
      <TwinsVisual frame={frame} />
      <p className="mt-4 font-mono text-sm text-emerald-200">{t("twins.result", { coins: trace.taken.join(", "), count: trace.count })}</p>
      <RuleNotes rule={t("twins.rule")} safety={t("twins.safety")} complexity={t("twins.complexity")} />
      <div className="mt-5"><GreedyStepControls total={trace.frames.length} player={player} narration={twinNarration(t, frame)} /></div>
    </GreedyLabShell>
  );
}

export function TwinsLab(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const [raw, setRaw] = useState("2, 1, 2");
  const values = parseGreedyIntegers(raw, { maxCount: 12, minValue: 1, maxValue: 100, allowZero: false });
  const trace = useMemo(() => values === null ? null : traceTwins(values), [values]);
  const player = useStepPlayer(trace?.frames.length ?? 0);
  useEffect(() => player.move(0), [raw]);
  const frame = trace?.frames[player.index];
  return (
    <GreedyLabShell label={t("twins.applicationLabel")}>
      <label className="grid gap-1.5 text-sm text-zinc-300"><span>{t("twins.valuesLabel")}</span><input aria-label={t("twins.valuesLabel")} className={greedyFieldClass} value={raw} onChange={(event) => setRaw(event.target.value)} /></label>
      {values === null || trace === null || frame === undefined ? <GreedyErrorText>{t("twins.invalidValues")}</GreedyErrorText> : (
        <><div className="mt-5"><TwinsVisual frame={frame} /></div><p className="mt-4 font-mono text-sm text-emerald-200">{t("twins.result", { coins: trace.taken.join(", "), count: trace.count })}</p><div className="mt-5"><GreedyStepControls total={trace.frames.length} player={player} narration={twinNarration(t, frame)} /></div></>
      )}
    </GreedyLabShell>
  );
}

function chatNarration(t: TFunction<"greedy">, frame: ChatFrame, input: string): string {
  if (frame.step === "done") return frame.nextTargetIndex === CHAT_TARGET.length ? t("chat.narration.accepted") : t("chat.narration.rejected", { matched: frame.nextTargetIndex });
  const letter = input[frame.cursor] ?? "";
  const needed = CHAT_TARGET[frame.nextTargetIndex] ?? CHAT_TARGET.at(-1) ?? "";
  if (frame.step === "match") return t("chat.narration.match", { letter, cursor: frame.cursor, next: frame.nextTargetIndex });
  return letter === needed ? t("chat.narration.scanMatch", { letter, cursor: frame.cursor, needed }) : t("chat.narration.scanSkip", { letter, cursor: frame.cursor, needed });
}

function ChatVisual({ trace, frame }: { readonly trace: ReturnType<typeof traceChatRoom>; readonly frame: ChatFrame }): React.JSX.Element {
  const { t } = useTranslation("greedy");
  return <StringScanner input={trace.input} cursor={frame.step === "done" ? null : frame.cursor} matchedIndices={frame.matchedIndices} target={CHAT_TARGET} nextTargetIndex={frame.nextTargetIndex} label={t("chat.scannerLabel")} />;
}

export function ChatRoomTool(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const trace = useMemo(() => traceChatRoom("ahhellllloou"), []);
  const player = useStepPlayer(trace.frames.length);
  const frame = trace.frames[player.index] ?? trace.frames[0];
  if (frame === undefined) return <GreedyLabShell label={t("chat.toolLabel")}><p>{t("controls.noSteps")}</p></GreedyLabShell>;
  return (
    <GreedyLabShell label={t("chat.toolLabel")}>
      <ChatVisual trace={trace} frame={frame} />
      <RuleNotes rule={t("chat.rule")} safety={t("chat.safety")} complexity={t("chat.complexity")} />
      <div className="mt-5"><GreedyStepControls total={trace.frames.length} player={player} narration={chatNarration(t, frame, trace.input)} /></div>
    </GreedyLabShell>
  );
}

export function ChatRoomLab(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const [raw, setRaw] = useState("ahhellllloou");
  const input = parseLowercaseWord(raw, 100);
  const trace = useMemo(() => input === null ? null : traceChatRoom(input), [input]);
  const player = useStepPlayer(trace?.frames.length ?? 0);
  useEffect(() => player.move(0), [raw]);
  const frame = trace?.frames[player.index];
  const choose = (value: string): void => setRaw(value);
  return (
    <GreedyLabShell label={t("chat.applicationLabel")}>
      <label className="grid gap-1.5 text-sm text-zinc-300"><span>{t("chat.inputLabel")}</span><input aria-label={t("chat.inputLabel")} className={greedyFieldClass} value={raw} onChange={(event) => setRaw(event.target.value)} /></label>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" onClick={() => choose("ahhellllloou")}>{t("chat.acceptedPreset")}</button><button type="button" className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" onClick={() => choose("hlelo")}>{t("chat.rejectedPreset")}</button></div>
      {input === null || trace === null || frame === undefined ? <GreedyErrorText>{t("chat.invalidInput")}</GreedyErrorText> : (
        <><div className="mt-5"><ChatVisual trace={trace} frame={frame} /></div><p className={cn("mt-4 font-semibold", trace.accepted ? "text-emerald-200" : "text-rose-200")}>{trace.accepted ? t("chat.accepted") : t("chat.rejected")}</p><div className="mt-5"><GreedyStepControls total={trace.frames.length} player={player} narration={chatNarration(t, frame, trace.input)} /></div></>
      )}
    </GreedyLabShell>
  );
}

function alternatingNarration(t: TFunction<"greedy">, frame: AlternatingFrame, values: readonly number[]): string {
  const value = values[Math.min(frame.index, values.length - 1)] ?? 0;
  if (frame.step === "done") return t("alternating.narration.done", { sum: frame.runningSum, count: frame.blocks.length });
  if (frame.step === "open-block") return t("alternating.narration.open", { value, index: frame.index });
  if (frame.step === "extend-block") return t("alternating.narration.extend", { value, best: frame.currentBest ?? value });
  if (frame.step === "replace-candidate") return t("alternating.narration.replace", { value, best: frame.currentBest ?? value });
  return t("alternating.narration.close", { chosen: frame.blocks.at(-1)?.chosen ?? value, sum: frame.runningSum });
}

function AlternatingVisual({ trace, frame }: { readonly trace: ReturnType<typeof traceAlternatingSubsequence>; readonly frame: AlternatingFrame }): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const closedEnd = frame.blocks.at(-1)?.end ?? -1;
  const openStart = frame.currentSign === null ? null : closedEnd + 1;
  const bestIndex = frame.currentBest === null || openStart === null ? null : trace.values.findIndex((value, index) => index >= openStart && index <= frame.index && value === frame.currentBest);
  return <SignBlockStrip values={trace.values} blocks={frame.blocks} cursor={frame.step === "done" ? null : frame.index} openStart={openStart} bestIndex={bestIndex === null || bestIndex < 0 ? null : bestIndex} label={t("alternating.stripLabel")} />;
}

export function AlternatingTool(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const trace = useMemo(() => traceAlternatingSubsequence([1, 2, 3, -1, -2]), []);
  const player = useStepPlayer(trace.frames.length);
  const frame = trace.frames[player.index] ?? trace.frames[0];
  if (frame === undefined) return <GreedyLabShell label={t("alternating.toolLabel")}><p>{t("controls.noSteps")}</p></GreedyLabShell>;
  return (
    <GreedyLabShell label={t("alternating.toolLabel")}>
      <AlternatingVisual trace={trace} frame={frame} />
      <p className="mt-4 font-mono text-sm text-emerald-200">{t("alternating.result", { chosen: trace.chosen.join(", "), sum: trace.sum })}</p>
      <RuleNotes rule={t("alternating.rule")} safety={t("alternating.safety")} complexity={t("alternating.complexity")} />
      <div className="mt-5"><GreedyStepControls total={trace.frames.length} player={player} narration={alternatingNarration(t, frame, trace.values)} /></div>
    </GreedyLabShell>
  );
}

export function AlternatingLab(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  const [raw, setRaw] = useState("1, 2, 3, -1, -2");
  const values = parseGreedyIntegers(raw, { maxCount: 12, minValue: -1_000_000_000, maxValue: 1_000_000_000, allowZero: false });
  const trace = useMemo(() => values === null ? null : traceAlternatingSubsequence(values), [values]);
  const player = useStepPlayer(trace?.frames.length ?? 0);
  useEffect(() => player.move(0), [raw]);
  const frame = trace?.frames[player.index];
  return (
    <GreedyLabShell label={t("alternating.applicationLabel")}>
      <label className="grid gap-1.5 text-sm text-zinc-300"><span>{t("alternating.valuesLabel")}</span><input aria-label={t("alternating.valuesLabel")} className={greedyFieldClass} value={raw} onChange={(event) => setRaw(event.target.value)} /></label>
      {values === null || trace === null || frame === undefined ? <GreedyErrorText>{t("alternating.invalidValues")}</GreedyErrorText> : (
        <><div className="mt-5"><AlternatingVisual trace={trace} frame={frame} /></div><p className="mt-4 font-mono text-sm text-emerald-200">{t("alternating.result", { chosen: trace.chosen.join(", "), sum: trace.sum })}</p><div className="mt-5"><GreedyStepControls total={trace.frames.length} player={player} narration={alternatingNarration(t, frame, trace.values)} /></div></>
      )}
    </GreedyLabShell>
  );
}
