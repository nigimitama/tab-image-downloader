export type Settings = {
  isCloseTabAfterDownload: boolean;
  downloadDir: string | null;
};

const defaultSettings: Settings = {
  isCloseTabAfterDownload: true,
  downloadDir: null, // if null, use default download directory
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set(defaultSettings);

  // Gelbooru's CDN rejects requests without a Referer from gelbooru.com
  // (hotlink protection). Add the header so chrome.downloads.download works.
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
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
          ],
        },
      },
    ],
  });
});
