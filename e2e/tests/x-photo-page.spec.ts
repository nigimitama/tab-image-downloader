import { test, expect } from "../fixtures";

// The extension detects x.com/*/status/*/photo/* tabs and injects a content
// script to extract pbs.twimg.com/media/ image URLs.  We cannot navigate to
// real x.com in CI, so these tests verify the extraction script logic by
// running it against a local page that mirrors the DOM structure of an X
// photo page.

const extractionScript = `
  (() => {
    const imgs = document.querySelectorAll('img[src*="pbs.twimg.com/media/"]');
    return [...new Set(Array.from(imgs).map(img => img.src))];
  })()
`;

test("extraction script finds pbs.twimg.com image URLs in a page", async ({
  context,
  imageServer,
}) => {
  const page = await context.newPage();
  await page.goto(
    `http://127.0.0.1:${imageServer.port}/x-photo-page.html`
  );

  const urls: string[] = await page.evaluate(extractionScript);

  expect(urls).toHaveLength(2);
  expect(urls[0]).toContain("pbs.twimg.com/media/TestImageABC");
  expect(urls[1]).toContain("pbs.twimg.com/media/TestImageDEF");
});

test("extraction script ignores non-Twitter images", async ({
  context,
  imageServer,
}) => {
  const page = await context.newPage();
  await page.goto(
    `http://127.0.0.1:${imageServer.port}/x-photo-page.html`
  );

  const urls: string[] = await page.evaluate(extractionScript);

  for (const url of urls) {
    expect(url).not.toContain("example.com");
  }
});

test("extraction script returns empty array when no Twitter images exist", async ({
  context,
  imageServer,
}) => {
  const page = await context.newPage();
  await page.goto(
    `http://127.0.0.1:${imageServer.port}/page.html`
  );

  const urls: string[] = await page.evaluate(extractionScript);

  expect(urls).toHaveLength(0);
});
