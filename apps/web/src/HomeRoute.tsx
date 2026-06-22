import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppHeader } from "./AppHeader.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";

export function HomeRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const { hasConnectedJudge, status } = useConnectedJudges();

  useEffect(() => {
    if (status === "ready" && !hasConnectedJudge) {
      void navigate({ to: "/connect-judges" });
    }
    if (status === "error") {
      void navigate({ to: "/connect-judges" });
    }
  }, [hasConnectedJudge, navigate, status]);

  if (status !== "ready" || !hasConnectedJudge) {
    return <main className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="min-h-screen text-zinc-100">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8" />
    </div>
  );
}
