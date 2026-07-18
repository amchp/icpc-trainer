import type { AppLocale } from "@icpc-trainer/shared";

export const formatNumber = (value: number, locale: AppLocale): string =>
  new Intl.NumberFormat(locale).format(value);

export const formatPercent = (value: number, locale: AppLocale): string =>
  new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(value / 100);

export const formatDate = (value: Date | string, locale: AppLocale): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(typeof value === "string" ? new Date(value) : value);

export const compareText = (left: string, right: string, locale: AppLocale): number =>
  new Intl.Collator(locale, { sensitivity: "base", numeric: true }).compare(left, right);
