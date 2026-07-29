import { describe, expect, it } from "vitest";

import { router } from "./router.js";

describe("Binary Search route", () => {
  it("recognizes the stable direct URL", async () => {
    await router.navigate({ to: "/resources/binary-search" });
    expect(router.state.location.pathname).toBe("/resources/binary-search");
    expect(router.state.matches.at(-1)?.routeId).toBe("/resources-app/resources/binary-search");
  });
});
