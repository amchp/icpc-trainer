import { APP_LOCALES, type AppLocale } from "@icpc-trainer/shared";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "../queryKeys.js";
import { LocalePersistenceCoordinator, updatePersistedLocaleCache } from "./AuthenticatedLocaleSync.js";
import {
  claimPendingLocale,
  getPendingLocaleForUser,
  markLocalePending
} from "./storage.js";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("LocalePersistenceCoordinator", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("serializes rapid selections and persists the newest pending locale last", async () => {
    const first = deferred();
    const second = deferred();
    const writes: AppLocale[] = [];
    const persisted: AppLocale[] = [];
    const persist = vi.fn((locale: AppLocale) => {
      writes.push(locale);
      return writes.length === 1 ? first.promise : second.promise;
    });
    const coordinator = new LocalePersistenceCoordinator({ persist, onPersisted: (locale) => persisted.push(locale) });

    coordinator.request(APP_LOCALES.Spanish);
    coordinator.request(APP_LOCALES.English);
    expect(writes).toEqual([APP_LOCALES.Spanish]);

    first.resolve();
    await flushPromises();
    expect(writes).toEqual([APP_LOCALES.Spanish, APP_LOCALES.English]);

    second.resolve();
    await flushPromises();
    expect(persisted).toEqual([APP_LOCALES.Spanish, APP_LOCALES.English]);
  });

  it("retries a failed write only after the backoff delay", async () => {
    vi.useFakeTimers();
    const failed = deferred();
    const retry = deferred();
    const persist = vi.fn()
      .mockReturnValueOnce(failed.promise)
      .mockReturnValueOnce(retry.promise);
    const coordinator = new LocalePersistenceCoordinator({ persist, onPersisted: vi.fn() });

    coordinator.request(APP_LOCALES.Spanish);
    failed.reject(new Error("offline"));
    await flushPromises();

    await vi.advanceTimersByTimeAsync(999);
    expect(persist).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(persist).toHaveBeenNthCalledWith(2, APP_LOCALES.Spanish);

    retry.resolve();
    await flushPromises();
    coordinator.deactivate();
  });

  it("lets a newer selection supersede a scheduled retry", async () => {
    vi.useFakeTimers();
    const failed = deferred();
    const newest = deferred();
    const persist = vi.fn()
      .mockReturnValueOnce(failed.promise)
      .mockReturnValueOnce(newest.promise);
    const coordinator = new LocalePersistenceCoordinator({ persist, onPersisted: vi.fn() });

    coordinator.request(APP_LOCALES.Spanish);
    failed.reject(new Error("offline"));
    await flushPromises();

    await vi.advanceTimersByTimeAsync(999);
    expect(persist).toHaveBeenCalledTimes(1);

    coordinator.request(APP_LOCALES.English);
    expect(persist).toHaveBeenLastCalledWith(APP_LOCALES.English);
    await vi.advanceTimersByTimeAsync(1);
    expect(persist).toHaveBeenCalledTimes(2);

    newest.resolve();
    await flushPromises();
    coordinator.deactivate();
  });
});

describe("updatePersistedLocaleCache", () => {
  it("updates only the authenticated user's cache so same-user re-auth cannot replay stale locale data", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.accountLocale("user-a"), { locale: APP_LOCALES.English });
    queryClient.setQueryData(queryKeys.accountLocale("user-b"), { locale: null });

    updatePersistedLocaleCache(queryClient, "user-a", APP_LOCALES.Spanish);

    expect(queryClient.getQueryData(queryKeys.accountLocale("user-a"))).toEqual({ locale: APP_LOCALES.Spanish });
    expect(queryClient.getQueryData(queryKeys.accountLocale("user-b"))).toEqual({ locale: null });
  });
});

describe("pending locale ownership", () => {
  it("does not let one authenticated user's failed write overwrite the next user", () => {
    window.localStorage.clear();
    markLocalePending(APP_LOCALES.Spanish);
    claimPendingLocale("user-a", APP_LOCALES.Spanish);

    expect(getPendingLocaleForUser("user-a")).toBe(APP_LOCALES.Spanish);
    expect(getPendingLocaleForUser("user-b")).toBeNull();
  });

  it("lets an anonymous pre-sign-in choice attach to the first authenticated user", () => {
    window.localStorage.clear();
    markLocalePending(APP_LOCALES.Spanish);

    expect(getPendingLocaleForUser("user-a")).toBe(APP_LOCALES.Spanish);
    claimPendingLocale("user-a", APP_LOCALES.Spanish);
    expect(getPendingLocaleForUser("user-b")).toBeNull();
  });
});
