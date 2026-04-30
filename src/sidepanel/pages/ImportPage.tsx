import { useRef, useState, type ChangeEvent } from "react"
import { decodeBackup } from "../../lib/backup"
import { saveAppBackupArchive } from "../../repositories/local-repo"
import { HeroBanner } from "../components/HeroBanner"

export function ImportPage() {
  const [statusMessage, setStatusMessage] = useState("选择一个备份压缩包，即可恢复本地插件数据和个人配置。")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

      setStatusMessage("导入完成，当前本地插件数据已恢复。")
      event.target.value = ""
    } catch (error) {
      console.error(error)
      setStatusMessage(error instanceof Error ? error.message : "导入失败，请确认备份文件没有损坏。")
    }
  }

  return (
    <section className="page-stack">
      <HeroBanner title="导入数据" description="把之前导出的插件完整备份压缩包导回来，快速恢复收藏、分组、标签、访问记录和个人配置。" />
      <section className="surface group-section">
        <div className="section-head">
          <div>
            <h3>导入备份</h3>
            <p>{statusMessage}</p>
          </div>
        </div>
        <div className="group-create-row">
          <button className="route-text-button is-primary" onClick={handleImportClick} type="button">
            选择备份压缩包
          </button>
        </div>
        <input hidden accept=".opentab,.zip,application/zip,application/octet-stream,text/plain" onChange={handleImportFile} ref={fileInputRef} type="file" />
      </section>
    </section>
  )
}
