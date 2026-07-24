import { describe, expect, it } from "vitest";

import { router } from "./router.js";

describe("router", () => {
  it("redirects the index route to Find Problems", async () => {
    await router.navigate({ to: "/" });

    expect(router.state.location.pathname).toBe("/find-problems");
  });

  it("routes resources subpaths to the resources area", async () => {
    await router.navigate({
      to: "/resources/$",
      params: {
        _splat: "graphs/shortest-path"
      }
    });

    expect(router.state.location.pathname).toBe("/resources/graphs/shortest-path");
    expect(router.state.matches.at(-1)?.routeId).toBe("/app/resources/$");
  });
});
