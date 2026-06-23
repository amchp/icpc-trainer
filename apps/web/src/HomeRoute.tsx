import { useConnectedJudges } from "./ConnectedJudgesContext.js";

export function HomeRoute(): React.JSX.Element {
  const { hasConnectedJudge, status } = useConnectedJudges();

  if (status !== "ready" || !hasConnectedJudge) {
    return <main className="min-h-screen bg-zinc-950" />;
  }

  return <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8" />;
}
