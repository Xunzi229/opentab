import { useRef, useState, type ChangeEvent } from "react"
import { createBackupFilename, decodeBackup, encodeBackup } from "../../lib/backup"
import { getAppBackupArchive, resetAppSnapshot, saveAppBackupArchive } from "../../repositories/local-repo"

type ImportExportPageProps = {
  onUpdated: () => Promise<void> | void
}

function downloadBackupFile(filename: string, content: ArrayBuffer) {
  const blob = new Blob([content], { type: "application/zip" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ImportExportPage({ onUpdated }: ImportExportPageProps) {
  const [status, setStatus] = useState("你可以导出当前插件完整数据，也可以重新导入之前的备份压缩包。")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handleExport() {
    const archive = await getAppBackupArchive()
    const encoded = await encodeBackup(archive)
    downloadBackupFile(createBackupFilename(), encoded)
    setStatus("已导出本地插件完整备份压缩包。")
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
      const raw = await file.arrayBuffer()
      const archive = await decodeBackup(raw)
      await saveAppBackupArchive(archive)

      setStatus("导入完成，当前插件数据和个人配置已恢复。")
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
      <p>这里会导出插件完整数据压缩包，包含收藏、分组、标签、访问记录、插件设置和已保存的 WebDAV 配置。</p>
      <div className="options-actions" style={{ marginTop: 16 }}>
        <button className="options-button is-primary" onClick={handleExport} type="button">
          导出备份压缩包
        </button>
        <button className="options-button" onClick={handleImportClick} type="button">
          导入备份压缩包
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
        accept=".opentab,.zip,application/zip,application/octet-stream,text/plain"
      />
      <p className="options-help">{status}</p>
    </section>
  )
}
