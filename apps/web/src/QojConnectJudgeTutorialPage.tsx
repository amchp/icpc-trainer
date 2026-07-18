import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card } from "./components/ui.js";

export function QojConnectJudgeTutorialPage(): React.JSX.Element {
  const { t } = useTranslation("judges");
  const qojTutorialSteps = [
    { key: "inspect" as const, image: "/tutorials/qoj/open-inspect.png" },
    { key: "application" as const, image: "/tutorials/qoj/devtools-open.png" },
    { key: "cookies" as const, image: "/tutorials/qoj/application-storage.png" },
    { key: "copy" as const, image: "/tutorials/qoj/cookie-values-redacted.png" }
  ];
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-8 text-zinc-100 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="min-w-0">
          <Link
            to="/connect-judges/$provider"
            params={{ provider: "qoj" }}
            className="-ml-3 mb-3 inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("tutorialPage.back")}
          </Link>
          <h1 className="text-2xl font-semibold tracking-normal">{t("tutorialPage.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            {t("tutorialPage.subtitle")}
          </p>
        </div>
        <a
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-zinc-800 px-3 text-sm font-medium text-zinc-300 transition-colors hover:border-blue-500/70 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          href="https://qoj.ac"
          target="_blank"
          rel="noreferrer"
        >
          {t("tutorialPage.openQoj")}
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </header>

      <section className="grid gap-5">
        {qojTutorialSteps.map((step, index) => (
          <Card key={step.key} className="overflow-hidden">
            <div className="grid gap-4 p-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
              <div className="min-w-0">
                <div className="mb-3 inline-flex size-8 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-sm font-semibold text-blue-300">
                  {index + 1}
                </div>
                <h2 className="text-base font-semibold tracking-normal text-zinc-100">{t(`tutorialPage.steps.${step.key}.title`)}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{t(`tutorialPage.steps.${step.key}.description`)}</p>
              </div>
              <img
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 object-cover"
                src={step.image}
                alt={t(`tutorialPage.steps.${step.key}.alt`)}
                loading={index === 0 ? "eager" : "lazy"}
              />
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}
