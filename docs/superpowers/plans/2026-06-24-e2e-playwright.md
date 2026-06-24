# E2E Testing with Playwright — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright-based E2E tests that load the built Chrome extension into Chromium and verify popup display, image tab detection, bulk download, and settings persistence with real Chrome APIs.

**Architecture:** Tests run against the production build (`dist/`). A custom Playwright fixture launches Chromium with `--load-extension=dist/`, extracts the `extensionId` from the service worker URL, and creates a temp download directory. A tiny Node.js HTTP server in the fixture serves test image files so real tabs can be opened. Each spec file targets one concern: popup UI, downloads, settings.

**Tech Stack:** `@playwright/test` (Chromium-only), Node.js `http` + `fs` for test helpers, GitHub Actions for CI.

## Global Constraints

- Chromium only — Firefox/WebKit do not support extension side-loading.
- Tests use the production build (`dist/`), not the dev server.
- `channel: 'chromium'` for headless support with Playwright's bundled Chromium.
- Popup URL path in the built extension: `src/popup/index.html` (as declared in `dist/manifest.json`).
- The extension requires the `_locales/` directory in `dist/` to load properly (Manifest V3 with `default_locale: "ja"`).

---

### Task 1: Playwright infrastructure — install, config, fixtures, test image assets, npm scripts

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/fixtures.ts`
- Create: `e2e/helpers/server.ts`
- Create: `e2e/assets/test.png` (1x1 pixel PNG)
- Create: `e2e/assets/test.jpg` (1x1 pixel JPEG)
- Modify: `package.json` (add devDependency, add scripts)
- Modify: `.github/workflows/test.yml` (add e2e job)
- Modify: `.gitignore` (add playwright artifacts)

**Interfaces:**
- Produces: Fixtures `context`, `extensionId`, `imageServer`, `popupPage` — importable as `import { test, expect } from '../fixtures'` from any spec file. `imageServer` exposes `{ port: number }`. `popupPage` is a `Page` already navigated to the popup URL.

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create test image assets**

Create minimal valid image files:

```bash
mkdir -p e2e/assets
# 1x1 red PNG (68 bytes)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > e2e/assets/test.png
# 1x1 white JPEG — use Node to generate
node -e "
const sharp = require('sharp');
// If sharp not available, use a raw JFIF:
const fs = require('fs');
const buf = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=', 'base64');
fs.writeFileSync('e2e/assets/test.jpg', buf);
"
```

Actually, simpler approach — use Node.js directly without sharp:

```typescript
// Will be generated in Step 3 as part of a helper, or manually create minimal files.
// For now, create them with raw binary buffers via a small script.
```

Create `e2e/assets/create-test-images.mjs`:

```javascript
import { writeFileSync } from "fs";

// Minimal 1x1 PNG
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64"
);
writeFileSync("e2e/assets/test.png", png);

// Minimal 1x1 JPEG
const jpg = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=",
  "base64"
);
writeFileSync("e2e/assets/test.jpg", jpg);
```

Run: `node e2e/assets/create-test-images.mjs`

Then delete `create-test-images.mjs` — the binary files are committed directly.

- [ ] **Step 3: Create test image HTTP server helper**

Create `e2e/helpers/server.ts`:

```typescript
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export function createImageServer(
  assetsDir: string
): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(assetsDir, path.basename(req.url ?? ""));
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, port });
    });
  });
}
```

- [ ] **Step 4: Create Playwright fixtures**

Create `e2e/fixtures.ts`:

```typescript
import { test as base, chromium, type BrowserContext, type Page } from "@playwright/test";
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
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        `--download-default-dir=${downloadDir}`,
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
```

- [ ] **Step 5: Create Playwright config**

Create `playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    headless: true,
  },
});
```

`workers: 1` because persistent contexts with extensions cannot run in parallel.

- [ ] **Step 6: Add npm scripts to `package.json`**

Add to `"scripts"`:

```json
"test:e2e": "npm run build && npx playwright test",
"test:e2e:headed": "npm run build && npx playwright test --headed"
```

- [ ] **Step 7: Add `.gitignore` entries**

Append to `.gitignore`:

```
# Playwright
test-results/
playwright-report/
```

- [ ] **Step 8: Add e2e job to CI**

Modify `.github/workflows/test.yml` — add after the existing `test` job:

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run test:e2e
```

- [ ] **Step 9: Write a smoke test to verify infrastructure works**

Create `e2e/tests/popup.spec.ts` with a single test:

```typescript
import { test, expect } from "../fixtures";

test("extension loads and popup opens", async ({ popupPage }) => {
  await expect(popupPage.locator("#root")).toBeAttached();
  await expect(popupPage.getByText("Settings")).toBeVisible();
});
```

- [ ] **Step 10: Run the smoke test**

