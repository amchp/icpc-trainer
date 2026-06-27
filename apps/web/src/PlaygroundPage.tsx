import { PlaygroundPanel } from "./PlaygroundPanel.js";

export function PlaygroundPage(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Playground</h1>
          <p className="mt-1 text-sm text-zinc-500">Run judge API calls for debugging</p>
        </div>
      </section>

      <PlaygroundPanel />
    </main>
  );
}
