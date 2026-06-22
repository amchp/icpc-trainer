import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw } from "lucide-react";

import { trpc } from "./trpc.js";
import { Badge, Button, Card, Separator, Skeleton } from "./components/ui.js";

export function HealthPanel(): React.JSX.Element {
  const health = useQuery({
    queryKey: ["health", "ping"],
    queryFn: () => trpc.health.ping.query(),
    refetchInterval: false,
    retry: 1
  });
  const healthData = health.data;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            <Activity className="size-4 text-blue-300" aria-hidden="true" />
            Runtime health
          </div>
          <p className="mt-1 text-sm text-zinc-500">tRPC query backed by an Effect service.</p>
        </div>
        {health.data ? <Badge>online</Badge> : null}
      </div>

      <Separator className="my-4" />

      {health.isLoading ? (
        <div className="space-y-2" aria-label="Loading health status">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
      ) : health.isError || !healthData ? (
        <div className="space-y-3">
          <p className="text-sm text-red-300">Backend health is unavailable.</p>
          <Button type="button" onClick={() => void health.refetch()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : (
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-zinc-500">Service</dt>
            <dd className="mt-1 font-medium text-zinc-100">{healthData.service}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Database</dt>
            <dd className="mt-1 font-medium text-blue-300">{healthData.database}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Checked</dt>
            <dd className="mt-1 font-medium text-zinc-100">
              {new Date(healthData.timestamp).toLocaleTimeString()}
            </dd>
          </div>
        </dl>
      )}
    </Card>
  );
}
