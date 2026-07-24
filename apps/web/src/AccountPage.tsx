import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Badge,
  Button,
} from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { localizedErrorMessage } from "./i18n/localizedMessage.js";
import { JudgeDisplay } from "./JudgeDisplay.js";
import { judgeConfigs, judgeLabel, type JudgeProvider } from "./judgeConfig.js";
import { trpc } from "./trpc.js";
import { useToaster } from "./Toaster.js";

export function AccountPage(): React.JSX.Element {
  const { t } = useTranslation("judges");
  const navigate = useNavigate();
  const { connectedJudges, credentialStatus, refresh } = useConnectedJudges();
  const toaster = useToaster();
  const [clearing, setClearing] = useState<JudgeProvider | "all" | null>(null);
  const missingJudges = judgeConfigs.filter((judge) => !credentialStatus[judge.id].saved);

  const clearJudge = async (judge: JudgeProvider): Promise<void> => {
    setClearing(judge);
    try {
      await trpc.credentials.clear.mutate(judge);
      await refresh();
    } catch (error) {
      toaster.error({
        title: t("clearError", { judge: judgeLabel(judge) }),
        description: localizedErrorMessage(error)
      });
    } finally {
      setClearing(null);
    }
  };

  const clearAllJudges = async (): Promise<void> => {
    setClearing("all");
    try {
      await Promise.all(connectedJudges.map((judge) => trpc.credentials.clear.mutate(judge.id)));
      await refresh();
    } catch (error) {
      toaster.error({
        title: t("clearAllError"),
        description: localizedErrorMessage(error)
      });
    } finally {
      setClearing(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 border-red-950/80 text-red-200 hover:border-red-500/70 hover:bg-red-950/30"
          disabled={connectedJudges.length === 0 || clearing !== null}
          onClick={() => void clearAllJudges()}
        >
          {clearing === "all" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
          {t("clearAll")}
        </Button>
      </section>

      <section className="space-y-8">
        <div className="py-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">{t("connectedJudges")}</h2>
            {missingJudges.length > 0 ? (
              <Button type="button" onClick={() => void navigate({ to: "/connect-judges" })}>
                <Plus className="size-4" aria-hidden="true" />
                {t("connectJudge")}
              </Button>
            ) : (
              <p className="text-sm text-zinc-500">{t("allConnected")}</p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {judgeConfigs.map((judge) => {
              const judgeStatus = credentialStatus[judge.id];
              return (
                <div key={judge.id} className="rounded-md border border-zinc-800 p-4">
                  <div className="flex h-full items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <JudgeDisplay judge={judge.id} />
                      <Badge className={judgeStatus.saved ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 bg-zinc-900 text-zinc-400"}>
                        {judgeStatus.saved ? t("connected") : t("missing")}
                      </Badge>
                    </div>
                    {judgeStatus.saved ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 text-zinc-400 hover:text-red-300"
                        disabled={clearing !== null}
                        onClick={() => void clearJudge(judge.id)}
                      >
                        {clearing === judge.id ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
                        {t("clear")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
