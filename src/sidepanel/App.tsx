import { useEffect, useState } from "react"
import { loadSettings, updateSettings } from "../services/settings-service"
import { Sidebar, type SidepanelView } from "./components/Sidebar"
import { AllRoutesPage } from "./pages/AllRoutesPage"
import { BackupPage } from "./pages/BackupPage"
import { DashboardPage } from "./pages/DashboardPage"
import { RecentVisitsPage } from "./pages/RecentVisitsPage"
import { TagsPage } from "./pages/TagsPage"

export function App() {
  const [activeView, setActiveView] = useState<SidepanelView>("groups")
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  useEffect(() => {
    void loadSettings().then((s) => setViewMode(s.viewMode || "list"))
  }, [])

  async function handleViewModeChange(mode: "grid" | "list") {
    setViewMode(mode)
    await updateSettings("viewMode", mode)
  }

  return (
    <main className="sidepanel-layout">
      <Sidebar activeView={activeView} onChange={setActiveView} />
      <section className="sidepanel-content">
        {activeView === "all-routes" ? <AllRoutesPage viewMode={viewMode} onViewModeChange={handleViewModeChange} /> : null}
        {activeView === "recent-visits" ? <RecentVisitsPage /> : null}
        {activeView === "groups" ? <DashboardPage viewMode={viewMode} onViewModeChange={handleViewModeChange} /> : null}
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
