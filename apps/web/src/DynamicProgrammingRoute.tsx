import "./i18n/registerDynamicProgrammingResources.js";

import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

const DynamicProgrammingPage = lazy(() => import("./DynamicProgrammingPage.js").then((module) => ({ default: module.DynamicProgrammingPage })));

export function DynamicProgrammingRoute(): React.JSX.Element {
  const { t } = useTranslation("dynamicProgramming");
  return <Suspense fallback={<main className="mx-auto max-w-5xl px-5 py-16 text-sm text-zinc-500 sm:px-8">{t("loading")}</main>}><DynamicProgrammingPage /></Suspense>;
}
