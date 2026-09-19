import { describe, expect, it } from "vitest";

import { router } from "./router.js";

describe("router", () => {
  it("routes animation workspaces outside the judge-connection layout and preserves search", async () => {
    await router.navigate({ to: "/animations/$groupId", params: { groupId: "permutations" }, search: { q: "recursive", topic: "brute-force" } });
    expect(router.state.location.pathname).toBe("/animations/permutations");
    expect(router.state.location.search).toEqual({ q: "recursive", topic: "brute-force" });
    expect(router.state.matches.map(({ routeId }) => routeId)).not.toContain("/app");
    expect(router.state.matches.at(-1)?.routeId).toBe("/animations-app/animations/$groupId");
  });

  it("recognizes unknown animation IDs for the workspace not-found view", async () => {
    await router.navigate({ to: "/animations/$groupId", params: { groupId: "not-an-animation" } });
    expect(router.state.matches.at(-1)?.routeId).toBe("/animations-app/animations/$groupId");
  });
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

  it("recognizes the stable Data Structures guide URL", async () => {
    await router.navigate({ to: "/resources/data-structures" });
    expect(router.state.location.pathname).toBe("/resources/data-structures");
  });

  it("recognizes the stable Dynamic Programming guide URL", async () => {
    await router.navigate({ to: "/resources/dynamic-programming" });
    expect(router.state.location.pathname).toBe("/resources/dynamic-programming");
  });

  it("recognizes the stable Graph Theory guide URL", async () => {
    await router.navigate({ to: "/resources/graph-theory" });
    expect(router.state.location.pathname).toBe("/resources/graph-theory");
  });

  it("recognizes the stable Greedy Algorithms guide URL", async () => {
    await router.navigate({ to: "/resources/greedy" });
    expect(router.state.location.pathname).toBe("/resources/greedy");
  });
});
