import { PlaygroundPanel } from "./PlaygroundPanel.js";

export function PlaygroundPage(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <PlaygroundPanel />
    </main>
  );
}
