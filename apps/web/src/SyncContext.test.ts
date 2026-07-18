import { APP_LOCALES } from "@icpc-trainer/shared";
import { describe, expect, it } from "vitest";

import { i18n } from "./i18n/i18n.js";
import { completionSummaryDescription } from "./SyncContext.js";

describe("sync completion summary", () => {
  it("uses Spanish catalog copy, locale-formatted counts, and plurals", () => {
    const summary = completionSummaryDescription({
      usersProcessed: 0,
      submissionsFetched: 0,
      submissionsInserted: 1_234,
      submissionsUpdated: 1,
      submissionsSkipped: 0,
      contestsSynced: 1,
      regularContestsImported: 1,
      regularProblemsImported: 1,
      regularPendingSubmissionsRetried: 0,
      errors: 0
    }, i18n.getFixedT(APP_LOCALES.Spanish, "shell"), APP_LOCALES.Spanish);

    expect(summary).toContain("Concursos: 2 concursos nuevos/actualizados");
    expect(summary).toContain("Problemas: 1 problema importado");
    expect(summary).toContain("Envíos: 1234 envíos nuevos, 1 envío actualizado");
    expect(summary).not.toContain("Submissions");
  });
});
