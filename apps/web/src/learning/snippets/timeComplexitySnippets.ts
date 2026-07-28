import { timeComplexityEnglishSnippets } from "./timeComplexitySnippets.en.js";
import { timeComplexitySpanishSnippets } from "./timeComplexitySnippets.es.js";
import type { TimeComplexitySnippets } from "./timeComplexitySnippets.types.js";

export function getTimeComplexitySnippets(language: string): TimeComplexitySnippets {
  return language.toLowerCase().startsWith("es")
    ? timeComplexitySpanishSnippets
    : timeComplexityEnglishSnippets;
}
