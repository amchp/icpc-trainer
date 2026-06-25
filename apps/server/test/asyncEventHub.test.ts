import { describe, expect, it } from "vitest";

import { createAsyncEventHub } from "../src/asyncEventHub.js";

describe("createAsyncEventHub", () => {
  it("bounds queued websocket events for slow subscribers", async () => {
    const hub = createAsyncEventHub<number>({ maxBufferedEvents: 2 });
    const iterator = hub.subscribe()[Symbol.asyncIterator]();

    hub.publish(1);
    hub.publish(2);
    hub.publish(3);

    await expect(iterator.next()).resolves.toEqual({ done: false, value: 2 });
    await expect(iterator.next()).resolves.toEqual({ done: false, value: 3 });
    await iterator.return?.();
  });
});
