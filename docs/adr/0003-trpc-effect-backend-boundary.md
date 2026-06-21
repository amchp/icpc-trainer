# Use tRPC at the HTTP boundary and Effect inside the backend

We use tRPC for typed HTTP calls between the web app and backend, with Effect services owning backend runtime behavior. This gives ergonomic frontend typing now while keeping backend logic composable and testable.
