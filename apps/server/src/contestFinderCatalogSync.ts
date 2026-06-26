import { type DatabaseService, DatabaseServiceTag } from "@icpc-trainer/db";
import { JUDGE_PROVIDERS, type JudgeProvider } from "@icpc-trainer/shared";
import { Effect } from "effect";

import type { Judge } from "../judges/judges.js";

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

const errorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "_tag" in error
      ? String(error)
      : String(error);

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

  return {
    ok: results.every((result) => result.ok),
    providers: results
  };
};
