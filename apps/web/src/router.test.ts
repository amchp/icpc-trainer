import { describe, expect, it } from "vitest";

import { router } from "./router.js";

describe("router", () => {
  it("redirects the index route to Find Problems", async () => {
    await router.navigate({ to: "/" });

    expect(router.state.location.pathname).toBe("/find-problems");
  });
});
