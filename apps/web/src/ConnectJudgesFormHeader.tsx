import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./components/ui.js";
import type { ProviderConnectJudgeFormProps } from "./connectJudgesShared.js";

interface ConnectJudgesFormHeaderProps extends ProviderConnectJudgeFormProps {
  readonly disabled: boolean;
  readonly icon?: ReactNode;
  readonly title: string;
}

export function ConnectJudgesFormHeader({
  disabled,
  icon,
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
        {icon}
        {title}
      </div>
    </div>
  );
}
