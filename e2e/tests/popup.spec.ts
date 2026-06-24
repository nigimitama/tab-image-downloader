import { test, expect } from "../fixtures";

test("extension loads and popup opens", async ({ popupPage }) => {
  await expect(popupPage.locator("#root")).toBeAttached();
  await expect(popupPage.getByText("Settings")).toBeVisible();
});
