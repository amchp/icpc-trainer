import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

import "./i18n/registerGreedyResources.js";

const GreedyPage = lazy(() =>
  import("./GreedyPage.js").then((module) => ({ default: module.GreedyPage }))
);

export function GreedyRoute(): React.JSX.Element {
  const { t } = useTranslation("greedy");
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-5 py-16 text-sm text-zinc-500 sm:px-8">{t("loading")}</main>}>
      <GreedyPage />
    </Suspense>
  );
}
