import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib.js";
import { ScenarioPlayer, type ScenarioPreset } from "../ScenarioPlayer.js";
import { buildAliceExample, type AliceExample } from "./aliceStatementModel.js";

type Translate = (english: string, spanish: string) => string;
const fieldClass = "mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

export function AliceStatementAnimation(): React.JSX.Element {
  const { t, i18n } = useTranslation("bruteForce");
  const spanish = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");
  const l: Translate = (en, es) => spanish ? es : en;
  const [moves, setMoves] = useState("NNE");
  const [x, setX] = useState("1");
  const [y, setY] = useState("2");
  const [custom, setCustom] = useState<AliceExample | null>(null);
  const [revision, setRevision] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const examples = useMemo(() => ({
    yes: buildAliceExample("NNE", 1, 2),
    no: buildAliceExample("NS", 1, 2),
    ...(custom ? { custom } : {})
  }), [custom]);
  const preset = (id: keyof typeof examples): ScenarioPreset => {
    const example = examples[id]!;
    return {
      id,
      label: id === "yes" ? l("YES example", "Ejemplo YES") : id === "no" ? l("NO example", "Ejemplo NO") : l("Your input", "Tu entrada"),
      description: `s = ${example.moves} · ${l("Target", "Objetivo")} = (${example.target.x}, ${example.target.y})`,
      frames: example.positions.map((point, index) => {
        const last = index === example.positions.length - 1;
        let narration = index === 0
          ? l("Alice starts at (0, 0). The flag marks the target. Advance one move at a time.", "Alice empieza en (0, 0). La bandera marca el objetivo. Avanza un movimiento a la vez.")
          : l(`Move ${index}: ${example.moves[(index - 1) % example.moves.length]} takes Alice to (${point.x}, ${point.y}).`, `Movimiento ${index}: ${example.moves[(index - 1) % example.moves.length]} lleva a Alice a (${point.x}, ${point.y}).`);
        if (last) narration += example.answer === "YES"
          ? l(" YES: Alice reaches the target.", " YES: Alice llega al objetivo.")
          : id === "no"
            ? l(" NO: Alice returns to the start and repeats these same two positions forever. The target is outside this path.", " NO: Alice vuelve al inicio y repite estas mismas dos posiciones para siempre. El objetivo queda fuera de ese recorrido.")
            : l(" NO: this repeating movement never reaches the target. This preview shows two repetitions, not the entire infinite journey.", " NO: este movimiento repetido nunca llega al objetivo. Esta vista muestra dos repeticiones, no todo el recorrido infinito.");
        return { narration, visuals: [] };
      })
    };
  };
  const presets = custom ? [preset("custom"), preset("yes"), preset("no")] : [preset("yes"), preset("no")];
  return (
    <div className="mt-6">
      <form className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4" onSubmit={(event) => {
        event.preventDefault();
        try {
          const example = buildAliceExample(moves.trim().toUpperCase(), Number(x), Number(y));
          setCustom(example);
          setRevision((value) => value + 1);
          setInvalid(false);
        } catch { setInvalid(true); }
      }}>
        <p className="text-sm font-semibold text-zinc-200">{l("Try your own input", "Prueba tu propia entrada")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <label className="text-xs text-zinc-400">{l("Moves (N, S, E, W)", "Movimientos (N, S, E, W)")}
            <input className={fieldClass} value={moves} maxLength={10} required pattern="[NnSsEeWw]{1,10}" spellCheck={false} onChange={(event) => setMoves(event.target.value)} />
          </label>
          <label className="text-xs text-zinc-400">{l("Target x", "Objetivo x")}
            <input className={fieldClass} type="number" min={1} max={10} step={1} required value={x} onChange={(event) => setX(event.target.value)} />
          </label>
          <label className="text-xs text-zinc-400">{l("Target y", "Objetivo y")}
            <input className={fieldClass} type="number" min={1} max={10} step={1} required value={y} onChange={(event) => setY(event.target.value)} />
          </label>
        </div>
        <p className="mt-2 text-xs text-zinc-500">{l("Use 1–10 moves and target coordinates from 1 to 10. The board changes when you load the input.", "Usa de 1 a 10 movimientos y coordenadas de 1 a 10. El tablero cambia al cargar la entrada.")}</p>
        {invalid ? <p role="alert" className="mt-2 text-sm text-rose-300">{l("Enter valid moves and whole-number coordinates within the limits.", "Introduce movimientos válidos y coordenadas enteras dentro de los límites.")}</p> : null}
        <button type="submit" className="mt-3 rounded-md bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{l("Load input", "Cargar entrada")}</button>
      </form>
      <ScenarioPlayer key={revision} label={l(`Statement animation: ${t("alice.title")}`, `Animación del enunciado: ${t("alice.title")}`)} presets={presets} accent="cyan" intervalMs={900}
        renderFrame={(_, index, id) => {
          const example = examples[id as keyof typeof examples]!;
          return <AliceBoard example={example} step={index} l={l} />;
        }}
      />
    </div>
  );
}

