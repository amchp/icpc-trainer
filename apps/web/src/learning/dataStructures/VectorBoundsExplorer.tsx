import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib.js";

export function VectorBoundsExplorer(): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  const [target, setTarget] = useState(5);
  const values = [1, 3, 3, 6, 8, 10] as const;
  const targets = [0, 3, 5, 10, 12] as const;
  const lowerIndex = values.findIndex((value) => value >= target);
  const upperIndex = values.findIndex((value) => value > target);
  const lower = lowerIndex === -1 ? values.length : lowerIndex;
  const upper = upperIndex === -1 ? values.length : upperIndex;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/50" aria-label={t("vector.lab.explorerLabel")}>
      <div className="border-b border-zinc-800 px-5 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">{t("vector.lab.explorerEyebrow")}</p>
        <h4 className="mt-2 font-semibold text-zinc-100">{t("vector.lab.explorerTitle")}</h4>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("vector.lab.chooseTarget")}>
          {targets.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={target === candidate}
              onClick={() => setTarget(candidate)}
              className={cn(
                "min-w-10 rounded-md border px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                target === candidate ? "border-blue-400 bg-blue-400/15 text-blue-200" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              )}
            >
              {candidate}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-6">
        <div className="overflow-x-auto pb-3">
          <div className="flex min-w-max items-end gap-2">
            {values.map((value, index) => {
              const isLower = index === lower;
              const isUpper = index === upper;
              return (
                <div key={`${value}-${index}`} className="w-14 shrink-0 text-center">
                  <div className="mb-2 flex h-6 items-center justify-center gap-1 font-mono text-[9px]">
                    {isLower ? <span className="rounded bg-cyan-400/15 px-1 text-cyan-300">L</span> : null}
                    {isUpper ? <span className="rounded bg-violet-400/15 px-1 text-violet-300">U</span> : null}
                  </div>
                  <div className={cn(
                    "rounded-md border px-3 py-3 font-mono text-sm",
                    isLower && isUpper
                      ? "border-fuchsia-400 bg-fuchsia-400/10 text-fuchsia-200"
                      : isLower
                        ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                        : isUpper
                          ? "border-violet-400 bg-violet-400/10 text-violet-200"
                          : "border-zinc-700 bg-zinc-900 text-zinc-300"
                  )}>
                    {value}
                  </div>
                  <span className="mt-1 block font-mono text-[9px] text-zinc-600">{index}</span>
                </div>
              );
            })}
            <div className="w-16 shrink-0 text-center">
              <div className="mb-2 flex h-6 items-center justify-center gap-1 font-mono text-[9px]">
                {lower === values.length ? <span className="rounded bg-cyan-400/15 px-1 text-cyan-300">L</span> : null}
                {upper === values.length ? <span className="rounded bg-violet-400/15 px-1 text-violet-300">U</span> : null}
              </div>
              <div className="rounded-md border border-dashed border-zinc-700 px-2 py-3 font-mono text-xs text-zinc-500">end()</div>
              <span className="mt-1 block font-mono text-[9px] text-zinc-600">{values.length}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-x-8 gap-y-5 border-t border-zinc-800 pt-5 sm:grid-cols-2">
          <div className="border-l-2 border-cyan-400/50 pl-4">
            <p className="font-mono text-xs font-semibold text-cyan-300">lower_bound({target}) → {lower}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{t("vector.lab.lowerMeaning", { target })}</p>
          </div>
          <div className="border-l-2 border-violet-400/50 pl-4">
            <p className="font-mono text-xs font-semibold text-violet-300">upper_bound({target}) → {upper}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{t("vector.lab.upperMeaning", { target })}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-blue-400/25 bg-blue-400/[0.045] p-4 sm:p-5">
          <h5 className="text-sm font-semibold text-blue-100">{t("vector.lab.iteratorResultTitle")}</h5>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t("vector.lab.iteratorResultDescription")}</p>
          <div className="mt-4 grid gap-2 font-mono text-xs sm:grid-cols-2">
            <p className="rounded-md border border-zinc-800 bg-zinc-950/75 px-3 py-2 text-zinc-300">
              it - begin() <span className="text-zinc-600">→</span> {t("vector.lab.countBefore")}
            </p>
            <p className="rounded-md border border-zinc-800 bg-zinc-950/75 px-3 py-2 text-zinc-300">
              end() - it <span className="text-zinc-600">→</span> {t("vector.lab.countAfter")}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 border-t border-zinc-800 lg:grid-cols-4">
          {[
            [`< ${target}`, lower, t("vector.lab.less")],
            [`≤ ${target}`, upper, t("vector.lab.lessEqual")],
            [`≥ ${target}`, values.length - lower, t("vector.lab.greaterEqual")],
            [`> ${target}`, values.length - upper, t("vector.lab.greater")]
          ].map(([relation, count, label], index) => (
            <div
              key={String(relation)}
              className={cn(
                "py-4 pr-4",
                index % 2 === 1 && "border-l border-zinc-800 pl-4",
                "lg:border-l lg:pl-4 lg:first:border-l-0 lg:first:pl-0"
              )}
            >
              <p className="font-mono text-lg font-semibold text-zinc-100">{String(relation)} → {String(count)}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{String(label)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
