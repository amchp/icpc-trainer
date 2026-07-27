export interface LocalDateRange {
  readonly startAt: string;
  readonly endAtExclusive: string;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const localMidnight = (value: string): Date | undefined => {
  const match = DATE_PATTERN.exec(value);
  if (match === null) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
};

export type LocalDateRangeResult =
  | { readonly status: "empty" | "incomplete" | "reversed" | "invalid" }
  | { readonly status: "valid"; readonly range: LocalDateRange };

export const localDateRangeToIso = (
  startDate: string,
  endDate: string
): LocalDateRangeResult => {
  if (startDate === "" && endDate === "") return { status: "empty" };
  if (startDate === "" || endDate === "") return { status: "incomplete" };

  const start = localMidnight(startDate);
  const end = localMidnight(endDate);
  if (start === undefined || end === undefined) return { status: "invalid" };
  if (end < start) return { status: "reversed" };

  const endAtExclusive = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() + 1
  );
  return {
    status: "valid",
    range: {
      startAt: start.toISOString(),
      endAtExclusive: endAtExclusive.toISOString()
    }
  };
};

