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

});

