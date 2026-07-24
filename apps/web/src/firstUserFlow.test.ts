import { describe, expect, it } from "vitest";

import { getFirstUserRedirectUrl, isResourcesPath } from "./firstUserFlow.js";

describe("first user flow", () => {
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
