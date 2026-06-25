import { test, expect } from "../fixtures";

// NOTE: chrome.downloads.download() in extensions does not actually save files
// to disk in Playwright's bundled Chromium. The download-to-disk test below
// verifies the download flow via UI behavior (loading state cycles correctly,
// no errors thrown) rather than checking the filesystem.

test("bulk download completes without error for multiple image tabs", async ({
  context,
  imageServer,
  extensionId,
}) => {
  const page1 = await context.newPage();
  await page1.goto(`http://127.0.0.1:${imageServer.port}/test.png`);
  const page2 = await context.newPage();
  await page2.goto(`http://127.0.0.1:${imageServer.port}/test.jpg`);

  const popup = await context.newPage();
  await popup.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );
  await expect(popup.getByText("2 image tabs found.")).toBeVisible();

  const downloadBtn = popup.getByRole("button", { name: "Download" });
  await expect(downloadBtn).toBeEnabled();

  // Listen for console errors during download
  const consoleErrors: string[] = [];
  popup.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await downloadBtn.click();

  // Loading state should appear (download flow started)
  await expect(downloadBtn).toHaveAttribute("data-loading", { timeout: 5_000 });

  // Loading state should clear (download flow completed)
  await expect(downloadBtn).not.toHaveAttribute("data-loading", {
    timeout: 10_000,
  });

  // No download-related errors should have been logged
  const downloadErrors = consoleErrors.filter((e) =>
    e.toLowerCase().includes("download")
  );
  expect(downloadErrors).toHaveLength(0);
});

