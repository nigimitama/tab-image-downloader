# E2E Testing with Playwright — Design Spec

## Overview

Playwright を使って tab-image-downloader Chrome 拡張の E2E テストを導入する。Playwright の Chrome 拡張テストサポートを活用し、ビルド済み拡張を Chromium にロードして実際の Chrome API（tabs, downloads, storage）との統合を検証する。

## Approach

**フルインテグレーション**: 実際の Chromium で拡張をロードし、タブ操作・ダウンロード・設定まで全てリアルに検証する。既存の vitest + jsdom テストはユニット/コンポーネントレベルのカバレッジを担い、Playwright E2E テストは実ブラウザでの統合動作を保証する。

## Directory Structure

```
e2e/
  fixtures.ts          # Playwright custom fixtures
  helpers/
    server.ts          # Test image HTTP server
  tests/
    popup.spec.ts      # Popup display, image tab detection
    download.spec.ts   # Download execution, file verification
    settings.spec.ts   # Settings UI, persistence
  assets/
    test.png           # Test image files
    test.jpg
playwright.config.ts   # Playwright configuration (project root)
```

## Infrastructure

### Playwright Configuration

- **Browser**: Chromium only (Firefox/WebKit do not support extensions)
- **Context**: `chromium.launchPersistentContext` with `--load-extension` and `--disable-extensions-except` flags pointing to `dist/`
- **Headless**: Supported with Playwright's bundled Chromium (`channel: 'chromium'`)

### Custom Fixtures (`e2e/fixtures.ts`)

Four fixtures:

1. **`context`**: Persistent browser context with extension loaded. Creates a temp download directory via `fs.mkdtemp` and passes `--download-default-dir` to Chromium. Cleans up on teardown.
2. **`extensionId`**: Extracted from the service worker URL (`serviceWorker.url().split('/')[2]`). Waits for service worker if not immediately available.
3. **`imageServer`**: Node.js `http.createServer` serving `e2e/assets/` files. Starts on a random available port, closes on teardown.
4. **`popupPage`**: Navigates to `chrome-extension://<extensionId>/src/popup/index.html` and returns the page. Convenience fixture to reduce boilerplate.

### Build Integration

Test execution requires a prior build step. Managed via npm script:

```json
{
  "test:e2e": "npm run build && playwright test",
  "test:e2e:headed": "npm run build && playwright test --headed"
}
```

### Test Image Server

- `http.createServer` serves static files from `e2e/assets/`
- Binds to `127.0.0.1` on port 0 (OS-assigned)
- Serves `test.png`, `test.jpg` at `http://127.0.0.1:<port>/test.png`
- Managed as a Playwright fixture — lifecycle tied to test suite

## Test Scenarios

### `popup.spec.ts` — Popup Display & Image Tab Detection

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Extension loads and popup opens | Navigate to popup URL | UI renders with "Settings" section visible |
| 2 | No image tabs | Open popup with no image tabs open | "0 image tabs found." displayed, Download button disabled |
| 3 | Image tabs detected | Open tabs with `http://localhost:<port>/test.png` and `test.jpg`, then open popup | "2 image tabs found.", thumbnail list shows both images |
| 4 | Non-image tabs excluded | Open mix of image and HTML tabs, then open popup | Only image tabs counted and listed |

### `download.spec.ts` — Download Execution

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 5 | Bulk download | Open 2 image tabs, click Download | Both files exist in temp download directory |
| 6 | Loading state | Click Download | Button shows loading spinner during download, re-enables after |

### `settings.spec.ts` — Settings UI & Persistence

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 7 | Close tab after download ON | Enable setting, open image tab, download | Image tab is closed after download |
| 8 | Close tab after download OFF | Disable setting, open image tab, download | Image tab remains open |
| 9 | Download directory setting | Set directory to "test-dir", download | File saved under `test-dir/` subdirectory |
| 10 | Settings persistence | Change settings, close popup, reopen | Settings values preserved |

## Download Verification Strategy

- Use `fs.mkdtemp` to create a unique temp directory per test run
- Pass `--download-default-dir=<tempDir>` to Chromium launch args
- After download action, poll the temp directory for expected files (with timeout)
- Clean up temp directory in fixture teardown

## CI Integration

Add `e2e` job to existing `.github/workflows/test.yml`:

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

## Constraints & Limitations

- **Chromium only**: Google Chrome and Edge removed the flags needed for extension side-loading. Tests use Playwright's bundled Chromium.
- **Service Worker suspension**: Chrome MV3 service workers auto-suspend after ~30s inactivity. Tests should not rely on long-lived service worker state.
- **Twitter image URLs**: `pbs.twimg.com` URLs cannot be tested as real tabs in E2E (requires actual Twitter CDN). The URL pattern matching logic is already covered by unit tests. E2E tests focus on the standard image format path.
- **No `@crxjs/vite-plugin` HMR in tests**: Tests use the production build (`dist/`), not the dev server.

## Dependencies to Add

```
devDependencies:
  @playwright/test: ^1.52
```
