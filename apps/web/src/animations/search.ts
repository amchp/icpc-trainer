import { animations as en } from "../locales/en/animations.js";
import { animations as es } from "../locales/es/animations.js";
import { ANIMATION_TOPICS, type AnimationGroup, type AnimationTopic } from "./catalog.js";

export type AnimationSearch = { q?: string; topic?: AnimationTopic };

export function validateAnimationSearch(raw: Record<string, unknown>): AnimationSearch {
  const q = typeof raw.q === "string" ? raw.q.trim().slice(0, 200).trimEnd() : "";
  const topic = typeof raw.topic === "string" && ANIMATION_TOPICS.some((value) => value === raw.topic)
    ? raw.topic as AnimationTopic
    : undefined;
  return { ...(q ? { q } : {}), ...(topic ? { topic } : {}) };
}

export function normalizeAnimationSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function searchableText(group: AnimationGroup): string {
  const text: string[] = [group.id, group.topic, ...group.aliases.en, ...group.aliases.es];
  for (const catalog of [en, es]) {
    const copy = catalog.groups[group.id];
    text.push(copy.title, copy.description, catalog.topics[group.topic]);
    for (const tool of group.tools) {
      const toolCopy = catalog.tools[tool.id];
      text.push(tool.id, toolCopy.title, toolCopy.description, ...tool.aliases.en, ...tool.aliases.es);
    }
  }
  return normalizeAnimationSearch(text.join(" "));
}

/** Every token may match any group/member field, in either supported language. */
export function searchAnimations(
  groups: readonly AnimationGroup[],
  query: string,
  topic: AnimationTopic | undefined,
  locale: string,
): AnimationGroup[] {
  const tokens = normalizeAnimationSearch(query).split(" ").filter(Boolean);
  const catalog = locale.toLowerCase().startsWith("es") ? es : en;
  const collator = new Intl.Collator(catalog === es ? "es" : "en");
  const seen = new Set<string>();
  return groups.filter((group) => {
    if (seen.has(group.id) || (topic && group.topic !== topic)) return false;
    const text = searchableText(group);
    if (!tokens.every((token) => text.includes(token))) return false;
    seen.add(group.id);
    return true;
  }).sort((a, b) => collator.compare(catalog.groups[a.id].title, catalog.groups[b.id].title)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
