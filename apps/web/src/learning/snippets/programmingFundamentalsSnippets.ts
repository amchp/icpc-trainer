import { programmingFundamentalsEnglishSnippets } from "./programmingFundamentalsSnippets.en.js";
import { programmingFundamentalsSpanishSnippets } from "./programmingFundamentalsSnippets.es.js";
import type { ProgrammingFundamentalsSnippets } from "./programmingFundamentalsSnippets.types.js";

export function getProgrammingFundamentalsSnippets(language: string): ProgrammingFundamentalsSnippets {
  return language.toLowerCase().startsWith("es")
    ? programmingFundamentalsSpanishSnippets
    : programmingFundamentalsEnglishSnippets;
}
