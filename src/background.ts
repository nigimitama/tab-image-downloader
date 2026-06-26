export type Settings = {
  isCloseTabAfterDownload: boolean;
  downloadDir: string | null;
  isSiteParsingEnabled: boolean;
};

const defaultSettings: Settings = {
  isCloseTabAfterDownload: true,
  downloadDir: null, // if null, use default download directory
  isSiteParsingEnabled: true,
};

const setupRefererRules = () => {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: "Referer",
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: "https://gelbooru.com/",
            },
          ],
        },
        condition: {
          requestDomains: ["gelbooru.com"],
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.IMAGE,
            chrome.declarativeNetRequest.ResourceType.OTHER,
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          ],
        },
      },
      {
        id: 2,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: "Referer",
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: "https://www.pixiv.net/",
            },
          ],
        },
        condition: {
          requestDomains: ["pximg.net"],
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.IMAGE,
            chrome.declarativeNetRequest.ResourceType.OTHER,
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          ],
        },
      },
    ],
  });
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set(defaultSettings);
  setupRefererRules();
});

chrome.runtime.onStartup.addListener(() => {
  setupRefererRules();
});

const needsRefererDownload = (url: string): boolean => {
  try {
    const host = new URL(url).hostname;
    return host.endsWith("pximg.net") || host.endsWith("gelbooru.com");
  } catch {
    return false;
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "downloadImage") return false;
  (async () => {
    try {
      let downloadUrl = message.url;
      if (needsRefererDownload(message.url)) {
        const res = await fetch(message.url);
        if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
        const blob = await res.blob();
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode(
            ...bytes.subarray(i, Math.min(i + 8192, bytes.length)),
          );
        }
        downloadUrl = `data:${blob.type};base64,${btoa(binary)}`;
      }
      const downloadId = await chrome.downloads.download({
        url: downloadUrl,
        filename: message.filename,
        saveAs: false,
      });
      sendResponse({ downloadId });
    } catch (e) {
      sendResponse({ error: (e as Error).message });
    }
  })();
  return true;
});
