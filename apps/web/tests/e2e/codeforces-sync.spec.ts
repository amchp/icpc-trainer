import { expect, test, type Page } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";

import { clearConnectedJudgesIfPresent } from "./helpers.js";

const CODEFORCES_API_URL = "https://codeforces.com/api";
const CODEFORCES_PAGE_SIZE = 100_000;
const DEFAULT_CODEFORCES_HANDLE = "drew138";
const GYM_CONTEST_ID_MIN = 100_000;
const GYM_CONTEST_ID_MAX = 200_000;
const DIV_ROUND_PATTERN = /\bdiv\.?\s*[1-4]\b/i;
const WEIRD_REGULAR_CONTEST_PATTERN =
  /\b(?:challenge|marathon|communication|huawei|huawai|april\s+fools|kotlin\s+heroes|experimental|testing\s+round)\b/i;

type CodeforcesRequestParam = string | number | boolean | undefined;

interface CodeforcesE2EConfig {
  readonly handle: string;
  readonly apiKey: string;
  readonly apiSecret: string;
}

interface CodeforcesApiSuccess<T> {
  readonly status: "OK";
  readonly result: T;
}

interface CodeforcesApiFailure {
  readonly status: "FAILED";
  readonly comment?: string;
}

type CodeforcesApiResponse<T> = CodeforcesApiSuccess<T> | CodeforcesApiFailure;

interface CodeforcesContest {
  readonly id: number;
  readonly name: string;
}

interface CodeforcesProblem {
  readonly contestId?: number;
  readonly index?: string;
  readonly name: string;
}

interface CodeforcesProblemset {
  readonly problems: readonly CodeforcesProblem[];
}

interface CodeforcesStandings {
  readonly contest: CodeforcesContest;
  readonly problems: readonly CodeforcesProblem[];
}

interface CodeforcesSubmission {
  readonly id: number;
  readonly contestId?: number;
  readonly problem?: CodeforcesProblem;
  readonly verdict?: string;
}

type ValidCodeforcesSubmission = CodeforcesSubmission & {
  readonly contestId: number;
  readonly problem: CodeforcesProblem & { readonly index: string };
};

interface ExpectedSyncCounts {
  readonly contestCount: number;
  readonly problemCount: number;
  readonly solvedCount: number;
  readonly attemptedCount: number;
  readonly upsolvedCount: number;
}

interface ContestSubmissionFacts {
  readonly submittedProblemIds: Set<string>;
  hasAccepted: boolean;
}

const trimmedEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
};

const codeforcesE2EConfig = (): CodeforcesE2EConfig | null => {
  const apiKey = trimmedEnv("E2E_CODEFORCES_API_KEY");
  const apiSecret = trimmedEnv("E2E_CODEFORCES_API_SECRET");

  if (apiKey === undefined || apiSecret === undefined) {
    return null;
  }

  return {
    handle: trimmedEnv("E2E_CODEFORCES_HANDLE") ?? DEFAULT_CODEFORCES_HANDLE,
    apiKey,
    apiSecret
  };
};

const isGymContestId = (contestId: number): boolean =>
  contestId >= GYM_CONTEST_ID_MIN && contestId <= GYM_CONTEST_ID_MAX;

const isNormalRegularContestName = (name: string): boolean =>
  DIV_ROUND_PATTERN.test(name) && !WEIRD_REGULAR_CONTEST_PATTERN.test(name);

const isValidSubmission = (submission: CodeforcesSubmission): submission is ValidCodeforcesSubmission =>
  submission.contestId !== undefined && submission.problem?.index !== undefined;

const hasContestIdAndIndex = (
  problem: CodeforcesProblem
): problem is CodeforcesProblem & { readonly contestId: number; readonly index: string } =>
  problem.contestId !== undefined && problem.index !== undefined;

const submissionProblemId = (submission: ValidCodeforcesSubmission): string =>
  `${submission.contestId}${submission.problem.index}`;

const problemCatalogId = (
  problem: CodeforcesProblem & { readonly contestId: number; readonly index: string }
): string =>
  `${problem.contestId}${problem.index}`;

const buildSignedCodeforcesUrl = (
  config: CodeforcesE2EConfig,
  method: string,
  params: Record<string, CodeforcesRequestParam> = {}
): string => {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      entries.push([key, String(value)]);
    }
  }

  entries.push(["apiKey", config.apiKey], ["time", String(Math.floor(Date.now() / 1_000))]);
  entries.sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey)
  );

  const query = new URLSearchParams(entries);
  const rand = randomBytes(3).toString("hex");
  const signaturePayload = `${rand}/${method}?${query.toString()}#${config.apiSecret}`;
  const digest = createHash("sha512").update(signaturePayload).digest("hex");
  query.set("apiSig", `${rand}${digest}`);

  return `${CODEFORCES_API_URL}/${method}?${query.toString()}`;
};

