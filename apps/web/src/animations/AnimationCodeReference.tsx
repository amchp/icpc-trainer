import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { GuideCodeBlock } from "../learning/GuideCodeBlock.js";

/** For existing visual-only tools. Trace players keep their synchronized code panes. */
export function AnimationCodeReference({ code, children }: { readonly code: string; readonly children: ReactNode }): React.JSX.Element {
  const { t } = useTranslation("animations");
  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]" data-animation-code-reference>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-zinc-200">{t("lesson.reference")}</h3>
        <p className="mt-2 text-xs leading-5 text-zinc-500">{t("lesson.referenceNote")}</p>
        <GuideCodeBlock code={code} />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
