import { test, expect } from "../fixtures";

test("excludes images from the download via row checkboxes", async ({
  context,
  imageServer,
  extensionId,
}) => {
  const page1 = await context.newPage();
  await page1.goto(`http://127.0.0.1:${imageServer.port}/test.png`);
  const page2 = await context.newPage();
  await page2.goto(`http://127.0.0.1:${imageServer.port}/test.jpg`);

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  await expect(popup.getByText("2 image tabs found.")).toBeVisible();

  const selectAll = popup.getByRole("checkbox", { name: "Select all" });
  const pngCheckbox = popup.getByRole("checkbox", {
    name: `Toggle http://127.0.0.1:${imageServer.port}/test.png`,
    exact: true,
  });
  const jpgCheckbox = popup.getByRole("checkbox", {
    name: `Toggle http://127.0.0.1:${imageServer.port}/test.jpg`,
    exact: true,
  });
  const downloadBtn = popup.getByRole("button", { name: "Download" });

  // Every found image is selected by default.
  await expect(selectAll).toBeChecked();
  await expect(pngCheckbox).toBeChecked();
  await expect(jpgCheckbox).toBeChecked();
  await expect(popup.getByText("2 / 2 selected")).toBeVisible();
  await expect(downloadBtn).toBeEnabled();

  // Excluding one image lowers the count and makes "select all" indeterminate.
  await pngCheckbox.uncheck({ force: true });
  await expect(pngCheckbox).not.toBeChecked();
  await expect(jpgCheckbox).toBeChecked();
  await expect(popup.getByText("1 / 2 selected")).toBeVisible();
  await expect(downloadBtn).toBeEnabled();

  // With nothing selected there is nothing to download.
  await jpgCheckbox.uncheck({ force: true });
  await expect(popup.getByText("0 / 2 selected")).toBeVisible();
  await expect(selectAll).not.toBeChecked();
  await expect(downloadBtn).toBeDisabled();

  // "Select all" re-includes every image.
  await selectAll.check({ force: true });
  await expect(pngCheckbox).toBeChecked();
  await expect(jpgCheckbox).toBeChecked();
  await expect(popup.getByText("2 / 2 selected")).toBeVisible();
  await expect(downloadBtn).toBeEnabled();
});
