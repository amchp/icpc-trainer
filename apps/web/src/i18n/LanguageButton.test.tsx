import { APP_LOCALES } from "@icpc-trainer/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { i18n } from "./i18n.js";
import { LanguageButton } from "./LanguageButton.js";
import { LocaleProvider } from "./LocaleProvider.js";

describe("LanguageButton", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage(APP_LOCALES.English);
    document.documentElement.lang = APP_LOCALES.English;
  });

  it("switches directly to the visibly named peer language", () => {
    render(<LocaleProvider><LanguageButton /></LocaleProvider>);

    const spanishButton = screen.getByRole("button", { name: "Switch language to Spanish" });
    expect(spanishButton).toHaveTextContent("🇪🇸");
    expect(spanishButton).not.toHaveTextContent("Español");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(spanishButton);

    const englishButton = screen.getByRole("button", { name: "Cambiar idioma a inglés" });
    expect(englishButton).toHaveTextContent("🇺🇸");
    expect(englishButton).not.toHaveTextContent("English");
    expect(document.documentElement.lang).toBe(APP_LOCALES.Spanish);
    expect(window.localStorage.getItem("icpc-trainer.locale.pending")).toBe(APP_LOCALES.Spanish);
  });

  it("can fill a compact-menu row without changing its direct action", () => {
    render(<LocaleProvider><LanguageButton fullWidth /></LocaleProvider>);

    expect(screen.getByRole("button", { name: "Switch language to Spanish" })).toHaveClass("w-full", "justify-start");
  });
});
