import { APP_NAME } from "@icpc-trainer/shared";
import { UserButton } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Menu, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths, protectedNavItems } from "./appNavigation.js";
import { Button } from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { judgeLabel } from "./judgeConfig.js";
import { LanguageButton } from "./i18n/LanguageButton.js";
import { queryKeys } from "./queryKeys.js";
import { useSync } from "./SyncContext.js";
import { trpc } from "./trpc.js";
import { useToaster } from "./Toaster.js";

const navLinkClassName =
  "rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100";

const activeNavLinkProps = {
  className: "rounded-md bg-zinc-900/80 px-3 py-2 text-sm font-medium text-zinc-100"
};

const mobileNavLinkClassName =
  "rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100";

export function AppHeader(): React.JSX.Element {
  const { t } = useTranslation("shell");
  const { connectedJudges } = useConnectedJudges();
  const { startSync, status: syncStatus } = useSync();
  const toaster = useToaster();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dataStatusQuery = useQuery({
    queryKey: queryKeys.accountDataStatus,
    queryFn: () => trpc.account.dataStatus.query()
  });
  const connectedJudgeIds = new Set(connectedJudges.map((judge) => judge.id));
  const syncedContestJudges = dataStatusQuery.data?.syncedContestJudges ?? [];
  const syncTargetJudges = connectedJudges.map((judge) => judge.id);
  const missingSyncJudges = dataStatusQuery.data?.hasSyncedContests
    ? syncedContestJudges.filter((judge) => !connectedJudgeIds.has(judge))
    : [];
  const navItems = protectedNavItems(t);

  return (
    <header className="relative z-40 border-b border-zinc-800 bg-zinc-950/80 px-5 backdrop-blur sm:px-8">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4">
        <Link to={appPaths.root} className="flex min-w-0 items-center gap-2 text-zinc-100">
          <img src="/icpc_trainer.png" alt="" className="size-8 shrink-0 object-contain" />
          <span className="truncate text-sm font-semibold">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={navLinkClassName}
              activeProps={activeNavLinkProps}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            aria-label={t("sync")}
            disabled={
              syncStatus === "running" ||
              dataStatusQuery.isLoading ||
              (syncTargetJudges.length === 0 && missingSyncJudges.length === 0)
            }
            onClick={() => {
              for (const judge of missingSyncJudges) {
                toaster.warning({
                  title: t("judgeNotConnectedTitle", { judge: judgeLabel(judge) }),
                  description: t("judgeNotConnectedDescription", { judge: judgeLabel(judge) })
                });
              }
              startSync(syncTargetJudges);
            }}
          >
            <RefreshCw className={syncStatus === "running" ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
            {t("sync")}
          </Button>

          <Link
            to={appPaths.judges}
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100 lg:inline-flex"
          >
            {t("nav.judges")}
          </Link>
          <LanguageButton className="relative hidden lg:inline-flex" />
          <UserButton />
          <Button
            type="button"
            variant="ghost"
            className="size-9 p-0 lg:hidden"
            aria-label={mobileNavOpen ? t("closeNavigation") : t("openNavigation")}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? (
              <X className="size-4" aria-hidden="true" />
            ) : (
              <Menu className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      {mobileNavOpen ? (
        <nav className="mx-auto grid w-full max-w-6xl gap-1 border-t border-zinc-800 py-2 lg:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={mobileNavLinkClassName}
              activeProps={activeNavLinkProps}
              onClick={() => setMobileNavOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to={appPaths.judges}
            className={mobileNavLinkClassName}
            activeProps={activeNavLinkProps}
            onClick={() => setMobileNavOpen(false)}
          >
            {t("nav.judges")}
          </Link>
          <div className="mt-1 border-t border-zinc-800 pt-2 lg:hidden">
            <LanguageButton className="relative" fullWidth />
          </div>
        </nav>
      ) : null}
    </header>
  );
}
