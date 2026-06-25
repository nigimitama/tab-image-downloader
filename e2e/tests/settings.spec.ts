import { test, expect } from "../fixtures";

test("closes image tab after download when setting is enabled", async ({
  context,
  imageServer,
  extensionId,
}) => {
  // Open the popup first to ensure the close-tab setting is enabled
  const settingsPage = await context.newPage();
  await settingsPage.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );
  // Wait for the checkbox state to load from storage (default is true/checked)
  const checkbox = settingsPage.getByRole("checkbox", { name: /Close the image tabs after/ });
  await expect(checkbox).toBeChecked({ timeout: 5_000 });
  await settingsPage.close();

  // Open an image tab
  const imgPage = await context.newPage();
  await imgPage.goto(`http://127.0.0.1:${imageServer.port}/test.png`);
  const imgPageUrl = imgPage.url();

  // Open popup and download
  const popup = await context.newPage();
  await popup.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );

  const downloadBtn = popup.getByRole("button", { name: "Download" });
  await downloadBtn.click();

  // Wait for download flow to complete (loading state clears)
  await expect(downloadBtn).not.toHaveAttribute("data-loading", {
    timeout: 10_000,
  });

  // Wait briefly for tab close
  await popup.waitForTimeout(2_000);

  // Verify the image tab was closed
  const pages = context.pages();
  const imageTabStillOpen = pages.some((p) => p.url() === imgPageUrl);
  expect(imageTabStillOpen).toBe(false);
});

test("keeps image tab open after download when setting is disabled", async ({
  context,
  imageServer,
  extensionId,
}) => {
  // Open popup and disable the close-tab setting
  const settingsPage = await context.newPage();
  await settingsPage.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );
  // Wait for storage-loaded state before interacting
  const checkbox = settingsPage.getByRole("checkbox", { name: /Close the image tabs after/ });
  await expect(checkbox).toBeChecked({ timeout: 5_000 });
  // Chakra UI checkbox overlay intercepts pointer events; use force click
  await checkbox.uncheck({ force: true });
  await expect(checkbox).not.toBeChecked();
  // Wait for storage write to complete before closing
  await settingsPage.waitForTimeout(500);
  await settingsPage.close();

  // Open an image tab
  const imgPage = await context.newPage();
  await imgPage.goto(`http://127.0.0.1:${imageServer.port}/test.png`);
  const imgPageUrl = imgPage.url();

  // Open popup and download
  const popup = await context.newPage();
  await popup.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );

  const downloadBtn = popup.getByRole("button", { name: "Download" });
  await downloadBtn.click();

  // Wait for download flow to complete (loading state clears)
  await expect(downloadBtn).not.toHaveAttribute("data-loading", {
    timeout: 10_000,
  });

  await popup.waitForTimeout(2_000);

  // Verify image tab is still open
  const pages = context.pages();
  const imageTabStillOpen = pages.some((p) => p.url() === imgPageUrl);
  expect(imageTabStillOpen).toBe(true);
});

test("download directory setting persists across popup reopens", async ({
  context,
  extensionId,
}) => {
  // Open popup and set a download directory
  const settingsPage = await context.newPage();
  await settingsPage.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );

  const dirInput = settingsPage.getByPlaceholder("Subdirectory (optional)");
  await dirInput.fill("test-subdir");
  // Wait for storage write to complete before closing
  await settingsPage.waitForTimeout(500);
  await settingsPage.close();

  // Reopen popup and verify the value persisted
  const popup2 = await context.newPage();
  await popup2.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );
  const dirInput2 = popup2.getByPlaceholder("Subdirectory (optional)");
  await expect(dirInput2).toHaveValue("test-subdir");
});

test("persists settings across popup reopens", async ({
  context,
  extensionId,
}) => {
  // Open popup and change settings
  const popup1 = await context.newPage();
  await popup1.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );

  // Ensure checkbox is checked before toggling — earlier tests may have changed it
  const checkbox = popup1.getByRole("checkbox", { name: /Close the image tabs after/ });
  await expect(checkbox).toBeAttached({ timeout: 5_000 });
  if (!(await checkbox.isChecked())) {
    await checkbox.check({ force: true });
    await popup1.waitForTimeout(500);
  }
  // Now uncheck to verify this state persists
  await checkbox.uncheck({ force: true });
  await expect(checkbox).not.toBeChecked();

  const dirInput = popup1.getByPlaceholder("Subdirectory (optional)");
  await dirInput.fill("my-folder");

  // Wait for storage write to complete before closing
  await popup1.waitForTimeout(500);
  await popup1.close();

  // Reopen popup
  const popup2 = await context.newPage();
  await popup2.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );

  const checkbox2 = popup2.getByRole("checkbox", { name: /Close the image tabs after/ });
  await expect(checkbox2).not.toBeChecked({ timeout: 5_000 });
  const dirInput2 = popup2.getByPlaceholder("Subdirectory (optional)");
  await expect(dirInput2).toHaveValue("my-folder");
});
