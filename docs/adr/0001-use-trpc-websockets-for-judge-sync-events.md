# 0001 Use tRPC WebSockets for Judge Sync Events

## Status

Accepted

## Context

Judge sync is a long-running operation that needs to report live progress to the UI. The app already uses tRPC for API calls, but its existing client/server transport was HTTP-only.

tRPC v11 supports subscription streams over multiple transports. Server-Sent Events would be simpler for one-way progress updates, but the product decision for this sync API is to use WebSockets through tRPC subscriptions.

## Decision

Use tRPC WebSockets for live judge sync progress events.

The `judges.sync` API starts sync work when a client subscribes and streams progress, error, and completion events until the operation finishes.

## Consequences

The server must host a WebSocket handler alongside the existing HTTP tRPC handler. The web client must split tRPC traffic so subscriptions use `wsLink` while queries and mutations keep using HTTP batching.

This creates a little more transport setup than SSE, but keeps live sync events inside the tRPC subscription model selected for this feature.
