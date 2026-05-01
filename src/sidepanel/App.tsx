import { useEffect, useState } from "react"
import { loadSettings, updateSettings } from "../services/settings-service"
import type { AppSettings } from "../types/settings"
import { Sidebar, type SidepanelView } from "./components/Sidebar"
import { AllRoutesPage } from "./pages/AllRoutesPage"
import { BackupPage } from "./pages/BackupPage"
import { DashboardPage } from "./pages/DashboardPage"
import { RecentVisitsPage } from "./pages/RecentVisitsPage"
import { TagsPage } from "./pages/TagsPage"

export function App() {
  const [activeView, setActiveView] = useState<SidepanelView>("groups")
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    void loadSettings().then(setSettings)
  }, [])

  async function handleViewModeChange(mode: "grid" | "list") {
    setSettings((current) => (current ? { ...current, viewMode: mode } : current))
    await updateSettings("viewMode", mode)
  }

  async function handleCollapsedGroupIdsChange(collapsedGroupIds: string[]) {
    setSettings((current) => (current ? { ...current, collapsedGroupIds } : current))
    await updateSettings("collapsedGroupIds", collapsedGroupIds)
  }

  const viewMode = settings?.viewMode || "list"
  const collapsedGroupIds = settings?.collapsedGroupIds || []

  return (
    <main className="sidepanel-layout">
      <Sidebar activeView={activeView} onChange={setActiveView} />
      <section className="sidepanel-content">
        {activeView === "all-routes" ? <AllRoutesPage viewMode={viewMode} onViewModeChange={handleViewModeChange} /> : null}
        {activeView === "recent-visits" ? <RecentVisitsPage /> : null}
        {activeView === "groups" ? (
          <DashboardPage
            collapsedGroupIds={collapsedGroupIds}
            onCollapsedGroupIdsChange={handleCollapsedGroupIdsChange}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        ) : null}
        {activeView === "tags" ? <TagsPage /> : null}
        {activeView === "backup" ? <BackupPage /> : null}
        {activeView !== "all-routes" &&
        activeView !== "recent-visits" &&
        activeView !== "groups" &&
        activeView !== "tags" &&
        activeView !== "backup" ? (
          <section className="surface group-section">
            <div className="section-head">
              <div>
                <h3>开发中</h3>
                <p>这个页面下一步就接上。</p>
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
