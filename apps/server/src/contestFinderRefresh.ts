import {
  type ContestFinderRefreshEvent,
  type ContestFinderRefreshInput,
  type ContestFinderRefreshObserveEvent,
  type ContestFinderRefreshProviderState,
  type ContestFinderRefreshService,
  type ContestFinderRefreshWarning
} from "@icpc-trainer/api";
import { type DatabaseService, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import type { Judge } from "../judges/judges.js";
import type { SyncUser } from "../judges/sync/sync.js";
import {
  createObservableProviderJobRegistry,
  type PublishProviderJobEvent
} from "./observableProviderJob.js";
import {
  applyContestFinderRefreshEventToState,
  emptyContestFinderRefreshState
} from "./contestFinderRefreshState.js";
import { formatJudgeError } from "./playground.js";

const { contests, providerCredentials, users } = schema;

type Provider = "codeforces" | "qoj";
type Registry = Partial<Record<Provider, Judge>>;

const supportedProviders: readonly Provider[] = ["codeforces", "qoj"];

const providerJudge = (provider: Provider): JUDGES =>
  provider === "codeforces" ? JUDGES.Codeforces : JUDGES.Qoj;

const isProvider = (value: string): value is Provider =>
  value === "codeforces" || value === "qoj";

const warning = (judge: Provider, error: unknown): ContestFinderRefreshWarning => ({
  judge,
  message: error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "_tag" in error
      ? formatJudgeError(error as never)
      : String(error)
});

const storedContestProviders = (database: DatabaseService): readonly Provider[] =>
  database.db
    .selectDistinct({ judge: contests.judge })
    .from(contests)
    .all()
    .map((row) => row.judge)
    .filter(isProvider);

const credentialProviders = (database: DatabaseService): readonly Provider[] =>
  database.db
    .selectDistinct({ provider: providerCredentials.provider })
    .from(providerCredentials)
    .all()
    .map((row) => row.provider)
    .filter(isProvider);

const refreshTargets = (database: DatabaseService): readonly Provider[] => {
  const targets = new Set<Provider>([
    ...credentialProviders(database),
    ...storedContestProviders(database)
  ]);
  return supportedProviders.filter((provider) => targets.has(provider));
};

const friendsForProvider = (database: DatabaseService, judge: JUDGES): readonly SyncUser[] =>
  database.db
    .select()
    .from(users)
    .where(eq(users.type, USER_TYPES.Friend))
    .all()
    .filter((user) => user.judge === judge);

export const createContestFinderRefreshService = (
  database: DatabaseService,
  registry: Registry
): ContestFinderRefreshService => {
  const jobs = createObservableProviderJobRegistry<Provider, ContestFinderRefreshEvent, ContestFinderRefreshProviderState>(
    supportedProviders,
    emptyContestFinderRefreshState,
    applyContestFinderRefreshEventToState
  );

  const runProviderRefresh = async (
    provider: Provider,
    publish: PublishProviderJobEvent<ContestFinderRefreshEvent>
  ): Promise<void> => {
    const warnings: ContestFinderRefreshWarning[] = [];
    let contestsUpserted = 0;
    let friendsProcessed = 0;
    let latestEvent: ContestFinderRefreshEvent | undefined;
    const judge = registry[provider];
    const friends = friendsForProvider(database, providerJudge(provider));
    const emptyStepsTotal = friends.length + 1;
    const emit = (event: ContestFinderRefreshEvent): void => {
      latestEvent = event;
      publish(event);
    };
    const latestStepsTotal = (): number => latestEvent?.stepsTotal ?? emptyStepsTotal;
    const latestStepsLeft = (): number => latestEvent?.stepsLeft ?? emptyStepsTotal;

    if (judge === undefined) {
      const missingWarning = {
        judge: provider,
        message: `${provider} is not configured.`
      };
      warnings.push(missingWarning);
      emit({
        type: "started",
        provider,
        stepsTotal: emptyStepsTotal,
        stepsLeft: emptyStepsTotal
      });
      emit({
        type: "warning",
        provider,
        message: missingWarning.message,
        stepsTotal: emptyStepsTotal,
        stepsLeft: emptyStepsTotal
      });
      emit({
        type: "completed",
        provider,
        stepsTotal: emptyStepsTotal,
        stepsLeft: 0,
        summary: {
          contestsUpserted,
          friendsProcessed,
          warnings
        }
      });
      return;
    }

    try {
      const result = await Effect.runPromise(
        judge.findContest({
          friends,
          emit: (event) => Effect.sync(() => emit(event))
        }).pipe(
          Effect.provideService(DatabaseServiceTag, database)
        )
      );
      contestsUpserted += result.contestsUpserted;
      friendsProcessed += result.friendsProcessed;
    } catch (error) {
      const refreshWarning = warning(provider, error);
      warnings.push(refreshWarning);
      emit({
        type: "warning",
        provider,
        message: refreshWarning.message,
        stepsTotal: latestStepsTotal(),
        stepsLeft: latestStepsLeft()
      });
    }

    emit({
      type: "completed",
      provider,
      stepsTotal: latestStepsTotal(),
      stepsLeft: 0,
      summary: {
        contestsUpserted,
        friendsProcessed,
        warnings
      }
    });
  };

  return {
    startContestFinderRefresh: async () => {
      for (const provider of refreshTargets(database)) {
        jobs.start(
          provider,
          {
            ...emptyContestFinderRefreshState(provider),
            status: "running"
          },
          (publish) => runProviderRefresh(provider, publish)
        );
      }
    },
    observeContestFinderRefresh: (input: ContestFinderRefreshInput) =>
      jobs.observe(input.provider) satisfies AsyncIterable<ContestFinderRefreshObserveEvent>
  }
};
