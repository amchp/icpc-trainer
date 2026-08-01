import { graphTheorySnippetsEn } from "./graphTheorySnippets.en.js";
import { graphTheorySnippetsEs } from "./graphTheorySnippets.es.js";
import type { GraphTheorySnippets } from "./graphTheorySnippets.types.js";

export function getGraphTheorySnippets(language: string): GraphTheorySnippets {
  return language.toLowerCase().startsWith("es") ? graphTheorySnippetsEs : graphTheorySnippetsEn;
}
