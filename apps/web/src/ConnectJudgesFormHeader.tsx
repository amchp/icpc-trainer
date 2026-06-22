import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "./components/ui.js";
import type { ProviderConnectJudgeFormProps } from "./connectJudgesShared.js";

interface ConnectJudgesFormHeaderProps extends ProviderConnectJudgeFormProps {
  readonly disabled: boolean;
  readonly title: string;
}

export function ConnectJudgesFormHeader({
  disabled,
  onChangeProvider,
  title
}: ConnectJudgesFormHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Button
        type="button"
        variant="ghost"
        className="size-9 shrink-0 p-0"
        disabled={disabled}
        aria-label="Back to provider selection"
        onClick={onChangeProvider}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
      </Button>
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
        <CheckCircle2 className="size-4 text-blue-300" aria-hidden="true" />
        {title}
      </div>
    </div>
  );
}
