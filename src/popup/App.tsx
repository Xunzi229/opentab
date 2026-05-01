import { useCallback, useEffect, useState } from "react"
import { listRoutes } from "../services/route-service"
import { sendAllTabsToGroup } from "../services/tab-workspace-service"
import type { RouteItem } from "../types/route"
import { QuickAddCard } from "./components/QuickAddCard"
import { RecentList } from "./components/RecentList"
import { SyncStatus } from "./components/SyncStatus"

function PopupIconTag() {
  return (
    <div className="popup-brand-mark" aria-hidden="true">
      <span className="popup-brand-mark-hole" />
    </div>
  )
}

function PopupShortcutCard({
  icon,
  title,
  onClick
}: {
  icon: React.ReactNode
  title: string
  onClick: () => void
}) {
  return (
    <button className="popup-shortcut-card" onClick={onClick} type="button">
      <span className="popup-shortcut-icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{title}</strong>
    </button>
  )
}

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
      <section className="surface popup-hero-card">
        <header className="popup-hero-head">
          <div className="popup-brand">
            <PopupIconTag />
            <div className="popup-brand-copy">
              <h1 className="popup-title">OpenTab</h1>
              <p className="popup-subtitle">快速收藏当前网址，然后在当前窗口的新标签页里打开管理页。</p>
            </div>
          </div>
          <button className="popup-settings-button" title="设置" type="button">
            ⚙
          </button>
        </header>

        <div className="popup-shortcuts">
          <PopupShortcutCard
            icon={
              <svg fill="none" height="32" viewBox="0 0 32 32" width="32">
                <rect height="20" rx="4" stroke="currentColor" strokeWidth="2.2" width="20" x="6" y="6" />
                <path d="M6 14h20M14 6v20" stroke="currentColor" strokeWidth="2.2" />
              </svg>
            }
            title="打开管理页面"
            onClick={handleOpenManager}
          />
          <PopupShortcutCard
            icon={
              <svg fill="none" height="32" viewBox="0 0 32 32" width="32">
                <path d="M8 10.5a3 3 0 0 1 3-3h8.2l4.8 4.8V21a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3v-10.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2.2" />
                <circle cx="19.5" cy="12.5" fill="currentColor" r="1.6" />
              </svg>
            }
            title="收起所有标签"
            onClick={() => void handleSendAllTabs()}
          />
        </div>

        {managerStatus ? <p className="popup-inline-status">{managerStatus}</p> : null}
        {sendResult ? <p className="popup-inline-status is-success">{sendResult}</p> : null}
      </section>

      <QuickAddCard onRouteSaved={loadRoutes} />
      <RecentList items={recentRoutes} />
      <SyncStatus routeCount={recentRoutes.length} />
    </main>
  )
}
