import { APP_LOCALES } from "@icpc-trainer/shared";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "../locales/en/index.js";
import { es } from "../locales/es/index.js";
import { resolveInitialLocale } from "./storage.js";

export const initialLocale = resolveInitialLocale();

void i18n.use(initReactI18next).init({
  lng: initialLocale,
  fallbackLng: APP_LOCALES.English,
  supportedLngs: [APP_LOCALES.English, APP_LOCALES.Spanish],
  defaultNS: "common",
  interpolation: { escapeValue: false },
  resources: {
    en,
    es
  }
});

document.documentElement.lang = initialLocale;

export { i18n };
