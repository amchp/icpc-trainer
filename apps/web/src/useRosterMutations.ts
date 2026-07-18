import { JUDGES } from "@icpc-trainer/shared";
import { useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { useToaster } from "./Toaster.js";
import { localizedErrorMessage } from "./i18n/localizedMessage.js";

interface RosterUserInput {
  readonly username: string;
  readonly judge: JUDGES;
}

interface RosterResult {
  readonly users: readonly RosterUserInput[];
}

export function useRosterMutations<TRoster extends RosterResult>({
  add,
  errorTitle,
  invalidateAfterSave,
  queryKey,
  replace
}: {
  readonly add: (input: RosterUserInput) => Promise<TRoster>;
  readonly errorTitle: string;
  readonly invalidateAfterSave: (queryClient: QueryClient) => void;
  readonly queryKey: QueryKey;
  readonly replace: (input: { readonly users: RosterUserInput[] }) => Promise<TRoster>;
}): {
  readonly saving: boolean;
  readonly addUser: (username: string, judge: JUDGES) => Promise<boolean>;
  readonly removeUser: (
    users: readonly RosterUserInput[],
    username: string,
    judge: JUDGES
  ) => Promise<boolean>;
} {
  const queryClient = useQueryClient();
  const toaster = useToaster();
  const [saving, setSaving] = useState(false);

  const saveRoster = useCallback((nextRoster: TRoster) => {
    queryClient.setQueryData(queryKey, nextRoster);
    invalidateAfterSave(queryClient);
  }, [invalidateAfterSave, queryClient, queryKey]);

  const showError = useCallback((error: unknown) => {
    toaster.error({
      title: errorTitle,
      description: localizedErrorMessage(error)
    });
  }, [errorTitle, toaster]);

  const replaceRoster = useCallback(async (users: readonly RosterUserInput[]): Promise<boolean> => {
    setSaving(true);
    try {
      const nextRoster = await replace({
        users: users.map((user) => ({
          username: user.username,
          judge: user.judge
        }))
      });
      saveRoster(nextRoster);
      return true;
    } catch (error) {
      showError(error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [replace, saveRoster, showError]);

  const addUser = useCallback(async (username: string, judge: JUDGES): Promise<boolean> => {
    const nextUsername = username.trim();
    if (nextUsername === "") {
      return false;
    }

    setSaving(true);
    try {
      const nextRoster = await add({ username: nextUsername, judge });
      saveRoster(nextRoster);
      return true;
    } catch (error) {
      showError(error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [add, saveRoster, showError]);

  const removeUser = useCallback((
    users: readonly RosterUserInput[],
    username: string,
    judge: JUDGES
  ): Promise<boolean> =>
    replaceRoster(
      users.filter(
        (user) =>
          user.username.toLowerCase() !== username.toLowerCase() ||
          user.judge !== judge
      )
    ), [replaceRoster]);

  return {
    saving,
    addUser,
    removeUser
  };
}
