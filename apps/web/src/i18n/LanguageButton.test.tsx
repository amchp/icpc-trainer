import { APP_LOCALES } from "@icpc-trainer/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { i18n } from "./i18n.js";
import { LanguageButton } from "./LanguageButton.js";
import { LocaleProvider } from "./LocaleProvider.js";

describe("LanguageButton", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage(APP_LOCALES.English);
    document.documentElement.lang = APP_LOCALES.English;
  });

  afterEach(cleanup);

  it("shows the selected language and switches from the dropdown", () => {
    render(<LocaleProvider><LanguageButton /></LocaleProvider>);

    const language = screen.getByRole("combobox", { name: "Choose language" });
    expect(language).toHaveValue(APP_LOCALES.English);
    expect(language).toHaveDisplayValue("🇺🇸");

    fireEvent.change(language, { target: { value: APP_LOCALES.Spanish } });

    expect(screen.getByRole("combobox", { name: "Elegir idioma" })).toHaveDisplayValue("🇪🇸");
    expect(document.documentElement.lang).toBe(APP_LOCALES.Spanish);
    expect(window.localStorage.getItem("icpc-trainer.locale.pending")).toBe(APP_LOCALES.Spanish);
  });

  it("can fill a compact-menu row", () => {
    render(<LocaleProvider><LanguageButton fullWidth /></LocaleProvider>);

    expect(screen.getByRole("combobox", { name: "Choose language" })).toHaveClass("w-full");
  });
});
