import type { LearningProgressRow } from "@icpc-trainer/api";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys.js";
import { trpc } from "./trpc.js";

export const useLearningProgress = () => {
  const { userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.learningProgress(userId),
    queryFn: () => trpc.learningProgress.list.query(),
    enabled: userId !== null && userId !== undefined,
    staleTime: 0
  });
};

const replaceProgress = (
  current: readonly LearningProgressRow[] | undefined,
  next: LearningProgressRow
): LearningProgressRow[] => [
  ...(current ?? []).filter((row) => row.guideId !== next.guideId),
  next
];

export const useStartLearningGuide = () => {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.learningProgressStart(userId),
    retry: 2,
    mutationFn: (guideId: Parameters<typeof trpc.learningProgress.start.mutate>[0]["guideId"]) =>
      trpc.learningProgress.start.mutate({ guideId }),
    onSuccess: (progress) => queryClient.setQueryData<LearningProgressRow[]>(
      queryKeys.learningProgress(userId),
      (current) => replaceProgress(current, progress)
    )
  });
};

export const useSetLearningProgressStatus = () => {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.learningProgressSetStatus(userId),
    mutationFn: (input: Parameters<typeof trpc.learningProgress.setStatus.mutate>[0]) =>
      trpc.learningProgress.setStatus.mutate(input),
    onSuccess: (progress) => queryClient.setQueryData<LearningProgressRow[]>(
      queryKeys.learningProgress(userId),
      (current) => replaceProgress(current, progress)
    )
  });
};
