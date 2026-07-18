import { APP_LOCALES, type AppLocale } from "@icpc-trainer/shared";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { i18n, initialLocale } from "./i18n.js";
import { markLocalePending, mirrorLocale } from "./storage.js";

interface LocaleContextValue {
  readonly locale: AppLocale;
  readonly selectLocale: (locale: AppLocale) => void;
  readonly applyAccountLocale: (locale: AppLocale) => void;
}

const applyFallbackLocale = (locale: AppLocale, pending: boolean): void => {
  document.documentElement.lang = locale;
  if (pending) markLocalePending(locale);
  else mirrorLocale(locale);
  void i18n.changeLanguage(locale);
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: initialLocale,
  selectLocale: (locale) => applyFallbackLocale(locale, true),
  applyAccountLocale: (locale) => applyFallbackLocale(locale, false)
});

export function LocaleProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const [locale, setLocale] = useState<AppLocale>(initialLocale);

  const apply = useCallback((nextLocale: AppLocale, pending: boolean) => {
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    if (pending) markLocalePending(nextLocale);
    else mirrorLocale(nextLocale);
    void i18n.changeLanguage(nextLocale);
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    selectLocale: (nextLocale) => apply(nextLocale, true),
    applyAccountLocale: (nextLocale) => apply(nextLocale, false)
  }), [apply, locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = (): LocaleContextValue => {
  return useContext(LocaleContext);
};

export const peerLocale = (locale: AppLocale): AppLocale =>
  locale === APP_LOCALES.English ? APP_LOCALES.Spanish : APP_LOCALES.English;
