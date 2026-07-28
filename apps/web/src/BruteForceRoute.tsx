import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

const BruteForcePage = lazy(() =>
  import("./BruteForcePage.js").then((module) => ({ default: module.BruteForcePage }))
);

export function BruteForceRoute(): React.JSX.Element {
  const { t } = useTranslation("bruteForce");
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-5 py-16 text-sm text-zinc-500 sm:px-8">{t("loading")}</main>}>
      <BruteForcePage />
    </Suspense>
  );
}
