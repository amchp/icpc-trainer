import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScenarioPlayer } from "../../ScenarioPlayer.js";
import { ExampleIllustration } from "./ExampleIllustration.js";
import type { ExamplePreset, IllustratedExample } from "./types.js";

export function IllustratedStatementPlayer({
  example,
  title,
}: {
  readonly example: IllustratedExample;
  readonly title: string;
}): React.JSX.Element {
  const { t, i18n } = useTranslation("resources");
  const es = (i18n.resolvedLanguage ?? i18n.language).startsWith("es");
  const l = (en: string, spanish: string): string => (es ? spanish : en);
  const [draft, setDraft] = useState(example.presets[0]!.input);
  const [custom, setCustom] = useState<ExamplePreset | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const scenarios = useMemo(
    () =>
      (custom ? [custom, ...example.presets] : example.presets).map(
        (choice) => ({ ...choice, steps: example.build(choice.input) }),
      ),
    [custom, example],
  );
  return (
    <div data-illustrated-statement className="mt-6 min-w-0">
      <details className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          {l("Try your own input", "Prueba tu propia entrada")}
        </summary>
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              example.build(draft);
              setCustom({
                id: "custom",
                label: l("Your input", "Tu entrada"),
                input: draft,
              });
              setRevision((n) => n + 1);
              setError("");
            } catch (problem) {
              setError(
                problem instanceof Error
                  ? problem.message
                  : l("Check your input.", "Revisa tu entrada."),
              );
            }
          }}
        >
          <p className="mb-2 text-xs text-zinc-400">
            {l(
              "Use this simplified format for small visual examples.",
              "Usa este formato simplificado para ejemplos visuales pequeños.",
            )}
          </p>
          <label className="block text-xs leading-6 text-zinc-400">
            {example.instructions}
            <textarea
              aria-label={l("Preview input", "Entrada de la vista previa")}
              value={draft}
              maxLength={1500}
              rows={Math.min(9, Math.max(2, draft.split("\n").length))}
              spellCheck={false}
              onChange={(event) => setDraft(event.target.value)}
              className="mt-2 block w-full min-w-0 resize-y rounded-md border border-zinc-700 bg-zinc-950 p-3 font-mono text-sm text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            />
          </label>
          {error ? (
            <p role="alert" className="mt-2 text-sm text-rose-300">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-3 rounded-md bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            {l("Load input", "Cargar entrada")}
          </button>
        </form>
      </details>
      <ScenarioPlayer
        key={revision}
        label={t("statement.animationLabel", { title })}
        accent="cyan"
        intervalMs={1400}
        presets={scenarios.map((scenario) => ({
          id: scenario.id,
          label: scenario.label,
          description: l(
            "Follow this input to its output. Colors and captions show which rules are satisfied.",
            "Sigue esta entrada hasta su salida. Los colores y las leyendas muestran qué reglas se cumplen.",
          ),
          frames: scenario.steps.map((frame) => ({
            narration: frame.narration,
            visuals: [],
          })),
        }))}
        renderFrame={(_, index, id) => {
          const scenario = scenarios.find((candidate) => candidate.id === id)!;
          const current = scenario.steps[index]!;
          return (
            <div className="min-w-0 space-y-4">
              <details className="text-xs text-zinc-400">
                <summary className="cursor-pointer">
                  {l(
                    "Input shown on the diagram",
                    "Entrada mostrada en el dibujo",
                  )}
                </summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded border border-zinc-800 p-3">
                  {scenario.input}
                </pre>
              </details>
              {current.scenes.map((scene, i) => (
                <ExampleIllustration key={i} scene={scene} />
              ))}
              <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-4">
                <p className="text-xs text-cyan-300">
                  {l("Output for this input", "Salida de esta entrada")}
                </p>
                <pre
                  data-example-result
                  className="mt-2 overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-zinc-100"
                >
                  {current.result ??
                    l(
                      "Advance to see the result",
                      "Avanza para ver el resultado",
                    )}
                </pre>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
