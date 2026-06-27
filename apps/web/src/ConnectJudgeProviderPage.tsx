import type { PlaygroundProvider } from "@icpc-trainer/api";
import { useNavigate } from "@tanstack/react-router";

import { connectJudgeProviderById } from "./connectJudgeProviders.js";

export function ConnectJudgeProviderPage({
  provider
}: {
  readonly provider: PlaygroundProvider;
}): React.JSX.Element {
  const navigate = useNavigate();
  const config = connectJudgeProviderById.get(provider);

  if (config === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-8 text-zinc-100 sm:px-8" />
    );
  }

  const Form = config.Form;

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8 text-zinc-100 sm:px-8">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Connect Judges</h1>
          <p className="mt-1 text-sm text-zinc-500">Save credentials for syncing {config.name}</p>
        </div>

        <Form
          onChangeProvider={() => void navigate({ to: "/connect-judges" })}
          tutorialUrl={config.tutorialUrl}
        />
      </section>
    </main>
  );
}
