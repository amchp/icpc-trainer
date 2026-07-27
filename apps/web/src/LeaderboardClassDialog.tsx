import type { ClassCandidateRow, ClassMemberRow } from "@icpc-trainer/api";
import { JUDGES } from "@icpc-trainer/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, FieldLabel, Input, Label, Select, Skeleton } from "./components/ui.js";
import { formatDate, formatNumber } from "./i18n/format.js";
import { useLocale } from "./i18n/LocaleProvider.js";
import { judgeDisplayLabels } from "./JudgeDisplay.js";
import { localizedErrorMessage } from "./i18n/localizedMessage.js";
import { queryKeys } from "./queryKeys.js";
import { trpc } from "./trpc.js";
import { useToaster } from "./Toaster.js";

const CLASS_LIMIT = 100;

export function LeaderboardClassDialog({
  open,
  onClose
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}): React.JSX.Element {
  const { t } = useTranslation("leaderboard");
  const { locale } = useLocale();
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [judge, setJudge] = useState<JUDGES | "all">("all");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog?.open !== true) dialog?.showModal();
    if (!open && dialog?.open === true) dialog.close();
  }, [open]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const membersQuery = useQuery({
    queryKey: queryKeys.leaderboardClassMembers,
    queryFn: () => trpc.leaderboard.classMembers.query(),
    enabled: open
  });
  const candidatesQuery = useQuery({
    queryKey: queryKeys.leaderboardClassCandidates(
      debouncedSearch,
      judge === "all" ? undefined : judge
    ),
    queryFn: () => trpc.leaderboard.searchClassCandidates.query({
      query: debouncedSearch,
      judge: judge === "all" ? undefined : judge
    }),
    enabled: open && debouncedSearch.length > 0
  });

  const refreshAfterMutation = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboardRoot }),
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboardClassMembers }),
      queryClient.invalidateQueries({ queryKey: ["leaderboard", "classCandidates"] })
    ]);
  };

  const addMutation = useMutation({
    mutationFn: (userId: number) => trpc.leaderboard.addClassMember.mutate({ userId }),
    onSuccess: async () => {
      await refreshAfterMutation();
      toaster.success({ title: t("class.added") });
    },
    onError: (error) => toaster.error({
      title: t("class.updateError"),
      description: localizedErrorMessage(error)
    })
  });
  const removeMutation = useMutation({
    mutationFn: (userId: number) => trpc.leaderboard.removeClassMember.mutate({ userId }),
    onSuccess: async () => {
      await refreshAfterMutation();
      toaster.success({ title: t("class.removed") });
    },
    onError: (error) => toaster.error({
      title: t("class.updateError"),
      description: localizedErrorMessage(error)
    })
  });
  const mutationPending = addMutation.isPending || removeMutation.isPending;
  const members = membersQuery.data ?? [];
  const classFull = members.length >= CLASS_LIMIT;

  const memberRow = (member: ClassMemberRow): React.JSX.Element => (
    <li key={member.userId} className="flex items-center gap-3 border-b border-zinc-800 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm text-zinc-100">{member.username}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {judgeDisplayLabels[member.judge]} · {t("class.solves", {
            count: member.allTimeSolvedCount,
            value: formatNumber(member.allTimeSolvedCount, locale)
          })} · {formatDate(member.addedAt, locale)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        disabled={mutationPending}
        aria-label={t("class.removeAccessible", { username: member.username })}
        onClick={() => removeMutation.mutate(member.userId)}
      >
        {t("class.remove")}
      </Button>
    </li>
  );

  const candidateRow = (candidate: ClassCandidateRow): React.JSX.Element => (
    <li key={candidate.userId} className="flex items-center gap-3 border-b border-zinc-800 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm text-zinc-100">{candidate.username}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {judgeDisplayLabels[candidate.judge]} · {t("class.solves", {
            count: candidate.allTimeSolvedCount,
            value: formatNumber(candidate.allTimeSolvedCount, locale)
          })}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={mutationPending || classFull}
        aria-label={t("class.addAccessible", { username: candidate.username })}
        onClick={() => addMutation.mutate(candidate.userId)}
      >
        {t("class.add")}
      </Button>
    </li>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="leaderboard-class-title"
      className="m-auto max-h-[min(90vh,760px)] w-[calc(100%_-_2rem)] max-w-3xl overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/75"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5">
        <div>
          <h2 id="leaderboard-class-title" className="text-lg font-semibold">{t("class.title")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t("class.count", {
            count: members.length,
            value: formatNumber(members.length, locale),
            limit: formatNumber(CLASS_LIMIT, locale)
          })}</p>
        </div>
        <Button type="button" variant="ghost" className="size-9 p-0" aria-label={t("class.close")} onClick={onClose}>
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid max-h-[calc(min(90vh,760px)_-_85px)] gap-6 overflow-y-auto p-5 md:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold">{t("class.members")}</h3>
          {membersQuery.isLoading ? <Skeleton className="mt-3 h-48" /> : null}
          {membersQuery.isError ? (
            <div className="mt-3 text-sm text-red-200">
              <p>{t("class.loadError")}</p>
              <Button className="mt-3" variant="secondary" type="button" onClick={() => void membersQuery.refetch()}>
                {t("retry")}
              </Button>
            </div>
          ) : null}
          {membersQuery.data?.length === 0 ? <p className="mt-3 text-sm text-zinc-500">{t("class.empty")}</p> : null}
          <ul>{members.map(memberRow)}</ul>
        </section>

        <section>
          <h3 className="text-sm font-semibold">{t("class.find")}</h3>
          <div className="mt-3 grid gap-3">
            <Label>
              <FieldLabel>{t("class.searchLabel")}</FieldLabel>
              <Input
                value={search}
                maxLength={64}
                placeholder={t("class.searchPlaceholder")}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Label>
            <Label>
              <FieldLabel>{t("judgeLabel")}</FieldLabel>
              <Select value={judge} onChange={(event) => setJudge(event.target.value as JUDGES | "all")}>
                <option value="all">{t("judges.all")}</option>
                <option value={JUDGES.Codeforces}>{judgeDisplayLabels.codeforces}</option>
                <option value={JUDGES.Qoj}>{judgeDisplayLabels.qoj}</option>
              </Select>
            </Label>
          </div>
          {classFull ? <p className="mt-3 text-sm text-amber-200">{t("class.limit")}</p> : null}
          {candidatesQuery.isFetching ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {t("class.searching")}
            </p>
          ) : null}
          {candidatesQuery.isError ? (
            <div className="mt-3 text-sm text-red-200">
              <p>{t("class.searchError")}</p>
              <Button className="mt-3" variant="secondary" type="button" onClick={() => void candidatesQuery.refetch()}>
                {t("retry")}
              </Button>
            </div>
          ) : null}
          {debouncedSearch === "" ? <p className="mt-3 text-sm text-zinc-500">{t("class.searchHint")}</p> : null}
          {candidatesQuery.data?.length === 0 ? <p className="mt-3 text-sm text-zinc-500">{t("class.noCandidates")}</p> : null}
          <ul>{candidatesQuery.data?.map(candidateRow)}</ul>
        </section>
      </div>
    </dialog>
  );
}
