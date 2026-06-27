import { useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

import { ConnectJudgeProviderPage } from "./ConnectJudgeProviderPage.js";
import { isConnectJudgeProvider } from "./connectJudgeProviders.js";

export function ConnectJudgeProviderRoute(): React.JSX.Element | null {
  const navigate = useNavigate();
  const { provider } = useParams({ strict: false });

  useEffect(() => {
    if (!isConnectJudgeProvider(provider)) {
      void navigate({ to: "/connect-judges" });
    }
  }, [navigate, provider]);

  return isConnectJudgeProvider(provider)
    ? <ConnectJudgeProviderPage provider={provider} />
    : null;
}
