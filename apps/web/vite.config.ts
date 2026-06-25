import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: "../..",
  envPrefix: ["VITE_", "CLERK_PUBLISHABLE_KEY"],
  resolve: {
    alias: {
      "@icpc-trainer/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  },
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/trpc": "http://127.0.0.1:3773",
      "/health": "http://127.0.0.1:3773"
    }
  }
});
