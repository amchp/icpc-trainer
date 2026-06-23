import type { JudgeSyncInput } from "@icpc-trainer/api";

import { cn } from "./lib.js";

export type JudgeDisplayId = JudgeSyncInput["provider"];

export const judgeDisplayLabels: Record<JudgeDisplayId, string> = {
  codeforces: "Codeforces",
  qoj: "QOJ"
};

export const judgeSearchText = (judge: JudgeDisplayId): string =>
  `${judge} ${judgeDisplayLabels[judge]}`;

export function JudgeDisplay({
  judge,
  className
}: {
  readonly judge: JudgeDisplayId;
  readonly className?: string;
}): React.JSX.Element {
  const label = judgeDisplayLabels[judge];

  return (
    <span
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-6 min-w-8 items-center justify-center rounded-sm text-xs font-semibold text-zinc-200",
        className
      )}
    >
      {judge === "codeforces" ? (
        <CodeforcesIcon className="size-5" />
      ) : (
        <span className="font-mono tracking-normal">QOJ</span>
      )}
    </span>
  );
}

function CodeforcesIcon({
  className
}: {
  readonly className?: string;
}): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#F44336"
        d="M24 19.5V12a1.5 1.5 0 0 0-1.5-1.5h-3A1.5 1.5 0 0 0 18 12v7.5a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5z"
      />
      <path
        fill="#2196F3"
        d="M13.5 21a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 13.5 3h-3C9.673 3 9 3.672 9 4.5v15c0 .828.673 1.5 1.5 1.5h3z"
      />
      <path
        fill="#FFC107"
        d="M0 19.5c0 .828.673 1.5 1.5 1.5h3A1.5 1.5 0 0 0 6 19.5V9a1.5 1.5 0 0 0-1.5-1.5h-3C.673 7.5 0 8.172 0 9v10.5z"
      />
    </svg>
  );
}
