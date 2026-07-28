import { bruteForceSnippetsEn } from "./bruteForceSnippets.en.js";
import { bruteForceSnippetsEs } from "./bruteForceSnippets.es.js";
import type { BruteForceSnippets } from "./bruteForceSnippets.types.js";

export function getBruteForceSnippets(language: string): BruteForceSnippets {
  return language.toLowerCase().startsWith("es") ? bruteForceSnippetsEs : bruteForceSnippetsEn;
}
