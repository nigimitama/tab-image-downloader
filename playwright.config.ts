import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    headless: true,
  },
});
