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
      </section>
    </main>
  );
}
