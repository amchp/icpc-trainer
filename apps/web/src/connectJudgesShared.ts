import type { PlaygroundProvider } from "@icpc-trainer/api";

export interface ProviderConnectJudgeFormProps {
  readonly onChangeProvider: () => void;
}

export const connectJudgeProviders: Array<{
  readonly id: PlaygroundProvider;
  readonly name: string;
}> = [
  {
    id: "codeforces",
    name: "Codeforces"
  },
  {
    id: "qoj",
    name: "QOJ"
  }
];
