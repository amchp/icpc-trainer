import { RefreshCw } from "lucide-react";

import { Card } from "./components/ui.js";

export function SyncDataPrompt(): React.JSX.Element {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 size-4 text-blue-300" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-zinc-100">No synced data yet.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Click the Sync button to update data for your connected judges.
          </p>
        </div>
      </div>
    </Card>
  );
}
