import type { ContestFinderRow } from "@icpc-trainer/api";
import { CONTEST_FINDER_TABS, JUDGES, isJudgeProvider } from "@icpc-trainer/shared";

import type { JudgeProvider } from "./judgeConfig.js";

export type { ContestFinderTabId } from "@icpc-trainer/shared";
export { CONTEST_FINDER_TABS as ContestFinderTab };

export const toJudge = (value: JudgeProvider | JUDGES): JUDGES =>
  value === JUDGES.Qoj ? JUDGES.Qoj : JUDGES.Codeforces;

const isContestFinderJudge = (value: unknown): value is ContestFinderRow["judge"] =>
  typeof value === "string" && isJudgeProvider(value);

const finiteNumberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const stringOrFallback = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

export const normalizeContestFinderRows = (
  rows: readonly ContestFinderRow[] | undefined
): ContestFinderRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.flatMap((row) => {
    if (row === null || typeof row !== "object") {
      return [];
    }

    const candidate = row as Record<string, unknown>;
    const id = candidate.id;
    const judge = candidate.judge;
    if (typeof id !== "number" || !Number.isFinite(id) || !isContestFinderJudge(judge)) {
      return [];
    }

    const handles = Array.isArray(candidate.handles)
      ? candidate.handles.filter((handle): handle is string => typeof handle === "string")
      : [];
    const friendCount = typeof candidate.friendCount === "number" && Number.isFinite(candidate.friendCount)
      ? candidate.friendCount
      : handles.length;

    return [{
      id,
      judge,
      judgeId: stringOrFallback(candidate.judgeId, String(id)),
      name: stringOrFallback(candidate.name, "Untitled contest"),
      link: stringOrFallback(candidate.link, ""),
      participants: finiteNumberOrNull(candidate.participants),
      stars: finiteNumberOrNull(candidate.stars),
      friendCount,
      handles
    }];
  });
};

export const contestFinderSearchText = (contest: ContestFinderRow): string =>
  [
    stringOrFallback(contest.name, ""),
    stringOrFallback(contest.judgeId, ""),
    stringOrFallback(contest.judge, ""),
    ...(Array.isArray(contest.handles) ? contest.handles : [])
  ].join(" ").toLowerCase();

export const sortContestFinderRows = (
  left: ContestFinderRow,
  right: ContestFinderRow
): number => {
  const leftFriendCount = Number.isFinite(left.friendCount) ? left.friendCount : 0;
  const rightFriendCount = Number.isFinite(right.friendCount) ? right.friendCount : 0;

  if (rightFriendCount !== leftFriendCount) {
    return rightFriendCount - leftFriendCount;
  }

  const judgeOrder = stringOrFallback(left.judge, "").localeCompare(stringOrFallback(right.judge, ""));
  return judgeOrder === 0
    ? stringOrFallback(left.name, "").localeCompare(stringOrFallback(right.name, ""))
    : judgeOrder;
};
