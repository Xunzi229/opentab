import { useCallback, useEffect, useState } from "react"
import { createBackupFilename, encodeBackup } from "../../lib/backup"
import { STORAGE_KEYS } from "../../lib/constants"
import { getAppBackupArchive } from "../../repositories/local-repo"
import { HeroBanner } from "../components/HeroBanner"

function downloadBackupFile(filename: string, content: ArrayBuffer) {
  const blob = new Blob([content], { type: "application/zip" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ExportPage() {
  const [counts, setCounts] = useState({ routes: 0, groups: 0, tags: 0, visits: 0, webdavConfigs: 0 })
  const [statusMessage, setStatusMessage] = useState("这里可以导出当前插件完整数据，生成 zip 备份压缩包。")

  const loadData = useCallback(async () => {
    const archive = await getAppBackupArchive()
    setCounts({
      routes: archive.snapshot.routes.length,
      groups: archive.snapshot.groups.length,
      tags: archive.snapshot.tags.length,
      visits: archive.snapshot.visits.length,
      webdavConfigs: archive.webdavConfigs.length
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
        changes[STORAGE_KEYS.visits] ||
        changes[STORAGE_KEYS.settings] ||
        changes[STORAGE_KEYS.webdavConfigs]
      ) {
        void loadData()
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [loadData])

  async function handleExport() {
    const archive = await getAppBackupArchive()
    const encoded = await encodeBackup(archive)
    downloadBackupFile(createBackupFilename(), encoded)
    setStatusMessage("导出完成，已生成插件完整备份压缩包。")
  }

  return (
    <section className="page-stack">
      <HeroBanner title="导出数据" description="把当前插件收藏、分组、标签、访问记录、插件设置和个人配置导出成 zip 备份压缩包。" />
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
          <span className="route-badge">WebDAV 配置 {counts.webdavConfigs}</span>
        </div>
        <div className="group-create-row" style={{ marginTop: 16 }}>
          <button className="route-text-button is-primary" onClick={handleExport} type="button">
            导出 zip 备份
          </button>
        </div>
      </section>
    </section>
  )
}
