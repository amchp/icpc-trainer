import { type ContestParticipationInput } from "../contestParticipation.js";
import type { JudgePreviewContest, JudgeSubmission } from "../judges.js";
import { type SyncUser } from "../sync/sync.js";

const CODEFORCES_CONTEST_URL = "https://codeforces.com/gym";

const contestLink = (contest: JudgePreviewContest): string =>
  contest.link !== undefined && contest.link.trim() !== ""
    ? contest.link
    : `${CODEFORCES_CONTEST_URL}/${encodeURIComponent(contest.judgeId)}`;

export const codeforcesContestParticipations = (
  user: SyncUser,
  submissions: readonly JudgeSubmission[],
  contestCatalog: ReadonlyMap<string, JudgePreviewContest> = new Map()
): readonly ContestParticipationInput[] => {
  const restrictToKnownContests = contestCatalog.size > 0;
  const byContest = new Map<string, JudgeSubmission[]>();
  for (const submission of submissions) {
    if (submission.judgeContestId === undefined) {
      continue;
    }
    if (restrictToKnownContests && !contestCatalog.has(submission.judgeContestId)) {
      continue;
    }
    const entries = byContest.get(submission.judgeContestId) ?? [];
    entries.push(submission);
    byContest.set(submission.judgeContestId, entries);
  }

  return [...byContest.entries()].flatMap(([contestJudgeId, contestSubmissions]) => {
    const contest = contestCatalog.get(contestJudgeId);
    if (contest === undefined) {
      return [];
    }

    return [{
      user,
      contestJudgeId,
      contestName: contest.name,
      contestLink: contestLink(contest),
      submissions: contestSubmissions
    }];
  });
};
