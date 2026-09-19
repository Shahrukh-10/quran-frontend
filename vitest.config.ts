import path from "node:path";
/// <reference types="vitest" />
// Vitest config — resolves the `@/*` path alias used across lib/ and tests/.
// Without this file, vitest can't find `@/lib/*` imports and every suite fails
// with "Failed to load url @/lib/…". Matches the tsconfig.json paths mapping.
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
