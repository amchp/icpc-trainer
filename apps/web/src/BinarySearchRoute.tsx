import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

import "./i18n/registerBinarySearchResources.js";

const BinarySearchPage = lazy(() =>
  import("./BinarySearchPage.js").then((module) => ({ default: module.BinarySearchPage }))
);

export function BinarySearchRoute(): React.JSX.Element {
  const { t } = useTranslation("binarySearch");
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-5 py-16 text-sm text-zinc-500 sm:px-8">{t("loading")}</main>}>
      <BinarySearchPage />
    </Suspense>
  );
}
