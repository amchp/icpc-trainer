import type { PlaygroundProvider } from "@icpc-trainer/api";
import type { ComponentType } from "react";

import { appPaths } from "./appNavigation.js";
import { CodeforcesConnectJudgeForm } from "./CodeforcesConnectJudgeForm.js";
import type { ProviderConnectJudgeFormProps } from "./connectJudgesShared.js";
import { QojConnectJudgeForm } from "./QojConnectJudgeForm.js";

export interface ConnectJudgeProviderConfig {
  readonly id: PlaygroundProvider;
  readonly name: string;
  readonly Form: ComponentType<ProviderConnectJudgeFormProps>;
  readonly tutorialUrl?: string;
}

export const connectJudgeProviders: readonly ConnectJudgeProviderConfig[] = [
  {
    id: "codeforces",
    name: "Codeforces",
    Form: CodeforcesConnectJudgeForm,
    tutorialUrl: "https://scribehow.com/o/wuKjFIrFRgKoK0RyxQxnQg/viewer/How_to_Create_an_API_Key_on_Codeforces__hvQRpAYRROi3R_6-FTZDiA"
  },
  {
    id: "qoj",
    name: "QOJ",
    Form: QojConnectJudgeForm,
    tutorialUrl: appPaths.connectQojTutorial
  }
];

export const connectJudgeProviderById = new Map(
  connectJudgeProviders.map((provider) => [provider.id, provider])
);

export const isConnectJudgeProvider = (value: string | undefined): value is PlaygroundProvider =>
  value !== undefined && connectJudgeProviderById.has(value as PlaygroundProvider);
