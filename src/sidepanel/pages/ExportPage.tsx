import { useCallback, useEffect, useState } from "react"
import { createBackupFilename, encodeBackup } from "../../lib/backup"
import { STORAGE_KEYS } from "../../lib/constants"
import { getAppSnapshot } from "../../repositories/local-repo"
import { HeroBanner } from "../components/HeroBanner"

function downloadBackupFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ExportPage() {
  const [counts, setCounts] = useState({ routes: 0, groups: 0, tags: 0, visits: 0 })
  const [statusMessage, setStatusMessage] = useState("这里可以导出当前本地数据，生成不直接暴露 JSON 结构的备份文件。")

  const loadData = useCallback(async () => {
    const snapshot = await getAppSnapshot()
    setCounts({
      routes: snapshot.routes.length,
      groups: snapshot.groups.length,
      tags: snapshot.tags.length,
      visits: snapshot.visits.length
    })
  }, [])

  useEffect(() => {
    void loadData()

    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== "local") {
        return
      }

      if (
        changes[STORAGE_KEYS.routes] ||
        changes[STORAGE_KEYS.groups] ||
        changes[STORAGE_KEYS.tags] ||
        changes[STORAGE_KEYS.visits]
      ) {
        void loadData()
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [loadData])

  async function handleExport() {
    const snapshot = await getAppSnapshot()
    const encoded = await encodeBackup(snapshot)
    downloadBackupFile(createBackupFilename(), encoded)
    setStatusMessage("导出完成，已经生成 .opentab 备份文件。")
  }

  return (
    <section className="page-stack">
      <HeroBanner title="导出数据" description="把当前本地收藏、分组、标签和访问记录导出成加码压缩后的 .opentab 备份。" />
      <section className="surface group-section">
        <div className="section-head">
          <div>
            <h3>导出当前快照</h3>
            <p>{statusMessage}</p>
          </div>
        </div>
        <div className="stats-row">
          <span className="route-badge">收藏 {counts.routes}</span>
          <span className="route-badge">分组 {counts.groups}</span>
          <span className="route-badge">标签 {counts.tags}</span>
          <span className="route-badge">访问记录 {counts.visits}</span>
        </div>
        <div className="group-create-row" style={{ marginTop: 16 }}>
          <button className="route-text-button is-primary" onClick={handleExport} type="button">
            导出 .opentab 备份
          </button>
        </div>
      </section>
    </section>
  )
}
