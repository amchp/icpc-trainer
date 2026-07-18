import { APP_LOCALES } from "@icpc-trainer/shared";
import { useTranslation } from "react-i18next";

import { Button } from "../components/ui.js";
import { peerLocale, useLocale } from "./LocaleProvider.js";

interface LanguageButtonProps {
  readonly className?: string;
  readonly fullWidth?: boolean;
}

export function LanguageButton({ className, fullWidth = false }: LanguageButtonProps): React.JSX.Element {
  const { t } = useTranslation("common");
  const { locale, selectLocale } = useLocale();
  const targetLocale = peerLocale(locale);
  const targetFlag = targetLocale === APP_LOCALES.English ? "🇺🇸" : "🇪🇸";
  const actionLabel = targetLocale === APP_LOCALES.English
    ? t("locale.switchToEnglish")
    : t("locale.switchToSpanish");

  return (
    <div className={`${className ?? "relative"} ${fullWidth ? "w-full" : ""}`}>
      <Button
        type="button"
        variant="secondary"
        aria-label={actionLabel}
        className={`locale-switch ${fullWidth ? "w-full justify-start" : ""}`}
        onClick={() => selectLocale(targetLocale)}
      >
        <span className="text-base leading-none" aria-hidden="true">{targetFlag}</span>
      </Button>
    </div>
  );
}
