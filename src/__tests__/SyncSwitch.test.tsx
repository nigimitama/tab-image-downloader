import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { SyncSwitch } from "../popup/components/SyncSwitch"

const renderWithChakra = (ui: React.ReactElement) =>
  render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)

describe("SyncSwitch", () => {
  beforeEach(() => {
    ;(chrome.storage.sync.get as Mock).mockReset()
    ;(chrome.storage.sync.set as Mock).mockReset()
  })

  it("renders with the fallback label", () => {
    ;(chrome.storage.sync.get as Mock).mockImplementation((_keys: string[], cb: Function) => {
      cb({ isCloseTabAfterDownload: false })
    })

    renderWithChakra(
      <SyncSwitch
        storageKey="isCloseTabAfterDownload"
        messageKey="optionTabCloseDesc"
        fallbackLabel="Close tabs after download"
      />,
    )

    expect(screen.getByText("optionTabCloseDesc")).toBeInTheDocument()
  })

  it("loads initial value from chrome.storage", () => {
    ;(chrome.storage.sync.get as Mock).mockImplementation((_keys: string[], cb: Function) => {
      cb({ isCloseTabAfterDownload: true })
    })

    renderWithChakra(
      <SyncSwitch
        storageKey="isCloseTabAfterDownload"
        messageKey="optionTabCloseDesc"
        fallbackLabel="Close tabs"
      />,
    )

    expect(screen.getByRole("checkbox")).toBeChecked()
  })

  it("saves to chrome.storage when toggled", async () => {
    const user = userEvent.setup()
    ;(chrome.storage.sync.get as Mock).mockImplementation((_keys: string[], cb: Function) => {
      cb({ isCloseTabAfterDownload: false })
    })

    renderWithChakra(
      <SyncSwitch
        storageKey="isCloseTabAfterDownload"
        messageKey="optionTabCloseDesc"
        fallbackLabel="Close tabs"
      />,
    )

    await user.click(screen.getByRole("checkbox"))

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ isCloseTabAfterDownload: true })
  })

  it("calls onChange callback when toggled", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    ;(chrome.storage.sync.get as Mock).mockImplementation((_keys: string[], cb: Function) => {
      cb({ isSiteParsingEnabled: true })
    })

    renderWithChakra(
      <SyncSwitch
        storageKey="isSiteParsingEnabled"
        messageKey="optionSiteParsingDesc"
        fallbackLabel="Site parsing"
        defaultValue={true}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole("checkbox"))

    expect(onChange).toHaveBeenCalledWith(false)
  })

  it("respects the disabled prop", () => {
    ;(chrome.storage.sync.get as Mock).mockImplementation((_keys: string[], cb: Function) => {
      cb({ isSiteParsingEnabled: true })
    })

    renderWithChakra(
      <SyncSwitch
        storageKey="isSiteParsingEnabled"
        messageKey="optionSiteParsingDesc"
        fallbackLabel="Site parsing"
        disabled={true}
      />,
    )

    expect(screen.getByRole("checkbox")).toBeDisabled()
  })
})
