import { useEffect } from "react"

const applyDarkMode = (dark: boolean) => {
  document.documentElement.classList.toggle("dark", dark)
}

export const ColorModeSync = () => {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")

    const sync = () => {
      if (chrome.storage === undefined) {
        applyDarkMode(mq.matches)
        return
      }
      chrome.storage.sync.get(["isDarkMode"], (result) => {
        const pref = result.isDarkMode as boolean | null | undefined
        applyDarkMode(pref ?? mq.matches)
      })
    }

    sync()

    const mqHandler = () => sync()
    mq.addEventListener("change", mqHandler)

    const storageHandler = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if ("isDarkMode" in changes) {
        const val = changes.isDarkMode.newValue as boolean | null
        applyDarkMode(val ?? mq.matches)
      }
    }
    chrome.storage?.onChanged.addListener(storageHandler)

    return () => {
      mq.removeEventListener("change", mqHandler)
      chrome.storage?.onChanged.removeListener(storageHandler)
    }
  }, [])
  return null
}