function AliceBoard({ example, step, l }: { readonly example: AliceExample; readonly step: number; readonly l: Translate }): React.JSX.Element {
  const point = example.positions[step]!;
  const all = [...example.positions, example.target];
  const minX = Math.min(...all.map((p) => p.x)) - 1;
  const minY = Math.min(...all.map((p) => p.y)) - 1;
  const span = Math.max(Math.max(...all.map((p) => p.x)) - minX, Math.max(...all.map((p) => p.y)) - minY) + 1;
  const px = (x: number): number => 35 + (x - minX) * 330 / span;
  const py = (y: number): number => 365 - (y - minY) * 330 / span;
  const stride = Math.max(1, Math.ceil(span / 12));
  const ticks = Array.from({ length: Math.floor(span / stride) + 1 }, (_, index) => index * stride);
  const done = step === example.positions.length - 1;
  const currentMove = step === 0 ? -1 : (step - 1) % example.moves.length;
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_12rem] md:items-center">
      <svg viewBox="0 0 400 400" role="img" aria-label={l(`Alice at (${point.x}, ${point.y}); target (${example.target.x}, ${example.target.y})`, `Alice en (${point.x}, ${point.y}); objetivo (${example.target.x}, ${example.target.y})`)} className="mx-auto w-full max-w-[440px] rounded-lg border border-zinc-800 bg-zinc-900/50">
        <title>{l("Alice’s movement board", "Tablero de movimientos de Alice")}</title>
        {ticks.map((offset) => <g key={offset}>
          <line x1={px(minX + offset)} x2={px(minX + offset)} y1={35} y2={365} stroke="#3f3f46" strokeWidth="0.6" />
          <line x1={35} x2={365} y1={py(minY + offset)} y2={py(minY + offset)} stroke="#3f3f46" strokeWidth="0.6" />
          <text x={px(minX + offset)} y={383} fill="#a1a1aa" textAnchor="middle" fontSize="10">{minX + offset}</text>
          <text x={23} y={py(minY + offset) + 3} fill="#a1a1aa" textAnchor="end" fontSize="10">{minY + offset}</text>
        </g>)}
        <line x1={px(0)} x2={px(0)} y1={35} y2={365} stroke="#71717a" />
        <line x1={35} x2={365} y1={py(0)} y2={py(0)} stroke="#71717a" />
        <text x={377} y={398} fontSize="12" fill="#a1a1aa">x →</text>
        <text x={8} y={18} fontSize="12" fill="#a1a1aa">y ↑</text>
        <polyline points={example.positions.slice(0, step + 1).map((p) => `${px(p.x)},${py(p.y)}`).join(" ")} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
        <circle cx={px(0)} cy={py(0)} r={4} fill="#a1a1aa" />
        <g transform={`translate(${px(example.target.x)},${py(example.target.y)})`}>
          <circle r={13} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M0 0 V-25 L17 -20 L0 -14" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" />
        </g>
        <g style={{ transform: `translate(${px(point.x)}px, ${py(point.y)}px)` }} className="transition-transform duration-500 ease-in-out motion-reduce:transition-none">
          <circle r={9} fill="#22d3ee" stroke="#ecfeff" strokeWidth="2" />
          <circle cy={-3} r={2.5} fill="#083344" />
          <path d="M-4 4 Q0 -2 4 4" fill="#083344" />
        </g>
      </svg>
      <div className="space-y-4 text-sm">
        <p className="text-cyan-300">● Alice: ({point.x}, {point.y})</p>
        <p className="text-amber-300">⚑ {l("Target", "Objetivo")}: ({example.target.x}, {example.target.y})</p>
        <div className="flex flex-wrap gap-1" aria-label={l("Movement pattern", "Patrón de movimientos")}>
          {[...example.moves].map((move, index) => <span key={index} className={cn("rounded border px-2 py-1 font-mono", index === currentMove ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-zinc-700 text-zinc-400")}>{move}</span>)}
        </div>
        <p className="text-xs text-zinc-400">{l("N ↑ · S ↓ · E → · W ←. Repeat after the last letter.", "N ↑ · S ↓ · E → · W ←. Repite después de la última letra.")}</p>
        <p className="text-xs text-zinc-400">{l(`Moves shown: ${step}`, `Movimientos mostrados: ${step}`)}</p>
        <div className={cn("rounded-lg border p-3", done ? example.answer === "YES" ? "border-emerald-400/50 text-emerald-300" : "border-rose-400/50 text-rose-300" : "border-zinc-700 text-zinc-400")}>
          <span className="block text-xs">{l("Output for this input", "Salida de esta entrada")}</span>
          <strong className="mt-1 block font-mono text-xl">{done ? example.answer : "?"}</strong>
        </div>
      </div>
    </div>
  );
}

const comparisons = ["D>B", "A>D", "E<C", "A>B", "B>C"] as const;
export function KitchenStatementAnimation(): React.JSX.Element {
  const { t, i18n } = useTranslation("bruteForce");
  const l: Translate = (en, es) => (i18n.resolvedLanguage ?? i18n.language).startsWith("es") ? es : en;
  const presets: ScenarioPreset[] = ["valid", "invalid"].map((id) => ({
    id,
    label: id === "valid" ? l("Valid order", "Orden válido") : l("Invalid order", "Orden inválido"),
    description: l("The same five comparisons apply to both arrangements. Step through them to see which ones hold.", "Las mismas cinco comparaciones se aplican a ambos órdenes. Avanza para ver cuáles se cumplen."),
    frames: Array.from({ length: 7 }, (_, index) => {
      let narration = l("These are plates, arranged from lightest to heaviest. A > B means A weighs more than B.", "Estos platos están ordenados del más liviano al más pesado. A > B significa que A pesa más que B.");
      if (index > 0 && index < 6) {
        const comparison = comparisons[index - 1]!;
        const passes = id === "valid" || index !== 5;
        narration = `${comparison}: ${passes ? l("this condition holds in the pictured order.", "esta condición se cumple en el orden dibujado.") : l("this condition fails: B is lighter than C here, but B>C requires B to be heavier.", "esta condición falla: aquí B pesa menos que C, pero B>C exige que B pese más.")}`;
      }
      if (index === 6) narration = id === "valid"
        ? l("All five conditions hold. ECBDA is a valid output for this input.", "Las cinco condiciones se cumplen. ECBDA es una salida válida para esta entrada.")
        : l("EBCDA is invalid because it breaks B>C. A single failed condition rejects an order; it does not mean the input is impossible.", "EBCDA no es válido porque incumple B>C. Basta una condición falsa para rechazar un orden; eso no significa que la entrada sea imposible.");
      return { narration, visuals: [] };
    })
  }));
  return <ScenarioPlayer label={l(`Statement animation: ${t("kitchen.title")}`, `Animación del enunciado: ${t("kitchen.title")}`)} presets={presets} accent="violet" intervalMs={1800}
    renderFrame={(_, index, id) => <PlateScene order={id === "valid" ? "ECBDA" : "EBCDA"} step={index} l={l} />}
  />;
}

function PlateScene({ order, step, l }: { readonly order: string; readonly step: number; readonly l: Translate }): React.JSX.Element {
  const comparison = comparisons[Math.max(0, Math.min(4, step - 1))]!;
  const left = comparison[0]!;
  const right = comparison[2]!;
  const leftHeavier = order.indexOf(left) > order.indexOf(right);
  const conditionHolds = comparison[1] === ">" ? leftHeavier : !leftHeavier;
  const titleId = useId();
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 500 130" className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{l(`Plates from lightest to heaviest: ${[...order].join(", ")}`, `Platos del más liviano al más pesado: ${[...order].join(", ")}`)}</title>
        <path d="M35 104 H460 L450 99 M460 104 L450 109" fill="none" stroke="#a1a1aa" />
        {[...order].map((plate, index) => <g key={plate} transform={`translate(${50 + index * 100},55)`}>
          <ellipse cy={6} rx={39} ry={25} fill="#18181b" stroke="#71717a" />
          <ellipse rx={39} ry={25} fill={step > 0 && (plate === left || plate === right) ? "#4c1d95" : "#3f3f46"} stroke="#c4b5fd" strokeWidth="2" />
          <ellipse rx={27} ry={16} fill="none" stroke="#a78bfa" />
          <text textAnchor="middle" y={6} fontSize="20" fill="#f5f3ff" fontWeight="600">{plate}</text>
        </g>)}
      </svg>
      <p className="flex justify-between text-xs text-zinc-400"><span>{l("Lightest", "Más liviano")}</span><span>{l("Heaviest", "Más pesado")}</span></p>
      {step > 0 && step < 6 ? <div className="grid items-center gap-3 sm:grid-cols-2">
        <svg viewBox="0 0 260 155" className="mx-auto w-full max-w-64" role="img" aria-label={l(`${leftHeavier ? left : right} is heavier; ${comparison} is ${conditionHolds ? "valid" : "invalid"}`, `${leftHeavier ? left : right} pesa más; ${comparison} es ${conditionHolds ? "válida" : "inválida"}`)}>
          <path d="M130 35 V140 M90 140 H170" stroke="#71717a" strokeWidth="7" fill="none" strokeLinecap="round" />
          <g style={{ transform: `rotate(${leftHeavier ? -10 : 10}deg)`, transformOrigin: "130px 45px" }} className="transition-transform duration-500 motion-reduce:transition-none">
            <path d="M40 45 H220 M40 45 V90 M220 45 V90" stroke="#c4b5fd" strokeWidth="3" fill="none" />
            {[40, 220].map((cx, index) => <g key={cx}>
              <ellipse cx={cx} cy={94} rx={33} ry={14} fill="#4c1d95" stroke="#c4b5fd" strokeWidth="2" />
              <text x={cx} y={99} textAnchor="middle" fontSize="18" fill="#f5f3ff">{index === 0 ? left : right}</text>
            </g>)}
          </g>
        </svg>
        <p className={cn("text-center text-lg font-semibold", conditionHolds ? "text-emerald-300" : "text-rose-300")}>{comparison} {conditionHolds ? "✓" : "✗"}<span className="mt-1 block text-sm font-normal">{l("The heavier plate hangs lower.", "El plato más pesado queda abajo.")}</span></p>
      </div> : null}
      <ul className="flex flex-wrap gap-2" aria-label={l("Comparison results", "Resultados de las comparaciones")}>
        {comparisons.map((rule, index) => {
          const checked = index < step;
          const valid = rule[1] === ">" ? order.indexOf(rule[0]!) > order.indexOf(rule[2]!) : order.indexOf(rule[0]!) < order.indexOf(rule[2]!);
          return <li key={rule} className={cn("rounded-md border px-3 py-2 font-mono text-sm", checked ? valid ? "border-emerald-400/40 text-emerald-300" : "border-rose-400/40 text-rose-300" : "border-zinc-700 text-zinc-400")}>{rule} · {checked ? valid ? "✓" : "✗" : "?"}<span className="sr-only"> {checked ? valid ? l("valid", "válida") : l("invalid", "inválida") : l("not checked yet", "sin comprobar")}</span></li>;
        })}
      </ul>
      {step === 6 ? <p className="rounded-lg border border-zinc-700 p-3 text-sm text-zinc-200">{order === "ECBDA" ? l("Example output: ECBDA", "Salida de ejemplo: ECBDA") : l("Rejected order: EBCDA. The valid output is ECBDA.", "Orden rechazado: EBCDA. La salida válida es ECBDA.")}</p> : null}
    </div>
  );
}
