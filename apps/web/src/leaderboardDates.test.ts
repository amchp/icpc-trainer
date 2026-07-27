import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { localDateRangeToIso } from "./leaderboardDates.js";

const originalTimezone = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "America/New_York";
});

afterAll(() => {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
});

describe("localDateRangeToIso", () => {
  it("builds inclusive local dates with a next-calendar-day exclusive boundary across DST", () => {
    expect(localDateRangeToIso("2026-03-08", "2026-03-08")).toEqual({
      status: "valid",
      range: {
        startAt: "2026-03-08T05:00:00.000Z",
        endAtExclusive: "2026-03-09T04:00:00.000Z"
      }
    });
  });

  it("accepts same-day ranges and distinguishes incomplete, reversed, and cleared input", () => {
    expect(localDateRangeToIso("", "")).toEqual({ status: "empty" });
    expect(localDateRangeToIso("2026-07-01", "")).toEqual({ status: "incomplete" });
    expect(localDateRangeToIso("2026-07-02", "2026-07-01")).toEqual({ status: "reversed" });
    expect(localDateRangeToIso("2026-07-01", "2026-07-01").status).toBe("valid");
  });
});
