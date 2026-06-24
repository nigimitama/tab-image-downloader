import { test, expect } from "../fixtures";

test("extension loads and popup opens", async ({ popupPage }) => {
  await expect(popupPage.locator("#root")).toBeAttached();
  await expect(popupPage.getByText("Settings")).toBeVisible();
});

test("shows zero image tabs when none are open", async ({ popupPage }) => {
  await expect(popupPage.getByText("0 image tabs found.")).toBeVisible();
  const downloadBtn = popupPage.getByRole("button", { name: "Download" });
  await expect(downloadBtn).toBeDisabled();
});

test("detects image tabs and shows count with thumbnails", async ({
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
  const images = popup.locator("img[src]");
  await expect(images).toHaveCount(2);
});

test("excludes non-image tabs from count", async ({
  context,
  imageServer,
  extensionId,
}) => {
  const imgPage = await context.newPage();
  await imgPage.goto(`http://127.0.0.1:${imageServer.port}/test.png`);
  const htmlPage = await context.newPage();
  await htmlPage.goto(`http://127.0.0.1:${imageServer.port}/page.html`);

  const popup = await context.newPage();
  await popup.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );

  await expect(popup.getByText("1 image tabs found.")).toBeVisible();
});
