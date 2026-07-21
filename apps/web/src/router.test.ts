import { describe, expect, it } from "vitest";

import { router } from "./router.js";

describe("router", () => {
  it("redirects the index route to Find Problems", async () => {
    await router.navigate({ to: "/" });

    expect(router.state.location.pathname).toBe("/find-problems");
  });

  it("recognizes the stable Introduction guide URL", async () => {
    await router.navigate({ to: "/resources/introduction" });
    expect(router.state.location.pathname).toBe("/resources/introduction");
  });

  it("recognizes the stable Programming Fundamentals guide URL", async () => {
    await router.navigate({ to: "/resources/programming-fundamentals" });
    expect(router.state.location.pathname).toBe("/resources/programming-fundamentals");
  });

  it("recognizes the stable Time & Space Complexity guide URL", async () => {
    await router.navigate({ to: "/resources/time-complexity" });
    expect(router.state.location.pathname).toBe("/resources/time-complexity");
  });
});
