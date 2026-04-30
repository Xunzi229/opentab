import { useEffect, useState } from "react"
import { loadSettings, updateSettings } from "../../services/settings-service"
import type { AppSettings } from "../../types/settings"

export function SettingsEntryPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  const handleToggleTracking = async () => {
    if (!settings) return
    const next = await updateSettings("enableVisitTracking", !settings.enableVisitTracking)
    setSettings(next)
  }

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  if (!settings) return null

  return (
    <div className="settings-entry-page">
      <div className="page-header">
        <div>
          <h3>设置</h3>
          <p className="page-header-desc">管理应用偏好与账户配置</p>
        </div>
      </div>

      <div className="settings-list">
        <div className="settings-item">
          <div className="settings-item-main">
            <span className="settings-label">访问追踪</span>
            <span className="settings-desc">记录最近访问的路由，方便快速回顾</span>
          </div>
          <button
            className={`toggle-btn ${settings.enableVisitTracking ? "on" : "off"}`}
            onClick={handleToggleTracking}
          >
            {settings.enableVisitTracking ? "已开启" : "已关闭"}
          </button>
        </div>

        <div className="settings-item clickable" onClick={handleOpenOptions}>
          <div className="settings-item-main">
            <span className="settings-label">同步与备份</span>
            <span className="settings-desc">配置 WebDAV 同步、导入导出数据</span>
          </div>
          <span className="settings-arrow">&rsaquo;</span>
        </div>

        <div className="settings-item clickable" onClick={handleOpenOptions}>
          <div className="settings-item-main">
            <span className="settings-label">隐私与安全</span>
            <span className="settings-desc">数据存储与隐私策略说明</span>
          </div>
          <span className="settings-arrow">&rsaquo;</span>
        </div>
      </div>
    </div>
  )
}
