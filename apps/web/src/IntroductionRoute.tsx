import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

const IntroductionPage = lazy(() =>
  import("./IntroductionPage.js").then((module) => ({ default: module.IntroductionPage }))
);

export function IntroductionRoute(): React.JSX.Element {
  const { t } = useTranslation("introduction");
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-5 py-16 text-sm text-zinc-500 sm:px-8">{t("loading")}</main>}>
      <IntroductionPage />
    </Suspense>
  );
}
