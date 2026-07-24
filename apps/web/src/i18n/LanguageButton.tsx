import { APP_LOCALES } from "@icpc-trainer/shared";
import { useTranslation } from "react-i18next";

import { useLocale } from "./LocaleProvider.js";

interface LanguageButtonProps {
  readonly className?: string;
  readonly fullWidth?: boolean;
}

export function LanguageButton({ className, fullWidth = false }: LanguageButtonProps): React.JSX.Element {
  const { t } = useTranslation("common");
  const { locale, selectLocale } = useLocale();

  return (
    <div className={`${className ?? "relative"} ${fullWidth ? "w-full" : ""}`}>
      <select
        aria-label={t("locale.menuLabel")}
        value={locale}
        className={`h-9 cursor-pointer rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-base text-zinc-200 shadow-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${fullWidth ? "w-full" : ""}`}
        onChange={(event) => selectLocale(event.target.value === APP_LOCALES.Spanish ? APP_LOCALES.Spanish : APP_LOCALES.English)}
      >
        <option value={APP_LOCALES.English} aria-label={t("locale.english")}>🇺🇸</option>
        <option value={APP_LOCALES.Spanish} aria-label={t("locale.spanish")}>🇪🇸</option>
      </select>
    </div>
  );
}
