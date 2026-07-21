import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

const TimeComplexityPage = lazy(() =>
  import("./TimeComplexityPage.js").then((module) => ({ default: module.TimeComplexityPage }))
);

export function TimeComplexityRoute(): React.JSX.Element {
  const { t } = useTranslation("timeComplexity");
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-5 py-16 text-sm text-zinc-500 sm:px-8">{t("loading")}</main>}>
      <TimeComplexityPage />
    </Suspense>
  );
}
