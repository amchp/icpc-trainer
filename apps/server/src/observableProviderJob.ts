import { createAsyncEventHub, type AsyncEventHub } from "./asyncEventHub.js";

export interface ObservableProviderJob<State> {
  running: boolean;
  latest: State;
  readonly hub: AsyncEventHub<State>;
}

export type PublishProviderJobState<State> = (state: State) => void;
export type PublishProviderJobEvent<Event> = (event: Event) => void;

export const createObservableProviderJob = <State>(
  initialState: State
): ObservableProviderJob<State> => ({
  running: false,
  latest: initialState,
  hub: createAsyncEventHub<State>({ maxBufferedEvents: 1 })
});

export const publishProviderJobState = <State>(
  job: ObservableProviderJob<State>,
  state: State
): void => {
  job.latest = state;
  job.hub.publish(state);
};

export const startObservableProviderJob = <State>(
  job: ObservableProviderJob<State>,
  initialRunningState: State,
  run: (publish: PublishProviderJobState<State>) => Promise<void>,
  onError?: (
    error: unknown,
    publish: PublishProviderJobState<State>
  ) => void | Promise<void>
): boolean => {
  if (job.running) {
    return false;
  }

  const publish = (state: State): void => publishProviderJobState(job, state);

  job.running = true;
  publish(initialRunningState);

  void run(publish)
    .catch((error: unknown) => onError?.(error, publish))
    .finally(() => {
      job.running = false;
    });

  return true;
};

export const observeProviderJob = async function* <State>(
  job: ObservableProviderJob<State>
): AsyncIterable<State> {
  const eventsSubscription = job.hub.subscribe();
  yield job.latest;
  yield* eventsSubscription;
};

export interface ObservableProviderJobRegistry<Provider extends string, Event, State> {
  readonly start: (
    provider: Provider,
    initialRunningState: State,
    run: (publish: PublishProviderJobEvent<Event>) => Promise<void>,
    onError?: (
      error: unknown,
      publish: PublishProviderJobEvent<Event>
    ) => void | Promise<void>
  ) => boolean;
  readonly observe: (provider: Provider) => AsyncIterable<State>;
}

export const createObservableProviderJobRegistry = <Provider extends string, Event, State>(
  providers: readonly Provider[],
  initialState: (provider: Provider) => State,
  reduce: (current: State, event: Event) => State
): ObservableProviderJobRegistry<Provider, Event, State> => {
  const jobs = Object.fromEntries(
    providers.map((provider) => [
      provider,
      createObservableProviderJob(initialState(provider))
    ])
  ) as Record<Provider, ObservableProviderJob<State>>;

  const publishEvent = (job: ObservableProviderJob<State>, event: Event): void => {
    publishProviderJobState(job, reduce(job.latest, event));
  };

  return {
    start: (provider, initialRunningState, run, onError) => {
      const job = jobs[provider];
      return startObservableProviderJob<State>(
        job,
        initialRunningState,
        async () => {
          const publish = (event: Event): void => publishEvent(job, event);
          await run(publish);
        },
        onError === undefined
          ? undefined
          : async (error) => {
              const publish = (event: Event): void => publishEvent(job, event);
              await onError(error, publish);
            }
      );
    },
    observe: (provider) => observeProviderJob(jobs[provider])
  };
};
