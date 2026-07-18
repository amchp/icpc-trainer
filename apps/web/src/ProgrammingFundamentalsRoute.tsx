import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

const ProgrammingFundamentalsPage = lazy(() =>
  import("./ProgrammingFundamentalsPage.js").then((module) => ({ default: module.ProgrammingFundamentalsPage }))
);

export function ProgrammingFundamentalsRoute(): React.JSX.Element {
  const { t } = useTranslation("programmingFundamentals");
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-5 py-16 text-sm text-zinc-500 sm:px-8">{t("loading")}</main>}>
      <ProgrammingFundamentalsPage />
    </Suspense>
  );
}
