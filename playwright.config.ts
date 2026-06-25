import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  timeout: 30_000,
  // The download tests assert on the Download button's transient loading state,
  // which is driven by real chrome.downloads timing. That state can be too brief
  // (or, rarely, hang) on the slower CI runners, making those tests flaky there
  // even though they pass reliably locally. Retry on CI so a single flake does
  // not fail the whole run; keep 0 retries locally to surface real failures fast.
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    headless: true,
  },
});
