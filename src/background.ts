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
