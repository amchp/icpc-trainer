import { Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib.js";

export type DataStructureSimulatorKind = "vector" | "stack" | "queue" | "deque" | "set" | "map" | "struct";

type SimulatorAccent = "cyan" | "blue" | "violet" | "amber" | "emerald" | "rose";
type ArgumentKind = "value" | "index" | "key" | "mappedValue";

interface SimulatorEntry {
  readonly key: number;
  readonly value: number;
}

interface SimulatorState {
  readonly values: readonly number[];
  readonly entries: readonly SimulatorEntry[];
  readonly counter: number;
  readonly activeIndex: number | null;
  readonly activeKey: number | "value" | null;
  readonly output: string | null;
}

interface SimulatorOperation {
  readonly id: string;
  readonly label: string;
  readonly parts: readonly string[];
  readonly defaults: readonly string[];
  readonly arguments: readonly ArgumentKind[];
}

interface SimulatorConfig {
  readonly variable: string;
  readonly initialCode: readonly string[];
  readonly operations: readonly SimulatorOperation[];
}

interface SimulatorCopy {
  readonly emptyError: string;
  readonly indexError: string;
  readonly capacityError: string;
  readonly integerError: string;
  readonly unsupported: string;
  readonly endLabel: string;
  readonly iteratorLabel: string;
}

interface CommandResult {
  readonly state?: SimulatorState;
  readonly error?: string;
}

const accentClasses: Record<SimulatorAccent, { readonly text: string; readonly border: string; readonly soft: string; readonly button: string }> = {
  cyan: { text: "text-cyan-300", border: "border-cyan-400/70", soft: "bg-cyan-400/10", button: "bg-cyan-400 text-zinc-950" },
  blue: { text: "text-blue-300", border: "border-blue-400/70", soft: "bg-blue-400/10", button: "bg-blue-400 text-zinc-950" },
  violet: { text: "text-violet-300", border: "border-violet-400/70", soft: "bg-violet-400/10", button: "bg-violet-400 text-zinc-950" },
  amber: { text: "text-amber-300", border: "border-amber-400/70", soft: "bg-amber-400/10", button: "bg-amber-400 text-zinc-950" },
  emerald: { text: "text-emerald-300", border: "border-emerald-400/70", soft: "bg-emerald-400/10", button: "bg-emerald-400 text-zinc-950" },
  rose: { text: "text-rose-300", border: "border-rose-400/70", soft: "bg-rose-400/10", button: "bg-rose-400 text-zinc-950" }
};

function initialSimulatorState(kind: DataStructureSimulatorKind): SimulatorState {
  const base = {
    entries: [] as readonly SimulatorEntry[],
    counter: 0,
    activeIndex: null,
    activeKey: null,
    output: null
  };
  switch (kind) {
    case "vector":
      return { ...base, values: [8, 3, 5] };
    case "stack":
      return { ...base, values: [2, 7, 4] };
    case "queue":
      return { ...base, values: [12, 24, 36] };
    case "deque":
      return { ...base, values: [3, 8, 13] };
    case "set":
      return { ...base, values: [3, 7, 11] };
    case "map":
      return { ...base, values: [], entries: [{ key: 1, value: 10 }, { key: 3, value: 30 }, { key: 7, value: 70 }] };
    case "struct":
      return { ...base, values: [], counter: 5 };
  }
}

function operation(
  id: string,
  label: string,
  parts: readonly string[],
  defaults: readonly string[] = [],
  argumentsList: readonly ArgumentKind[] = []
): SimulatorOperation {
  return { id, label, parts, defaults, arguments: argumentsList };
}

function simulatorConfig(kind: DataStructureSimulatorKind, spanish: boolean): SimulatorConfig {
  switch (kind) {
    case "vector":
      return {
        variable: "values",
        initialCode: ["vector<int> values = {8, 3, 5};"],
        operations: [
          operation("push", "push_back(number)", ["values.push_back(", ");"], ["13"], ["value"]),
          operation("index", "values[index]", ["cout << values[", "];"], ["1"], ["index"]),
          operation("pop", "pop_back()", ["values.pop_back();"]),
          operation("sort", "sort()", ["sort(values.begin(), values.end());"])
        ]
      };
    case "stack": {
      const variable = spanish ? "pila" : "pile";
      return {
        variable,
        initialCode: [`stack<int> ${variable}(deque<int>{2, 7, 4});`],
        operations: [
          operation("push", "push(number)", [`${variable}.push(`, ");"], ["9"], ["value"]),
          operation("top", "top()", [`cout << ${variable}.top();`]),
          operation("pop", "pop()", [`${variable}.pop();`]),
          operation("size", "size()", [`cout << ${variable}.size();`]),
          operation("empty", "empty()", [`cout << ${variable}.empty();`])
        ]
      };
    }
    case "queue": {
      const variable = spanish ? "fila" : "line";
      return {
        variable,
        initialCode: [`queue<int> ${variable}(deque<int>{12, 24, 36});`],
        operations: [
          operation("push", "push(number)", [`${variable}.push(`, ");"], ["48"], ["value"]),
          operation("front", "front()", [`cout << ${variable}.front();`]),
          operation("back", "back()", [`cout << ${variable}.back();`]),
          operation("pop", "pop()", [`${variable}.pop();`]),
          operation("size", "size()", [`cout << ${variable}.size();`]),
          operation("empty", "empty()", [`cout << ${variable}.empty();`])
        ]
      };
    }
    case "deque":
      return {
        variable: "deck",
        initialCode: ["deque<int> deck = {3, 8, 13};"],
        operations: [
          operation("push-front", "push_front(number)", ["deck.push_front(", ");"], ["2"], ["value"]),
          operation("push-back", "push_back(number)", ["deck.push_back(", ");"], ["21"], ["value"]),
          operation("front", "front()", ["cout << deck.front();"]),
          operation("back", "back()", ["cout << deck.back();"]),
          operation("index", "deck[index]", ["cout << deck[", "];"], ["1"], ["index"]),
          operation("pop-front", "pop_front()", ["deck.pop_front();"]),
          operation("pop-back", "pop_back()", ["deck.pop_back();"])
        ]
      };
    case "set": {
      const variable = spanish ? "numeros" : "numbers";
      return {
        variable,
        initialCode: [`set<int> ${variable} = {3, 7, 11};`],
        operations: [
          operation("insert", "insert(number)", [`${variable}.insert(`, ");"], ["9"], ["value"]),
          operation("count", "count(number)", [`cout << ${variable}.count(`, ");"], ["7"], ["value"]),
          operation("lower", "lower_bound(number)", [`auto result{result} = ${variable}.lower_bound(`, ");"], ["5"], ["value"]),
          operation("upper", "upper_bound(number)", [`auto result{result} = ${variable}.upper_bound(`, ");"], ["7"], ["value"]),
          operation("erase", "erase(number)", [`${variable}.erase(`, ");"], ["3"], ["value"]),
          operation("size", "size()", [`cout << ${variable}.size();`])
        ]
      };
    }
    case "map": {
      const variable = spanish ? "puntajes" : "scores";
      return {
        variable,
        initialCode: [`map<int, int> ${variable} = {{1, 10}, {3, 30}, {7, 70}};`],
        operations: [
          operation("emplace", "emplace(key, value)", [`${variable}.emplace(`, ", ", ");"], ["5", "50"], ["key", "mappedValue"]),
          operation("count", "count(key)", [`cout << ${variable}.count(`, ");"], ["3"], ["key"]),
          operation("lower", "lower_bound(key)", [`auto result{result} = ${variable}.lower_bound(`, ");"], ["4"], ["key"]),
          operation("upper", "upper_bound(key)", [`auto result{result} = ${variable}.upper_bound(`, ");"], ["3"], ["key"]),
          operation("erase", "erase(key)", [`${variable}.erase(`, ");"], ["1"], ["key"]),
          operation("size", "size()", [`cout << ${variable}.size();`])
        ]
      };
    }
    case "struct": {
      const type = spanish ? "Contador" : "Counter";
      const variable = spanish ? "visitas" : "visits";
      const add = spanish ? "agregar" : "add";
      const get = spanish ? "obtener" : "get";
      return {
        variable,
        initialCode: [`${type} ${variable};`, `${variable}.${add}(5);`],
        operations: [
          operation("add", `${add}(number)`, [`${variable}.${add}(`, ");"], ["3"], ["value"]),
          operation("get", `${get}()`, [`cout << ${variable}.${get}();`])
        ]
      };
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCommand(command: string): string {
  return command.trim().replace(/;\s*$/, "").trim();
}

function isCppInt(value: number): boolean {
  return Number.isInteger(value) && value >= -2_147_483_648 && value <= 2_147_483_647;
}

function queriedValue(
  state: SimulatorState,
  output: string,
  activeIndex: number | null = null,
  activeKey: number | "value" | null = null
): SimulatorState {
  return { ...state, output, activeIndex, activeKey };
}

function changedValues(state: SimulatorState, values: readonly number[], activeIndex: number | null): SimulatorState {
  return { ...state, values, activeIndex, activeKey: null, output: null };
}

function executeSequenceCommand(
  kind: "vector" | "stack" | "queue" | "deque",
  config: SimulatorConfig,
  command: string,
  state: SimulatorState,
  copy: SimulatorCopy
): CommandResult {
  const variable = escapeRegExp(config.variable);
  const pushName = kind === "vector" ? "push_back" : kind === "deque" ? "push_(front|back)" : "push";
  const pushMatch = command.match(new RegExp(`^${variable}\\.${pushName}\\((-?\\d+)\\)$`));
  if (pushMatch !== null) {
    if (state.values.length >= 10) return { error: copy.capacityError };
    const end = kind === "deque" ? pushMatch[1] : "back";
    const rawValue = kind === "deque" ? pushMatch[2] : pushMatch[1];
    const value = Number(rawValue);
    if (!isCppInt(value)) return { error: copy.integerError };
    const values = end === "front" ? [value, ...state.values] : [...state.values, value];
    return { state: changedValues(state, values, end === "front" ? 0 : values.length - 1) };
  }

  const popOperation = kind === "vector" ? "pop_back" : kind === "deque" ? "pop_(front|back)" : "pop";
  const popMatch = command.match(new RegExp(`^${variable}\\.${popOperation}\\(\\)$`));
  if (popMatch !== null) {
    if (state.values.length === 0) return { error: copy.emptyError };
    const end = kind === "deque" ? popMatch[1] : kind === "queue" ? "front" : "back";
    const values = end === "front" ? state.values.slice(1) : state.values.slice(0, -1);
    const activeIndex = values.length === 0 ? null : end === "front" ? 0 : values.length - 1;
    return { state: changedValues(state, values, activeIndex) };
  }

  if (kind === "vector" && new RegExp(`^sort\\(${variable}\\.begin\\(\\),\\s*${variable}\\.end\\(\\)\\)$`).test(command)) {
    return { state: changedValues(state, [...state.values].sort((left, right) => left - right), null) };
  }

  const indexRead = command.match(new RegExp(`^cout\\s*<<\\s*${variable}\\[(-?\\d+)\\]$`));
  if ((kind === "vector" || kind === "deque") && indexRead !== null) {
    const index = Number(indexRead[1]);
    if (index < 0 || index >= state.values.length) return { error: copy.indexError };
    return { state: queriedValue(state, String(state.values[index]), index) };
  }

  const readableEnd = kind === "stack" ? "top" : kind === "queue" || kind === "deque" ? "(front|back)" : null;
  if (readableEnd !== null) {
    const readMatch = command.match(new RegExp(`^cout\\s*<<\\s*${variable}\\.${readableEnd}\\(\\)$`));
    if (readMatch !== null) {
      if (state.values.length === 0) return { error: copy.emptyError };
      const end = kind === "stack" ? "back" : readMatch[1] ?? "front";
      const index = end === "front" ? 0 : state.values.length - 1;
      return { state: queriedValue(state, String(state.values[index]), index) };
    }
  }

  if (new RegExp(`^cout\\s*<<\\s*${variable}\\.size\\(\\)$`).test(command)) {
    return { state: queriedValue(state, String(state.values.length)) };
  }
  if (new RegExp(`^cout\\s*<<\\s*${variable}\\.empty\\(\\)$`).test(command)) {
    return { state: queriedValue(state, state.values.length === 0 ? "1" : "0") };
  }
  return { error: copy.unsupported };
}

function executeSetCommand(config: SimulatorConfig, command: string, state: SimulatorState, copy: SimulatorCopy): CommandResult {
  const variable = escapeRegExp(config.variable);
  const mutation = command.match(new RegExp(`^${variable}\\.(insert|erase)\\((-?\\d+)\\)$`));
  if (mutation !== null) {
    const value = Number(mutation[2]);
    if (!isCppInt(value)) return { error: copy.integerError };
    if (mutation[1] === "insert" && !state.values.includes(value) && state.values.length >= 10) return { error: copy.capacityError };
    const values = mutation[1] === "insert"
      ? [...new Set([...state.values, value])].sort((left, right) => left - right)
      : state.values.filter((candidate) => candidate !== value);
    return { state: changedValues(state, values, values.indexOf(value) >= 0 ? values.indexOf(value) : null) };
  }
  const countQuery = command.match(new RegExp(`^cout\\s*<<\\s*${variable}\\.count\\((-?\\d+)\\)$`));
  if (countQuery !== null) {
    const value = Number(countQuery[1]);
    if (!isCppInt(value)) return { error: copy.integerError };
    const index = state.values.indexOf(value);
    return { state: queriedValue(state, index >= 0 ? "1" : "0", index >= 0 ? index : null) };
  }
  const boundQuery = command.match(new RegExp(`^auto\\s+result\\d+\\s*=\\s*${variable}\\.(lower_bound|upper_bound)\\((-?\\d+)\\)$`));
  if (boundQuery !== null) {
    const value = Number(boundQuery[2]);
    if (!isCppInt(value)) return { error: copy.integerError };
    const index = state.values.findIndex((candidate) => boundQuery[1] === "lower_bound" ? candidate >= value : candidate > value);
    const pointedValue = index >= 0 ? String(state.values[index]) : copy.endLabel;
    return { state: queriedValue(state, `${copy.iteratorLabel} → ${pointedValue}`, index >= 0 ? index : null) };
  }
  if (new RegExp(`^cout\\s*<<\\s*${variable}\\.size\\(\\)$`).test(command)) {
    return { state: queriedValue(state, String(state.values.length)) };
  }
  return { error: copy.unsupported };
}

function executeMapCommand(config: SimulatorConfig, command: string, state: SimulatorState, copy: SimulatorCopy): CommandResult {
  const variable = escapeRegExp(config.variable);
  const emplace = command.match(new RegExp(`^${variable}\\.emplace\\((-?\\d+),\\s*(-?\\d+)\\)$`));
  if (emplace !== null) {
    const key = Number(emplace[1]);
    const value = Number(emplace[2]);
    if (!isCppInt(key) || !isCppInt(value)) return { error: copy.integerError };
    if (!state.entries.some((entry) => entry.key === key) && state.entries.length >= 10) return { error: copy.capacityError };
    const entries = state.entries.some((entry) => entry.key === key)
      ? state.entries
      : [...state.entries, { key, value }].sort((left, right) => left.key - right.key);
    return { state: { ...state, entries, activeKey: key, activeIndex: null, output: null } };
  }
  const erase = command.match(new RegExp(`^${variable}\\.erase\\((-?\\d+)\\)$`));
  if (erase !== null) {
    const key = Number(erase[1]);
    if (!isCppInt(key)) return { error: copy.integerError };
    return { state: { ...state, entries: state.entries.filter((entry) => entry.key !== key), activeKey: null, output: null } };
  }
  const countQuery = command.match(new RegExp(`^cout\\s*<<\\s*${variable}\\.count\\((-?\\d+)\\)$`));
  if (countQuery !== null) {
    const key = Number(countQuery[1]);
    if (!isCppInt(key)) return { error: copy.integerError };
    const exists = state.entries.some((entry) => entry.key === key);
    return { state: queriedValue(state, exists ? "1" : "0", null, exists ? key : null) };
  }
  const boundQuery = command.match(new RegExp(`^auto\\s+result\\d+\\s*=\\s*${variable}\\.(lower_bound|upper_bound)\\((-?\\d+)\\)$`));
  if (boundQuery !== null) {
    const operationName = boundQuery[1];
    const key = Number(boundQuery[2]);
    if (!isCppInt(key)) return { error: copy.integerError };
    const entry = state.entries.find((candidate) => operationName === "lower_bound" ? candidate.key >= key : candidate.key > key);
    const pointedEntry = entry === undefined ? copy.endLabel : `{${entry.key}, ${entry.value}}`;
    return { state: queriedValue(state, `${copy.iteratorLabel} → ${pointedEntry}`, null, entry?.key ?? null) };
  }
  if (new RegExp(`^cout\\s*<<\\s*${variable}\\.size\\(\\)$`).test(command)) {
    return { state: queriedValue(state, String(state.entries.length)) };
  }
  return { error: copy.unsupported };
}

function executeStructCommand(config: SimulatorConfig, command: string, state: SimulatorState, copy: SimulatorCopy): CommandResult {
  const variable = escapeRegExp(config.variable);
  const add = command.match(new RegExp(`^${variable}\\.(?:add|agregar)\\((-?\\d+)\\)$`));
  if (add !== null) {
    const counter = state.counter + Number(add[1]);
    if (!isCppInt(counter)) return { error: copy.integerError };
    return { state: { ...state, counter, activeKey: "value", activeIndex: null, output: null } };
  }
  if (new RegExp(`^cout\\s*<<\\s*${variable}\\.(?:get|obtener)\\(\\)$`).test(command)) {
    return { state: queriedValue(state, String(state.counter), null, "value") };
  }
  return { error: copy.unsupported };
}

function executeCommand(
  kind: DataStructureSimulatorKind,
  config: SimulatorConfig,
  rawCommand: string,
  state: SimulatorState,
  copy: SimulatorCopy
): CommandResult {
  const command = normalizeCommand(rawCommand);
  if (kind === "set") return executeSetCommand(config, command, state, copy);
  if (kind === "map") return executeMapCommand(config, command, state, copy);
  if (kind === "struct") return executeStructCommand(config, command, state, copy);
  return executeSequenceCommand(kind, config, command, state, copy);
}

function buildCommand(operationConfig: SimulatorOperation, argumentsList: readonly string[], resultNumber: number): string {
  return operationConfig.parts.reduce((command, part, index) => {
    const resolvedPart = part.replaceAll("{result}", String(resultNumber));
    return `${command}${resolvedPart}${argumentsList[index] ?? ""}`;
  }, "");
}

export function DataStructureSimulator({
  kind,
  accent
}: {
  readonly kind: DataStructureSimulatorKind;
  readonly accent: SimulatorAccent;
}): React.JSX.Element {
  const { t, i18n } = useTranslation("dataStructures");
  const spanish = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");
  const config = useMemo(() => simulatorConfig(kind, spanish), [kind, spanish]);
  const [state, setState] = useState<SimulatorState>(() => initialSimulatorState(kind));
  const [selectedId, setSelectedId] = useState(config.operations[0]?.id ?? "");
  const selectedOperation = config.operations.find((candidate) => candidate.id === selectedId) ?? config.operations[0];
  const [argumentsList, setArgumentsList] = useState<readonly string[]>(selectedOperation?.defaults ?? []);
  const [history, setHistory] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const colors = accentClasses[accent];
  const name = t(`simulator.names.${kind}`);
  const copy: SimulatorCopy = {
    emptyError: t("simulator.errors.empty"),
    indexError: t("simulator.errors.index"),
    capacityError: t("simulator.errors.capacity"),
    integerError: t("simulator.errors.integer"),
    unsupported: t("simulator.errors.unsupported"),
    endLabel: "end()",
    iteratorLabel: t("simulator.iteratorLabel")
  };

  const resetSession = (): void => {
    const firstOperation = config.operations[0];
    setState(initialSimulatorState(kind));
    setSelectedId(firstOperation?.id ?? "");
    setArgumentsList(firstOperation?.defaults ?? []);
    setHistory([]);
    setError(null);
    setRevision((current) => current + 1);
  };

  useEffect(() => {
    resetSession();
  }, [config]);

  const chooseOperation = (nextOperation: SimulatorOperation): void => {
    setSelectedId(nextOperation.id);
    setArgumentsList(nextOperation.defaults);
    setError(null);
  };

  const updateArgument = (index: number, nextValue: string): void => {
    if (!/^-?\d*$/.test(nextValue)) return;
    setArgumentsList((current) => current.map((value, currentIndex) => currentIndex === index ? nextValue : value));
    setError(null);
  };

  const command = selectedOperation === undefined
    ? ""
    : buildCommand(selectedOperation, argumentsList, config.initialCode.length + history.length + 1);

  const run = (): void => {
    if (selectedOperation === undefined || argumentsList.some((value) => !/^-?\d+$/.test(value))) {
      setError(copy.integerError);
      return;
    }
    const result = executeCommand(kind, config, command, state, copy);
    if (result.state === undefined) {
      setError(result.error ?? copy.unsupported);
      return;
    }
    setState(result.state);
    setHistory((current) => [...current, command]);
    setError(null);
    setRevision((current) => current + 1);
  };

  const renderedCode = [...config.initialCode, ...history];

  return (
    <section
      className="my-10 overflow-hidden rounded-xl border border-zinc-800 bg-[#0b0f14] shadow-[0_20px_70px_rgba(0,0,0,.18)]"
      aria-label={t("simulator.label", { name })}
    >
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.16em]", colors.text)}>{t("simulator.eyebrow")}</p>
            <h4 className="text-base font-semibold text-zinc-100">{t("simulator.title", { name })}</h4>
          </div>
          <button
            type="button"
            onClick={resetSession}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {t("simulator.reset")}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t("simulator.examples")}>
          {config.operations.map((operationConfig) => {
            const selected = operationConfig.id === selectedOperation?.id;
            return (
              <button
                key={operationConfig.id}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseOperation(operationConfig)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
                  selected ? cn(colors.border, colors.soft, colors.text) : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                )}
              >
                {operationConfig.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,.92fr)]">
        <div className="min-w-0 border-b border-zinc-800 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/45 px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{t("simulator.code")}</span>
            <span className="font-mono text-[10px] text-zinc-600">C++17</span>
          </div>
          <pre aria-label={t("simulator.code")} className="max-h-56 min-h-40 overflow-auto py-4 font-mono text-[13px] leading-6">
            {renderedCode.map((line, index) => {
              const active = history.length > 0 && index === renderedCode.length - 1;
              return (
                <span
                  key={`${line}-${index}`}
                  aria-current={active ? "step" : undefined}
                  className={cn("grid min-w-max grid-cols-[2rem_minmax(0,1fr)] px-4", active && colors.soft)}
                >
                  <span aria-hidden="true" className="select-none pr-3 text-right text-zinc-700">{index + 1}</span>
                  <code className={cn("pr-5 text-zinc-300", active && colors.text)}>{line}</code>
                </span>
              );
            })}
          </pre>
        </div>

        <div className="min-w-0 bg-zinc-950/55 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{t("simulator.state")}</p>
          <div role="region" aria-label={t("simulator.state")} className="mt-3 min-h-32" aria-live="polite" aria-atomic="true">
            <div key={revision} className="guide-rise">
              <SimulatorVisual kind={kind} state={state} accent={accent} emptyLabel={t("simulator.empty", { name })} />
            </div>
          </div>
          <div className="mt-5 border-t border-zinc-800 pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{t("simulator.output")}</p>
            <output aria-label={t("simulator.output")} className={cn("mt-2 block min-h-6 font-mono text-sm", state.output === null ? "text-zinc-600" : colors.text)}>
              {state.output ?? "—"}
            </output>
          </div>
        </div>
      </div>

      <form
        className="border-t border-zinc-800 bg-zinc-900/25 px-4 py-3"
        onSubmit={(event) => { event.preventDefault(); run(); }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div
            className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-y-1.5 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 font-mono text-sm text-zinc-300 focus-within:ring-2 focus-within:ring-zinc-300"
            aria-label={t("simulator.commandPreview")}
          >
            {selectedOperation?.parts.map((part, index) => {
              const argumentKind = selectedOperation.arguments[index];
              return (
                <span key={`${part}-${index}`} className="contents">
                  <code>{part.replaceAll("{result}", String(config.initialCode.length + history.length + 1))}</code>
                  {argumentKind === undefined ? null : (
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={argumentsList[index] ?? ""}
                    onChange={(event) => updateArgument(index, event.target.value)}
                    aria-label={t(`simulator.arguments.${argumentKind}`)}
                    aria-invalid={error !== null}
                    aria-describedby={error === null ? undefined : `simulator-error-${kind}`}
                    className={cn(
                      "mx-1 w-16 rounded border bg-zinc-900 px-2 py-1 text-center font-mono font-semibold outline-none",
                      colors.border,
                      colors.text
                    )}
                  />
                  )}
                </span>
              );
            })}
          </div>
          <button
            type="submit"
            className={cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white", colors.button)}
          >
            <Play className="size-4 fill-current" aria-hidden="true" />
            {t("simulator.run")}
          </button>
        </div>
        {error === null ? (
          <p className="mt-1.5 text-[11px] leading-4 text-zinc-500">{t("simulator.hint")}</p>
        ) : (
          <p id={`simulator-error-${kind}`} role="alert" className="mt-1.5 text-[11px] leading-4 text-rose-300">{error}</p>
        )}
      </form>
    </section>
  );
}

function SimulatorVisual({
  kind,
  state,
  accent,
  emptyLabel
}: {
  readonly kind: DataStructureSimulatorKind;
  readonly state: SimulatorState;
  readonly accent: SimulatorAccent;
  readonly emptyLabel: string;
}): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const colors = accentClasses[accent];
  if (kind === "struct") {
    return (
      <div className={cn("w-full rounded-lg border bg-zinc-900/70 p-4", state.activeKey === "value" ? colors.border : "border-zinc-700")}>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{t("simulator.field")}</p>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <code className={colors.text}>{t("simulator.valueField")}</code>
          <strong className="font-mono text-2xl text-zinc-100">{state.counter}</strong>
        </div>
      </div>
    );
  }
  if (kind === "map") {
    if (state.entries.length === 0) return <EmptySimulatorState label={emptyLabel} />;
    return (
      <dl className="grid gap-2">
        {state.entries.map((entry) => (
          <div key={entry.key} className={cn("grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border bg-zinc-900/70 px-3 py-2 font-mono text-sm", state.activeKey === entry.key ? cn(colors.border, colors.soft) : "border-zinc-700")}>
            <dt className="break-words text-zinc-300">{entry.key}</dt>
            <dd className={state.activeKey === entry.key ? colors.text : "text-zinc-100"}>{entry.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (state.values.length === 0) return <EmptySimulatorState label={emptyLabel} />;
  const renderedValues = kind === "stack" ? [...state.values].reverse() : state.values;
  return (
    <ol className={cn("gap-2", kind === "stack" ? "flex w-fit min-w-32 flex-col" : "flex max-w-full overflow-x-auto pb-2")}>
      {renderedValues.map((value, renderedIndex) => {
        const originalIndex = kind === "stack" ? state.values.length - renderedIndex - 1 : renderedIndex;
        const active = state.activeIndex === originalIndex;
        const marker = kind === "stack" && originalIndex === state.values.length - 1
          ? t("simulator.markers.top")
          : (kind === "queue" || kind === "deque") && originalIndex === 0
            ? t("simulator.markers.front")
            : (kind === "queue" || kind === "deque") && originalIndex === state.values.length - 1
              ? t("simulator.markers.back")
              : kind === "vector" || kind === "deque"
                ? String(originalIndex)
                : null;
        return (
          <li key={`${value}-${originalIndex}`} className={cn("min-w-14 shrink-0 rounded-md border bg-zinc-900/70 px-3 py-3 text-center font-mono text-sm", active ? cn(colors.border, colors.soft, colors.text) : "border-zinc-700 text-zinc-300")}>
            <span className="block">{value}</span>
            {marker === null ? null : <span className="mt-1 block text-[9px] uppercase tracking-[0.12em] text-zinc-500">{marker}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function EmptySimulatorState({ label }: { readonly label: string }): React.JSX.Element {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 px-5 text-center">
      <p className="max-w-xs text-sm leading-6 text-zinc-500">{label}</p>
    </div>
  );
}
