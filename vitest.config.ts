import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/main/services/**/*.ts"],
      exclude: ["src/**/*.d.ts"],
    },
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
