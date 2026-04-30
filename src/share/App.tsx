import { useCallback, useEffect, useMemo, useState } from "react"

interface SharedRoute {
  url: string
  title: string
  icon?: string
}

interface SharedGroup {
  name: string
  routes: SharedRoute[]
}

function decodeHash(): SharedGroup | null {
  const hash = window.location.hash.slice(1)
  if (!hash) return null

  try {
    const json = atob(hash)
    const data = JSON.parse(json)
    if (
      typeof data === "object" &&
      data !== null &&
      typeof data.name === "string" &&
      Array.isArray(data.routes)
    ) {
      return data as SharedGroup
    }
    return null
  } catch {
    return null
  }
}

function faviconUrl(route: SharedRoute): string {
  if (route.icon) return route.icon
  try {
    const hostname = new URL(route.url).hostname
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
  } catch {
    return ""
  }
}

export function App() {
  const [importStatus, setImportStatus] = useState("")
  const group = useMemo(() => decodeHash(), [])

  const handleImport = useCallback(async () => {
    if (!group) return
    setImportStatus("导入中...")

    try {
      const response = await chrome.runtime.sendMessage({
        type: "IMPORT_SHARED_GROUP",
        payload: { name: group.name, routes: group.routes },
      })
      if (response?.success) {
        setImportStatus(`已成功导入分组「${group.name}」，共 ${group.routes.length} 条路由。`)
      } else {
        setImportStatus(response?.error || "导入失败，请重试。")
      }
    } catch {
      setImportStatus("导入失败，请确保在 OpenTab 扩展环境中打开此页面。")
    }
  }, [group])

  useEffect(() => {
    if (!group) return
    document.title = `OpenTab - ${group.name}`
  }, [group])

  if (!group) {
    return (
      <main className="share-shell">
        <div className="share-error surface">
          <h1 className="share-title">OpenTab 分享</h1>
          <p className="share-error-text">
            无效的分享链接。请确认链接完整且未被篡改。
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="share-shell">
      <header className="share-header surface">
        <h1 className="share-title">{group.name}</h1>
        <p className="share-meta">共 {group.routes.length} 条路由</p>
        <button
          className="share-import-btn"
          onClick={handleImport}
          type="button"
        >
          一键导入到 OpenTab
        </button>
        {importStatus ? <p className="share-status">{importStatus}</p> : null}
      </header>

      <ul className="share-list">
        {group.routes.map((route, index) => (
          <li key={index} className="share-list-item surface">
            <img
              className="share-favicon"
              src={faviconUrl(route)}
              alt=""
              width={20}
              height={20}
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = "none"
              }}
            />
            <div className="share-list-content">
              <a
                className="share-link share-link-title"
                href={route.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {route.title || route.url}
              </a>
              <span className="share-url">{route.url}</span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
