import "../i18n/registerAnimationResources.js";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { animationGroups, type AnimationToolId } from "./catalog.js";

const tools = new Map(animationGroups.flatMap((group) => group.tools).map((tool) => [tool.id, tool]));

export function AnimationToolSection({ toolId, children }: {
  readonly toolId: AnimationToolId;
  readonly children: ReactNode;
}): React.JSX.Element {
  const { t } = useTranslation("animations");
  const tool = tools.get(toolId);
  if (!tool) throw new Error(`Unknown animation tool: ${toolId}`);

  return (
    <section aria-labelledby={`animation-${toolId}`} data-animation-tool={toolId} className="min-w-0 border-t border-zinc-800 py-8 first:border-t-0 first:pt-0 sm:py-10">
      <h2 id={`animation-${toolId}`} className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">{t(tool.titleKey)}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{t(tool.explanationKey)}</p>
      <div className="mt-5 min-w-0 max-w-full overflow-x-auto">{children}</div>
    </section>
  );
}
