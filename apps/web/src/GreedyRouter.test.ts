import { describe, expect, it } from "vitest";

import { router } from "./router.js";

describe("Greedy Algorithms route", () => {
  it("recognizes the stable direct URL before the resources catch-all", async () => {
    await router.navigate({ to: "/resources/greedy" });
    expect(router.state.location.pathname).toBe("/resources/greedy");
    expect(router.state.matches.at(-1)?.routeId).toBe("/resources-app/resources/greedy");
  });
});
