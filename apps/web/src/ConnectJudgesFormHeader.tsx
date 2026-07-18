import { ArrowLeft, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

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
  tutorialUrl,
  title
}: ConnectJudgesFormHeaderProps): React.JSX.Element {
  const { t } = useTranslation("judges");
  const tutorialIsExternal = tutorialUrl?.startsWith("http://") === true ||
    tutorialUrl?.startsWith("https://") === true;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          className="size-9 shrink-0 p-0"
          disabled={disabled}
          aria-label={t("back")}
          onClick={onChangeProvider}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Button>
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-100">
          {icon}
          <span className="truncate">{title}</span>
        </div>
      </div>
      {tutorialUrl === undefined ? null : (
        <a
          className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md border border-zinc-800 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-blue-500/70 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          href={tutorialUrl}
          target={tutorialIsExternal ? "_blank" : undefined}
          rel={tutorialIsExternal ? "noreferrer" : undefined}
          aria-label={t("tutorialLabel", { judge: title })}
        >
          {t("tutorial")}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
