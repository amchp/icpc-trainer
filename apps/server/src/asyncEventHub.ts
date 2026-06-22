interface AsyncEventQueue<T> {
  readonly iterable: AsyncIterable<T>;
  readonly push: (value: T) => void;
  readonly close: () => void;
}

const createAsyncEventQueue = <T>(): AsyncEventQueue<T> => {
  const values: T[] = [];
  const waiters: Array<(result: IteratorResult<T>) => void> = [];
  let closed = false;

  const next = async (): Promise<IteratorResult<T>> => {
    if (values.length > 0) {
      return { done: false, value: values.shift() as T };
    }

    if (closed) {
      return { done: true, value: undefined };
    }

    return await new Promise<IteratorResult<T>>((resolve) => {
      waiters.push(resolve);
    });
  };

  const push = (value: T): void => {
    if (closed) {
      return;
    }

    const waiter = waiters.shift();
    if (waiter !== undefined) {
      waiter({ done: false, value });
      return;
    }

    values.push(value);
  };

  const close = (): void => {
    closed = true;
    for (const waiter of waiters.splice(0)) {
      waiter({ done: true, value: undefined });
    }
  };

  return {
    iterable: {
      [Symbol.asyncIterator]: () => ({ next })
    },
    push,
    close
  };
};

export interface AsyncEventHub<T> {
  readonly publish: (event: T) => void;
  readonly subscribe: () => AsyncIterable<T>;
}

export const createAsyncEventHub = <T>(): AsyncEventHub<T> => {
  const subscribers = new Set<AsyncEventQueue<T>>();

  return {
    publish: (event) => {
      for (const subscriber of subscribers) {
        subscriber.push(event);
      }
    },
    subscribe: () => {
      const queue = createAsyncEventQueue<T>();
      subscribers.add(queue);

      return {
        [Symbol.asyncIterator]: async function* () {
          try {
            yield* queue.iterable;
          } finally {
            subscribers.delete(queue);
            queue.close();
          }
        }
      };
    }
  };
};
