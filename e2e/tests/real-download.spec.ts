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
    await page.goto(POST_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const src: string | null = await page.evaluate(extractImageSrc);

    expect(src).not.toBeNull();
    expect(src).toMatch(/^https:\/\/img\d+\.gelbooru\.com\//);
  });

  test("diagnose: Playwright request with Referer header", async ({ context }) => {
    const page = await context.newPage();
    await page.goto(POST_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const src: string | null = await page.evaluate(extractImageSrc);
    expect(src).not.toBeNull();

    // Test with gelbooru.com Referer
    const withReferer = await page.request.get(src!, {
      headers: { Referer: "https://gelbooru.com/" },
    });
    console.log(
      "With Referer gelbooru.com:",
      withReferer.status(),
      withReferer.headers()["content-type"]
    );

    // Test with no Referer
    const noReferer = await page.request.get(src!);
    console.log(
      "Without Referer:",
      noReferer.status(),
      noReferer.headers()["content-type"]
    );

    // Test with Cookie from the Gelbooru page
    const cookies = await context.cookies("https://gelbooru.com");
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    console.log("Cookies available:", cookies.length, cookieHeader.substring(0, 100));

    const withCookie = await page.request.get(src!, {
      headers: {
        Referer: "https://gelbooru.com/",
        Cookie: cookieHeader,
      },
    });
    console.log(
      "With Referer + Cookie:",
      withCookie.status(),
      withCookie.headers()["content-type"]
    );

    // Test with img subdomain Referer (for iframe-based approach)
    const withSubdomainReferer = await page.request.get(src!, {
      headers: { Referer: "https://img4.gelbooru.com/" },
    });
    console.log(
      "With Referer img4.gelbooru.com:",
      withSubdomainReferer.status(),
      withSubdomainReferer.headers()["content-type"]
    );

    // Check declarativeNetRequest rules
    const popup = await context.newPage();
    const extId = context.serviceWorkers()[0]?.url().split("/")[2];
    if (extId) {
      await popup.goto(`chrome-extension://${extId}/src/popup/index.html`);
      const rules = await popup.evaluate(() =>
        chrome.declarativeNetRequest.getDynamicRules()
      );
      console.log("DeclarativeNetRequest dynamic rules:", JSON.stringify(rules));
      await popup.close();
    }

    expect(withReferer.headers()["content-type"]).toContain("image");
  });

  test("downloaded content is an actual image, not an HTML page", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(POST_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const src: string | null = await page.evaluate(extractImageSrc);
    expect(src).not.toBeNull();

    const popup = await context.newPage();
    await popup.goto(
      `chrome-extension://${extensionId}/src/popup/index.html`
    );

    const result = await popup.evaluate(async (url) => {
      const downloadId = await chrome.downloads.download({
        url,
        filename: "gelbooru-test.jpg",
        saveAs: false,
      });

      const poll = (): Promise<chrome.downloads.DownloadItem> =>
        new Promise((resolve) => {
          const check = () => {
            chrome.downloads.search({ id: downloadId }, (items) => {
              const item = items[0];
              if (item && (item.state === "complete" || item.state === "interrupted")) {
                resolve(item);
                return;
              }
              setTimeout(check, 200);
            });
          };
          check();
        });

      const item = await Promise.race([
        poll(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("poll timed out")), 15_000)
        ),
      ]);

      return {
        state: item.state,
        error: item.error,
        mime: item.mime,
        totalBytes: item.totalBytes,
      };
    }, src!);

    console.log("Download result:", result);

    expect(result.state).toBe("complete");
    expect(result.mime).toContain("image");
  });
});

test.describe("Danbooru real download", () => {
  const POST_URL = "https://danbooru.donmai.us/posts/11655837";
  const EXPECTED_IMAGE_URL =
    "https://cdn.donmai.us/sample/ea/48/__moria_luluka_and_mashu_tan_precure_and_1_more_drawn_by_ryuhirohumi__sample-ea48f0b280a1d3f7efc3501f72a4ba9a.jpg";

  test("image URL extraction works", async ({ context }) => {
    const page = await context.newPage();
    await page.goto(POST_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const src: string | null = await page.evaluate(extractImageSrc);

    expect(src).not.toBeNull();
    expect(src).toBe(EXPECTED_IMAGE_URL);
  });

  test("downloaded content is an actual image, not an HTML page", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(POST_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const src: string | null = await page.evaluate(extractImageSrc);
    expect(src).not.toBeNull();

    const popup = await context.newPage();
    await popup.goto(
      `chrome-extension://${extensionId}/src/popup/index.html`
    );

    const result = await popup.evaluate(async (url) => {
      const downloadId = await chrome.downloads.download({
        url,
        filename: "danbooru-test.jpg",
        saveAs: false,
      });

      const poll = (): Promise<chrome.downloads.DownloadItem> =>
        new Promise((resolve) => {
          const check = () => {
            chrome.downloads.search({ id: downloadId }, (items) => {
              const item = items[0];
              if (item && (item.state === "complete" || item.state === "interrupted")) {
                resolve(item);
                return;
              }
              setTimeout(check, 200);
            });
          };
          check();
        });

      const item = await Promise.race([
        poll(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("poll timed out")), 15_000)
        ),
      ]);

      return {
        state: item.state,
        error: item.error,
        mime: item.mime,
        totalBytes: item.totalBytes,
      };
    }, src!);

    console.log("Download result:", result);

    expect(result.state).toBe("complete");
    expect(result.mime).toContain("image");
  });
});
