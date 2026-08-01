import "./i18n/registerGraphTheoryResources.js";

import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

const GraphTheoryPage = lazy(() =>
  import("./GraphTheoryPage.js").then((module) => ({ default: module.GraphTheoryPage }))
);

export function GraphTheoryRoute(): React.JSX.Element {
  const { t } = useTranslation("graphTheory");
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-5 py-16 text-sm text-zinc-500 sm:px-8">{t("loading")}</main>}>
      <GraphTheoryPage />
    </Suspense>
  );
}
