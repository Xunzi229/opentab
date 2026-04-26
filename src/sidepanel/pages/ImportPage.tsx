import { useRef, useState, type ChangeEvent } from "react"
import { decodeBackup } from "../../lib/backup"
import { saveAppSnapshot } from "../../repositories/local-repo"
import { HeroBanner } from "../components/HeroBanner"

export function ImportPage() {
  const [statusMessage, setStatusMessage] = useState("选择一个 .opentab 备份文件，即可恢复本地收藏和配置。")
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
      <HeroBanner title="导入数据" description="把之前导出的 .opentab 备份导回来，快速恢复收藏、分组、标签和访问记录。" />
      <section className="surface group-section">
        <div className="section-head">
          <div>
            <h3>导入备份</h3>
            <p>{statusMessage}</p>
          </div>
        </div>
        <div className="group-create-row">
          <button className="route-text-button is-primary" onClick={handleImportClick} type="button">
            选择 .opentab 备份文件
          </button>
        </div>
        <input hidden accept=".opentab,application/octet-stream,text/plain" onChange={handleImportFile} ref={fileInputRef} type="file" />
      </section>
    </section>
  )
}
