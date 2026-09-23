import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { Card } from "./components/ui.js";
import { cn } from "./lib.js";

export function ConnectJudgePrompt({ feature, className }: {
  readonly feature: "upsolving" | "contests" | "team" | "contestFinder" | "friends";
  readonly className?: string;
}): React.JSX.Element {
  const { t } = useTranslation("judges");
  return (
    <Card className={cn("p-5", className)}>
      <h2 className="text-base font-semibold text-zinc-100">{t("requiredTitle")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{t(`required.${feature}`)}</p>
      <Link to={appPaths.connectJudges} className="mt-4 inline-flex rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
        {t("connectJudge")}
      </Link>
    </Card>
  );
}
