import { test, expect } from "../fixtures";

// These tests verify that x.com photo page extraction works against a real
// x.com page — not just a local mock, but the live site.
//
// They require network access and hit live x.com servers.
// Run only this file: npx playwright test e2e/tests/real-x-photo-page.spec.ts

const extractionScript = `
  (() => {
    const imgs = document.querySelectorAll('img[src*="pbs.twimg.com/media/"]');
    return [...new Set(Array.from(imgs).map(img => img.src))];
  })()
`;

test.describe("x.com real photo page", () => {
  // A public tweet with an image from the official X account.
  // Using /photo/1 suffix so the extension recognises it as a photo page.
  const PHOTO_URL = "https://x.com/X/status/1845228806983516579/photo/1";

  test("extraction script finds pbs.twimg.com image on real x.com page", async ({
    context,
  }) => {
    const page = await context.newPage();
    await page.goto(PHOTO_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // x.com is an SPA — wait for the media image to render
    await page.waitForSelector('img[src*="pbs.twimg.com/media/"]', {
      timeout: 30_000,
    });

    const urls: string[] = await page.evaluate(extractionScript);

    expect(urls.length).toBeGreaterThanOrEqual(1);
    for (const url of urls) {
      expect(url).toContain("pbs.twimg.com/media/");
    }
  });

  test("popup detects x.com photo tab", async ({ context, extensionId }) => {
    const xPage = await context.newPage();
    await xPage.goto(PHOTO_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // Wait for the SPA to render the media image
    await xPage.waitForSelector('img[src*="pbs.twimg.com/media/"]', {
      timeout: 30_000,
    });

    // Open the extension popup
    const popup = await context.newPage();
    await popup.goto(
      `chrome-extension://${extensionId}/src/popup/index.html`
    );

    // The popup should detect the x.com photo tab
    await expect(popup.getByText("1 image tabs found.")).toBeVisible({
      timeout: 30_000,
    });

    // Verify the detected image is listed and has a pbs.twimg.com URL
    const imgElement = popup.locator("img");
    await expect(imgElement.first()).toBeVisible({ timeout: 10_000 });
    const src = await imgElement.first().getAttribute("src");
    expect(src).toContain("pbs.twimg.com/media/");
  });

  test("popup downloads image from x.com photo tab", async ({
    context,
    extensionId,
  }) => {
    const xPage = await context.newPage();
    await xPage.goto(PHOTO_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await xPage.waitForSelector('img[src*="pbs.twimg.com/media/"]', {
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
