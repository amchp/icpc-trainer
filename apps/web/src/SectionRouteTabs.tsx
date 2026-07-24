import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { appPaths } from "./appNavigation.js";

const tabClassName = "rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100";
const activeProps = { className: "rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-100" };

export function ContestRouteTabs(): React.JSX.Element {
  const { t } = useTranslation("shell");
  return (
    <nav aria-label={t("sections.contestsLabel")} className="mb-6 inline-flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
      <Link to={appPaths.contestFinder} className={tabClassName} activeProps={activeProps}>{t("sections.contestFinder")}</Link>
      <Link to={appPaths.contests} className={tabClassName} activeProps={activeProps}>{t("sections.contests")}</Link>
    </nav>
  );
}

export function PeopleRouteTabs(): React.JSX.Element {
  const { t } = useTranslation("shell");
  return (
    <nav aria-label={t("sections.peopleLabel")} className="mb-6 inline-flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
      <Link to={appPaths.team} className={tabClassName} activeProps={activeProps}>{t("sections.team")}</Link>
      <Link to={appPaths.friends} className={tabClassName} activeProps={activeProps}>{t("sections.friends")}</Link>
    </nav>
  );
}
