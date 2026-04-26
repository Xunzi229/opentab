import { useRef, useState, type ChangeEvent } from "react"
import { createBackupFilename, decodeBackup, encodeBackup } from "../../lib/backup"
import { getAppSnapshot, resetAppSnapshot, saveAppSnapshot } from "../../repositories/local-repo"

type ImportExportPageProps = {
  onUpdated: () => Promise<void> | void
}

function downloadBackupFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ImportExportPage({ onUpdated }: ImportExportPageProps) {
  const [status, setStatus] = useState("你可以导出当前本地数据，也可以重新导入 .opentab 备份。")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handleExport() {
    const snapshot = await getAppSnapshot()
    const encoded = await encodeBackup(snapshot)
    downloadBackupFile(createBackupFilename(), encoded)
    setStatus("已导出本地 .opentab 备份文件。")
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
      const snapshot = await decodeBackup(raw)
      await saveAppSnapshot(snapshot)

      setStatus("导入完成，当前数据已恢复。")
      await onUpdated()
      event.target.value = ""
    } catch (error) {
      console.error(error)
      setStatus(error instanceof Error ? error.message : "导入失败，请确认备份文件没有损坏。")
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
      <p>这里使用压缩编码后的 .opentab 备份格式，避免直接暴露原始 JSON 结构。</p>
      <div className="options-actions" style={{ marginTop: 16 }}>
        <button className="options-button is-primary" onClick={handleExport} type="button">
          导出 .opentab
        </button>
        <button className="options-button" onClick={handleImportClick} type="button">
          导入 .opentab
        </button>
        <button className="options-button is-danger" onClick={handleReset} type="button">
          清空本地数据
        </button>
      </div>
      <input
        hidden
        onChange={handleImportFile}
        ref={fileInputRef}
        type="file"
        accept=".opentab,application/octet-stream,text/plain"
      />
      <p className="options-help">{status}</p>
    </section>
  )
}
