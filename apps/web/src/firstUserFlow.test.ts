import { describe, expect, it } from "vitest";

import { getFirstUserRedirectUrl, isAnimationsPath, isResourcesPath } from "./firstUserFlow.js";

describe("first user flow", () => {
  it.each([
    ["/animations", true], ["/animations/", true], ["/animations/permutations", true],
    ["/animations-old", false], ["/animations.example.com", false], ["//evil.example/animations", false]
  ])("classifies %s as an animation destination: %s", (pathname, expected) => {
    expect(isAnimationsPath(pathname)).toBe(expected);
  });

  it("preserves shared workspaces and catalog filters after authentication", () => {
    expect(getFirstUserRedirectUrl({ pathname: "/animations/permutations", search: "?q=recursive&topic=brute-force" }))
      .toBe("/animations/permutations?q=recursive&topic=brute-force");
    expect(getFirstUserRedirectUrl({ pathname: "/animations", search: "?q=BFS" })).toBe("/animations?q=BFS");
  });
  it.each([
    ["/resources", true],
    ["/resources/", true],
    ["/resources/graphs/shortest-path", true],
    ["/resources-old", false],
    ["/find-problems", false]
  ])("classifies %s as a resources destination: %s", (pathname, expected) => {
    expect(isResourcesPath(pathname)).toBe(expected);
  });

  it("preserves a resources destination and its query string after authentication", () => {
    expect(getFirstUserRedirectUrl({
      pathname: "/resources/graphs/shortest-path",
      search: "?language=es"
    })).toBe("/resources/graphs/shortest-path?language=es");
  });

  it("uses the normal first-user destination for every other path", () => {
    expect(getFirstUserRedirectUrl({
      pathname: "/contests",
      search: "?source=invite"
    })).toBe("/");
  });
});
