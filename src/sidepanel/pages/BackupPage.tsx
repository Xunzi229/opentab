import { useRef, useState, type ChangeEvent } from "react"
import { createBackupFilename, decodeBackup, encodeBackup } from "../../lib/backup"
import { getAppSnapshot, saveAppSnapshot, getWebdavConfigVersions, saveWebdavConfigVersion, removeWebdavConfigVersion, WebdavConfigVersion } from "../../repositories/local-repo"
import { downloadSnapshotFromWebdav, uploadSnapshotToWebdav, verifyWebdavConnection, uploadFileToWebdav, deleteFileFromWebdav, downloadFileFromWebdav, listWebdavFiles } from "../../services/webdav-sync-service"
import { loadSettings, updateSettings } from "../../services/settings-service"

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
  const [showWebdavModal, setShowWebdavModal] = useState(false)
  const [webdavUrl, setWebdavUrl] = useState("")
  const [webdavUsername, setWebdavUsername] = useState("")
  const [webdavPassword, setWebdavPassword] = useState("")
  const [webdavFilePath, setWebdavFilePath] = useState("")
  const [modalStatus, setModalStatus] = useState<string | null>(null)
  const [versions, setVersions] = useState<WebdavConfigVersion[]>([])
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
          <button
            className="route-text-button"
            disabled={syncing}
            onClick={async () => {
              const settings = await loadSettings()
              setWebdavUrl(settings?.webdavUrl ?? "")
              setWebdavUsername(settings?.webdavUsername ?? "")
              setWebdavPassword(settings?.webdavPassword ?? "")
              setWebdavFilePath(settings?.webdavFilePath ?? "opentab/backup.opentab")
              const vs = await getWebdavConfigVersions()
              setVersions(vs)
              setModalStatus(null)
              setShowWebdavModal(true)

              // 尝试从远程拉取配置版本列表
              try {
                const fileDir = (settings?.webdavFilePath || "").replace(/\/?[^\/]+$/, "").replace(/^\/+|\/+$/g, "")
                const remoteDir = fileDir ? `${fileDir}/configs` : `configs`
                const remoteFiles = await listWebdavFiles(remoteDir, {
                  webdavUrl: settings?.webdavUrl || "",
                  webdavUsername: settings?.webdavUsername || "",
                  webdavPassword: settings?.webdavPassword || ""
                })
                // 过滤出完整配置文件（含密码）
                const fullConfigFiles = remoteFiles.filter(f => f.startsWith("config-") && f.endsWith("-full.json"))

                // 拉取远程完整配置并与本地合并
                for (const file of fullConfigFiles) {
                  try {
                    const content = await downloadFileFromWebdav(`${remoteDir}/${file}`, {
                      webdavUrl: settings?.webdavUrl || "",
                      webdavUsername: settings?.webdavUsername || "",
                      webdavPassword: settings?.webdavPassword || ""
                    })
                    const remoteConfig: WebdavConfigVersion = JSON.parse(content)
                    // 检查本地是否已存在该配置
                    const exists = vs.some(v => v.id === remoteConfig.id)
                    if (!exists) {
                      await saveWebdavConfigVersion(remoteConfig)
                    } else {
                      // 如果已存在，更新本地配置为远程的完整版本（含密码）
                      await removeWebdavConfigVersion(remoteConfig.id)
                      await saveWebdavConfigVersion(remoteConfig)
                    }
                  } catch (e) {
                    console.warn(`Failed to load remote config ${file}:`, e)
                  }
                }

                // 重新加载版本列表
                const updatedVs = await getWebdavConfigVersions()
                setVersions(updatedVs)
              } catch (e) {
                console.warn("Failed to sync remote configs:", e)
              }
            }}
            type="button"
          >
            配置 WebDAV
          </button>
          <button className="route-text-button" disabled={syncing} onClick={handleDownloadFromWebdav} type="button">
            从 WebDAV 下载
          </button>
        </div>
      </section>

      {showWebdavModal ? (
        <div className="modal-overlay">
          <div className="modal-card webdav-modal">
            <h3 style={{ marginTop: 0 }}>WebDAV 配置</h3>
            <p style={{ marginTop: 0 }}>填写你的 WebDAV 地址、账号和备份路径，供手动上传和下载使用。</p>
            <input className="group-input" placeholder="https://dav.example.com/remote.php/dav/files/user" value={webdavUrl} onChange={(e) => setWebdavUrl(e.target.value)} />
            <input className="group-input" placeholder="WebDAV 用户名" value={webdavUsername} onChange={(e) => setWebdavUsername(e.target.value)} />
            <input className="group-input" placeholder="WebDAV 密码" type="password" value={webdavPassword} onChange={(e) => setWebdavPassword(e.target.value)} />
            <input className="group-input" placeholder="opentab/backup.opentab" value={webdavFilePath} onChange={(e) => setWebdavFilePath(e.target.value)} />

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                className="route-text-button is-primary"
                onClick={async () => {
                  try {
                    // persist current settings
                    await updateSettings("webdavUrl", webdavUrl)
                    await updateSettings("webdavUsername", webdavUsername)
                    await updateSettings("webdavPassword", webdavPassword)
                    await updateSettings("webdavFilePath", webdavFilePath)

                    // create version entry
                    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
                    const v: WebdavConfigVersion = {
                      id,
                      createdAt: new Date().toISOString(),
                      webdavUrl,
                      webdavUsername,
                      webdavPassword,
                      webdavFilePath
                    }

                    const fileDir = (webdavFilePath || "").replace(/\/?[^\/]+$/, "").replace(/^\/+|\/+$/g, "")
                    const remoteDir = fileDir ? `${fileDir}/configs` : `configs`

                    // 先上传到远程（完整配置，含密码）
                    try {
                      const fullPath = `${remoteDir}/config-${id}-full.json`
                      const fullPayload = JSON.stringify(v)
                      await uploadFileToWebdav(fullPath, fullPayload, "application/json")
                    } catch (e) {
                      console.error("Upload full version to WebDAV failed:", e)
                      throw new Error("远程上传完整配置失败，请检查连接。")
                    }

                    // 再上传公开配置（不含密码）
                    try {
                      const publicPath = `${remoteDir}/config-${id}.json`
                      const publicPayload = JSON.stringify({
                        id: v.id,
                        createdAt: v.createdAt,
                        webdavUrl: v.webdavUrl,
                        webdavUsername: v.webdavUsername,
                        webdavFilePath: v.webdavFilePath
                      })
                      await uploadFileToWebdav(publicPath, publicPayload, "application/json")
                    } catch (e) {
                      console.error("Upload public version to WebDAV failed:", e)
                      throw new Error("远程上传公开配置失败，请检查连接。")
                    }

                    // 远程上传成功后，保存到本地
                    await saveWebdavConfigVersion(v)
                    const vs = await getWebdavConfigVersions()
                    setVersions(vs)

                    setModalStatus("配置已保存并生成新版本，同时已上传到 WebDAV（完整和公开版本）。")
                    setStatusMessage("WebDAV 配置已保存并上传到远程。")
                  } catch (err) {
                    console.error(err)
                    setModalStatus(err instanceof Error ? err.message : "保存失败。")
                  }
                }}
                type="button"
              >
                保存并生成版本
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  className="route-text-button"
                  onClick={async () => {
                    try {
                      setModalStatus("正在检查 WebDAV 连接...")
                      // ensure latest fields saved for check
                      await updateSettings("webdavUrl", webdavUrl)
                      await updateSettings("webdavUsername", webdavUsername)
                      await updateSettings("webdavPassword", webdavPassword)
                      await updateSettings("webdavFilePath", webdavFilePath)
                      await verifyWebdavConnection()
                      setModalStatus("WebDAV 连接检查通过。")
                      setStatusMessage("WebDAV 连接检查通过。")
                    } catch (err) {
                      console.error(err)
                      setModalStatus(err instanceof Error ? err.message : "连接检查失败。")
                      setStatusMessage(err instanceof Error ? err.message : "连接检查失败。")
                    }
                  }}
                  type="button"
                >
                  检查连接
                </button>
                {modalStatus && <div style={{ fontSize: 12, color: "#666" }}>{modalStatus}</div>}
              </div>
              <div style={{ flex: 1 }} />
              <button
                className="route-text-button"
                onClick={() => {
                  setShowWebdavModal(false)
                }}
                type="button"
              >
                取消
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: "8px 0" }}>已保存的配置版本</h4>
              {versions.length === 0 ? <div style={{ color: "#666" }}>还没有保存的版本。</div> : null}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, maxHeight: 240, overflow: "auto" }}>
                {versions.map((ver) => (
                  <div key={ver.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, border: "1px solid #eee", borderRadius: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "#333" }}>{new Date(ver.createdAt).toLocaleString()}</div>
                      <div style={{ fontSize: 13, color: "#111", marginTop: 4 }}>{ver.webdavUrl}</div>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{ver.webdavUsername} · {ver.webdavFilePath}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="route-text-button"
                        onClick={async () => {
                          try {
                            // 尝试从远程拉取完整配置（包括密码）
                            const fileDir = (ver.webdavFilePath || "").replace(/\/?[^\/]+$/, "").replace(/^\/+|\/+$/g, "")
                            const remoteDir = fileDir ? `${fileDir}/configs` : `configs`
                            const remotePath = `${remoteDir}/config-${ver.id}-full.json`

                            let fullConfig: WebdavConfigVersion

                            try {
                              // 尝试从远程拉取完整配置
                              const content = await downloadFileFromWebdav(remotePath)
                              fullConfig = JSON.parse(content)
                              setModalStatus("已从远程加载完整配置（含密码）。")
                            } catch (e) {
                              console.warn("Failed to load full config from remote, using local:", e)
                              // 远程拉取失败，使用本地配置
                              fullConfig = ver
                              setModalStatus("远程拉取失败，已加载本地配置（密码可能为空）。")
                            }

                            // restore this version into fields
                            setWebdavUrl(fullConfig.webdavUrl)
                            setWebdavUsername(fullConfig.webdavUsername)
                            setWebdavPassword(fullConfig.webdavPassword)
                            setWebdavFilePath(fullConfig.webdavFilePath)
                          } catch (err) {
                            console.error(err)
                            setModalStatus(err instanceof Error ? err.message : "加载失败。")
                          }
                        }}
                        type="button"
                      >
                        加载
                      </button>
                      <button
                        className="route-text-button"
                        onClick={async () => {
                          if (!window.confirm("确认删除该配置版本？此操作不可逆。")) return
                          try {
                            // 先删除远程文件
                            const fileDir = (ver.webdavFilePath || "").replace(/\/?[^\/]+$/, "").replace(/^\/+|\/+$/g, "")
                            const remoteDir = fileDir ? `${fileDir}/configs` : `configs`

                            try {
                              // 删除公开配置文件（不含密码）
                              const publicPath = `${remoteDir}/config-${ver.id}.json`
                              await deleteFileFromWebdav(publicPath)
                            } catch (e) {
                              console.warn("Failed to delete public remote config:", e)
                            }

                            try {
                              // 删除完整配置文件（含密码）
                              const fullPath = `${remoteDir}/config-${ver.id}-full.json`
                              await deleteFileFromWebdav(fullPath)
                            } catch (e) {
                              console.warn("Failed to delete full remote config:", e)
                            }

                            // 删除本地配置
                            await removeWebdavConfigVersion(ver.id)
                            const vs = await getWebdavConfigVersions()
                            setVersions(vs)

                            setModalStatus("已删除版本（本地和远程）。")
                            setStatusMessage("已删除 WebDAV 配置版本（本地和远程）。")
                          } catch (e) {
                            console.error(e)
                            setModalStatus(e instanceof Error ? e.message : "删除失败")
                          }
                        }}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
