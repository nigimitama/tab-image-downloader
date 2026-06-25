import { test, expect } from "../fixtures";

// These tests verify that images from real Pixiv artwork pages are correctly
// extracted.  They require network access and hit live pixiv.net servers.
// Run only this file: npx playwright test e2e/tests/pixiv-artwork-page.spec.ts

const extractionScript = `
  (async () => {
    const match = location.pathname.match(/\\/artworks\\/(\\d+)/);
    if (!match) return [];
    const id = match[1];
    try {
      const res = await fetch('/ajax/illust/' + id + '/pages');
      const data = await res.json();
      if (!data.error && Array.isArray(data.body)) {
        return data.body.map(p => p.urls.regular);
      }
    } catch {}
    const imgs = document.querySelectorAll('img[src*="i.pximg.net"]');
    const urls = [];
    for (const img of imgs) {
      const path = new URL(img.src).pathname;
      if (path.startsWith('/img-master/') || path.startsWith('/img-original/')) {
        urls.push(img.src);
      }
    }
    return urls;
  })()
`;

test.describe("Pixiv single-image artwork", () => {
  const ARTWORK_URL = "https://www.pixiv.net/artworks/123720628";

  test("extracts the artwork image URL", async ({ context }) => {
    const page = await context.newPage();
    await page.goto(ARTWORK_URL, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    const urls: string[] = await page.evaluate(extractionScript);

    expect(urls.length).toBeGreaterThanOrEqual(1);
    expect(urls[0]).toContain(
      "i.pximg.net/img-master/img/2024/10/27/13/02/51/123720628_p0_master1200.jpg",
    );
  });
});

test.describe("Pixiv multi-image artwork", () => {
  const ARTWORK_URL = "https://www.pixiv.net/artworks/134386572";

  test("extracts all page image URLs", async ({ context }) => {
    const page = await context.newPage();
    await page.goto(ARTWORK_URL, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    const urls: string[] = await page.evaluate(extractionScript);

    expect(urls.length).toBeGreaterThanOrEqual(2);
    expect(urls[0]).toContain(
      "i.pximg.net/img-master/img/2025/08/27/16/55/34/134386572_p0_master1200.jpg",
    );
    expect(urls[1]).toContain(
      "i.pximg.net/img-master/img/2025/08/27/16/55/34/134386572_p1_master1200.jpg",
    );
  });
});
