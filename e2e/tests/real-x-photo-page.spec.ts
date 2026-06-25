import { test, expect } from "../fixtures";

// These tests verify that pbs.twimg.com images (used by X/Twitter) are actually
// downloadable by the browser — not just that the URL is extracted, but that
// the downloaded content is a real image.
//
// We cannot navigate to real x.com pages in CI because x.com requires login
// for headless browsers.  Instead we serve a local page that embeds a real
// pbs.twimg.com image URL and verify the full popup → download flow against it.
//
// They require network access and hit live pbs.twimg.com servers.
// Run only this file: npx playwright test e2e/tests/real-x-photo-page.spec.ts

// Real pbs.twimg.com media URL from:
// https://x.com/mitama64/status/1799680081184620622/photo/2
const REAL_TWIMG_URL =
  "https://pbs.twimg.com/media/GPm--3abMAAmfFQ?format=jpg&name=medium";

test.describe("x.com real image download", () => {
  test("pbs.twimg.com image is directly accessible", async ({ context }) => {
    const page = await context.newPage();
    const response = await page.goto(REAL_TWIMG_URL, {
      waitUntil: "load",
      timeout: 30_000,
    });

    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    const contentType = response!.headers()["content-type"] ?? "";
    expect(contentType).toContain("image");
  });

  test("extraction script finds real pbs.twimg.com image in mock page", async ({
    context,
    imageServer,
  }) => {
    // Local page embedding the real pbs.twimg.com URL — mirrors x.com DOM
    const page = await context.newPage();
    await page.goto(
      `http://127.0.0.1:${imageServer.port}/x-photo-page-real.html`
    );

    // Wait for the real image to load from pbs.twimg.com
    await page.waitForSelector('img[src*="pbs.twimg.com/media/"]', {
      timeout: 15_000,
    });

    const urls: string[] = await page.evaluate(`
      (() => {
        const imgs = document.querySelectorAll('img[src*="pbs.twimg.com/media/"]');
        return [...new Set(Array.from(imgs).map(img => img.src))];
      })()
    `);

    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("pbs.twimg.com/media/GPm--3abMAAmfFQ");
  });

  test("popup detects and downloads real pbs.twimg.com image", async ({
    context,
    extensionId,
  }) => {
    // Open a tab with the direct pbs.twimg.com image URL — the extension
    // recognizes this as a Twitter image tab via isTwitterImage().
    const imgPage = await context.newPage();
    await imgPage.goto(REAL_TWIMG_URL, {
      waitUntil: "load",
      timeout: 30_000,
    });

    const popup = await context.newPage();
    await popup.goto(
      `chrome-extension://${extensionId}/src/popup/index.html`
    );

    await expect(popup.getByText("1 image tabs found.")).toBeVisible({
      timeout: 30_000,
    });

    const consoleErrors: string[] = [];
    popup.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const downloadBtn = popup.getByRole("button", { name: "Download" });
    await expect(downloadBtn).toBeEnabled();
    await downloadBtn.click();

    // Loading state should appear then clear
    await expect(downloadBtn).toHaveAttribute("data-loading", {
      timeout: 5_000,
    });
    await expect(downloadBtn).not.toHaveAttribute("data-loading", {
      timeout: 15_000,
    });

    // No download-related errors
    const downloadErrors = consoleErrors.filter((e) =>
      e.toLowerCase().includes("download")
    );
    expect(downloadErrors).toHaveLength(0);

    // Verify the last completed download is an actual image
    const downloadInfo = await popup.evaluate(async () => {
      const items = await new Promise<chrome.downloads.DownloadItem[]>(
        (resolve) =>
          chrome.downloads.search(
            { orderBy: ["-startTime"], limit: 1 },
            resolve
          )
      );
      const item = items[0];
      return item
        ? { state: item.state, mime: item.mime, totalBytes: item.totalBytes }
        : null;
    });

    console.log("Download info:", downloadInfo);
    expect(downloadInfo).not.toBeNull();
    expect(downloadInfo!.state).toBe("complete");
    expect(downloadInfo!.mime).toContain("image");
    expect(downloadInfo!.totalBytes).toBeGreaterThan(1000);
  });
});
