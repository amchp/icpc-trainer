import { describe, expect, it } from "vitest";

import { router } from "./router.js";

describe("Brute Force route", () => {
  it("recognizes the stable direct URL", async () => {
    await router.navigate({ to: "/resources/brute-force" });
    expect(router.state.location.pathname).toBe("/resources/brute-force");
    expect(router.state.matches.at(-1)?.routeId).toBe("/resources-app/resources/brute-force");
  });
});
