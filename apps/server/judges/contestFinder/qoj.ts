import { type ContestParticipationInput } from "../contestParticipation.js";
import type { JudgePreviewContest } from "../judges.js";
import { type SyncUser } from "../sync/sync.js";

const QOJ_CONTEST_URL = "https://qoj.ac/contest";

const contestLink = (contest: JudgePreviewContest): string =>
  contest.link !== undefined && contest.link.trim() !== ""
    ? contest.link
    : `${QOJ_CONTEST_URL}/${encodeURIComponent(contest.judgeId)}`;

export const qojContestParticipations = (
  user: SyncUser,
  contests: readonly JudgePreviewContest[]
): readonly ContestParticipationInput[] =>
  [...new Map(contests.map((contest) => [contest.judgeId, contest])).values()].flatMap((contest) =>
    [{
      user,
      contestJudgeId: contest.judgeId,
      contestName: contest.name,
      contestLink: contestLink(contest),
      submissions: []
    }]
  );
