import { useRef, useState, type ChangeEvent } from "react"
import { createBackupFilename, decodeBackup, encodeBackup } from "../../lib/backup"
import { getAppSnapshot, saveAppSnapshot } from "../../repositories/local-repo"
import { downloadSnapshotFromWebdav, uploadSnapshotToWebdav } from "../../services/webdav-sync-service"

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
  const [statusMessage, setStatusMessage] = useState("这里统一管理本地备份和 WebDAV 同步。")
  const [syncing, setSyncing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handleExport() {
    const snapshot = await getAppSnapshot()
    const encoded = await encodeBackup(snapshot)
    downloadBackupFile(createBackupFilename(), encoded)
    setStatusMessage("导出完成，已生成 .opentab 备份文件。")
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
      setStatusMessage("导入完成，本地数据已恢复。")
      event.target.value = ""
    } catch (error) {
      console.error(error)
      setStatusMessage(error instanceof Error ? error.message : "导入失败，请检查备份文件是否可用。")
    }
  }

  async function handleUploadToWebdav() {
    setSyncing(true)
    try {
      await uploadSnapshotToWebdav()
      setStatusMessage("上传完成，当前本地数据已同步到 WebDAV。")
    } catch (error) {
      console.error(error)
      setStatusMessage(error instanceof Error ? error.message : "上传失败，请检查 WebDAV 配置。")
    } finally {
      setSyncing(false)
    }
  }

  async function handleDownloadFromWebdav() {
    setSyncing(true)
    try {
      await downloadSnapshotFromWebdav()
      setStatusMessage("下载完成，WebDAV 备份已覆盖到本地。")
    } catch (error) {
      console.error(error)
      setStatusMessage(error instanceof Error ? error.message : "下载失败，请检查 WebDAV 配置。")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <section className="page-stack">
      <section className="surface group-section">
        <div className="section-head">
          <div>
            <h3>备份与同步</h3>
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

      <section className="surface group-section">
        <div className="section-head">
          <div>
            <h3>WebDAV 同步</h3>
            <p>先在设置页面填写 WebDAV 地址、用户名、密码和备份路径。</p>
          </div>
        </div>
        <div className="group-create-row">
          <button className="route-text-button is-primary" disabled={syncing} onClick={handleUploadToWebdav} type="button">
            上传到 WebDAV
          </button>
          <button className="route-text-button" disabled={syncing} onClick={handleDownloadFromWebdav} type="button">
            从 WebDAV 下载
          </button>
        </div>
      </section>
    </section>
  )
}
