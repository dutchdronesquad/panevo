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
      include: [
        "src/main/services/**/*.ts",
        "src/shared/**/*.ts",
        "src/renderer/components/input/view-model.ts",
      ],
      exclude: ["src/**/*.d.ts"],
    },
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
