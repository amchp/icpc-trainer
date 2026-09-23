import { Link } from "@tanstack/react-router";
import { appPaths } from "./appNavigation.js";
import { AvailableJudgeProviderSelection } from "./AvailableJudgeProviderSelection.js";
import { useTranslation } from "react-i18next";

export function ConnectJudgesPage(): React.JSX.Element {
  const { t } = useTranslation("judges");
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8 text-zinc-100 sm:px-8">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{t("connectTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("choose")}</p>
        </div>

        <AvailableJudgeProviderSelection />
        <div className="flex flex-col items-start gap-2">
          <Link to={appPaths.findProblems} className="rounded-md border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            {t("skip")}
          </Link>
          <p className="text-sm text-zinc-500">{t("skipDescription")}</p>
        </div>
      </section>
    </main>
  );
}
