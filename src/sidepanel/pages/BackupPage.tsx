import { useRef, useState, type ChangeEvent } from "react"
import { createBackupFilename, decodeBackup, encodeBackup } from "../../lib/backup"
import { getAppSnapshot, saveAppSnapshot } from "../../repositories/local-repo"
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

export function BackupPage() {
  const [statusMessage, setStatusMessage] = useState("这里统一处理本地备份导入、导出，下一步也会接入远程同步。")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handleExport() {
    const snapshot = await getAppSnapshot()
    const encoded = await encodeBackup(snapshot)
    downloadBackupFile(createBackupFilename(), encoded)
    setStatusMessage("导出完成，已经生成 .opentab 备份文件。")
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
      setStatusMessage("导入完成，当前本地数据已经恢复。")
      event.target.value = ""
    } catch (error) {
      console.error(error)
      setStatusMessage(error instanceof Error ? error.message : "导入失败，请确认备份文件没有损坏。")
    }
  }

  return (
    <section className="page-stack">
      <HeroBanner title="备份与同步" description="这里统一管理本地导入导出，文件格式固定为 .opentab，后续远程同步也会收在这里。" />
      <section className="surface group-section">
        <div className="section-head">
          <div>
            <h3>本地备份</h3>
            <p>{statusMessage}</p>
          </div>
        </div>
        <div className="group-create-row">
          <button className="route-text-button is-primary" onClick={handleExport} type="button">
            导出 .opentab 备份
          </button>
          <button className="route-text-button" onClick={handleImportClick} type="button">
            导入 .opentab 备份
          </button>
        </div>
        <input hidden accept=".opentab,application/octet-stream,text/plain" onChange={handleImportFile} ref={fileInputRef} type="file" />
      </section>
    </section>
  )
}
