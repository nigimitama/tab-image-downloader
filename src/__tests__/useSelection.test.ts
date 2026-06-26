import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSelection } from "../popup/hooks/useSelection"
import type { ImageSource } from "../popup/chromeApi"

const makeSource = (id: number, imageUrl: string): ImageSource => ({
  tab: { id, url: imageUrl } as chrome.tabs.Tab,
  imageUrl,
})

describe("useSelection", () => {
  it("starts with empty selection", () => {
    const { result } = renderHook(() => useSelection(null))
    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.selectedSources).toEqual([])
  })

  it("selectAll selects all tab ids", () => {
    const sources = [makeSource(1, "https://a.png"), makeSource(2, "https://b.png")]
    const { result } = renderHook(() => useSelection(sources))

    act(() => result.current.selectAll(sources))

    expect(result.current.selectedIds).toEqual(new Set([1, 2]))
    expect(result.current.selectedSources).toHaveLength(2)
  })

  it("toggleSelected adds and removes ids", () => {
    const sources = [makeSource(1, "https://a.png"), makeSource(2, "https://b.png")]
    const { result } = renderHook(() => useSelection(sources))

    act(() => result.current.selectAll(sources))
    act(() => result.current.toggleSelected(1))

    expect(result.current.selectedIds).toEqual(new Set([2]))

    act(() => result.current.toggleSelected(1))

    expect(result.current.selectedIds).toEqual(new Set([1, 2]))
  })

  it("toggleAll selects all when not all selected, deselects when all selected", () => {
    const sources = [makeSource(1, "https://a.png"), makeSource(2, "https://b.png")]
    const { result } = renderHook(() => useSelection(sources))

    act(() => result.current.toggleAll())
    expect(result.current.selectedIds).toEqual(new Set([1, 2]))

    act(() => result.current.toggleAll())
    expect(result.current.selectedIds).toEqual(new Set())
  })

  it("selectedSources filters based on selectedIds", () => {
    const sources = [makeSource(1, "https://a.png"), makeSource(2, "https://b.png")]
    const { result } = renderHook(() => useSelection(sources))

    act(() => result.current.toggleSelected(2))

    expect(result.current.selectedSources).toHaveLength(1)
    expect(result.current.selectedSources[0].imageUrl).toBe("https://b.png")
  })
})
