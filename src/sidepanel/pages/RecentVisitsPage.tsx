import { useCallback, useEffect, useState } from "react"
import { STORAGE_KEYS } from "../../lib/constants"
import { listVisits } from "../../services/history-service"
import type { VisitRecord } from "../../types/history"
import { HeroBanner } from "../components/HeroBanner"
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
      <HeroBanner title="最近访问" description="这里单独汇总最近访问记录，方便你回看最近操作过的网址。" />
      <section className="surface group-section">
        <div className="section-head">
          <div>
            <h3>最近访问</h3>
            <p>当前共记录 {rows.length} 条访问记录，默认折叠展示前 5 条。</p>
          </div>
        </div>
      </section>
      <RecentTable rows={rows} />
    </section>
  )
}