const requestSignedCodeforces = async <T>(
  config: CodeforcesE2EConfig,
  method: string,
  params?: Record<string, CodeforcesRequestParam>
): Promise<T> => {
  const response = await fetch(buildSignedCodeforcesUrl(config, method, params));
  const payload = (await response.json()) as CodeforcesApiResponse<T>;

  if (!response.ok || payload.status === "FAILED") {
    throw new Error(`Codeforces ${method} failed: ${payload.status === "FAILED" ? payload.comment ?? "FAILED" : response.status}`);
  }

  return payload.result;
};

const requestPublicCodeforces = async <T>(
  method: string,
  params: Record<string, CodeforcesRequestParam> = {}
): Promise<T> => {
  const url = new URL(`${CODEFORCES_API_URL}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url);
  const payload = (await response.json()) as CodeforcesApiResponse<T>;

  if (!response.ok || payload.status === "FAILED") {
    throw new Error(`Codeforces ${method} failed: ${payload.status === "FAILED" ? payload.comment ?? "FAILED" : response.status}`);
  }

  return payload.result;
};

const getAllCodeforcesPages = async <T>(
  getPage: (from: number, count: number) => Promise<readonly T[]>
): Promise<readonly T[]> => {
  const items: T[] = [];
  let from = 1;

  for (;;) {
    const page = await getPage(from, CODEFORCES_PAGE_SIZE);
    items.push(...page);
    if (page.length < CODEFORCES_PAGE_SIZE) {
      return items;
    }
    from += CODEFORCES_PAGE_SIZE;
  }
};

const addImportedProblemIds = (
  importedProblemsByContest: Map<string, Set<string>>,
  contestId: string,
  problemIds: Iterable<string>
): void => {
  const current = importedProblemsByContest.get(contestId) ?? new Set<string>();
  for (const problemId of problemIds) {
    current.add(problemId);
  }
  importedProblemsByContest.set(contestId, current);
};

const intersectionSize = (left: ReadonlySet<string>, right: ReadonlySet<string>): number => {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) {
      count += 1;
    }
  }
  return count;
};

const countExpectedCodeforcesSyncRows = async (
  config: CodeforcesE2EConfig
): Promise<ExpectedSyncCounts> => {
  const submissions = (await getAllCodeforcesPages((from, count) =>
    requestSignedCodeforces<readonly CodeforcesSubmission[]>(config, "user.status", {
      handle: config.handle,
      from,
      count
    })
  )).filter(isValidSubmission);

  const factsByContest = new Map<string, ContestSubmissionFacts>();
  const submissionsByProblem = new Map<string, ValidCodeforcesSubmission[]>();

  for (const submission of submissions) {
    const contestId = String(submission.contestId);
    const problemId = submissionProblemId(submission);
    const contestFacts = factsByContest.get(contestId) ?? {
      submittedProblemIds: new Set<string>(),
      hasAccepted: false
    };
    contestFacts.submittedProblemIds.add(problemId);
    contestFacts.hasAccepted = contestFacts.hasAccepted || submission.verdict === "OK";
    factsByContest.set(contestId, contestFacts);

    const problemSubmissions = submissionsByProblem.get(problemId) ?? [];
    problemSubmissions.push(submission);
    submissionsByProblem.set(problemId, problemSubmissions);
  }

  const importedProblemsByContest = new Map<string, Set<string>>();
  const gymContestIds = [...factsByContest.entries()]
    .filter(([contestId, facts]) => isGymContestId(Number(contestId)) && facts.submittedProblemIds.size >= 2)
    .map(([contestId]) => contestId);
  const regularContestIds = [...factsByContest.entries()]
    .filter(([contestId, facts]) =>
      !isGymContestId(Number(contestId)) && (facts.submittedProblemIds.size >= 2 || facts.hasAccepted)
    )
    .map(([contestId]) => contestId);

  for (const contestId of gymContestIds) {
    const standings = await requestSignedCodeforces<CodeforcesStandings>(config, "contest.standings", {
      contestId,
      from: 1,
      count: CODEFORCES_PAGE_SIZE,
      showUnofficial: true
    });
    addImportedProblemIds(
      importedProblemsByContest,
      contestId,
      standings.problems
        .filter(hasContestIdAndIndex)
        .map(problemCatalogId)
    );
  }

  if (regularContestIds.length > 0) {
    const [regularContests, problemset] = await Promise.all([
      requestSignedCodeforces<readonly CodeforcesContest[]>(config, "contest.list"),
      requestPublicCodeforces<CodeforcesProblemset>("problemset.problems")
    ]);
    const normalRegularContestIds = new Set(
      regularContests
        .filter((contest) => !isGymContestId(contest.id) && isNormalRegularContestName(contest.name))
        .map((contest) => String(contest.id))
    );
    const importableRegularContestIds = new Set(
      regularContestIds.filter((contestId) => normalRegularContestIds.has(contestId))
    );

    for (const problem of problemset.problems) {
      if (hasContestIdAndIndex(problem) && importableRegularContestIds.has(String(problem.contestId))) {
        addImportedProblemIds(importedProblemsByContest, String(problem.contestId), [problemCatalogId(problem)]);
      }
    }
  }

  const simulatedContestIds = [...importedProblemsByContest.entries()]
    .filter(([contestId, problemIds]) => {
      const submittedProblemIds = factsByContest.get(contestId)?.submittedProblemIds ?? new Set<string>();
      return intersectionSize(problemIds, submittedProblemIds) >= 2;
    })
    .map(([contestId]) => contestId);

  let problemCount = 0;
  let solvedCount = 0;
  let attemptedCount = 0;
  let upsolvedCount = 0;

  for (const contestId of simulatedContestIds) {
    const problemIds = importedProblemsByContest.get(contestId) ?? new Set<string>();
    problemCount += problemIds.size;

    for (const problemId of problemIds) {
      const problemSubmissions = submissionsByProblem.get(problemId) ?? [];
      if (problemSubmissions.some((submission) => submission.verdict === "OK")) {
        solvedCount += 1;
      } else if (problemSubmissions.length > 0) {
        attemptedCount += 1;
      } else {
        upsolvedCount += 1;
      }
    }
  }

  return {
    contestCount: simulatedContestIds.length,
    problemCount,
    solvedCount,
    attemptedCount,
    upsolvedCount
  };
};

const clearTeamRoster = async (page: Page): Promise<void> => {
  const removeButtons = page.getByRole("button", { name: /^Remove / });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const count = await removeButtons.count();
    if (count === 0) {
      return;
    }

    await removeButtons.first().click();
    await expect(removeButtons).toHaveCount(count - 1, { timeout: 10_000 });
  }

  throw new Error("Could not clear the team roster.");
};

const connectCodeforces = async (page: Page, config: CodeforcesE2EConfig): Promise<void> => {
  await clearConnectedJudgesIfPresent(page);
  await page.goto("/connect-judges/codeforces");
  await expect(page.getByRole("heading", { name: "Connect Judges" })).toBeVisible();

  await page.getByLabel("Handle").fill(config.handle);
  await page.getByLabel("API key").fill(config.apiKey);
  await page.getByLabel("API secret").fill(config.apiSecret);
  await page.getByRole("button", { name: "Enter" }).click();

  await expect(page).toHaveURL(/\/judges$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Judges", exact: true })).toBeVisible();
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
};

const replaceTeamRosterWithCodeforcesUser = async (
  page: Page,
  handle: string
): Promise<void> => {
  await page.goto("/team");
  await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
  await clearTeamRoster(page);

  await page.getByLabel("Handle").fill(handle);
  await page.getByRole("button", { name: "Add user" }).click();

  await expect(page.getByLabel("1 user")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(handle, { exact: true })).toBeVisible();
};

const runSync = async (page: Page): Promise<void> => {
  const syncButton = page.getByRole("button", { name: "Sync" });
  await expect(syncButton).toBeEnabled({ timeout: 15_000 });
  await syncButton.click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Codeforces sync complete" })
  ).toBeVisible({ timeout: 90_000 });
  await expect(syncButton).toBeEnabled({ timeout: 10_000 });
};

const expectTableCount = async (
  page: Page,
  count: number,
  itemName: string
): Promise<void> => {
  const countLabel = count === 1 ? itemName : `${itemName}s`;
  await expect(page.getByLabel(`${count.toLocaleString()} ${countLabel}`)).toBeVisible({ timeout: 30_000 });
};

test.describe.configure({ mode: "serial" });

test("syncs Codeforces data for drew138 and shows matching problem and contest totals", async ({ page }) => {
  test.setTimeout(120_000);
  const config = codeforcesE2EConfig();
  test.skip(config === null, "Set E2E_CODEFORCES_API_KEY and E2E_CODEFORCES_API_SECRET to run Codeforces e2e sync.");
  if (config === null) {
    return;
  }

  const expected = await countExpectedCodeforcesSyncRows(config);

  await connectCodeforces(page, config);
  await replaceTeamRosterWithCodeforcesUser(page, config.handle);
  await runSync(page);

  await page.goto("/contests");
  await expect(page.getByRole("heading", { name: "Contests" })).toBeVisible();
  await expectTableCount(page, expected.contestCount, "contest");

  await page.goto("/upsolving");
  await expect(page.getByRole("heading", { name: "Upsolving" })).toBeVisible();
  await page.getByRole("button", { name: "Filter by status" }).click();
  await page.getByRole("menuitemradio", {
    name: `All statuses, ${expected.problemCount} ${expected.problemCount === 1 ? "problem" : "problems"}`
  }).click();
  await expectTableCount(page, expected.problemCount, "problem");
});
