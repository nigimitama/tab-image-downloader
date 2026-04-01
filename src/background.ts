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
});
