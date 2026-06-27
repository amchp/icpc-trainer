import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Card } from "./components/ui.js";

const qojTutorialSteps = [
  {
    title: "Open QOJ and inspect the page",
    description: "Sign in to QOJ with the account you want to sync. Right-click the page and choose Inspect.",
    image: "/tutorials/qoj/open-inspect.png",
    imageAlt: "QOJ home page with the browser context menu open on Inspect"
  },
  {
    title: "Switch to Application",
    description: "In Chrome DevTools, select the Application tab from the top toolbar.",
    image: "/tutorials/qoj/devtools-open.png",
    imageAlt: "Chrome DevTools open with the Application tab available"
  },
  {
    title: "Open the QOJ cookies",
    description: "In Storage, expand Cookies and select https://qoj.ac.",
    image: "/tutorials/qoj/application-storage.png",
    imageAlt: "Chrome DevTools Application panel with Cookies selected in the Storage sidebar"
  },
  {
    title: "Copy the cookie values",
    description: "Copy the Value column for the QOJ cookie rows into the matching fields in ICPC Trainer.",
    image: "/tutorials/qoj/cookie-values-redacted.png",
    imageAlt: "Chrome DevTools cookie table for QOJ with credential values redacted"
  }
] as const;

export function QojConnectJudgeTutorialPage(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-8 text-zinc-100 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="min-w-0">
          <Link
            to="/connect-judges/$provider"
            params={{ provider: "qoj" }}
            className="-ml-3 mb-3 inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            QOJ connect
          </Link>
          <h1 className="text-2xl font-semibold tracking-normal">Create a QOJ cookie credential</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Use Chrome DevTools to copy your QOJ session cookie fields into ICPC Trainer.
          </p>
        </div>
        <a
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-zinc-800 px-3 text-sm font-medium text-zinc-300 transition-colors hover:border-blue-500/70 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          href="https://qoj.ac"
          target="_blank"
          rel="noreferrer"
        >
          Open QOJ
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </header>

      <section className="grid gap-5">
        {qojTutorialSteps.map((step, index) => (
          <Card key={step.title} className="overflow-hidden">
            <div className="grid gap-4 p-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
              <div className="min-w-0">
                <div className="mb-3 inline-flex size-8 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-sm font-semibold text-blue-300">
                  {index + 1}
                </div>
                <h2 className="text-base font-semibold tracking-normal text-zinc-100">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{step.description}</p>
              </div>
              <img
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 object-cover"
                src={step.image}
                alt={step.imageAlt}
                loading={index === 0 ? "eager" : "lazy"}
              />
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}
