import type { TeamRoster } from "@icpc-trainer/api";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

import {
  Button,
  FieldLabel,
  Input,
  Label,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";
import { JudgeDisplay, type JudgeDisplayId } from "./JudgeDisplay.js";
import { judgeLabel, type JudgeProvider } from "./judgeConfig.js";
import { trpc } from "./trpc.js";
import { useToaster } from "./Toaster.js";

const toJudge = (value: JudgeProvider | JUDGES): JUDGES =>
  value === JUDGES.Qoj ? JUDGES.Qoj : JUDGES.Codeforces;

export function TeamPage(): React.JSX.Element {
  const { connectedJudges, hasConnectedJudge, status } = useConnectedJudges();
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const [draftUsername, setDraftUsername] = useState("");
  const [draftJudge, setDraftJudge] = useState<JUDGES>(JUDGES.Codeforces);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const query = useQuery({
    queryKey: ["team", "roster"],
    queryFn: () => trpc.team.roster.query(),
    enabled: status === "ready" && hasConnectedJudge
  });
  const roster = query.data ?? { users: [], updatedAt: null } satisfies TeamRoster;
  const judgeOptions = connectedJudges.length > 0
    ? connectedJudges
    : [
        { id: JUDGES.Codeforces, label: judgeLabel(JUDGES.Codeforces) },
        { id: JUDGES.Qoj, label: judgeLabel(JUDGES.Qoj) }
      ];
  const selectedJudge = judgeOptions.some((judge) => judge.id === draftJudge)
    ? draftJudge
    : toJudge(judgeOptions[0]?.id ?? JUDGES.Codeforces);

  if (status !== "ready" || !hasConnectedJudge) {
    return <main className="min-h-screen bg-zinc-950" />;
  }

  const replaceRoster = async (users: TeamRoster["users"]): Promise<boolean> => {
    setSaving(true);
    try {
      const nextRoster = await trpc.team.replace.mutate({
        users: users.map((user) => ({
          username: user.username,
          judge: user.judge
        }))
      });
      queryClient.setQueryData(["team", "roster"], nextRoster);
      return true;
    } catch (error) {
      toaster.error({
        title: "User was not saved",
        description: error instanceof Error ? error.message : String(error)
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addUser = async (): Promise<void> => {
    const nextUsername = draftUsername.trim();
    if (nextUsername === "") {
      return;
    }

    const duplicate = roster.users.some(
      (user) =>
        user.username.toLowerCase() === nextUsername.toLowerCase() &&
        user.judge === selectedJudge
    );
    if (duplicate) {
      setDraftUsername("");
      return;
    }

    const saved = await replaceRoster([
      ...roster.users,
      {
        username: nextUsername,
        judge: selectedJudge,
        type: USER_TYPES.Team
      }
    ]);
    if (saved) {
      setDraftUsername("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const removeUser = async (username: string, judge: JUDGES): Promise<void> => {
    await replaceRoster(
      roster.users.filter(
        (user) =>
          user.username.toLowerCase() !== username.toLowerCase() ||
          user.judge !== judge
      )
    );
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        </div>
      </section>

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
              disabled={query.isLoading || saving}
            />
          </Label>
          <Label>
            <FieldLabel>Judge</FieldLabel>
            <Select
              value={selectedJudge}
              onChange={(event) => setDraftJudge(toJudge(event.target.value as JudgeProvider))}
              disabled={query.isLoading || saving}
            >
              {judgeOptions.map((judge) => (
                <option key={judge.id} value={judge.id}>
                  {judge.label}
                </option>
              ))}
            </Select>
          </Label>
          <Button
            type="submit"
            className="sm:w-auto"
            disabled={saving || draftUsername.trim() === ""}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Add user
          </Button>
        </form>

        <div className="mt-6 overflow-hidden">
          {query.isLoading ? (
            <Skeleton className="my-4 h-32" />
          ) : roster.users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Judge</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.users.map((user, index) => (
                  <TableRow key={`${user.judge}:${user.username}`}>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-zinc-100">
                      {user.username}
                    </TableCell>
                    <TableCell>
                      <JudgeDisplay judge={user.judge as JudgeDisplayId} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 text-zinc-400 hover:text-red-300"
                        onClick={() => void removeUser(user.username, user.judge)}
                        disabled={saving}
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
          ) : (
            <p className="py-8 text-center text-sm text-zinc-500">
              No team users added yet. Add the first handle above.
            </p>
          )}
        </div>
    </main>
  );
}
