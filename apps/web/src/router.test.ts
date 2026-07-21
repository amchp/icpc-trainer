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
    expect(router.state.matches.at(-1)?.routeId).toBe("/resources-app/resources/$");
  });

  it("recognizes the stable Introduction guide URL", async () => {
    await router.navigate({ to: "/resources/introduction" });
    expect(router.state.location.pathname).toBe("/resources/introduction");
  });

  it("recognizes the stable Programming Fundamentals guide URL", async () => {
    await router.navigate({ to: "/resources/programming-fundamentals" });
    expect(router.state.location.pathname).toBe("/resources/programming-fundamentals");
  });

  it("recognizes the protected Leaderboard URL", async () => {
    await router.navigate({ to: "/leaderboard" });
    expect(router.state.location.pathname).toBe("/leaderboard");
  });

  it("recognizes the stable Time & Space Complexity guide URL", async () => {
    await router.navigate({ to: "/resources/time-complexity" });
    expect(router.state.location.pathname).toBe("/resources/time-complexity");
  });
});
