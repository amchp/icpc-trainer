import { APP_NAME } from "@icpc-trainer/shared";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";
import { LanguageButton } from "./i18n/LanguageButton.js";
import { SignInAction } from "./SignInAction.js";

export function PublicHeader(): React.JSX.Element {
  const { t } = useTranslation("shell");
  return (
    <header className="relative z-40 border-b border-zinc-800 bg-zinc-950/80 px-5 backdrop-blur sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 py-3">
        <Link to={appPaths.resources} className="flex items-center gap-2 text-zinc-100">
          <img src="/icpc_trainer.png" alt="" className="size-8 object-contain" />
          <span className="hidden text-sm font-semibold sm:inline">{APP_NAME}</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-medium text-zinc-300">
          <Link to={appPaths.resources} activeProps={{ className: "text-white" }}>{t("nav.resources")}</Link>
          <Link to={appPaths.animations} activeProps={{ className: "text-white" }}>{t("nav.animations")}</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageButton />
          <SignInAction />
        </div>
      </div>
    </header>
  );
}
