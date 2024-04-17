const defaultSettings = {
  isCloseTabAfterDownload: true,
  downloadDir: null,  // if null, use default download directory
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set(defaultSettings);
});
