import type { ContestFinderRow } from "@icpc-trainer/api";
import { JUDGES } from "@icpc-trainer/shared";

import type { JudgeProvider } from "./judgeConfig.js";

export type ContestFinderTabId = "contest" | "friends";

export const toJudge = (value: JudgeProvider | JUDGES): JUDGES =>
  value === JUDGES.Qoj ? JUDGES.Qoj : JUDGES.Codeforces;

export const contestFinderSearchText = (contest: ContestFinderRow): string =>
  [
    contest.name,
    contest.judgeId,
    contest.judge,
    ...contest.handles
  ].join(" ").toLowerCase();

export const sortContestFinderRows = (
  left: ContestFinderRow,
  right: ContestFinderRow
): number => {
  if (right.friendCount !== left.friendCount) {
    return right.friendCount - left.friendCount;
  }

  const judgeOrder = left.judge.localeCompare(right.judge);
  return judgeOrder === 0 ? left.name.localeCompare(right.name) : judgeOrder;
};
