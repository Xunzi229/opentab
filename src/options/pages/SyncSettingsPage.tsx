import { useState } from "react"
import { updateSettings } from "../../services/settings-service"
import type { AppSettings } from "../../types/settings"

type SyncSettingsPageProps = {
  settings: AppSettings | null
  onUpdated: () => Promise<void> | void
}

export function SyncSettingsPage({ settings, onUpdated }: SyncSettingsPageProps) {
  const [status, setStatus] = useState("当前默认使用本地存储。")

  async function handleToggleVisitTracking() {
    if (!settings) {
      return
    }

    const nextValue = !settings.enableVisitTracking
    await updateSettings("enableVisitTracking", nextValue)
    setStatus(nextValue ? "已开启访问记录。" : "已关闭访问记录。")
    await onUpdated()
  }

  return (
    <section className="surface options-card">
      <div className="options-row">
        <div>
          <h2>同步与记录设置</h2>
          <p>当前先把本地存储、访问记录和后续 Chrome Sync 的入口管理起来。</p>
        </div>
        <button className="options-button" type="button">
          Chrome Sync 即将接入
        </button>
      </div>
      <div className="options-stack" style={{ marginTop: 16 }}>
        <div className="options-row">
          <div>
            <h3>访问记录</h3>
            <p>控制是否记录已收藏页面的访问时间和访问次数。</p>
          </div>
          <button className="options-button is-primary" onClick={handleToggleVisitTracking} type="button">
            {settings?.enableVisitTracking ? "关闭记录" : "开启记录"}
          </button>
        </div>
      </div>
      <p className="options-help">{status}</p>
    </section>
  )
}
