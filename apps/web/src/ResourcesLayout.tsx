import { Outlet } from "@tanstack/react-router";

import { AppHeader } from "./AppHeader.js";

export function ResourcesLayout(): React.JSX.Element {
  return (
    <div className="min-h-screen text-zinc-100">
      <AppHeader />
      <Outlet />
    </div>
  );
}
