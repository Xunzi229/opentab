import { useRef, useState, type ChangeEvent } from "react"
import { createBackupFilename, decodeBackup, encodeBackup } from "../../lib/backup"
import { decryptText, encryptText } from "../../lib/crypto"
import { getAppBackupArchive, saveAppBackupArchive } from "../../repositories/local-repo"
import {
  deleteWebdavBackup,
  downloadSnapshotFromWebdav,
  enforceWebdavBackupLimit,
  listWebdavBackups,
  uploadSnapshotToWebdav,
  verifyWebdavConnection,
  type WebdavBackupItem
} from "../../services/webdav-sync-service"
import { loadSettings, updateSettings } from "../../services/settings-service"

function downloadBackupFile(filename: string, content: ArrayBuffer) {
  const blob = new Blob([content], { type: "application/zip" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function normalizeBackupLimit(value: string | number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 10
  }
  return Math.min(100, Math.max(1, Math.floor(parsed)))
}

function formatBackupLabel(item: WebdavBackupItem) {
  if (!item.createdAt) {
    return item.name
  }

  return new Date(item.createdAt).toLocaleString()
}

export function BackupPage() {
  const [statusMessage, setStatusMessage] = useState("这里统一管理本地备份和 WebDAV 同步。")
  const [syncing, setSyncing] = useState(false)
  const [showWebdavModal, setShowWebdavModal] = useState(false)
  const [webdavUrl, setWebdavUrl] = useState("")
  const [webdavUsername, setWebdavUsername] = useState("")
  const [webdavPassword, setWebdavPassword] = useState("")
  const [webdavFilePath, setWebdavFilePath] = useState("")
  const [webdavBackupLimit, setWebdavBackupLimit] = useState("10")
  const [modalStatus, setModalStatus] = useState<string | null>(null)
  const [remoteBackups, setRemoteBackups] = useState<WebdavBackupItem[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function refreshRemoteBackups() {
    const backups = await listWebdavBackups()
    setRemoteBackups(backups)
    return backups
  }

  async function saveCurrentSettings(passwordValue = webdavPassword) {
    const encryptedPassword = await encryptText(passwordValue)
    const limit = normalizeBackupLimit(webdavBackupLimit)

    await updateSettings("webdavUrl", webdavUrl.trim())
    await updateSettings("webdavUsername", webdavUsername.trim())
    await updateSettings("webdavPassword", encryptedPassword)
    await updateSettings("webdavFilePath", webdavFilePath.trim())
    await updateSettings("webdavBackupLimit", limit)

    return {
      encryptedPassword,
      limit
    }
  }

  async function handleExport() {
    const archive = await getAppBackupArchive()
    const encoded = await encodeBackup(archive)
    downloadBackupFile(createBackupFilename(), encoded)
    setStatusMessage("导出完成，已生成插件完整备份压缩包。")
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
      setStatusMessage("导入完成，本地插件数据和个人配置已恢复。")
      event.target.value = ""
    } catch (error) {
      console.error(error)
      setStatusMessage(error instanceof Error ? error.message : "导入失败，请检查备份文件是否可用。")
    }
  }

  async function handleUploadToWebdav() {
    setSyncing(true)
    try {
      const result = await uploadSnapshotToWebdav()
      if (showWebdavModal) {
        await refreshRemoteBackups()
      }
      const replacedMessage = result.replaced ? "，已覆盖最旧的一条远程备份并更新时间" : ""
      setStatusMessage(`上传完成，当前本地数据已同步到 WebDAV${replacedMessage}。`)
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
      const result = await downloadSnapshotFromWebdav()
      setStatusMessage(`下载完成，已从 ${result.sourcePath} 恢复最新远程备份。`)
    } catch (error) {
      console.error(error)
      setStatusMessage(error instanceof Error ? error.message : "下载失败，请检查 WebDAV 配置。")
    } finally {
      setSyncing(false)
    }
  }

  async function openWebdavModal() {
    const settings = await loadSettings()
    const decryptedPassword = await decryptText(settings.webdavPassword ?? "")
    const limit = normalizeBackupLimit(settings.webdavBackupLimit ?? 10)

    setWebdavUrl(settings.webdavUrl ?? "")
    setWebdavUsername(settings.webdavUsername ?? "")
    setWebdavPassword(decryptedPassword)
    setWebdavFilePath(settings.webdavFilePath ?? "opentab/backup.opentab.zip")
    setWebdavBackupLimit(String(limit))
    setModalStatus(null)
    setShowWebdavModal(true)

    try {
      const backups = await refreshRemoteBackups()
      setModalStatus(backups.length > 0 ? `已加载 ${backups.length} 条远程备份。` : "远程目录中还没有历史备份。")
    } catch (error) {
      console.error(error)
      setModalStatus(error instanceof Error ? error.message : "远程备份列表加载失败。")
      setRemoteBackups([])
    }
  }

  async function handleSaveSettings() {
    try {
      await saveCurrentSettings()
      setModalStatus("WebDAV 配置已保存。")
      setStatusMessage("WebDAV 配置已保存。")
    } catch (error) {
      console.error(error)
      setModalStatus(error instanceof Error ? error.message : "保存失败。")
    }
  }

  async function handleVerifyConnection() {
    try {
      setModalStatus("正在检查 WebDAV 连接...")
      await saveCurrentSettings()
      await verifyWebdavConnection()
      setModalStatus("WebDAV 连接检查通过。")
      setStatusMessage("WebDAV 连接检查通过。")
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : "连接检查失败。"
      setModalStatus(message)
      setStatusMessage(message)
    }
  }

  async function handleApplyBackupLimit() {
    try {
      const { limit } = await saveCurrentSettings()
      const { removed } = await enforceWebdavBackupLimit()
      const backups = await refreshRemoteBackups()
      setModalStatus(
        removed.length > 0
          ? `备份数量已限制为 ${limit}，并清理了 ${removed.length} 条旧备份，当前剩余 ${backups.length} 条。`
          : `备份数量已更新为 ${limit}。`
      )
      setStatusMessage("WebDAV 备份数量设置已生效。")
    } catch (error) {
      console.error(error)
      setModalStatus(error instanceof Error ? error.message : "更新备份数量失败。")
    }
  }

  async function handleRestoreRemoteBackup(item: WebdavBackupItem) {
    try {
      await downloadSnapshotFromWebdav(item.remotePath)
      setModalStatus(`已恢复远程备份 ${item.name}。`)
      setStatusMessage(`已从 WebDAV 恢复备份 ${item.name}。`)
    } catch (error) {
      console.error(error)
      setModalStatus(error instanceof Error ? error.message : "恢复失败。")
    }
  }

  async function handleDeleteRemoteBackup(item: WebdavBackupItem) {
    if (!window.confirm(`确认删除远程备份 ${item.name}？此操作不可逆。`)) {
      return
    }

    try {
      await deleteWebdavBackup(item.remotePath)
      await refreshRemoteBackups()
      setModalStatus(`已删除远程备份 ${item.name}。`)
      setStatusMessage(`已删除 WebDAV 远程备份 ${item.name}。`)
    } catch (error) {
      console.error(error)
      setModalStatus(error instanceof Error ? error.message : "删除失败。")
    }
  }

  return (
    <section className="page-stack backup-page">
      <section className="backup-hero">
        <div className="backup-hero-mark">
          <span className="backup-hero-mark-core" />
        </div>
        <div className="backup-hero-copy">
          <h2>备份与同步</h2>
          <p>管理本地备份和 WebDAV 同步，保障数据安全。</p>
          <div className="backup-hero-status">{statusMessage}</div>
        </div>
      </section>

      <section className="surface backup-feature-card backup-feature-card-local">
        <div className="backup-feature-content">
          <div className="backup-feature-icon backup-feature-icon-local">
            <span className="backup-feature-icon-core" />
          </div>
          <div className="backup-feature-body">
            <div className="backup-feature-title-row">
              <h3>备份与同步</h3>
              <span className="backup-feature-badge backup-feature-badge-local">本地备份</span>
            </div>
            <p>这里统一管理本地备份和 WebDAV 同步。</p>
            <div className="group-create-row backup-toolbar">
              <button className="route-text-button is-primary" onClick={handleExport} type="button">
                导出 zip 备份
              </button>
              <button className="route-text-button" onClick={handleImportClick} type="button">
                导入 zip 备份
              </button>
            </div>
          </div>
        </div>
        <div className="backup-feature-art backup-feature-art-local" aria-hidden="true">
          <span className="backup-orb backup-orb-a" />
          <span className="backup-orb backup-orb-b" />
          <span className="backup-orb backup-orb-c" />
          <div className="backup-stack">
            <span className="backup-stack-unit backup-stack-top" />
            <span className="backup-stack-unit backup-stack-mid" />
            <span className="backup-stack-folder" />
          </div>
        </div>
        <input hidden accept=".opentab,.zip,application/zip,application/octet-stream,text/plain" onChange={handleImportFile} ref={fileInputRef} type="file" />
      </section>

      <section className="surface backup-feature-card backup-feature-card-remote">
        <div className="backup-feature-content">
          <div className="backup-feature-icon backup-feature-icon-remote">
            <span className="backup-feature-icon-core" />
          </div>
          <div className="backup-feature-body">
            <div className="backup-feature-title-row">
              <h3>WebDAV 同步</h3>
              <span className="backup-feature-badge backup-feature-badge-remote">远程备份</span>
            </div>
            <p>上传会生成一份新的远程备份；下载默认恢复最新一份远程备份。</p>
            <div className="group-create-row backup-toolbar">
              <button className="route-text-button is-primary" disabled={syncing} onClick={handleUploadToWebdav} type="button">
                上传到 WebDAV
              </button>
              <button className="route-text-button" disabled={syncing} onClick={() => void openWebdavModal()} type="button">
                配置 WebDAV
              </button>
              <button className="route-text-button" disabled={syncing} onClick={handleDownloadFromWebdav} type="button">
                从 WebDAV 下载
              </button>
            </div>
          </div>
        </div>
        <div className="backup-feature-art backup-feature-art-remote" aria-hidden="true">
          <span className="backup-orb backup-orb-d" />
          <span className="backup-orb backup-orb-e" />
          <span className="backup-orb backup-orb-f" />
          <div className="backup-cloud">
            <span className="backup-cloud-core" />
            <span className="backup-cloud-node backup-cloud-node-a" />
            <span className="backup-cloud-node backup-cloud-node-b" />
            <span className="backup-cloud-arrow" />
          </div>
        </div>
      </section>

      <section className="surface backup-tip-bar">
        <div className="backup-tip-icon" aria-hidden="true">
          !
        </div>
        <div className="backup-tip-copy">
          <strong>提示</strong>
          <span>建议定期进行本地备份，并将重要数据同步到 WebDAV 以防止数据丢失。</span>
        </div>
      </section>

      {showWebdavModal ? (
        <div className="modal-overlay" onClick={() => setShowWebdavModal(false)}>
          <div className="modal-card webdav-modal" onClick={(event) => event.stopPropagation()}>
            <div className="webdav-modal-header">
              <h3>WebDAV 配置</h3>
              <p>填写你的 WebDAV 地址、账号、密码、备份路径和备份数量上限。备份路径可填目录，系统会自动补成 `backup.opentab.zip`。</p>
            </div>

            <section className="webdav-config-panel">
              <div className="webdav-config-panel-head">连接配置</div>
              <div className="backup-form-grid">
                <label className="webdav-field">
                  <span>WebDAV 地址</span>
                  <input className="group-input" placeholder="https://dav.example.com/dav/" value={webdavUrl} onChange={(event) => setWebdavUrl(event.target.value)} />
                </label>
                <label className="webdav-field">
                  <span>账号</span>
                  <input className="group-input" placeholder="your-account@example.com" value={webdavUsername} onChange={(event) => setWebdavUsername(event.target.value)} />
                </label>
                <label className="webdav-field">
                  <span>密码</span>
                  <input className="group-input" placeholder="请输入 WebDAV 密码" type="password" value={webdavPassword} onChange={(event) => setWebdavPassword(event.target.value)} />
                </label>
                <label className="webdav-field">
                  <span>备份目录</span>
                  <input className="group-input" placeholder="opentab/backup.opentab.zip" value={webdavFilePath} onChange={(event) => setWebdavFilePath(event.target.value)} />
                </label>
                <label className="webdav-field webdav-field-limit">
                  <span>备份数量上限</span>
                  <input
                    className="group-input"
                    min="1"
                    max="100"
                    placeholder="10"
                    type="number"
                    value={webdavBackupLimit}
                    onChange={(event) => setWebdavBackupLimit(event.target.value)}
                  />
                </label>
              </div>
            </section>

            <div className="backup-modal-toolbar webdav-modal-toolbar">
              <button className="route-text-button is-primary" onClick={() => void handleSaveSettings()} type="button">
                保存配置
              </button>
              <button className="route-text-button" onClick={() => void handleVerifyConnection()} type="button">
                检查连接
              </button>
              <button className="route-text-button" onClick={() => void handleApplyBackupLimit()} type="button">
                应用备份数量
              </button>
              <button className="route-text-button" onClick={() => void refreshRemoteBackups()} type="button">
                刷新备份列表
              </button>
            </div>

            {modalStatus ? (
              <div className="backup-modal-status webdav-status-banner">
                <span className="webdav-status-icon">i</span>
                <span>{modalStatus}</span>
              </div>
            ) : null}

            <div className="backup-list-section webdav-list-section">
              <h4 className="webdav-list-title">远程备份列表</h4>
              {remoteBackups.length === 0 ? <div className="backup-list-empty">远程目录中还没有可恢复的历史备份。</div> : null}
              <div className="backup-list">
                {remoteBackups.map((item) => (
                  <div key={item.remotePath} className="backup-list-item">
                    <div className="backup-list-item-main">
                      <div className="backup-list-item-time">{formatBackupLabel(item)}</div>
                      <div className="backup-list-item-name">{item.name}</div>
                      <div className="backup-list-item-path">{item.remotePath}</div>
                    </div>
                    <div className="backup-list-item-actions">
                      <button className="route-text-button" onClick={() => void handleRestoreRemoteBackup(item)} type="button">
                        加载
                      </button>
                      <button className="route-text-button is-danger" onClick={() => void handleDeleteRemoteBackup(item)} type="button">
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="webdav-modal-footer">
              <button className="route-text-button webdav-close-button" onClick={() => setShowWebdavModal(false)} type="button">
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
