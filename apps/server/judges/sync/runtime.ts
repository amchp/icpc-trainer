import {
  AppUserIdTag,
  type RefetchContestInput,
  type AppScopedJudgeSyncInput,
  type JudgeSyncEvent,
  type JudgeSyncInput,
  type JudgeSyncProviderState,
  type JudgeSyncService,
  JudgeSyncEventType,
  SyncRunStatus
} from "@icpc-trainer/api";
import { type DatabaseService, DatabaseServiceTag } from "@icpc-trainer/db";
import { SYNC_ERROR_PHASES } from "@icpc-trainer/shared";
import { Effect } from "effect";

import type { Judge } from "../judges.js";
import {
  createObservableProviderJob,
  observeProviderJob,
  startObservableProviderJob,
  type ObservableProviderJob
} from "../../src/observableProviderJob.js";
import { emptySummary, finalEvent } from "./events.js";
import type { EmitSyncEvent } from "./progress.js";
import { applyJudgeSyncEventToState, emptyProviderState } from "./syncState.js";

interface AsyncEventQueue<T> {
  readonly iterable: AsyncIterable<T>;
  readonly push: (value: T) => void;
  readonly close: () => void;
  readonly fail: (error: unknown) => void;
}

type JudgeSyncRegistry = Partial<Record<JudgeSyncInput["provider"], Judge>>;

export async function* notImplementedJudgeSync(input: JudgeSyncInput): AsyncIterable<JudgeSyncEvent> {
  const summary = emptySummary();
  summary.errors = 1;
  yield {
    type: JudgeSyncEventType.Error,
    provider: input.provider,
    phase: SYNC_ERROR_PHASES.Database,
    message: `${input.provider} sync is not implemented yet.`,
    stepsTotal: 0,
    stepsLeft: 0
  };
  yield finalEvent(input.provider, 0, summary);
}

const createAsyncEventQueue = <T>(): AsyncEventQueue<T> => {
  const values: T[] = [];
  const waiters: Array<{
    readonly resolve: (result: IteratorResult<T>) => void;
    readonly reject: (error: unknown) => void;
  }> = [];
  let closed = false;
  let failure: unknown;

  const next = async (): Promise<IteratorResult<T>> => {
    if (values.length > 0) {
      return { done: false, value: values.shift() as T };
    }

    if (failure !== undefined) {
      throw failure;
    }

    if (closed) {
      return { done: true, value: undefined };
    }

    return await new Promise<IteratorResult<T>>((resolve, reject) => {
      waiters.push({ resolve, reject });
    });
  };

  const push = (value: T): void => {
    const waiter = waiters.shift();
    if (waiter !== undefined) {
      waiter.resolve({ done: false, value });
      return;
    }

    values.push(value);
  };

  const close = (): void => {
    closed = true;
    for (const waiter of waiters.splice(0)) {
      waiter.resolve({ done: true, value: undefined });
    }
  };

  const fail = (error: unknown): void => {
    failure = error;
    closed = true;
    for (const waiter of waiters.splice(0)) {
      waiter.reject(error);
    }
  };

  return {
    iterable: {
      [Symbol.asyncIterator]: () => ({ next })
    },
    push,
    close,
    fail
  };
};

export async function* createJudgeSyncRunner(
  runProgram: (emit: EmitSyncEvent) => Effect.Effect<void>
): AsyncIterable<JudgeSyncEvent> {
  const queue = createAsyncEventQueue<JudgeSyncEvent>();
  const emit: EmitSyncEvent = (event) => Effect.sync(() => queue.push(event));
  Effect.runPromise(
    runProgram(emit).pipe(
      Effect.ensuring(Effect.sync(() => {
        queue.close();
      }))
    )
  ).catch((error: unknown) => queue.fail(error));

  yield* queue.iterable;
}

const syncFailureEvent = (
  provider: JudgeSyncInput["provider"],
  error: unknown
): JudgeSyncEvent => ({
  type: JudgeSyncEventType.Error,
  provider,
    phase: SYNC_ERROR_PHASES.Database,
  message: error instanceof Error ? error.message : String(error),
  stepsTotal: 0,
  stepsLeft: 0
});

const failedSyncCompletedEvent = (provider: JudgeSyncInput["provider"]): JudgeSyncEvent => {
  const summary = emptySummary();
  summary.errors = 1;
  return finalEvent(provider, 0, summary);
};

const judgeFor = (provider: JudgeSyncInput["provider"], registry: JudgeSyncRegistry): Judge | undefined =>
  registry[provider];

export const createJudgeSyncService = (
  registry: JudgeSyncRegistry,
  database: DatabaseService
): JudgeSyncService & {
  readonly sync: (input: AppScopedJudgeSyncInput) => AsyncIterable<JudgeSyncEvent>;
} => {
  const jobs = new Map<string, ObservableProviderJob<JudgeSyncProviderState>>();
  const jobKey = (input: AppScopedJudgeSyncInput): string => `${input.appUserId}:${input.provider}`;
  const jobFor = (input: AppScopedJudgeSyncInput): ObservableProviderJob<JudgeSyncProviderState> => {
    const key = jobKey(input);
    const existing = jobs.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const job = createObservableProviderJob(emptyProviderState(input.provider));
    jobs.set(key, job);
    return job;
  };

  return {
    start: async (input) => {
      const judge = judgeFor(input.provider, registry);
      const iterable = judge?.sync(input) ?? notImplementedJudgeSync(input);
      const job = jobFor(input);
      startObservableProviderJob(
        job,
        {
          ...emptyProviderState(input.provider),
          status: SyncRunStatus.Running
        },
        async (publish) => {
          for await (const event of iterable) {
            publish(applyJudgeSyncEventToState(job.latest, event));
          }
        },
        (error, publish) => {
          publish(applyJudgeSyncEventToState(job.latest, syncFailureEvent(input.provider, error)));
          publish(applyJudgeSyncEventToState(job.latest, failedSyncCompletedEvent(input.provider)));
        }
      );
    },
    observe: (input) => observeProviderJob(jobFor(input)),
    refetchContest: async (input: RefetchContestInput & { readonly appUserId: number }) => {
      const judge = judgeFor(input.provider, registry);
      if (judge === undefined) {
        throw new Error(`${input.provider} sync is not implemented yet.`);
      }

      await Effect.runPromise(
        judge.refetchContest(input).pipe(
          Effect.provideService(DatabaseServiceTag, database),
          Effect.provideService(AppUserIdTag, input.appUserId)
        )
      );
    },
    sync: (input) => {
      const judge = judgeFor(input.provider, registry);
      return judge?.sync(input) ?? notImplementedJudgeSync(input);
    }
  };
};
