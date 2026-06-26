import type { FriendsRoster } from "@icpc-trainer/api";
import { JUDGES } from "@icpc-trainer/shared";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

import {
  Button,
  Card,
  FieldLabel,
  Input,
  Label,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableCount,
  TableHead,
  TableHeader,
  TableRow
} from "./components/ui.js";
import { toJudge } from "./contestFinderModel.js";
import { JudgeDisplay } from "./JudgeDisplay.js";
import type { JudgeProvider } from "./judgeConfig.js";
import { invalidateAfterFriendRosterChange, queryKeys } from "./queryKeys.js";
import { trpc } from "./trpc.js";
import { useRosterMutations } from "./useRosterMutations.js";

export function ContestFinderFriendsTab(): React.JSX.Element {
  const [draftUsername, setDraftUsername] = useState("");
  const [draftJudge, setDraftJudge] = useState<JUDGES>(JUDGES.Codeforces);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const query = useQuery({
    queryKey: queryKeys.friendsRoster,
    queryFn: () => trpc.friends.roster.query()
  });
  const roster = query.data ?? { users: [], updatedAt: null } satisfies FriendsRoster;
  const rosterMutations = useRosterMutations<FriendsRoster>({
    add: trpc.friends.add.mutate,
    errorTitle: "Friend was not saved",
    invalidateAfterSave: invalidateAfterFriendRosterChange,
    queryKey: queryKeys.friendsRoster,
    replace: trpc.friends.replace.mutate
  });

  const addUser = async (): Promise<void> => {
    const saved = await rosterMutations.addUser(draftUsername, draftJudge);
    if (saved) {
      setDraftUsername("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const removeUser = async (username: string, judge: JUDGES): Promise<void> => {
    await rosterMutations.removeUser(roster.users, username, judge);
  };

  return (
    <Card className="p-5">
      <form
        className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void addUser();
        }}
      >
        <Label>
          <FieldLabel>Handle</FieldLabel>
          <Input
            ref={inputRef}
            value={draftUsername}
            onChange={(event) => setDraftUsername(event.target.value)}
            placeholder="tourist"
            disabled={query.isLoading || rosterMutations.saving}
          />
        </Label>
        <Label>
          <FieldLabel>Judge</FieldLabel>
          <Select
            value={draftJudge}
            onChange={(event) => setDraftJudge(toJudge(event.target.value as JudgeProvider))}
            disabled={query.isLoading || rosterMutations.saving}
          >
            <option value={JUDGES.Codeforces}>Codeforces</option>
            <option value={JUDGES.Qoj}>QOJ</option>
          </Select>
        </Label>
        <Button type="submit" disabled={rosterMutations.saving || draftUsername.trim() === ""}>
          {rosterMutations.saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Add friend
        </Button>
      </form>

      <div className="mt-6 overflow-hidden">
        {query.isLoading ? (
          <Skeleton className="my-4 h-32" />
        ) : roster.users.length === 0 ? (
          <>
            <div className="mb-2 flex justify-end">
              <TableCount count={roster.users.length} itemName="friend" />
            </div>
            <p className="py-8 text-center text-sm text-zinc-500">
              No friends added yet.
            </p>
          </>
        ) : (
          <>
            <div className="mb-2 flex justify-end">
              <TableCount count={roster.users.length} itemName="friend" />
            </div>
            <Table className="border-t border-zinc-800">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Judge</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.users.map((user) => (
                  <TableRow key={`${user.judge}:${user.username}`}>
                    <TableCell className="font-mono text-zinc-100">{user.username}</TableCell>
                    <TableCell>
                      <JudgeDisplay judge={user.judge} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 text-zinc-400 hover:text-red-300"
                        onClick={() => void removeUser(user.username, user.judge)}
                        disabled={rosterMutations.saving}
                        aria-label={`Remove ${user.username}`}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </Card>
  );
}
