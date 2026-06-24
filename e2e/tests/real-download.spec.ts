import { test, expect } from "../fixtures";

// These tests verify that images from real external sites are actually
// downloadable by the browser — not just that the URL is extracted, but that
// the downloaded content is a real image (not an HTML hotlink-protection page).
//
// They require network access and hit live servers.
// Run only this file: npx playwright test e2e/tests/real-download.spec.ts

const extractImageSrc = `
  (() => {
    const img = document.querySelector('#image');
    return img ? img.src : null;
  })()
`;

test.describe("Gelbooru real download", () => {
  const POST_URL =
    "https://gelbooru.com/index.php?page=post&s=view&id=14357815";

  test("image URL extraction works", async ({ context }) => {
    const page = await context.newPage();
    await page.goto(POST_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    const src: string | null = await page.evaluate(extractImageSrc);

    expect(src).not.toBeNull();
    expect(src).toMatch(/^https:\/\/img\d+\.gelbooru\.com\//);
  });

  test("popup detects Gelbooru tab and downloads actual image", async ({
    context,
    extensionId,
  }) => {
    // Open the Gelbooru post page
    const gelbooruPage = await context.newPage();
    await gelbooruPage.goto(POST_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // Open the extension popup — this triggers getImageSources() which uses
    // the iframe-based fetch for Gelbooru
    const popup = await context.newPage();
    await popup.goto(
      `chrome-extension://${extensionId}/src/popup/index.html`
    );

    // Wait for the popup to detect the Gelbooru image tab.
    // The iframe fetch can take up to ~7s, so use a generous timeout.
    await expect(popup.getByText("1 image tabs found.")).toBeVisible({
      timeout: 30_000,
    });

    // Listen for console errors during download
    const consoleErrors: string[] = [];
    popup.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Click download
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
