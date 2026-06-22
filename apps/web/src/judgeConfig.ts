import type { CredentialStatus, JudgeSyncInput } from "@icpc-trainer/api";

export type JudgeProvider = JudgeSyncInput["provider"];

interface JudgeConfig {
  readonly id: JudgeProvider;
  readonly label: string;
  readonly syncProgressClassName: string;
}

export const judgeConfigs = [
  {
    id: "codeforces",
    label: "Codeforces",
    syncProgressClassName: "bg-sky-500"
  },
  {
    id: "qoj",
    label: "QOJ",
    syncProgressClassName: "bg-emerald-500"
  }
] as const satisfies readonly JudgeConfig[];

export const syncObservableProviders = judgeConfigs.map((judge) => judge.id);

const judgeConfigByProvider = new Map<JudgeProvider, JudgeConfig>(
  judgeConfigs.map((judge) => [judge.id, judge])
);

export const judgeLabel = (provider: JudgeProvider): string =>
  judgeConfigByProvider.get(provider)?.label ?? provider;

export const judgeSyncProgressClassName = (provider: JudgeProvider): string =>
  judgeConfigByProvider.get(provider)?.syncProgressClassName ?? "bg-blue-500";

export const connectedJudgesFromCredentialStatus = (
  status: CredentialStatus
): Array<{ readonly id: JudgeProvider; readonly label: string }> =>
  judgeConfigs
    .filter((judge) => status[judge.id].saved)
    .map((judge) => ({
      id: judge.id,
      label: judge.label
    }));

export const emptyCredentialStatus = (): CredentialStatus =>
  Object.fromEntries(
    judgeConfigs.map((judge) => [
      judge.id,
      {
        saved: false
      }
    ])
  ) as unknown as CredentialStatus;
