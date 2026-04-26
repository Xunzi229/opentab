import { useCallback, useEffect, useState } from "react"
import { STORAGE_KEYS } from "../../lib/constants"
import { listVisits } from "../../services/history-service"
import type { VisitRecord } from "../../types/history"
import { RecentTable } from "../components/RecentTable"

export function RecentVisitsPage() {
  const [rows, setRows] = useState<VisitRecord[]>([])

  const loadData = useCallback(async () => {
    const visits = await listVisits()
    setRows(visits)
  }, [])

  useEffect(() => {
    void loadData()

    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== "local") {
        return
      }

      if (changes[STORAGE_KEYS.visits]) {
        void loadData()
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [loadData])

  return (
    <section className="page-stack">
      <RecentTable
        description={`当前共记录 ${rows.length} 条访问记录，默认展示前 5 条。`}
        rows={rows}
        title="最近访问"
      />
    </section>
  )
}
