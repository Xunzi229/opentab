import { useEffect, useState } from "react"
import { decryptText, encryptText } from "../../lib/crypto"
import { updateSettings } from "../../services/settings-service"
import { verifyWebdavConnection } from "../../services/webdav-sync-service"
import { getChromeSyncStatus, syncFromChrome, syncToChrome } from "../../services/chrome-sync-service"
import type { AppSettings } from "../../types/settings"

type SyncSettingsPageProps = {
  settings: AppSettings | null
  onUpdated: () => Promise<void> | void
}

function normalizeBackupLimit(value: string | number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 10
  }
  return Math.min(100, Math.max(1, Math.floor(parsed)))
}

export function SyncSettingsPage({ settings, onUpdated }: SyncSettingsPageProps) {
  const [status, setStatus] = useState("当前默认使用本地存储，你也可以在这里配置 WebDAV 同步。")
  const [chromeSyncStatus, setChromeSyncStatus] = useState<{ lastSynced: string | null; dataSize: number }>({ lastSynced: null, dataSize: 0 })
  const [syncing, setSyncing] = useState(false)
  const [displayPassword, setDisplayPassword] = useState("")

  useEffect(() => {
    void getChromeSyncStatus().then(setChromeSyncStatus)
  }, [])

  useEffect(() => {
    if (settings?.webdavPassword) {
      void decryptText(settings.webdavPassword).then(setDisplayPassword)
    } else {
      setDisplayPassword("")
    }
  }, [settings?.webdavPassword])

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

  async function handleSyncToChrome() {
    setSyncing(true)
    try {
      const result = await syncToChrome()
      setStatus(result.success ? "数据已推送到 Chrome 云端。" : `推送失败：${result.error}`)
      setChromeSyncStatus(await getChromeSyncStatus())
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "推送失败。")
    } finally {
      setSyncing(false)
    }
  }

  async function handleSyncFromChrome() {
    setSyncing(true)
    try {
      const result = await syncFromChrome()
      setStatus(result.success ? "数据已从 Chrome 云端拉取到本地。" : `拉取失败：${result.error}`)
      await onUpdated()
      setChromeSyncStatus(await getChromeSyncStatus())
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "拉取失败。")
    } finally {
      setSyncing(false)
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
            <p>当前可以选择本地、Chrome Sync 或 WebDAV，同步不会替代本地数据。</p>
          </div>
          <div className="options-actions">
            <button className={`options-button${settings?.syncProvider === "local" ? " is-primary" : ""}`} onClick={() => void handleProviderChange("local")} type="button">
              本地
            </button>
            <button className={`options-button${settings?.syncProvider === "chrome-sync" ? " is-primary" : ""}`} onClick={() => void handleProviderChange("chrome-sync")} type="button">
              Chrome Sync
            </button>
            <button className={`options-button${settings?.syncProvider === "webdav" ? " is-primary" : ""}`} onClick={() => void handleProviderChange("webdav")} type="button">
              WebDAV
            </button>
          </div>
        </div>

        <div className="options-stack">
          <div>
            <h3>Chrome Storage Sync</h3>
            <p>通过 Chrome 账号同步数据到云端，适合少量数据跨设备同步。</p>
          </div>
          <div className="options-info-row">
            <span>上次同步：{chromeSyncStatus.lastSynced ? new Date(chromeSyncStatus.lastSynced).toLocaleString() : "从未同步"}</span>
            <span>数据大小：{chromeSyncStatus.dataSize > 0 ? `${(chromeSyncStatus.dataSize / 1024).toFixed(1)}KB` : "无数据"}</span>
          </div>
          <div className="options-actions">
            <button className="options-button is-primary" disabled={syncing} onClick={handleSyncToChrome} type="button">
              {syncing ? "同步中..." : "推送数据到云端"}
            </button>
            <button className="options-button" disabled={syncing} onClick={handleSyncFromChrome} type="button">
              {syncing ? "同步中..." : "从云端拉取"}
            </button>
          </div>
        </div>

        <div className="options-stack">
          <div>
            <h3>WebDAV 配置</h3>
            <p>填写你的 WebDAV 地址、账号、密码、备份路径和配置备份数量上限。备份路径也可以只填目录。</p>
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
            onChange={(event) => {
              const raw = event.target.value
              setDisplayPassword(raw)
              void encryptText(raw).then((encrypted) => handleFieldChange("webdavPassword", encrypted))
            }}
            placeholder="WebDAV 密码"
            type="password"
            value={displayPassword}
          />
          <input
            className="group-input"
            onChange={(event) => void handleFieldChange("webdavFilePath", event.target.value)}
            placeholder="opentab/backup.opentab.zip"
            value={settings?.webdavFilePath ?? ""}
          />
          <input
            className="group-input"
            min="1"
            max="100"
            onChange={(event) => void handleFieldChange("webdavBackupLimit", normalizeBackupLimit(event.target.value))}
            placeholder="10"
            type="number"
            value={settings?.webdavBackupLimit ?? 10}
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
