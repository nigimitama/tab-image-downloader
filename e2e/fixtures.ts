import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { createImageServer } from "./helpers/server";

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  imageServer: { port: number };
  popupPage: Page;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.resolve("dist");
    const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), "tid-e2e-"));
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      locale: "en-US",
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        `--download-default-dir=${downloadDir}`,
        "--lang=en-US",
      ],
    });
    (context as any).__downloadDir = downloadDir;
    await use(context);
    await context.close();
    fs.rmSync(downloadDir, { recursive: true, force: true });
  },

  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker");
    }
    const extensionId = serviceWorker.url().split("/")[2];
    await use(extensionId);
  },

  imageServer: async ({}, use) => {
    const assetsDir = path.resolve("e2e/assets");
    const { server, port } = await createImageServer(assetsDir);
    await use({ port });
    server.close();
  },

  popupPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await use(page);
    await page.close();
  },
});

export { expect } from "@playwright/test";

export function getDownloadDir(context: BrowserContext): string {
  return (context as any).__downloadDir;
}
