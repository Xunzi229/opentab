import { useState } from "react"
import { updateSettings } from "../../services/settings-service"
import { verifyWebdavConnection } from "../../services/webdav-sync-service"
import type { AppSettings } from "../../types/settings"

type SyncSettingsPageProps = {
  settings: AppSettings | null
  onUpdated: () => Promise<void> | void
}

export function SyncSettingsPage({ settings, onUpdated }: SyncSettingsPageProps) {
  const [status, setStatus] = useState("当前默认使用本地存储，你也可以在这里配置 WebDAV 同步。")

  async function handleToggleVisitTracking() {
    if (!settings) {
      return
    }

    const nextValue = !settings.enableVisitTracking
    await updateSettings("enableVisitTracking", nextValue)
    setStatus(nextValue ? "已开启访问记录。" : "已关闭访问记录。")
    await onUpdated()
  }

  async function handleProviderChange(provider: AppSettings["syncProvider"]) {
    await updateSettings("syncProvider", provider)
    setStatus(`同步提供方已切换为 ${provider}。`)
    await onUpdated()
  }

  async function handleFieldChange<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    await updateSettings(key, value)
    await onUpdated()
  }

  async function handleVerifyWebdav() {
    try {
      await verifyWebdavConnection()
      setStatus("WebDAV 连接检查通过。")
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "WebDAV 连接检查失败。")
    }
  }

  return (
    <section className="surface options-card">
      <div className="options-row">
        <div>
          <h2>同步与记录设置</h2>
          <p>这里统一管理本地记录、同步提供方和 WebDAV 连接配置。</p>
        </div>
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

        <div className="options-stack">
          <div>
            <h3>同步提供方</h3>
            <p>当前可以选择本地存储或 WebDAV，同步不会替代本地数据。</p>
          </div>
          <div className="options-actions">
            <button
              className={`options-button${settings?.syncProvider === "local" ? " is-primary" : ""}`}
              onClick={() => void handleProviderChange("local")}
              type="button"
            >
              本地
            </button>
            <button
              className={`options-button${settings?.syncProvider === "webdav" ? " is-primary" : ""}`}
              onClick={() => void handleProviderChange("webdav")}
              type="button"
            >
              WebDAV
            </button>
          </div>
        </div>

        <div className="options-stack">
          <div>
            <h3>WebDAV 配置</h3>
            <p>填写你的 WebDAV 地址、账号和备份路径，供手动上传和下载使用。</p>
          </div>
          <input
            className="group-input"
            onChange={(event) => void handleFieldChange("webdavUrl", event.target.value)}
            placeholder="https://dav.example.com/remote.php/dav/files/user"
            value={settings?.webdavUrl ?? ""}
          />
          <input
            className="group-input"
            onChange={(event) => void handleFieldChange("webdavUsername", event.target.value)}
            placeholder="WebDAV 用户名"
            value={settings?.webdavUsername ?? ""}
          />
          <input
            className="group-input"
            onChange={(event) => void handleFieldChange("webdavPassword", event.target.value)}
            placeholder="WebDAV 密码"
            type="password"
            value={settings?.webdavPassword ?? ""}
          />
          <input
            className="group-input"
            onChange={(event) => void handleFieldChange("webdavFilePath", event.target.value)}
            placeholder="opentab/backup.opentab"
            value={settings?.webdavFilePath ?? ""}
          />
          <div className="options-actions">
            <button className="options-button" onClick={handleVerifyWebdav} type="button">
              检查 WebDAV 连接
            </button>
          </div>
        </div>
      </div>
      <p className="options-help">{status}</p>
    </section>
  )
}
