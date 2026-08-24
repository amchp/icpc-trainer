import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ScenarioPlayer } from "../ScenarioPlayer.js";
import type { ScenarioPreset } from "../ScenarioPlayer.js";
import {
  buildDagScenarios,
  buildFibonacciScenarios,
  buildGridScenarios,
  buildKnapsackScenarios,
  buildNonAdjacentScenarios
} from "./dpScenarios.js";

type DpTechnique = "fibonacci" | "nonAdjacent" | "grid" | "knapsack" | "dag";

function DpPlayer({ technique, build, accent }: {
  readonly technique: DpTechnique;
  readonly build: (t: TFunction<"dynamicProgramming">) => readonly ScenarioPreset[];
  readonly accent: "emerald" | "cyan" | "violet" | "amber" | "rose";
}): React.JSX.Element {
  const { t } = useTranslation("dynamicProgramming");
  const presets = useMemo(() => build(t), [build, t]);
  return <ScenarioPlayer label={t("scenarios.playerLabel", { technique: t(`sections.${technique}`) })} presets={presets} accent={accent} intervalMs={1500} />;
}

export function FibonacciDpPlayer(): React.JSX.Element { return <DpPlayer technique="fibonacci" build={buildFibonacciScenarios} accent="emerald" />; }
export function NonAdjacentDpPlayer(): React.JSX.Element { return <DpPlayer technique="nonAdjacent" build={buildNonAdjacentScenarios} accent="cyan" />; }
export function GridDpPlayer(): React.JSX.Element { return <DpPlayer technique="grid" build={buildGridScenarios} accent="violet" />; }
export function KnapsackDpPlayer(): React.JSX.Element { return <DpPlayer technique="knapsack" build={buildKnapsackScenarios} accent="amber" />; }
export function DagDpPlayer(): React.JSX.Element { return <DpPlayer technique="dag" build={buildDagScenarios} accent="rose" />; }