```bash
npm run build && npx playwright test
```

Expected: 1 test passes. The extension loads in Chromium, the popup page renders with the React app mounted.

- [ ] **Step 11: Commit**

```bash
git add playwright.config.ts e2e/ package.json package-lock.json .gitignore .github/workflows/test.yml
git commit -m "test: add Playwright E2E infrastructure with smoke test"
```

---

### Task 2: Popup display & image tab detection tests

**Files:**
- Modify: `e2e/tests/popup.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, `popupPage`, `imageServer`, `context` from `e2e/fixtures.ts`

- [ ] **Step 1: Write test — no image tabs shows zero count and disabled button**

Add to `e2e/tests/popup.spec.ts`:

```typescript
test("shows zero image tabs when none are open", async ({ popupPage }) => {
  await expect(popupPage.getByText("0 image tabs found.")).toBeVisible();
  const downloadBtn = popupPage.getByRole("button", { name: "Download" });
  await expect(downloadBtn).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npx playwright test popup
```

Expected: PASS — with no image tabs open, the popup should show "0 image tabs found." and the button should be disabled.

- [ ] **Step 3: Write test — image tabs are detected and listed**

```typescript
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
```

- [ ] **Step 4: Run test**

```bash
npx playwright test popup
```

Expected: PASS — two image tabs open before the popup, popup detects both.

- [ ] **Step 5: Write test — non-image tabs are excluded**

```typescript
test("excludes non-image tabs from count", async ({
  context,
  imageServer,
  extensionId,
}) => {
  const imgPage = await context.newPage();
  await imgPage.goto(`http://127.0.0.1:${imageServer.port}/test.png`);
  const htmlPage = await context.newPage();
  await htmlPage.goto("https://example.com");

  const popup = await context.newPage();
  await popup.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );

  await expect(popup.getByText("1 image tabs found.")).toBeVisible();
});
```

- [ ] **Step 6: Run all popup tests**

```bash
npx playwright test popup
```

Expected: All 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add e2e/tests/popup.spec.ts
git commit -m "test: add popup display and image tab detection E2E tests"
```

---

### Task 3: Download execution tests

**Files:**
- Create: `e2e/tests/download.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, `context`, `imageServer`, `extensionId`, `getDownloadDir` from `e2e/fixtures.ts`

- [ ] **Step 1: Write helper — wait for file to appear in directory**

Add at the top of `e2e/tests/download.spec.ts`:

```typescript
import { test, expect, getDownloadDir } from "../fixtures";
import fs from "node:fs";
import path from "node:path";

async function waitForFile(
  dir: string,
  filename: string,
  timeoutMs = 10_000
): Promise<void> {
  const filePath = path.join(dir, filename);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(filePath)) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`File ${filename} did not appear in ${dir} within ${timeoutMs}ms`);
}
```

- [ ] **Step 2: Write test — bulk download saves files to disk**

```typescript
test("downloads image files to disk", async ({
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

  const downloadBtn = popup.getByRole("button", { name: "Download" });
  await downloadBtn.click();

  const downloadDir = getDownloadDir(context);
  await waitForFile(downloadDir, "test.png");
  await waitForFile(downloadDir, "test.jpg");
});
```

- [ ] **Step 3: Run test**

```bash
npx playwright test download
```

Expected: PASS — both files appear in the temp download directory.

- [ ] **Step 4: Write test — loading state on download button**

```typescript
test("shows loading state while downloading", async ({
  context,
  imageServer,
  extensionId,
}) => {
  const imgPage = await context.newPage();
  await imgPage.goto(`http://127.0.0.1:${imageServer.port}/test.png`);

  const popup = await context.newPage();
  await popup.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );

  const downloadBtn = popup.getByRole("button", { name: "Download" });
  await expect(downloadBtn).toBeEnabled();
  await downloadBtn.click();

  // Chakra UI Button with isLoading adds a spinner and data-loading attribute
  await expect(downloadBtn).toHaveAttribute("data-loading", { timeout: 5_000 });

  // After download completes, loading state clears
  await expect(downloadBtn).not.toHaveAttribute("data-loading", { timeout: 10_000 });
});
```

- [ ] **Step 5: Run all download tests**

```bash
npx playwright test download
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add e2e/tests/download.spec.ts
git commit -m "test: add download execution E2E tests"
```

---

### Task 4: Settings UI & persistence tests

**Files:**
- Create: `e2e/tests/settings.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, `context`, `imageServer`, `extensionId`, `popupPage`, `getDownloadDir` from `e2e/fixtures.ts`

- [ ] **Step 1: Write test — close tab after download ON**

Create `e2e/tests/settings.spec.ts`:

