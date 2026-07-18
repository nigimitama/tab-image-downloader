import { describe, it, expect, beforeEach, vi, type Mock } from "vitest"

const getOnInstalledListener = () => {
  const addListenerMock = chrome.runtime.onInstalled.addListener as unknown as Mock
  return addListenerMock.mock.calls[0][0] as () => Promise<void>
}

describe("onInstalled", () => {
  const getMock = chrome.storage.sync.get as unknown as Mock
  const setMock = chrome.storage.sync.set as unknown as Mock
  const updateDynamicRulesMock = chrome.declarativeNetRequest.updateDynamicRules as unknown as Mock

  beforeEach(async () => {
    vi.resetModules()
    getMock.mockReset()
    setMock.mockReset()
    updateDynamicRulesMock.mockReset()
    ;(chrome.runtime.onInstalled.addListener as unknown as Mock).mockReset()
    await import("../background")
  })

  it("only fills in missing keys, leaving existing saved values untouched", async () => {
    getMock.mockResolvedValue({ downloadDir: "existing-dir" })

    await getOnInstalledListener()()

    expect(setMock).toHaveBeenCalledWith({
      isCloseTabAfterDownload: true,
      isSiteParsingEnabled: true,
      isDarkMode: null,
    })
  })

  it("does not write to storage when every key already exists", async () => {
    // Regression guard: writing unconditionally here raced with settings
    // changes made elsewhere (e.g. the popup) right after install/update,
    // silently reverting them. See #onInstalled fix.
    getMock.mockResolvedValue({
      isCloseTabAfterDownload: false,
      downloadDir: "existing-dir",
      isSiteParsingEnabled: false,
      isDarkMode: true,
    })

    await getOnInstalledListener()()

    expect(setMock).not.toHaveBeenCalled()
  })

  it("falls back to defaults when no existing settings are saved", async () => {
    getMock.mockResolvedValue({})

    await getOnInstalledListener()()

    expect(setMock).toHaveBeenCalledWith({
      isCloseTabAfterDownload: true,
      downloadDir: null,
      isSiteParsingEnabled: true,
      isDarkMode: null,
    })
  })

  it("still sets up the referer rules when storage.sync.get fails", async () => {
    getMock.mockRejectedValue(new Error("storage unavailable"))

    await expect(getOnInstalledListener()()).rejects.toThrow("storage unavailable")

    expect(setMock).not.toHaveBeenCalled()
    expect(updateDynamicRulesMock).toHaveBeenCalled()
  })

  it("sets up the referer rules on successful install", async () => {
    getMock.mockResolvedValue({})

    await getOnInstalledListener()()

    expect(updateDynamicRulesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        removeRuleIds: [1],
        addRules: expect.any(Array),
      }),
    )
  })
})
