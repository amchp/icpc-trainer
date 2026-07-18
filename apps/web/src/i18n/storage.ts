import { APP_LOCALES, isAppLocale, type AppLocale } from "@icpc-trainer/shared";

export const LOCALE_STORAGE_KEY = "icpc-trainer.locale";
export const PENDING_LOCALE_STORAGE_KEY = "icpc-trainer.locale.pending";
export const PENDING_LOCALE_OWNER_STORAGE_KEY = "icpc-trainer.locale.pendingOwner";

const storedLocale = (key: string): AppLocale | null => {
  try {
    const value = window.localStorage.getItem(key);
    return value !== null && isAppLocale(value) ? value : null;
  } catch {
    return null;
  }
};

export const getPendingLocale = (): AppLocale | null => storedLocale(PENDING_LOCALE_STORAGE_KEY);

const getPendingLocaleOwner = (): string | null => {
  try {
    return window.localStorage.getItem(PENDING_LOCALE_OWNER_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const getPendingLocaleForUser = (userId: string): AppLocale | null => {
  const pending = getPendingLocale();
  const owner = getPendingLocaleOwner();
  return pending !== null && (owner === null || owner === userId) ? pending : null;
};

export const claimPendingLocale = (userId: string, locale: AppLocale): void => {
  if (getPendingLocale() !== locale) return;
  try {
    window.localStorage.setItem(PENDING_LOCALE_OWNER_STORAGE_KEY, userId);
  } catch {
    // The in-memory coordinator still keeps the current user's write isolated.
  }
};

export const resolveInitialLocale = (): AppLocale => {
  const pending = getPendingLocale();
  if (pending !== null) return pending;
  const mirrored = storedLocale(LOCALE_STORAGE_KEY);
  if (mirrored !== null) return mirrored;
  return navigator.languages.some((language) => language.toLowerCase().startsWith("es"))
    ? APP_LOCALES.Spanish
    : APP_LOCALES.English;
};

export const mirrorLocale = (locale: AppLocale): void => {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
};

export const markLocalePending = (locale: AppLocale): void => {
  mirrorLocale(locale);
  try {
    window.localStorage.setItem(PENDING_LOCALE_STORAGE_KEY, locale);
    window.localStorage.removeItem(PENDING_LOCALE_OWNER_STORAGE_KEY);
  } catch {
    // The in-memory selection still applies for this session.
  }
};

export const clearPendingLocale = (): void => {
  try {
    window.localStorage.removeItem(PENDING_LOCALE_STORAGE_KEY);
    window.localStorage.removeItem(PENDING_LOCALE_OWNER_STORAGE_KEY);
  } catch {
    // Nothing else is required when storage is unavailable.
  }
};
