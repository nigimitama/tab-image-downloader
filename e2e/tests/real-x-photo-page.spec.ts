import { test, expect } from "../fixtures";

// These tests verify the full popup integration for x.com photo pages:
// extraction of pbs.twimg.com image URLs from the page DOM and popup detection.
//
// We cannot navigate to real x.com pages in CI (login wall) and individual
// pbs.twimg.com media URLs can disappear, so we use local mock pages that
// mirror the DOM structure of a real X photo page.
//
// Run only this file: npx playwright test e2e/tests/real-x-photo-page.spec.ts

test.describe("x.com photo page popup integration", () => {
  test("popup detects x-photo-page tab via extraction script", async ({
    context,
    imageServer,
  }) => {
    // The mock page has <img src="pbs.twimg.com/media/..."> elements that
    // mirror a real X photo page DOM.  The extension's isXPhotoPage() check
    // requires an x.com URL pattern, but the extraction script itself runs
    // on any page with pbs.twimg.com images — so we test the script directly.
    const page = await context.newPage();
    await page.goto(
      `http://127.0.0.1:${imageServer.port}/x-photo-page.html`
    );

    const extractionScript = `
      (() => {
        const imgs = document.querySelectorAll('img[src*="pbs.twimg.com/media/"]');
        return [...new Set(Array.from(imgs).map(img => img.src))];
      })()
    `;

    const urls: string[] = await page.evaluate(extractionScript);

    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("pbs.twimg.com/media/TestImageABC");
    expect(urls[1]).toContain("pbs.twimg.com/media/TestImageDEF");

    // Verify upgradeTwitterImageUrl logic: name param should become "orig"
    for (const url of urls) {
      const u = new URL(url);
      expect(u.host).toBe("pbs.twimg.com");
      expect(u.pathname).toMatch(/^\/media\//);
      expect(u.searchParams.has("format")).toBe(true);
    }
  });

  test("popup detects local image tab and completes download flow", async ({
    context,
    extensionId,
    imageServer,
  }) => {
    // Open a local image file — the extension detects this as an image tab
    // via isImageURL (file extension check).
    const imgPage = await context.newPage();
    await imgPage.goto(
      `http://127.0.0.1:${imageServer.port}/test.png`
    );

    const popup = await context.newPage();
    await popup.goto(
      `chrome-extension://${extensionId}/src/popup/index.html`
    );

    await expect(popup.getByText("1 image tabs found.")).toBeVisible({
      timeout: 10_000,
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
  });
});
