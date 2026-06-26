import { describe, it, expect, vi } from "vitest"
import { t } from "../popup/i18n"

describe("t", () => {
  it("returns chrome.i18n.getMessage result when available", () => {
    expect(t("imageTabsFound", "fallback", ["3"])).toBe("imageTabsFound")
    expect(chrome.i18n.getMessage).toHaveBeenCalledWith("imageTabsFound", ["3"])
  })

  it("returns fallback when chrome.i18n is undefined", () => {
    const original = chrome.i18n
    // @ts-expect-error testing undefined case
    chrome.i18n = undefined
    expect(t("someKey", "fallback text")).toBe("fallback text")
    chrome.i18n = original
  })

  it("returns fallback when getMessage returns empty string", () => {
    vi.mocked(chrome.i18n.getMessage).mockReturnValueOnce("")
    expect(t("missingKey", "fallback")).toBe("fallback")
  })
})