```typescript
import { test, expect, getDownloadDir } from "../fixtures";
import fs from "node:fs";
import path from "node:path";

async function waitForFile(
  dir: string,
  filename: string,
  timeoutMs = 10_000
): Promise<void> {
  const filePath = path.join(dir, filename);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(filePath)) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`File ${filename} did not appear in ${dir} within ${timeoutMs}ms`);
}

test("closes image tab after download when setting is enabled", async ({
  context,
  imageServer,
  extensionId,
}) => {
  // Open the popup first to enable the setting
  const settingsPage = await context.newPage();
  await settingsPage.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );
  const checkbox = settingsPage.getByRole("checkbox");
  if (!(await checkbox.isChecked())) {
    await checkbox.check();
  }
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
  await popup.getByRole("button", { name: "Download" }).click();

  // Wait for download to complete
  const downloadDir = getDownloadDir(context);
  await waitForFile(downloadDir, "test.png");

  // Wait briefly for tab close
  await popup.waitForTimeout(2_000);

  // Verify the image tab was closed
  const pages = context.pages();
  const imageTabStillOpen = pages.some((p) => p.url() === imgPageUrl);
  expect(imageTabStillOpen).toBe(false);
});
```

- [ ] **Step 2: Run test**

```bash
npx playwright test settings
```

Expected: PASS — image tab is closed after download.

- [ ] **Step 3: Write test — close tab after download OFF**

```typescript
test("keeps image tab open after download when setting is disabled", async ({
  context,
  imageServer,
  extensionId,
}) => {
  // Open popup and disable the setting
  const settingsPage = await context.newPage();
  await settingsPage.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );
  const checkbox = settingsPage.getByRole("checkbox");
  if (await checkbox.isChecked()) {
    await checkbox.uncheck();
  }
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
  await popup.getByRole("button", { name: "Download" }).click();

  const downloadDir = getDownloadDir(context);
  await waitForFile(downloadDir, "test.png");
  await popup.waitForTimeout(2_000);

  // Verify image tab is still open
  const pages = context.pages();
  const imageTabStillOpen = pages.some((p) => p.url() === imgPageUrl);
  expect(imageTabStillOpen).toBe(true);
});
```

- [ ] **Step 4: Run test**

```bash
npx playwright test settings
```

Expected: 2 tests pass.

- [ ] **Step 5: Write test — download directory setting**

```typescript
test("saves file to custom subdirectory", async ({
  context,
  imageServer,
  extensionId,
}) => {
  // Disable close-tab to keep test simpler
  const settingsPage = await context.newPage();
  await settingsPage.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );
  const checkbox = settingsPage.getByRole("checkbox");
  if (await checkbox.isChecked()) {
    await checkbox.uncheck();
  }

  // Set download directory
  const dirInput = settingsPage.getByPlaceholder("Subdirectory (optional)");
  await dirInput.fill("test-subdir");
  await settingsPage.close();

  // Open image tab and download
  const imgPage = await context.newPage();
  await imgPage.goto(`http://127.0.0.1:${imageServer.port}/test.png`);

  const popup = await context.newPage();
  await popup.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );
  await popup.getByRole("button", { name: "Download" }).click();

  const downloadDir = getDownloadDir(context);
  await waitForFile(downloadDir, path.join("test-subdir", "test.png"));
});
```

- [ ] **Step 6: Run test**

```bash
npx playwright test settings
```

Expected: 3 tests pass.

- [ ] **Step 7: Write test — settings persistence**

```typescript
test("persists settings across popup reopens", async ({
  context,
  extensionId,
}) => {
  // Open popup and change settings
  const popup1 = await context.newPage();
  await popup1.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );

  const checkbox = popup1.getByRole("checkbox");
  // Default is checked (true); uncheck it
  if (await checkbox.isChecked()) {
    await checkbox.uncheck();
  }
  const dirInput = popup1.getByPlaceholder("Subdirectory (optional)");
  await dirInput.fill("my-folder");

  await popup1.close();

  // Reopen popup
  const popup2 = await context.newPage();
  await popup2.goto(
    `chrome-extension://${extensionId}/src/popup/index.html`
  );

  const checkbox2 = popup2.getByRole("checkbox");
  await expect(checkbox2).not.toBeChecked();
  const dirInput2 = popup2.getByPlaceholder("Subdirectory (optional)");
  await expect(dirInput2).toHaveValue("my-folder");
});
```

- [ ] **Step 8: Run all settings tests**

```bash
npx playwright test settings
```

Expected: 4 tests pass.

- [ ] **Step 9: Run full E2E suite**

```bash
npm run test:e2e
```

Expected: All 10 tests pass (4 popup + 2 download + 4 settings).

- [ ] **Step 10: Commit**

```bash
git add e2e/tests/settings.spec.ts
git commit -m "test: add settings UI and persistence E2E tests"
```
