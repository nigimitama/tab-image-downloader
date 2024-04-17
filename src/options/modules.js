export const getSyncData = async (keys) => {
  // chrome.storageから値を取得
  if (chrome.storage === undefined) return null;
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

export const setSyncData = (key, value) => {
  if (chrome.storage === undefined) return null;

  chrome.storage.sync.set({ [key]: value });
};
