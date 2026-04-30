import { useCallback, useEffect, useState } from "react"
import { listRoutes } from "../services/route-service"
import { sendAllTabsToGroup } from "../services/tab-workspace-service"
import type { RouteItem } from "../types/route"
import { QuickAddCard } from "./components/QuickAddCard"
import { RecentList } from "./components/RecentList"
import { SyncStatus } from "./components/SyncStatus"

export function App() {
  const [recentRoutes, setRecentRoutes] = useState<RouteItem[]>([])
  const [managerStatus, setManagerStatus] = useState("")
  const [sendResult, setSendResult] = useState("")

  const loadRoutes = useCallback(async () => {
    const routes = await listRoutes()
    setRecentRoutes(routes.slice(0, 5))
  }, [])

  useEffect(() => {
    void loadRoutes()
  }, [loadRoutes])

  async function handleSendAllTabs() {
    try {
      const result = await sendAllTabsToGroup()
      if (result.savedCount === 0) {
        setSendResult("没有可收起的标签页。")
      } else {
        setSendResult(`已收起 ${result.savedCount} 个标签页${result.skippedCount > 0 ? `，跳过 ${result.skippedCount} 个` : ""}。`)
        await loadRoutes()
      }
    } catch (error) {
      setSendResult(error instanceof Error ? error.message : "收起标签页失败。")
    }
  }

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
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <button className="popup-secondary-button" onClick={handleOpenManager} type="button">
            打开管理页面
          </button>
          <button className="popup-secondary-button send-all-tabs-btn" onClick={handleSendAllTabs} type="button">
            收起所有标签
          </button>
        </div>
        {managerStatus ? (
          <p className="popup-muted" style={{ marginTop: 10 }}>
            {managerStatus}
          </p>
        ) : null}
        {sendResult ? (
          <p className="popup-muted send-result" style={{ marginTop: 10 }}>
            {sendResult}
          </p>
        ) : null}
      </section>
      <QuickAddCard onRouteSaved={loadRoutes} />
      <RecentList items={recentRoutes} />
      <SyncStatus routeCount={recentRoutes.length} />
    </main>
  )
}
