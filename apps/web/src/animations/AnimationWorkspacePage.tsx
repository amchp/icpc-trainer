import "../i18n/registerAnimationResources.js";

import { Link, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Copy, Expand, Minimize } from "lucide-react";
import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "../appNavigation.js";
import { Button, Input } from "../components/ui.js";
import { cn } from "../lib.js";
import { useAnimationPresentation } from "./AnimationLayout.js";
import { animationGroups, getAnimationGroup } from "./catalog.js";
import { animationLoaders } from "./loaders.js";
import { validateAnimationSearch } from "./search.js";

const groupPlayers = new Map(animationGroups.map((group) => [group.id, lazy(animationLoaders[group.id])]));

export class AnimationErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  override render(): ReactNode { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function AnimationWorkspacePage({ groupId, search }: {
  readonly groupId: string;
  readonly search: ReturnType<typeof validateAnimationSearch>;
}): React.JSX.Element {
  const { t } = useTranslation("animations");
  const { presenting, setPresenting } = useAnimationPresentation();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const enterControl = useRef<HTMLSpanElement>(null);
  const exitControl = useRef<HTMLDivElement>(null);
  const group = getAnimationGroup(groupId);
  const Player = group ? groupPlayers.get(group.id) : undefined;
  const canonicalUrl = new URL(`${appPaths.animations}/${encodeURIComponent(groupId)}`, window.location.origin).href;
  const exitPresentation = useCallback(() => {
    setPresenting(false);
    requestAnimationFrame(() => enterControl.current?.querySelector("button")?.focus());
  }, [setPresenting]);

  useEffect(() => {
    if (!presenting) return;
    exitControl.current?.querySelector("button")?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") { event.preventDefault(); exitPresentation(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [presenting, exitPresentation]);

  const copyLink = async (): Promise<void> => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(canonicalUrl);
      setCopyState("copied");
    } catch { setCopyState("failed"); }
  };
  const linkClass = "inline-flex items-center gap-2 rounded text-sm font-medium text-zinc-400 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

  if (!group || !Player) return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-3xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="mb-6 mt-3 text-zinc-400">{t("notFoundDescription")}</p>
      <Link to={appPaths.animations} search={search} className={linkClass}><ArrowLeft className="size-4" aria-hidden="true" />{t("backToLibrary")}</Link>
    </main>
  );

  return (
    <main data-animation-workspace={group.id} data-presenting={presenting} className={cn("mx-auto w-full min-w-0 px-5 pb-16 sm:px-8", presenting ? "max-w-none" : "max-w-6xl")}>
      <div ref={exitControl} hidden={!presenting} className="sticky top-0 z-50 -mx-5 border-b border-zinc-800 bg-zinc-950/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <Button variant="secondary" onClick={exitPresentation}><Minimize className="size-4" aria-hidden="true" />{t("exitPresentation")}</Button>
      </div>
      <div hidden={presenting} className="pt-7">
        <Link to={appPaths.animations} search={search} className={linkClass}><ArrowLeft className="size-4" aria-hidden="true" />{t("backToLibrary")}</Link>
      </div>
      <header className="py-8 sm:py-10">
        <p className="text-xs font-medium text-blue-300">{t(`topics.${group.topic}`)}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t(group.titleKey)}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">{t(group.explanationKey)}</p>
        <div hidden={presenting}>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span ref={enterControl}><Button onClick={() => setPresenting(true)}><Expand className="size-4" aria-hidden="true" />{t("present")}</Button></span>
            <Button variant="secondary" onClick={() => void copyLink()}><Copy className="size-4" aria-hidden="true" />{t("copyLink")}</Button>
            <Link to={group.guidePath} className={cn(linkClass, "px-2 py-2")}>
              {t("fullGuide")}<ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div aria-live="polite" className="mt-3 text-sm text-zinc-400">
            {copyState === "copied" ? t("copied") : copyState === "failed" ? (
              <label className="grid max-w-2xl gap-2">{t("copyFailed")}<Input readOnly value={canonicalUrl} onFocus={(event) => event.target.select()} /></label>
            ) : null}
          </div>
        </div>
      </header>
      <AnimationErrorBoundary key={group.id} fallback={
        <section role="alert" className="rounded-lg border border-zinc-700 p-6">
          <h2 className="text-lg font-semibold">{t("errorTitle")}</h2>
          <p className="mb-4 mt-2 text-sm text-zinc-400">{t("errorDescription")}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>{t("reload")}</Button>
        </section>
      }>
        <Suspense fallback={<p role="status" className="py-10 text-zinc-400">{t("loading")}</p>}><Player /></Suspense>
      </AnimationErrorBoundary>
    </main>
  );
}

export function AnimationWorkspaceRoute(): React.JSX.Element {
  const { groupId = "" } = useParams({ strict: false });
  const search = useSearch({ strict: false });
  return <AnimationWorkspacePage key={groupId} groupId={groupId} search={validateAnimationSearch(search)} />;
}
