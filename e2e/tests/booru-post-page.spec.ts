import { test, expect } from "../fixtures";

// The extension detects Booru post pages (Danbooru: /posts/<id>, Gelbooru:
// index.php?page=post&s=view&id=<id>) and injects a content script that reads
// the displayed <img id="image"> src.  We cannot navigate to the real booru
// sites in CI, so these tests run the extraction script against local pages
// that mirror the DOM structure of a booru post page.  The script below mirrors
// extractBooruImageUrl() in src/popup/chromeApi.ts.

const extractionScript = `
  (() => {
    const img = document.querySelector('#image');
    return img ? img.src : null;
  })()
`;

for (const site of [
  { name: "Danbooru", page: "danbooru-post-page.html" },
  { name: "Gelbooru", page: "gelbooru-post-page.html" },
  { name: "yande.re", page: "yandere-post-page.html" },
]) {
  test.describe(site.name, () => {
    test("extraction script returns the displayed #image src", async ({
      context,
      imageServer,
    }) => {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${imageServer.port}/${site.page}`);

      const src: string | null = await page.evaluate(extractionScript);

      // The fixture's #image points at a local image (test.jpg); the extracted
      // src is the absolute, resolved URL of that displayed image.
      expect(src).toBe(`http://127.0.0.1:${imageServer.port}/test.jpg`);
    });

    test("the extracted image is downloadable", async ({
      context,
      imageServer,
    }) => {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${imageServer.port}/${site.page}`);

      const src: string = await page.evaluate(extractionScript);
      const response = await page.request.get(src);

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("image");
    });
  });
}

test("extraction script returns null when the page has no #image element", async ({
  context,
  imageServer,
}) => {
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${imageServer.port}/page.html`);

  const src: string | null = await page.evaluate(extractionScript);

  expect(src).toBeNull();
});
