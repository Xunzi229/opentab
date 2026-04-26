import { useRef, useState, type ChangeEvent } from "react"
import { getAppSnapshot, resetAppSnapshot, saveAppSnapshot } from "../../repositories/local-repo"

type ImportExportPageProps = {
  onUpdated: () => Promise<void> | void
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ImportExportPage({ onUpdated }: ImportExportPageProps) {
  const [status, setStatus] = useState("你可以导出当前本地数据，也可以重新导入历史备份。")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handleExport() {
    const snapshot = await getAppSnapshot()
    downloadTextFile("opentab-backup.json", JSON.stringify(snapshot, null, 2))
    setStatus("已导出本地数据备份。")
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const raw = await file.text()
      const parsed = JSON.parse(raw)
      await saveAppSnapshot({
        routes: Array.isArray(parsed.routes) ? parsed.routes : [],
        groups: Array.isArray(parsed.groups) ? parsed.groups : [],
        visits: Array.isArray(parsed.visits) ? parsed.visits : [],
        settings:
          parsed.settings && typeof parsed.settings === "object"
            ? parsed.settings
            : {
                dedupeByUrl: true,
                syncProvider: "local",
                enableVisitTracking: true,
                viewMode: "grid"
              }
      })

      setStatus("导入完成，当前数据已恢复。")
      await onUpdated()
      event.target.value = ""
    } catch (error) {
      console.error(error)
      setStatus("导入失败，请确认文件内容是合法的 JSON 备份。")
    }
  }

  async function handleReset() {
    await resetAppSnapshot()
    setStatus("已清空本地数据并恢复默认设置。")
    await onUpdated()
  }

  return (
    <section className="surface options-card">
      <h3>导入 / 导出</h3>
      <p>先把数据流转能力打稳，后面接 Chrome Sync 和 WebDAV 时会轻松很多。</p>
      <div className="options-actions" style={{ marginTop: 16 }}>
        <button className="options-button is-primary" onClick={handleExport} type="button">
          导出 JSON
        </button>
        <button className="options-button" onClick={handleImportClick} type="button">
          导入 JSON
        </button>
        <button className="options-button is-danger" onClick={handleReset} type="button">
          清空本地数据
        </button>
      </div>
      <input hidden onChange={handleImportFile} ref={fileInputRef} type="file" accept=".json,application/json" />
      <p className="options-help">{status}</p>
    </section>
  )
}
