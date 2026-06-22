import { useNavigate } from "@tanstack/react-router";
import { KeyRound, ShieldCheck } from "lucide-react";

import { Button } from "./components/ui.js";
import { connectJudgeProviders } from "./connectJudgesShared.js";

export function ConnectJudgesProviderSelection(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {connectJudgeProviders.map((provider) => {
        const Icon = provider.id === "codeforces" ? KeyRound : ShieldCheck;
        return (
          <Button
            key={provider.id}
            type="button"
            variant="secondary"
            className="h-auto justify-start rounded-lg bg-zinc-950/72 p-4 text-left"
            data-testid={`connect-judges-provider-${provider.id}`}
            onClick={() => void navigate({ to: `/connect-judges/${provider.id}` })}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Icon className="size-4 text-blue-300" aria-hidden="true" />
              {provider.name}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
