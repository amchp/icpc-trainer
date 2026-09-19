import "../i18n/registerAnimationResources.js";

import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowUpRight, Search, Shapes } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { appPaths } from "../appNavigation.js";
import { Button, Input, Select } from "../components/ui.js";
import { animationGroups, ANIMATION_TOPICS } from "./catalog.js";
import { searchAnimations, validateAnimationSearch } from "./search.js";

type AnimationSearch = ReturnType<typeof validateAnimationSearch>;

export function AnimationLibraryPage({ search, onSearchChange }: {
  readonly search: AnimationSearch;
  readonly onSearchChange: (search: AnimationSearch) => void;
}): React.JSX.Element {
  const { t, i18n } = useTranslation("animations");
  // Keep trailing spaces while typing; the URL uses the canonical trimmed query.
  const [query, setQuery] = useState(search.q ?? "");
  useEffect(() => setQuery((current) => current.trim().slice(0, 200) === (search.q ?? "") ? current : search.q ?? ""), [search.q]);
  const groups = searchAnimations(animationGroups, search.q ?? "", search.topic, i18n.resolvedLanguage ?? i18n.language);
  const reset = (): void => { setQuery(""); onSearchChange({}); };

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="max-w-3xl">
        <Shapes className="mb-4 size-7 text-blue-300" aria-hidden="true" />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("libraryTitle")}</h1>
        <p className="mt-3 text-base leading-7 text-zinc-400">{t("subtitle")}</p>
      </header>
      <div className="mt-8 grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <label className="min-w-0 text-sm font-medium text-zinc-300">
          {t("searchLabel")}
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-zinc-500" aria-hidden="true" />
            <Input type="search" value={query} maxLength={200} placeholder={t("searchPlaceholder")} className="pl-9" onChange={(event) => {
              setQuery(event.target.value);
              onSearchChange(validateAnimationSearch({ ...search, q: event.target.value }));
            }} />
          </div>
        </label>
        <label className="text-sm font-medium text-zinc-300">
          {t("topicLabel")}
          <Select className="mt-2" value={search.topic ?? ""} onChange={(event) => onSearchChange(validateAnimationSearch({ ...search, topic: event.target.value }))}>
            <option value="">{t("allTopics")}</option>
            {ANIMATION_TOPICS.map((topic) => <option key={topic} value={topic}>{t(`topics.${topic}`)}</option>)}
          </Select>
        </label>
      </div>
      <p role="status" className="mb-5 mt-5 text-sm text-zinc-500">{t("resultCount", { count: groups.length })}</p>
      {groups.length === 0 ? (
        <section className="rounded-lg border border-dashed border-zinc-700 px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">{t("emptyTitle")}</h2>
          <p className="mb-5 mt-2 text-sm text-zinc-400">{t("emptyDescription")}</p>
          <Button variant="secondary" onClick={reset}>{t("reset")}</Button>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} to="/animations/$groupId" params={{ groupId: group.id }} search={search} data-animation-card={group.id}
              className="group flex min-w-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 outline-none transition-colors hover:border-blue-400/50 hover:bg-zinc-900/60 focus-visible:ring-2 focus-visible:ring-blue-400 sm:p-6">
              <p className="text-xs font-medium text-blue-300">{t(`topics.${group.topic}`)}</p>
              <div className="mt-3 flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-100">{t(group.titleKey)}</h2>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-zinc-500 transition-colors group-hover:text-blue-300" aria-hidden="true" />
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{t(group.descriptionKey)}</p>
              <ul className="mb-5 mt-4 space-y-1.5 text-sm text-zinc-300">
                {group.tools.map((tool) => <li key={tool.id} className="flex gap-2"><span aria-hidden="true" className="text-zinc-600">·</span>{t(tool.titleKey)}</li>)}
              </ul>
              <span className="mt-auto border-t border-zinc-800 pt-4 text-xs text-zinc-500">{t("memberCount", { count: group.tools.length })}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export function AnimationLibraryRoute(): React.JSX.Element {
  const rawSearch = useSearch({ strict: false });
  const navigate = useNavigate();
  return <AnimationLibraryPage search={validateAnimationSearch(rawSearch)} onSearchChange={(search) => {
    void navigate({ to: appPaths.animations, search, replace: true });
  }} />;
}
