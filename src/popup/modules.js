export const getSyncData = async (keys) => {
  // chrome.storageから値を取得
  try {
    const items = await new Promise((resolve, reject) => {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
        } else {
          resolve(result);
        }
      });
    });
    return items;
  } catch (error) {
    console.error("Error retrieving data:", error);
    throw error;
  }
};

export const sleep = async (second) => {
  // 指定秒数待つ関数
  return new Promise((resolve) => setTimeout(resolve, 1000 * second));
};

const isImageURL = (url) => {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"];
  const u = new URL(url);

  for (const ext of imageExtensions) {
    if (u.pathname.toLowerCase().endsWith(ext)) {
      return true;
    }
  }

  return false;
};

export const getImageTabs = async () => {
  // tabs: Tab[]
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const imageTabs = tabs.filter((tab) => isImageURL(tab.url));
  console.log(`${imageTabs.length} image tabs found.`);
  return imageTabs;
};

export const downloadFile = (url, filename) => {
  const downloading = chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false, // 保存先の選択ダイアログを表示しない
  });
  return downloading;
};

export const getFileName = (url) => {
  const u = new URL(url);
  const fileName = u.pathname.split("/").pop();
  return fileName;
};
