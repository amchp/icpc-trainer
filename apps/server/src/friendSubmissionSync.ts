import {
  AppUserIdTag,
  type FriendSubmissionSyncEvent,
  type FriendSubmissionSyncObserveEvent,
  type FriendSubmissionSyncProviderState,
  type FriendSubmissionSyncService,
  type FriendSubmissionSyncWarning
} from "@icpc-trainer/api";
import { type DatabaseService, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import {
  FRIEND_SUBMISSION_SYNC_EVENT_TYPES,
  JUDGE_PROVIDERS,
  LOCALIZED_MESSAGE_CODES,
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
  applyFriendSubmissionSyncEventToState,
  emptyFriendSubmissionSyncState
} from "./friendSubmissionSyncState.js";
import { formatJudgeError } from "./judgeErrorFormatting.js";

const { appUserJudgeUsers, users } = schema;

type Provider = JudgeProvider;
type Registry = Partial<Record<Provider, Judge>>;

const supportedProviders: readonly Provider[] = JUDGE_PROVIDERS;

const warning = (judge: Provider, error: unknown): FriendSubmissionSyncWarning => ({
  judge,
  message: {
    code: LOCALIZED_MESSAGE_CODES.FriendSyncWarning,
    params: { judge },
    technicalDetail: error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "_tag" in error
      ? formatJudgeError(error as never)
      : String(error)
  }
});

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

const syncTargets = async (database: DatabaseService, appUserId: number): Promise<readonly Provider[]> => {
  const targets = new Set<Provider>(await friendProviders(database, appUserId));
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

export const createFriendSubmissionSyncService = (
  database: DatabaseService,
  registry: Registry
): FriendSubmissionSyncService => {
  const jobs = createObservableProviderJobRegistry<string, FriendSubmissionSyncEvent, FriendSubmissionSyncProviderState>(
    supportedProviders,
    (key) => emptyFriendSubmissionSyncState(key.includes(":")
      ? key.split(":")[1] as Provider
      : key as Provider),
    applyFriendSubmissionSyncEventToState
  );
  const jobKey = (appUserId: number, provider: Provider): string => `${appUserId}:${provider}`;

  const runProviderSync = async (
    appUserId: number,
    provider: Provider,
    publish: PublishProviderJobEvent<FriendSubmissionSyncEvent>
  ): Promise<void> => {
    const warnings: FriendSubmissionSyncWarning[] = [];
    let friendsProcessed = 0;
    let latestEvent: FriendSubmissionSyncEvent | undefined;
    const judge = registry[provider];
    const friends = await friendsForProvider(database, appUserId, judgeFromProvider(provider));
    const emptyStepsTotal = friends.length;
    const emit = (event: FriendSubmissionSyncEvent): void => {
      latestEvent = event;
      publish(event);
    };
    const latestStepsTotal = (): number => latestEvent?.stepsTotal ?? emptyStepsTotal;
    const latestStepsLeft = (): number => latestEvent?.stepsLeft ?? emptyStepsTotal;

    if (judge === undefined) {
      const missingWarning = {
        judge: provider,
        message: {
          code: LOCALIZED_MESSAGE_CODES.FriendSyncWarning,
          params: { judge: provider },
          technicalDetail: `${provider} is not configured.`
        } as const
      };
      warnings.push(missingWarning);
      emit({
        type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Started,
        provider,
        stepsTotal: emptyStepsTotal,
        stepsLeft: emptyStepsTotal
      });
      emit({
        type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Warning,
        provider,
        message: missingWarning.message,
        stepsTotal: emptyStepsTotal,
        stepsLeft: emptyStepsTotal
      });
      emit({
        type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Completed,
        provider,
        stepsTotal: emptyStepsTotal,
        stepsLeft: 0,
        summary: {
          friendsProcessed,
          warnings
        }
      });
      return;
    }

    try {
      const result = await Effect.runPromise(
        judge.syncFriendSubmissions({
          friends,
          emit: (event) => Effect.sync(() => emit(event))
        }).pipe(
          Effect.provideService(DatabaseServiceTag, database),
          Effect.provideService(AppUserIdTag, appUserId)
        )
      );
      friendsProcessed += result.friendsProcessed;
    } catch (error) {
      const syncWarning = warning(provider, error);
      warnings.push(syncWarning);
      emit({
        type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Warning,
        provider,
        message: syncWarning.message,
        stepsTotal: latestStepsTotal(),
        stepsLeft: latestStepsLeft()
      });
    }

    emit({
      type: FRIEND_SUBMISSION_SYNC_EVENT_TYPES.Completed,
      provider,
      stepsTotal: latestStepsTotal(),
      stepsLeft: 0,
      summary: {
        friendsProcessed,
        warnings
      }
    });
  };

  return {
    startFriendSubmissionSync: async ({ appUserId }) => {
      for (const provider of await syncTargets(database, appUserId)) {
        jobs.start(
          jobKey(appUserId, provider),
          {
            ...emptyFriendSubmissionSyncState(provider),
            status: RUN_STATUSES.Running
          },
          (publish) => runProviderSync(appUserId, provider, publish)
        );
      }
    },
    observeFriendSubmissionSync: (input) =>
      jobs.observe(jobKey(input.appUserId, input.provider)) satisfies AsyncIterable<FriendSubmissionSyncObserveEvent>
  }
};
