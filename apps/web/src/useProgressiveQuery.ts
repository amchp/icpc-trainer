import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";

export function useProgressiveQuery<T>({
  queryKey,
  queryFn,
  enabled = true
}: {
  readonly queryKey: QueryKey;
  readonly queryFn: (input?: { readonly limit?: number }) => Promise<T>;
  readonly enabled?: boolean;
}) {
  const client = useQueryClient();
  const cached = client.getQueryData<T>(queryKey);
  const initial = useQuery({
    queryKey: [...queryKey, { limit: 50 }],
    queryFn: () => queryFn({ limit: 50 }),
    enabled: enabled && cached === undefined,
    staleTime: 30_000,
    retry: false
  });
  const full = useQuery({
    queryKey,
    queryFn: () => queryFn(),
    // A separate request lets the initial rows render before the full response.
    enabled: enabled && (cached !== undefined || initial.isFetched),
    staleTime: 30_000
  });
  const data = full.data ?? initial.data;
  return {
    ...full,
    data,
    isPartial: full.data === undefined,
    isLoading: enabled && data === undefined && !full.isError,
    isFetching: initial.isFetching || full.isFetching
  };
}
