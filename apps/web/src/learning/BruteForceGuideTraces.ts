import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import "../i18n/registerBruteForceResources.js";
import { defineGuideTrace, type GuideTraceVisual } from "./BruteForceGuideTrace.js";
import { getBruteForceSnippets } from "./snippets/bruteForceSnippets.js";

type BruteForceT = TFunction<"bruteForce">;
type TreeNode = Extract<GuideTraceVisual, { readonly kind: "tree" }>["nodes"][number];

const permutationValues = ["ABC", "ACB", "BAC", "BCA", "CAB", "CBA"] as const;

export function useBruteForceGuideTraces() {
  const { t, i18n } = useTranslation("bruteForce");
  const language = i18n.resolvedLanguage ?? i18n.language;
  return useMemo(() => createBruteForceGuideTraces(t, language), [language, t]);
}

export function createBruteForceGuideTraces(t: BruteForceT, language = "en") {
  const snippets = getBruteForceSnippets(language);
  const candidatesLabel = t("traces.visuals.candidates");
  const treeLabel = t("traces.visuals.tree");
  const decisionsLabel = t("traces.visuals.decisions");
  const stackLabel = t("traces.visuals.stack");
  const permutationTree = buildPrefixTree(["A", "B", "C"]);
  const decisionTree = buildBinaryTree(3);

  const recursivePermutation = defineGuideTrace({
    code: snippets.recursivePermutation,
    language: "cpp",
    label: t("traces.permutationRecursive.label"),
    inputs: {},
    intervalMs: 450,
    build: (_inputs, recorder) => {
      const output: string[] = [];
      const completed: string[] = [];
      const items = ["A", "B", "C"];
      const used = [false, false, false];
      const stack: string[] = [];
      let current = "";

      const visuals = (active = current): GuideTraceVisual[] => [
        { kind: "vector", label: snippets.names.used, values: used },
        { kind: "callStack", label: stackLabel, frames: stack.map((value) => ({ label: `${snippets.names.permutationFunction}()`, detail: value === "" ? "∅" : value })), activeIndex: Math.max(0, stack.length - 1) },
        { kind: "output", label: candidatesLabel, lines: output },
        { kind: "tree", label: treeLabel, nodes: permutationTree, activeId: active === "" ? "root" : active, completedIds: completed }
      ];
      const frame = (line: number, narration: string, extra: { readonly i?: number } = {}): void => recorder.frame({
        line,
        narration,
        variables: [
          { name: snippets.names.current, typeLabel: "vector<char>", value: current === "" ? "∅" : current },
          ...(extra.i === undefined ? [] : [{ name: "i", typeLabel: "int", value: extra.i }])
        ],
        visuals: visuals()
      });

      recorder.frame({ line: 1, narration: t("traces.execution.initialize", { state: snippets.names.current }), visuals: [{ kind: "tree", label: treeLabel, nodes: permutationTree, activeId: "root", completedIds: [] }] });
      recorder.frame({ line: 2, narration: t("traces.execution.initialize", { state: snippets.names.used }), visuals: [{ kind: "vector", label: snippets.names.used, values: used }, { kind: "tree", label: treeLabel, nodes: permutationTree, activeId: "root", completedIds: [] }] });

      const generate = (): void => {
        stack.push(current);
        frame(4, t("traces.execution.enter", { state: current === "" ? "∅" : current }));
        frame(5, t("traces.execution.baseCheck", { result: String(current.length === items.length) }));
        if (current.length === items.length) {
          output.push(current);
          completed.push(current);
          frame(6, t("traces.execution.visit", { state: current }));
          frame(7, t("traces.execution.return"));
          stack.pop();
          return;
        }
        for (let i = 0; i < items.length; i += 1) {
          frame(9, t("traces.execution.loop", { index: i, value: items[i]! }), { i });
          frame(10, t("traces.execution.usedCheck", { value: items[i]!, result: String(used[i]!) }), { i });
          if (used[i]) continue;
          used[i] = true;
          frame(11, t("traces.execution.mark", { value: items[i]! }), { i });
          current += items[i];
          frame(12, t("traces.execution.push", { value: items[i]!, state: current }), { i });
          frame(13, t("traces.execution.descend", { state: current }), { i });
          generate();
          const removed = current.at(-1)!;
          current = current.slice(0, -1);
          frame(14, t("traces.execution.pop", { value: removed, state: current === "" ? "∅" : current }), { i });
          used[i] = false;
          frame(15, t("traces.execution.unmark", { value: items[i]! }), { i });
        }
        stack.pop();
      };

      generate();
      recorder.frame({
        line: 17,
        narration: t("traces.execution.finished", { count: output.length }),
        variables: [{ name: snippets.names.current, typeLabel: "vector<char>", value: "∅" }],
        visuals: [
          { kind: "output", label: candidatesLabel, lines: output },
          { kind: "tree", label: treeLabel, nodes: permutationTree, activeId: "root", completedIds: completed }
        ]
      });
    }
  });

  const iterativePermutation = defineGuideTrace({
    code: snippets.iterativePermutation,
    language: "cpp",
    label: t("traces.permutationIterative.label"),
    inputs: {},
    intervalMs: 700,
    build: (_inputs, recorder) => {
      const output: string[] = [];
      recorder.frame({ line: 1, narration: t("traces.permutationIterative.sort"), variables: [{ name: snippets.names.order, typeLabel: "string", value: "ABC" }] });
      for (const [index, order] of permutationValues.entries()) {
        recorder.frame({ line: 2, narration: t("traces.permutationIterative.loop", { order }), variables: [{ name: snippets.names.order, typeLabel: "string", value: order }], visuals: [{ kind: "output", label: candidatesLabel, lines: output }] });
        output.push(order);
        recorder.frame({ line: 3, narration: t("traces.execution.visit", { state: order }), variables: [{ name: snippets.names.order, typeLabel: "string", value: order }], visuals: [{ kind: "output", label: candidatesLabel, lines: output }] });
        recorder.frame({
          line: 4,
          narration: index === permutationValues.length - 1
            ? t("traces.permutationIterative.end", { order })
            : t("traces.permutationIterative.next", { current: order, next: permutationValues[index + 1]! }),
          variables: [{ name: snippets.names.order, typeLabel: "string", value: permutationValues[index + 1] ?? order }],
          visuals: [{ kind: "output", label: candidatesLabel, lines: output }]
        });
      }
    }
  });

  const recursiveSubset = defineGuideTrace({
    code: snippets.recursiveSubset,
    language: "cpp",
    label: t("traces.subsetRecursive.label"),
    inputs: {},
    intervalMs: 500,
    build: (_inputs, recorder) => {
      const decisions: number[] = [];
      const output: string[] = [];
      const completed: string[] = [];
      const stack: number[] = [];
      const stateId = (): string => decisions.length === 0 ? "root" : decisions.join("");
      const visuals = (): GuideTraceVisual[] => [
        { kind: "vector", label: decisionsLabel, values: decisions },
        { kind: "callStack", label: stackLabel, frames: stack.map((index) => ({ label: `${snippets.names.subsetFunction}(${index})`, detail: decisions.slice(0, index).join("") || "∅" })), activeIndex: Math.max(0, stack.length - 1) },
        { kind: "output", label: candidatesLabel, lines: output },
        { kind: "tree", label: treeLabel, nodes: decisionTree, activeId: stateId(), completedIds: completed }
      ];
      const frame = (line: number, narration: string, index: number): void => recorder.frame({
        line,
        narration,
        variables: [
          { name: snippets.names.index, typeLabel: "int", value: index },
          { name: snippets.names.decisions, typeLabel: "vector<int>", value: decisions.join("") || "∅" }
        ],
        visuals: visuals()
      });

      recorder.frame({ line: 1, narration: t("traces.execution.initialize", { state: snippets.names.decisions }), visuals: [{ kind: "tree", label: treeLabel, nodes: decisionTree, activeId: "root", completedIds: [] }] });
      const generate = (index: number): void => {
        stack.push(index);
        frame(3, t("traces.execution.enter", { state: decisions.join("") || "∅" }), index);
        frame(4, t("traces.execution.baseCheck", { result: String(index === 3) }), index);
        if (index === 3) {
          const candidate = decisions.join("");
          output.push(candidate);
          completed.push(candidate);
          frame(5, t("traces.execution.visit", { state: candidate }), index);
          frame(6, t("traces.execution.return"), index);
          stack.pop();
          return;
        }
        decisions.push(0);
        frame(8, t("traces.execution.push", { value: 0, state: decisions.join("") }), index);
        frame(9, t("traces.execution.descend", { state: decisions.join("") }), index);
        generate(index + 1);
        decisions.pop();
        frame(10, t("traces.execution.pop", { value: 0, state: decisions.join("") || "∅" }), index);
        decisions.push(1);
        frame(11, t("traces.execution.push", { value: 1, state: decisions.join("") }), index);
        frame(12, t("traces.execution.descend", { state: decisions.join("") }), index);
        generate(index + 1);
        decisions.pop();
        frame(13, t("traces.execution.pop", { value: 1, state: decisions.join("") || "∅" }), index);
        stack.pop();
      };
      generate(0);
      recorder.frame({ line: 14, narration: t("traces.execution.finished", { count: output.length }), visuals: [{ kind: "output", label: candidatesLabel, lines: output }, { kind: "tree", label: treeLabel, nodes: decisionTree, activeId: "root", completedIds: completed }] });
    }
  });

  const bitmaskSubset = defineGuideTrace({
    code: snippets.bitmaskSubset,
    language: "cpp",
    label: t("traces.subsetBitmask.label"),
    inputs: {},
    intervalMs: 500,
    build: (_inputs, recorder) => {
      const output: string[] = [];
      for (let mask = 0; mask < 8; mask += 1) {
        const decisions: number[] = [];
        recorder.frame({ line: 1, narration: t("traces.subsetBitmask.mask", { mask, binary: binary(mask) }), variables: [{ name: snippets.names.mask, typeLabel: "int", value: mask }], visuals: [{ kind: "output", label: candidatesLabel, lines: output }] });
        recorder.frame({ line: 2, narration: t("traces.execution.initialize", { state: snippets.names.decisions }), variables: [{ name: snippets.names.mask, typeLabel: "int", value: mask }], visuals: [{ kind: "vector", label: decisionsLabel, values: decisions }] });
        for (let bit = 2; bit >= 0; bit -= 1) {
          recorder.frame({ line: 3, narration: t("traces.subsetBitmask.bit", { bit }), variables: [{ name: "bit", typeLabel: "int", value: bit }, { name: snippets.names.mask, typeLabel: "int", value: mask }], visuals: [{ kind: "vector", label: decisionsLabel, values: decisions }] });
          decisions.push((mask & (1 << bit)) !== 0 ? 1 : 0);
          recorder.frame({ line: 4, narration: t("traces.subsetBitmask.read", { bit, value: decisions.at(-1)! }), variables: [{ name: "bit", typeLabel: "int", value: bit }, { name: snippets.names.mask, typeLabel: "int", value: mask }], visuals: [{ kind: "vector", label: decisionsLabel, values: decisions, activeIndex: decisions.length - 1 }] });
        }
        const candidate = decisions.join("");
        output.push(candidate);
        recorder.frame({ line: 6, narration: t("traces.execution.visit", { state: candidate }), variables: [{ name: snippets.names.mask, typeLabel: "int", value: mask }], visuals: [{ kind: "vector", label: decisionsLabel, values: decisions }, { kind: "output", label: candidatesLabel, lines: output }] });
      }
      recorder.frame({ line: 7, narration: t("traces.execution.finished", { count: output.length }), visuals: [{ kind: "output", label: candidatesLabel, lines: output }] });
    }
  });

  return { recursivePermutation, iterativePermutation, recursiveSubset, bitmaskSubset };
}

function buildPrefixTree(values: readonly string[]): readonly TreeNode[] {
  const nodes: TreeNode[] = [{ id: "root", label: "∅", depth: 0 }];
  const visit = (prefix: string, remaining: readonly string[]): void => {
    for (const value of remaining) {
      const id = `${prefix}${value}`;
      nodes.push({ id, label: id, parentId: prefix === "" ? "root" : prefix, depth: id.length });
      visit(id, remaining.filter((candidate) => candidate !== value));
    }
  };
  visit("", values);
  return nodes;
}

function buildBinaryTree(depth: number): readonly TreeNode[] {
  const nodes: TreeNode[] = [{ id: "root", label: "∅", depth: 0 }];
  for (let level = 1; level <= depth; level += 1) {
    for (let value = 0; value < 2 ** level; value += 1) {
      const id = value.toString(2).padStart(level, "0");
      nodes.push({ id, label: id, parentId: level === 1 ? "root" : id.slice(0, -1), depth: level });
    }
  }
  return nodes;
}

function binary(mask: number): string {
  return mask.toString(2).padStart(3, "0");
}
