import { useEffect } from "react";

interface ProviderStateHandlers<TState> {
  readonly onData: (state: TState) => void;
  readonly onError: (error: Error) => void;
}

interface ProviderStateSubscription {
  readonly unsubscribe: () => void;
}

export function useProviderStateSubscriptions<TProvider extends string, TState>({
  providers,
  subscribe,
  onData,
  onError
}: {
  readonly providers: readonly TProvider[];
  readonly subscribe: (
    provider: TProvider,
    handlers: ProviderStateHandlers<TState>
  ) => ProviderStateSubscription;
  readonly onData: (state: TState) => void;
  readonly onError: (provider: TProvider, error: Error) => void;
}): void {
  useEffect(() => {
    const subscriptions = providers.map((provider) =>
      subscribe(provider, {
        onData,
        onError: (error) => onError(provider, error)
      })
    );

    return () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    };
  }, [onData, onError, providers, subscribe]);
}
