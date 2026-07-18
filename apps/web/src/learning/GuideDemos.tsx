import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../lib.js";

function DemoPanel({ label, accent, children }: { readonly label: string; readonly accent: string; readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="relative my-10 rounded-lg border border-zinc-800 bg-zinc-900/25 p-6 sm:p-8">
      <span className={cn("absolute -top-2 left-5 bg-[#09090b] px-2 font-mono text-[10px] uppercase tracking-[0.18em]", accent)}>{label}</span>
      {children}
    </div>
  );
}

export function TypeExplorer(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  const types = { bool: ["true", t("demos.bool")], int: ["42", t("demos.integer")], double: ["3.1416", t("demos.decimal")], char: ["'A'", t("demos.character")] } as const;
  const [type, setType] = useState<keyof typeof types>("int");

  return (
    <DemoPanel label={t("demos.explore")} accent="text-cyan-300">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("demos.typeSelection")}>
        {(Object.keys(types) as Array<keyof typeof types>).map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={type === key}
            onClick={() => setType(key)}
            className={cn("rounded-md border px-3 py-1.5 font-mono text-xs transition-colors", type === key ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200")}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="mt-7 grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-baseline">
        <output className="font-mono text-4xl text-cyan-300">{types[type][0]}</output>
        <p className="m-0 text-zinc-400">{types[type][1]}</p>
      </div>
    </DemoPanel>
  );
}
