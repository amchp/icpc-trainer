import { SignIn, SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { APP_NAME } from "@icpc-trainer/shared";
import { Fragment, useEffect, useState, type ReactNode } from "react";

import { getFirstUserRedirectUrl } from "./firstUserFlow.js";
import { setAuthToken } from "./trpc.js";

function AuthenticatedProviders({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { getToken, sessionId, userId } = useAuth();
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

    setReadyAuthScope(null);
    void waitForToken();

    return () => {
      cancelled = true;
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      setAuthToken(null);
    };
  }, [authScope, getToken]);

  if (readyAuthScope !== authScope) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-8 text-zinc-100 sm:px-8">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
          Preparing your session...
        </div>
      </main>
    );
  }

  return <Fragment key={authScope}>{children}</Fragment>;
}

export function AuthGate({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const firstUserRedirectUrl = getFirstUserRedirectUrl(window.location);

  return (
    <>
      <SignedOut>
        <main className="grid min-h-screen place-items-center px-5 py-8 text-zinc-100 sm:px-8">
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
