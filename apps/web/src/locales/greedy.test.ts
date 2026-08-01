import { describe, expect, it } from "vitest";

import { greedy as en } from "./en/greedy.js";
import { greedy as es } from "./es/greedy.js";

function keyShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(keyShape);
  if (typeof value !== "object" || value === null) return typeof value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, keyShape(child)]));
}

function strings(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (typeof value !== "object" || value === null) return [];
  return Object.values(value).flatMap(strings);
}

function parameters(value: string): readonly string[] {
  return [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] ?? "").sort();
}

describe("Greedy Algorithms locale catalogs", () => {
  it("keeps English and Spanish structurally equal with matching interpolation names", () => {
    expect(keyShape(es)).toEqual(keyShape(en));
    const enStrings = strings(en);
    const esStrings = strings(es);
    expect(esStrings).toHaveLength(enStrings.length);
    for (const [index, value] of enStrings.entries()) expect(parameters(esStrings[index] ?? "")).toEqual(parameters(value));
    expect(enStrings.every((value) => value.length > 0)).toBe(true);
    expect(esStrings.every((value) => value.length > 0)).toBe(true);
  });

  it("pins the decided bilingual product copy", () => {
    expect(en).toMatchObject({ eyebrow: "Greedy Algorithms", title: "Choose. Justify. Verify." });
    expect(es).toMatchObject({ eyebrow: "Algoritmos voraces", title: "Elige. Justifica. Verifica." });
    expect(en.challenge).toMatchObject({ problemStage: "Problem", toolStage: "Tool", applicationStage: "Problem connection", reveal: "Learn the tool", applicationReveal: "Show the problem connection" });
    expect(es.challenge).toMatchObject({ problemStage: "Problema", toolStage: "Herramienta", applicationStage: "Conexión con el problema", reveal: "Aprender la herramienta", applicationReveal: "Mostrar la conexión con el problema" });
  });

  it("keeps Spanish terminology canonical and both guides code-free", () => {
    expect(JSON.stringify(es)).not.toMatch(/greedy/i);
    const banned = [/int /, /for \(/, /while \(/, /#include/, /vector</, /->/, /::/, /return /, /\{\}/];
    for (const catalog of [en, es]) for (const pattern of banned) expect(JSON.stringify(catalog)).not.toMatch(pattern);
  });

  it("keeps start, intermediate, and terminal narration explicit for every animation", () => {
    const englishFrames = [
      [en.recognize.recipeNarration.state, en.recognize.recipeNarration.rule, en.recognize.recipeNarration.safety],
      [en.coins.narration.consider, en.coins.narration.take, en.coins.narration.done],
      [en.fails.narration.start, en.fails.narration.step, en.fails.narration.done],
      [en.activities.narration.sort, en.activities.narration.take, en.activities.narration.done],
      [en.twins.narration.sort, en.twins.narration.takeEnough, en.twins.narration.done],
      [en.chat.narration.scanMatch, en.chat.narration.match, en.chat.narration.accepted],
      [en.alternating.narration.open, en.alternating.narration.replace, en.alternating.narration.done]
    ];
    const spanishFrames = [
      [es.recognize.recipeNarration.state, es.recognize.recipeNarration.rule, es.recognize.recipeNarration.safety],
      [es.coins.narration.consider, es.coins.narration.take, es.coins.narration.done],
      [es.fails.narration.start, es.fails.narration.step, es.fails.narration.done],
      [es.activities.narration.sort, es.activities.narration.take, es.activities.narration.done],
      [es.twins.narration.sort, es.twins.narration.takeEnough, es.twins.narration.done],
      [es.chat.narration.scanMatch, es.chat.narration.match, es.chat.narration.accepted],
      [es.alternating.narration.open, es.alternating.narration.replace, es.alternating.narration.done]
    ];
    for (const frames of englishFrames) {
      expect(frames).toHaveLength(3);
      for (const narration of frames) {
        expect(narration).toMatch(/[.;]$/);
        expect(narration).toMatch(/state|remainder|lane|schedule|total|block/i);
        expect(narration).toMatch(/choice|coin|activity|character|candidate|value/i);
        expect(narration).toMatch(/because|so |only because/i);
      }
    }
    for (const frames of spanishFrames) {
      expect(frames).toHaveLength(3);
      for (const narration of frames) {
        expect(narration).toMatch(/[.;]$/);
        expect(narration).toMatch(/estado|restante|carril|horario|total|bloque/i);
        expect(narration).toMatch(/elecci[oó]n|opci[oó]n|elige|moneda|actividad|car[aá]cter|candidato|valor/i);
        expect(narration).toMatch(/porque|as[ií] que/i);
      }
    }
  });
});
