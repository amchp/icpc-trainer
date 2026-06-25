import {
  type RefetchContestInput,
  type JudgeSyncEvent,
  type JudgeSyncInput,
  type JudgeSyncProviderState,
  type JudgeSyncService,
  JudgeSyncEventType,
  SyncRunStatus
} from "@icpc-trainer/api";
import { type DatabaseService, DatabaseServiceTag } from "@icpc-trainer/db";
import { Effect } from "effect";

import type { Judge } from "../judges.js";
import { createObservableProviderJobRegistry } from "../../src/observableProviderJob.js";
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
    phase: "database",
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
  phase: "database",
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
  readonly sync: (input: JudgeSyncInput) => AsyncIterable<JudgeSyncEvent>;
} => {
  const jobs = createObservableProviderJobRegistry<
    JudgeSyncInput["provider"],
    JudgeSyncEvent,
    JudgeSyncProviderState
  >(["codeforces", "qoj"], emptyProviderState, applyJudgeSyncEventToState);

  return {
    start: async (input) => {
      const judge = judgeFor(input.provider, registry);
      const iterable = judge?.sync(input) ?? notImplementedJudgeSync(input);
      jobs.start(
        input.provider,
        {
          ...emptyProviderState(input.provider),
          status: SyncRunStatus.Running
        },
        async (publish) => {
          for await (const event of iterable) {
            publish(event);
          }
        },
        (error, publish) => {
          publish(syncFailureEvent(input.provider, error));
          publish(failedSyncCompletedEvent(input.provider));
        }
      );
    },
    observe: (input) => jobs.observe(input.provider),
    refetchContest: async (input: RefetchContestInput) => {
      const judge = judgeFor(input.provider, registry);
      if (judge === undefined) {
        throw new Error(`${input.provider} sync is not implemented yet.`);
      }

      await Effect.runPromise(
        judge.refetchContest(input).pipe(
          Effect.provideService(DatabaseServiceTag, database)
        )
      );
    },
    sync: (input) => {
      const judge = judgeFor(input.provider, registry);
      return judge?.sync(input) ?? notImplementedJudgeSync(input);
    }
  };
};
