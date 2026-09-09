import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    environment: "jsdom",
    // jsdom setup alone costs several seconds per file here, so the 5s default times out
    // render and Leaflet tests under load rather than because anything is actually wrong.
    testTimeout: 15_000,
    setupFiles: ["./tests/setup.ts"],
    css: false,
    coverage: { reporter: ["text", "json-summary"] },
  },
});
