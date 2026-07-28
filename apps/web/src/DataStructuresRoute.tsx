import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

const DataStructuresPage = lazy(() =>
  import("./DataStructuresPage.js").then((module) => ({ default: module.DataStructuresPage }))
);

export function DataStructuresRoute(): React.JSX.Element {
  const { t } = useTranslation("dataStructures");
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-5 py-16 text-sm text-zinc-500 sm:px-8">{t("loading")}</main>}>
      <DataStructuresPage />
    </Suspense>
  );
}
