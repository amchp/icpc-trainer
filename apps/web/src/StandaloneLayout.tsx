import { Outlet } from "@tanstack/react-router";

import { LanguageButton } from "./i18n/LanguageButton.js";

export function StandaloneLayout(): React.JSX.Element {
  return (
    <div className="relative min-h-screen text-zinc-100">
      <LanguageButton className="absolute right-5 top-5 z-50 sm:right-8 sm:top-8" />
      <Outlet />
    </div>
  );
}
