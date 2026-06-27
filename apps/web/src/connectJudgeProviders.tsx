import type { PlaygroundProvider } from "@icpc-trainer/api";
import type { ComponentType } from "react";

import { CodeforcesConnectJudgeForm } from "./CodeforcesConnectJudgeForm.js";
import type { ProviderConnectJudgeFormProps } from "./connectJudgesShared.js";
import { QojConnectJudgeForm } from "./QojConnectJudgeForm.js";

export interface ConnectJudgeProviderConfig {
  readonly id: PlaygroundProvider;
  readonly name: string;
  readonly Form: ComponentType<ProviderConnectJudgeFormProps>;
}

export const connectJudgeProviders: readonly ConnectJudgeProviderConfig[] = [
  {
    id: "codeforces",
    name: "Codeforces",
    Form: CodeforcesConnectJudgeForm
  },
  {
    id: "qoj",
    name: "QOJ",
    Form: QojConnectJudgeForm
  }
];

export const connectJudgeProviderById = new Map(
  connectJudgeProviders.map((provider) => [provider.id, provider])
);

export const isConnectJudgeProvider = (value: string | undefined): value is PlaygroundProvider =>
  value !== undefined && connectJudgeProviderById.has(value as PlaygroundProvider);
