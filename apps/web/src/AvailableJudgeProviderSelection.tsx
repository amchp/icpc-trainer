import { useNavigate } from "@tanstack/react-router";

import { Button } from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { connectJudgeProviders } from "./connectJudgeProviders.js";
import { JudgeDisplay } from "./JudgeDisplay.js";

export function AvailableJudgeProviderSelection(): React.JSX.Element {
  const navigate = useNavigate();
  const { connectedJudges } = useConnectedJudges();
  const connectedJudgeIds = new Set(connectedJudges.map((judge) => judge.id));
  const availableProviders = connectJudgeProviders.filter((provider) => !connectedJudgeIds.has(provider.id));

  if (availableProviders.length === 0) {
    return <p className="text-sm text-zinc-500">All connected</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {availableProviders.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="secondary"
          className="h-auto justify-start rounded-lg bg-zinc-950/72 p-4 text-left"
          data-testid={`connect-judges-provider-${provider.id}`}
          onClick={() => void navigate({ to: `/connect-judges/${provider.id}` })}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <JudgeDisplay judge={provider.id} className="h-5 min-w-5" />
            {provider.name}
          </span>
        </Button>
      ))}
    </div>
  );
}
