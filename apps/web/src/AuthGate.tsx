import { SignIn, SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { APP_NAME } from "@icpc-trainer/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { getFirstUserRedirectUrl } from "./firstUserFlow.js";
import { AuthenticatedLocaleSync } from "./i18n/AuthenticatedLocaleSync.js";
import { LanguageButton } from "./i18n/LanguageButton.js";
import { clearAuthenticatedQueryCache } from "./queryKeys.js";
import { setAuthToken } from "./trpc.js";

function AuthenticatedProviders({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { t } = useTranslation("shell");
  const { getToken, sessionId, userId } = useAuth();
  const queryClient = useQueryClient();
  const [readyAuthScope, setReadyAuthScope] = useState<string | null>(null);
  const authScope = `${userId ?? "anonymous"}:${sessionId ?? "no-session"}`;

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const waitForToken = async (): Promise<void> => {
      const token = await getToken();
      if (cancelled) {
        return;
      }

      if (token !== null) {
        setAuthToken(token, getToken);
        setReadyAuthScope(authScope);
        return;
      }

      timeout = setTimeout(() => {
        void waitForToken();
      }, 100);
    };

    clearAuthenticatedQueryCache(queryClient);
    setReadyAuthScope(null);
    void waitForToken();

    return () => {
      cancelled = true;
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      setAuthToken(null);
      clearAuthenticatedQueryCache(queryClient);
    };
  }, [authScope, getToken, queryClient]);

  if (readyAuthScope !== authScope) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-8 text-zinc-100 sm:px-8">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
          {t("preparingSession")}
        </div>
      </main>
    );
  }

  return <Fragment key={authScope}><AuthenticatedLocaleSync>{children}</AuthenticatedLocaleSync></Fragment>;
}

export function AuthGate({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const isResourcesPreview =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("preview") === "resources";

  if (isResourcesPreview) {
    return <>{children}</>;
  }

  const firstUserRedirectUrl = getFirstUserRedirectUrl(window.location);

  return (
    <>
      <SignedOut>
        <main className="relative grid min-h-screen place-items-center px-5 py-8 text-zinc-100 sm:px-8">
          <LanguageButton className="absolute right-5 top-5 sm:right-8 sm:top-8" />
          <section className="grid w-full max-w-md gap-5">
            <div className="flex items-center justify-center gap-2">
              <img src="/icpc_trainer.png" alt="" className="size-9 object-contain" />
              <span className="text-sm font-semibold text-zinc-100">{APP_NAME}</span>
            </div>
            <SignIn
              routing="hash"
              signUpForceRedirectUrl={firstUserRedirectUrl}
              fallbackRedirectUrl={firstUserRedirectUrl}
            />
          </section>
        </main>
      </SignedOut>
      <SignedIn>
        <AuthenticatedProviders>{children}</AuthenticatedProviders>
      </SignedIn>
    </>
  );
}
