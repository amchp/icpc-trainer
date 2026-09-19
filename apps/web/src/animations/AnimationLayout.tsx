import { Outlet, useLocation } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { AppHeader } from "../AppHeader.js";

const PresentationContext = createContext<{
  presenting: boolean;
  setPresenting: (value: boolean) => void;
} | null>(null);

export function AnimationPresentationProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const [presenting, setPresenting] = useState(false);
  return <PresentationContext.Provider value={{ presenting, setPresenting }}>{children}</PresentationContext.Provider>;
}

export function useAnimationPresentation() {
  const context = useContext(PresentationContext);
  if (!context) throw new Error("Animation workspaces require AnimationPresentationProvider.");
  return context;
}

function AnimationShell(): React.JSX.Element {
  const { presenting, setPresenting } = useAnimationPresentation();
  const pathname = useLocation({ select: (location) => location.pathname });
  useEffect(() => setPresenting(false), [pathname, setPresenting]);

  return (
    <div className="min-h-screen text-zinc-100">
      <div hidden={presenting} data-animation-navigation><AppHeader /></div>
      <Outlet />
    </div>
  );
}

export function AnimationLayout(): React.JSX.Element {
  return <AnimationPresentationProvider><AnimationShell /></AnimationPresentationProvider>;
}
