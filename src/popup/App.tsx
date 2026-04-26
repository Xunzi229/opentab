import { useCallback, useEffect, useState } from "react"
import { listRoutes } from "../services/route-service"
import type { RouteItem } from "../types/route"
import { QuickAddCard } from "./components/QuickAddCard"
import { RecentList } from "./components/RecentList"
import { SyncStatus } from "./components/SyncStatus"

export function App() {
  const [recentRoutes, setRecentRoutes] = useState<RouteItem[]>([])
  const [managerStatus, setManagerStatus] = useState("")

  const loadRoutes = useCallback(async () => {
    const routes = await listRoutes()
    setRecentRoutes(routes.slice(0, 5))
  }, [])

  useEffect(() => {
    void loadRoutes()
  }, [loadRoutes])

  async function handleOpenManager() {
    try {
      const managerUrl = chrome.runtime.getURL("manager.html")
      const existingTabs = await chrome.tabs.query({ url: managerUrl })
      const existingTab = existingTabs[0]

      if (existingTab?.id) {
        await chrome.tabs.update(existingTab.id, { active: true, pinned: true })
        if (typeof existingTab.windowId === "number") {
          await chrome.windows.update(existingTab.windowId, { focused: true })
        }
      } else {
        await chrome.tabs.create({
          url: managerUrl,
          active: true,
          pinned: true
        })
      }

      window.close()
    } catch (error) {
      console.error(error)
      setManagerStatus("打开管理页面失败，请刷新扩展后重试。")
    }
  }

  return (
    <main className="popup-shell">
      <section className="surface popup-card">
        <h1 className="popup-title">OpenTab</h1>
        <p className="popup-subtitle">快速收藏当前网址，然后在当前窗口的新标签页里打开管理页。</p>
        <div style={{ marginTop: 12 }}>
          <button className="popup-secondary-button" onClick={handleOpenManager} type="button">
            打开管理页面
          </button>
        </div>
        {managerStatus ? (
          <p className="popup-muted" style={{ marginTop: 10 }}>
            {managerStatus}
          </p>
        ) : null}
      </section>
      <QuickAddCard onRouteSaved={loadRoutes} />
      <RecentList items={recentRoutes} />
      <SyncStatus routeCount={recentRoutes.length} />
    </main>
  )
}
