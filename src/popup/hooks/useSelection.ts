import { useState, useMemo } from "react"
import type { ImageSource } from "@/popup/chromeApi"

const getTabIds = (sources: ImageSource[]): number[] =>
  sources.map((s) => s.tab.id).filter((id): id is number => id !== undefined)

export const useSelection = (imageSources: ImageSource[] | null) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const selectAll = (sources: ImageSource[]) => {
    setSelectedIds(new Set(getTabIds(sources)))
  }

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    const ids = getTabIds(imageSources ?? [])
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id))
      return allSelected ? new Set() : new Set(ids)
    })
  }

  const selectedSources = useMemo(
    () =>
      (imageSources ?? []).filter(
        (source) => source.tab.id !== undefined && selectedIds.has(source.tab.id),
      ),
    [imageSources, selectedIds],
  )

  return { selectedIds, selectAll, toggleSelected, toggleAll, selectedSources }
}
