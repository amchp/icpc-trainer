import { ConnectJudgesProviderSelection } from "./ConnectJudgesProviderSelection.js";

export function ConnectJudgesPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8 text-zinc-100 sm:px-8">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Connect Judges</h1>
        </div>

        <ConnectJudgesProviderSelection />
      </section>
    </main>
  );
}
