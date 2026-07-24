import { PlaygroundPanel } from "./PlaygroundPanel.js";
import { useTranslation } from "react-i18next";

export function PlaygroundPage(): React.JSX.Element {
  const { t } = useTranslation("playground");
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>
        </div>
      </section>

      <PlaygroundPanel />
    </main>
  );
}
