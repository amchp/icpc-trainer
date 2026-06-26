import {
  AppUserIdTag,
  type ContestFinderRefreshEvent,
  type ContestFinderRefreshObserveEvent,
  type ContestFinderRefreshProviderState,
  type ContestFinderRefreshService,
  type ContestFinderRefreshWarning
} from "@icpc-trainer/api";
import { type DatabaseService, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import {
  CONTEST_FINDER_REFRESH_EVENT_TYPES,
  JUDGE_PROVIDERS,
  RUN_STATUSES,
  USER_TYPES,
  isJudgeProvider,
  judgeFromProvider,
  type JUDGES,
  type JudgeProvider
} from "@icpc-trainer/shared";
import { and, eq } from "drizzle-orm";
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

const { appUserJudgeUsers, providerCredentials, users } = schema;

type Provider = JudgeProvider;
type Registry = Partial<Record<Provider, Judge>>;

const supportedProviders: readonly Provider[] = JUDGE_PROVIDERS;

const warning = (judge: Provider, error: unknown): ContestFinderRefreshWarning => ({
  judge,
  message: error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "_tag" in error
      ? formatJudgeError(error as never)
      : String(error)
});

const credentialProviders = async (database: DatabaseService, appUserId: number): Promise<readonly Provider[]> =>
  (await database.db
    .selectDistinct({ provider: providerCredentials.provider })
    .from(providerCredentials)
    .where(eq(providerCredentials.appUserId, appUserId))
    .all())
    .map((row) => row.provider)
    .filter(isJudgeProvider);

const friendProviders = async (database: DatabaseService, appUserId: number): Promise<readonly Provider[]> =>
  (await database.db
    .selectDistinct({ judge: users.judge })
    .from(appUserJudgeUsers)
    .innerJoin(users, eq(users.id, appUserJudgeUsers.userId))
    .where(and(
      eq(appUserJudgeUsers.appUserId, appUserId),
      eq(appUserJudgeUsers.role, USER_TYPES.Friend)
    ))
    .all())
    .map((row) => row.judge)
    .filter(isJudgeProvider);

const refreshTargets = async (database: DatabaseService, appUserId: number): Promise<readonly Provider[]> => {
  const targets = new Set<Provider>([
    ...await credentialProviders(database, appUserId),
    ...await friendProviders(database, appUserId)
  ]);
  return supportedProviders.filter((provider) => targets.has(provider));
};

const friendsForProvider = async (
  database: DatabaseService,
  appUserId: number,
  judge: JUDGES
): Promise<readonly SyncUser[]> =>
  (await database.db
    .select()
    .from(appUserJudgeUsers)
    .innerJoin(users, eq(users.id, appUserJudgeUsers.userId))
    .where(and(
      eq(appUserJudgeUsers.appUserId, appUserId),
      eq(appUserJudgeUsers.role, USER_TYPES.Friend),
      eq(users.judge, judge)
    ))
    .all())
    .map((row) => row.users);

export const createContestFinderRefreshService = (
  database: DatabaseService,
  registry: Registry
): ContestFinderRefreshService => {
  const jobs = createObservableProviderJobRegistry<string, ContestFinderRefreshEvent, ContestFinderRefreshProviderState>(
    supportedProviders,
    (key) => emptyContestFinderRefreshState(key.includes(":")
      ? key.split(":")[1] as Provider
      : key as Provider),
    applyContestFinderRefreshEventToState
  );
  const jobKey = (appUserId: number, provider: Provider): string => `${appUserId}:${provider}`;

  const runProviderRefresh = async (
    appUserId: number,
    provider: Provider,
    publish: PublishProviderJobEvent<ContestFinderRefreshEvent>
  ): Promise<void> => {
    const warnings: ContestFinderRefreshWarning[] = [];
    let contestsUpserted = 0;
    let friendsProcessed = 0;
    let latestEvent: ContestFinderRefreshEvent | undefined;
    const judge = registry[provider];
    const friends = await friendsForProvider(database, appUserId, judgeFromProvider(provider));
    const emptyStepsTotal = friends.length;
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
        type: CONTEST_FINDER_REFRESH_EVENT_TYPES.Started,
        provider,
        stepsTotal: emptyStepsTotal,
        stepsLeft: emptyStepsTotal
      });
      emit({
        type: CONTEST_FINDER_REFRESH_EVENT_TYPES.Warning,
        provider,
        message: missingWarning.message,
        stepsTotal: emptyStepsTotal,
        stepsLeft: emptyStepsTotal
      });
      emit({
        type: CONTEST_FINDER_REFRESH_EVENT_TYPES.Completed,
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
          Effect.provideService(DatabaseServiceTag, database),
          Effect.provideService(AppUserIdTag, appUserId)
        )
      );
      contestsUpserted += result.contestsUpserted;
      friendsProcessed += result.friendsProcessed;
    } catch (error) {
      const refreshWarning = warning(provider, error);
      warnings.push(refreshWarning);
      emit({
        type: CONTEST_FINDER_REFRESH_EVENT_TYPES.Warning,
        provider,
        message: refreshWarning.message,
        stepsTotal: latestStepsTotal(),
        stepsLeft: latestStepsLeft()
      });
    }

    emit({
      type: CONTEST_FINDER_REFRESH_EVENT_TYPES.Completed,
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
    startContestFinderRefresh: async ({ appUserId }) => {
      for (const provider of await refreshTargets(database, appUserId)) {
        jobs.start(
          jobKey(appUserId, provider),
          {
            ...emptyContestFinderRefreshState(provider),
            status: RUN_STATUSES.Running
          },
          (publish) => runProviderRefresh(appUserId, provider, publish)
        );
      }
    },
    observeContestFinderRefresh: (input) =>
      jobs.observe(jobKey(input.appUserId, input.provider)) satisfies AsyncIterable<ContestFinderRefreshObserveEvent>
  }
};
