import { type DatabaseService, DatabaseServiceTag } from "@icpc-trainer/db";
import { JUDGE_PROVIDERS, type JudgeProvider } from "@icpc-trainer/shared";
import { Effect } from "effect";

import type { Judge } from "../judges/judges.js";
import {
  formatJudgeError,
  isJudgeError,
  unwrapEffectFailure
} from "./judgeErrorFormatting.js";
import { getPostHog } from "./posthog.js";

type Registry = Record<JudgeProvider, Judge>;

export interface ContestFinderCatalogSyncProviderResult {
  readonly provider: JudgeProvider;
  readonly ok: boolean;
  readonly contestsUpserted: number;
  readonly regularContestsImported: number;
  readonly regularProblemsImported: number;
  readonly error?: string;
}

export interface ContestFinderCatalogSyncJobResult {
  readonly ok: boolean;
  readonly providers: readonly ContestFinderCatalogSyncProviderResult[];
}

const errorMessage = (error: unknown): string => {
  const unwrapped = unwrapEffectFailure(error);
  if (unwrapped !== error) {
    return errorMessage(unwrapped);
  }

  if (isJudgeError(error)) {
    return formatJudgeError(error);
  }

  return error instanceof Error
    ? error.message
    : String(error);
};

export const runContestFinderCatalogSyncJob = async (
  database: DatabaseService,
  registry: Registry,
): Promise<ContestFinderCatalogSyncJobResult> => {
  const results: ContestFinderCatalogSyncProviderResult[] = [];

  for (const provider of JUDGE_PROVIDERS) {
    try {
      const result = await Effect.runPromise(
        registry[provider].syncContestFinderCatalog().pipe(
          Effect.provideService(DatabaseServiceTag, database)
        )
      );
      results.push({
        provider,
        ok: true,
        contestsUpserted: result.contestsUpserted,
        regularContestsImported: result.regularContestsImported,
        regularProblemsImported: result.regularProblemsImported
      });
    } catch (error) {
      results.push({
        provider,
        ok: false,
        contestsUpserted: 0,
        regularContestsImported: 0,
        regularProblemsImported: 0,
        error: errorMessage(error)
      });
    }
  }

  const jobResult = {
    ok: results.every((result) => result.ok),
    providers: results
  };

  const totalContestsUpserted = results.reduce((sum, r) => sum + r.contestsUpserted, 0);
  getPostHog()?.capture({
    distinctId: "server",
    event: "catalog_sync_completed",
    properties: {
      ok: jobResult.ok,
      total_contests_upserted: totalContestsUpserted,
      provider_results: results.map((r) => ({ provider: r.provider, ok: r.ok, contests_upserted: r.contestsUpserted }))
    }
  });

  return jobResult;
};
