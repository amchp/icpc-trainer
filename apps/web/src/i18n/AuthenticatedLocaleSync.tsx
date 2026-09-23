import type { AppLocale } from "@icpc-trainer/shared";
import { useAuth } from "@clerk/clerk-react";
import { type QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { queryKeys } from "../queryKeys.js";
import { trpc } from "../trpc.js";
import { useLocale } from "./LocaleProvider.js";
import {
  claimPendingLocale,
  clearPendingLocale,
  getPendingLocaleForUser
} from "./storage.js";

const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 30_000;

interface LocalePersistenceCoordinatorOptions {
  readonly persist: (locale: AppLocale) => Promise<unknown>;
  readonly onPersisted: (locale: AppLocale) => void;
}

/** Serializes account writes while retaining only the newest requested locale. */
export class LocalePersistenceCoordinator {
  private readonly persist: LocalePersistenceCoordinatorOptions["persist"];
  private readonly onPersisted: LocalePersistenceCoordinatorOptions["onPersisted"];
  private inFlight: AppLocale | null = null;
  private queued: AppLocale | null = null;
  private retryAttempt = 0;
  private retryLocale: AppLocale | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private inactive = false;

  constructor({ persist, onPersisted }: LocalePersistenceCoordinatorOptions) {
    this.persist = persist;
    this.onPersisted = onPersisted;
  }

  activate(): void {
    this.inactive = false;
  }

  deactivate(): void {
    this.inactive = true;
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.retryLocale = null;
  }

  request(locale: AppLocale): void {
    if (this.inactive) return;
    if (this.inFlight !== null) {
      this.queued = locale;
      return;
    }
    if (this.retryTimer !== null) {
      if (this.retryLocale === locale) return;
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
      this.retryLocale = null;
      this.retryAttempt = 0;
    }
    this.start(locale);
  }

  private start(locale: AppLocale): void {
    this.inFlight = locale;
    let request: Promise<unknown>;
    try {
      request = this.persist(locale);
    } catch {
      this.handleFailure(locale);
      return;
    }
    void request.then(
      () => this.handleSuccess(locale),
      () => this.handleFailure(locale),
    );
  }

  private handleSuccess(locale: AppLocale): void {
    this.inFlight = null;
    this.onPersisted(locale);
    if (this.inactive) return;

    const nextLocale = this.takeQueued();
    this.retryAttempt = 0;
    if (nextLocale !== null && nextLocale !== locale) this.start(nextLocale);
  }

  private handleFailure(locale: AppLocale): void {
    this.inFlight = null;
    if (this.inactive) return;

    const nextLocale = this.takeQueued();
    if (nextLocale !== null && nextLocale !== locale) {
      this.retryAttempt = 0;
      this.start(nextLocale);
      return;
    }

    const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** this.retryAttempt, RETRY_MAX_DELAY_MS);
    this.retryAttempt += 1;
    this.retryLocale = locale;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.retryLocale = null;
      if (!this.inactive) this.start(locale);
    }, delay);
  }

  private takeQueued(): AppLocale | null {
    const queued = this.queued;
    this.queued = null;
    return queued;
  }
}

export const updatePersistedLocaleCache = (
  queryClient: QueryClient,
  userId: string,
  locale: AppLocale,
): void => {
  queryClient.setQueryData(queryKeys.accountLocale(userId), { locale });
};

export function AuthenticatedLocaleSync({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { userId } = useAuth();
  const { locale, applyAccountLocale } = useLocale();
  const queryClient = useQueryClient();
  const reconciledUserId = useRef<string | null>(null);
  const activeUserId = useRef<string | null>(null);
  const localeQuery = useQuery({
    queryKey: queryKeys.accountLocale(userId),
    // Preferences must not hold table responses behind the same HTTP batch.
    queryFn: () => trpc.account.locale.query(undefined, { context: { skipBatch: true } }),
    enabled: userId !== null && userId !== undefined,
    staleTime: Infinity
  });
  const persistence = useMemo(() => new LocalePersistenceCoordinator({
    persist: (nextLocale) => trpc.account.setLocale.mutate({ locale: nextLocale }),
    onPersisted: (persistedLocale) => {
      if (userId !== null && userId !== undefined) {
        updatePersistedLocaleCache(queryClient, userId, persistedLocale);
      }
      if (
        userId !== null &&
        userId !== undefined &&
        activeUserId.current === userId &&
        getPendingLocaleForUser(userId) === persistedLocale
      ) {
        clearPendingLocale();
      }
    }
  }), [queryClient, userId]);

  useEffect(() => {
    activeUserId.current = userId ?? null;
    persistence.activate();
    return () => {
      if (activeUserId.current === userId) activeUserId.current = null;
      persistence.deactivate();
    };
  }, [persistence, userId]);

  useEffect(() => {
    if (userId === null || userId === undefined || localeQuery.data === undefined) return;
    if (reconciledUserId.current === userId) return;

    const pending = getPendingLocaleForUser(userId);
    const accountLocale = localeQuery.data.locale;
    reconciledUserId.current = userId;
    if (pending !== null) {
      claimPendingLocale(userId, pending);
      persistence.request(pending);
    } else if (accountLocale !== null) {
      applyAccountLocale(accountLocale);
    } else {
      persistence.request(locale);
    }
  }, [applyAccountLocale, locale, localeQuery.data, persistence, userId]);

  useEffect(() => {
    if (reconciledUserId.current !== userId) return;
    if (userId === null || userId === undefined) return;
    const pending = getPendingLocaleForUser(userId);
    if (pending !== null) {
      claimPendingLocale(userId, pending);
      persistence.request(pending);
    }
  }, [locale, persistence, userId]);

  return <>{children}</>;
}
