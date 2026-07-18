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

  it("redirects the locked Programming Fundamentals guide", async () => {
    await router.navigate({ to: "/resources/programming-fundamentals" });
    expect(router.state.location.pathname).toBe("/resources");
  });
});
