import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const stubs = fileURLToPath(new URL("./.roadmap-preview/stubs.tsx", import.meta.url));

export default defineConfig({
  envDir: "../..",
  resolve: {
    alias: [
      { find: "@icpc-trainer/shared", replacement: fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)) },
      { find: "@tanstack/react-router", replacement: stubs },
      { find: /^\.\/useLearningProgress\.js$/, replacement: stubs }
    ]
  },
  plugins: [react(), tailwindcss()],
  server: { host: "127.0.0.1", port: 5199, strictPort: true }
});
