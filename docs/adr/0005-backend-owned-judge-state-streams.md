# 0005 Use Backend-Owned Judge State Streams

## Status

Accepted

## Context

Judge credentials and active judge sync progress must remain correct after a frontend reload or when multiple windows are open. The existing sync API used a tRPC subscription where subscribing started sync work. That made it difficult for a new window to observe backend state without also behaving like a sync starter.

ADR 0001 selected tRPC WebSockets for live judge sync events. This decision keeps WebSockets, but supersedes the part where the subscription starts the sync operation.

## Decision

Use separate commands and observer subscriptions for backend-owned judge state.

Credential save and clear operations publish status-only credential events. The event payload contains whether credentials are saved and validation timestamps; it never contains API keys, API secrets, cookies, encrypted payloads, or decrypted credential material.

Judge sync starts through an explicit mutation. Active sync progress is kept in backend memory per judge provider and is broadcast to every observer subscription. A new observer receives a snapshot of the active run before future events.

Completed sync event history is not persisted. Once a run finishes, the imported database records are the durable result.

## Consequences

Multiple windows can show the same credential and active sync state. Reloading during a sync reconstructs progress from the backend snapshot.

The backend must own singleton in-memory hubs for credential-status events and active sync events. These hubs are process-local, so active sync progress does not survive backend restart.

Frontend code can use subscriptions for synchronization without using browser storage as a source of truth.
