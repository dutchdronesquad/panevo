import { defineConfig, type Plugin } from "vite";
import { resolve } from "node:path";

const disablePreloadCodeSplitting = (): Plugin => ({
  name: "panevo:disable-preload-code-splitting",
  configResolved(config) {
    const output = config.build.rolldownOptions.output;
    const outputs = Array.isArray(output) ? output : [output];

    for (const item of outputs) {
      if (!item) {
        continue;
      }

      const normalizedOutput = item as Record<string, unknown>;
      delete normalizedOutput.inlineDynamicImports;
      normalizedOutput.codeSplitting = false;
    }
  },
});

// https://vitejs.dev/config
export default defineConfig({
  plugins: [disablePreloadCodeSplitting()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
