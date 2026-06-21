import { APP_NAME } from "@icpc-trainer/shared";
import { Database, Monitor, Route } from "lucide-react";

import { HealthPanel } from "./HealthPanel.js";
import { StarterTable } from "./StarterTable.js";

const capabilities = [
  { icon: Route, label: "TanStack Router" },
  { icon: Database, label: "Drizzle SQLite" },
  { icon: Monitor, label: "Electron wrapper" }
];

export function HomeRoute(): React.JSX.Element {
  return (
    <main className="min-h-screen px-5 py-5 text-zinc-100 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-normal">{APP_NAME}</h1>
            <p className="mt-1 text-sm text-zinc-500">Local-first starter base.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <span
                  key={capability.label}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-400"
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {capability.label}
                </span>
              );
            })}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <HealthPanel />
          <StarterTable />
        </section>
      </div>
    </main>
  );
}
