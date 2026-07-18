import type {
  PlaygroundOperation,
  PlaygroundProvider,
  PlaygroundResult
} from "@icpc-trainer/api";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Braces, Loader2, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { trpc } from "./trpc.js";
import { ProviderDropdown } from "./components/ProviderDropdown.js";
import { Button, Card, FieldLabel, Input, Label, Select, Separator } from "./components/ui.js";
import { useConnectedJudges } from "./ConnectedJudgesContext.js";

const isPlaygroundFailure = (value: unknown): value is Extract<PlaygroundResult, { ok: false }> =>
  typeof value === "object" && value !== null && "ok" in value && value.ok === false;

export function PlaygroundPanel(): React.JSX.Element {
  const { t } = useTranslation("playground");
  const operations: Array<{ value: PlaygroundOperation; label: string }> = [
    { value: "contests", label: t("operations.contests") },
    { value: "contest", label: t("operations.contest") },
    { value: "user", label: t("operations.user") },
    { value: "submissions", label: t("operations.submissions") }
  ];
  const {
    connectedJudges,
    hasConnectedJudge,
    status
  } = useConnectedJudges();
  const [provider, setProvider] = useState<PlaygroundProvider>("codeforces");
  const [operation, setOperation] = useState<PlaygroundOperation>("contest");
  const [contestId, setContestId] = useState("");
  const [userHandle, setUserHandle] = useState("");

  useEffect(() => {
    if (status !== "ready" || connectedJudges.length === 0) {
      return;
    }

    if (!connectedJudges.some((judge) => judge.id === provider)) {
      const firstJudge = connectedJudges[0];
      if (firstJudge) {
        setProvider(firstJudge.id);
      }
    }
  }, [connectedJudges, provider, status]);

  const mutation = useMutation({
    mutationFn: () =>
      trpc.playground.run.mutate({
        provider,
        operation,
        contestId,
        userHandle
      })
  });

  const output = useMemo(() => {
    if (mutation.isError) {
      return JSON.stringify(
        {
          ok: false,
          error: {
            message: mutation.error.message
          }
        },
        null,
        2
      );
    }

    if (mutation.data === undefined) {
      return "{\n  \"result\": null\n}";
    }

    return JSON.stringify(mutation.data, null, 2);
  }, [mutation.data, mutation.error, mutation.isError]);

  const needsContest = operation === "contest";
  const needsUser = operation === "user" || operation === "submissions";
  const hasApiError = isPlaygroundFailure(mutation.data);

  const runPlayground = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    mutation.mutate();
  };

  const resetInputs = (): void => {
    setContestId("");
    setUserHandle("");
    mutation.reset();
  };

  if (status !== "ready" || !hasConnectedJudge) {
    return <div className="min-h-[20rem]" />;
  }

  return (
    <Card className="overflow-hidden">
      <form onSubmit={runPlayground}>
        <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <Braces className="size-4 text-blue-300" aria-hidden="true" />
              {t("panelTitle")}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={resetInputs}>
              <RotateCcw className="size-4" aria-hidden="true" />
              {t("reset")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="size-4" aria-hidden="true" />
              )}
              {t("run")}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ProviderDropdown value={provider} onChange={setProvider} />
              <Label>
                <FieldLabel>{t("operation")}</FieldLabel>
                <Select
                  value={operation}
                  onChange={(event) => setOperation(event.target.value as PlaygroundOperation)}
                >
                  {operations.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Label>
                <FieldLabel>{t("contestId")}</FieldLabel>
                <Input
                  value={contestId}
                  onChange={(event) => setContestId(event.target.value)}
                  placeholder={provider === "qoj" ? "1113" : "566"}
                  required={needsContest}
                />
              </Label>
              <Label>
                <FieldLabel>{t("userHandle")}</FieldLabel>
                <Input
                  value={userHandle}
                  onChange={(event) => setUserHandle(event.target.value)}
                  placeholder={provider === "qoj" ? "qoj_handle" : "tourist"}
                  required={needsUser}
                />
              </Label>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase text-zinc-500">{t("output")}</span>
              {mutation.isError || hasApiError ? (
                <span className="inline-flex items-center gap-1 text-xs text-red-300">
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  {t("error")}
                </span>
              ) : null}
            </div>
            <pre className="max-h-[34rem] min-h-80 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-4 text-xs leading-5 text-zinc-300">
              <code>{output}</code>
            </pre>
          </div>
        </div>
      </form>
    </Card>
  );
}
