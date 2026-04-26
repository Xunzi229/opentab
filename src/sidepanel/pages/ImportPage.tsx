import { useRef, useState, type ChangeEvent } from "react"
import { saveAppSnapshot } from "../../repositories/local-repo"
import { HeroBanner } from "../components/HeroBanner"

export function ImportPage() {
  const [statusMessage, setStatusMessage] = useState("选择一个 OpenTab 备份 JSON，即可恢复本地收藏和配置。")
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
      const parsed = JSON.parse(raw)
      await saveAppSnapshot({
        routes: Array.isArray(parsed.routes) ? parsed.routes : [],
        groups: Array.isArray(parsed.groups) ? parsed.groups : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
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

      setStatusMessage("导入完成，当前本地数据已经恢复。")
      event.target.value = ""
    } catch (error) {
      console.error(error)
      setStatusMessage("导入失败，请确认文件内容是合法的 OpenTab JSON 备份。")
    }
  }

  return (
    <section className="page-stack">
      <HeroBanner title="导入数据" description="把之前导出的 OpenTab 备份导回来，快速恢复收藏、分组、标签和访问记录。" />
      <section className="surface group-section">
        <div className="section-head">
          <div>
            <h3>导入备份</h3>
            <p>{statusMessage}</p>
          </div>
        </div>
        <div className="group-create-row">
          <button className="route-text-button is-primary" onClick={handleImportClick} type="button">
            选择 JSON 备份文件
          </button>
        </div>
        <input hidden accept=".json,application/json" onChange={handleImportFile} ref={fileInputRef} type="file" />
      </section>
    </section>
  )
}
