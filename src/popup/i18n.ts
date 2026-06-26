export const t = (key: string, fallback: string, substitutions?: string[]): string =>
  chrome.i18n?.getMessage(key, substitutions) || fallback
