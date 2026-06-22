import type { CredentialStatus } from "@icpc-trainer/api";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { connectedJudgesFromCredentialStatus, emptyCredentialStatus, type JudgeProvider } from "./judgeConfig.js";
import { trpc } from "./trpc.js";

export interface ConnectedJudge {
  readonly id: JudgeProvider;
  readonly label: string;
}

interface ConnectedJudgesContextValue {
  readonly status: "loading" | "ready" | "error";
  readonly credentialStatus: CredentialStatus;
  readonly connectedJudges: readonly ConnectedJudge[];
  readonly hasConnectedJudge: boolean;
  readonly refresh: () => Promise<CredentialStatus>;
  readonly setCredentialStatus: (status: CredentialStatus) => void;
}

const ConnectedJudgesContext = createContext<ConnectedJudgesContextValue | null>(null);

export function ConnectedJudgesProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const [credentialStatus, setCredentialStatusState] = useState<CredentialStatus>(emptyCredentialStatus);
  const [status, setStatus] = useState<ConnectedJudgesContextValue["status"]>("loading");

  const setCredentialStatus = useCallback((nextStatus: CredentialStatus) => {
    setCredentialStatusState(nextStatus);
    setStatus("ready");
  }, []);

  const refresh = useCallback(async () => {
    const nextStatus = await trpc.credentials.status.query();
    setCredentialStatus(nextStatus);
    return nextStatus;
  }, [setCredentialStatus]);

  useEffect(() => {
    let active = true;
    const subscription = trpc.credentials.events.subscribe(undefined, {
      onData: (event) => {
        if (active) {
          setCredentialStatus(event.status);
        }
      },
      onError: () => {
        if (active) {
          setStatus("error");
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [setCredentialStatus]);

  const connectedJudges = useMemo(
    () => connectedJudgesFromCredentialStatus(credentialStatus),
    [credentialStatus]
  );

  const value = useMemo<ConnectedJudgesContextValue>(() => ({
    status,
    credentialStatus,
    connectedJudges,
    hasConnectedJudge: connectedJudges.length > 0,
    refresh,
    setCredentialStatus
  }), [connectedJudges, credentialStatus, refresh, setCredentialStatus, status]);

  return <ConnectedJudgesContext.Provider value={value}>{children}</ConnectedJudgesContext.Provider>;
}

export function useConnectedJudges(): ConnectedJudgesContextValue {
  const context = useContext(ConnectedJudgesContext);
  if (!context) {
    throw new Error("useConnectedJudges must be used inside ConnectedJudgesProvider.");
  }
  return context;
}
