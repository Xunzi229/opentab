import { useState } from "react"
import { Sidebar, type SidepanelView } from "./components/Sidebar"
import { AllRoutesPage } from "./pages/AllRoutesPage"
import { DashboardPage } from "./pages/DashboardPage"
import { RecentVisitsPage } from "./pages/RecentVisitsPage"
import { TagsPage } from "./pages/TagsPage"

export function App() {
  const [activeView, setActiveView] = useState<SidepanelView>("groups")

  return (
    <main className="sidepanel-layout">
      <Sidebar activeView={activeView} onChange={setActiveView} />
      <section className="sidepanel-content">
        {activeView === "all-routes" ? <AllRoutesPage /> : null}
        {activeView === "recent-visits" ? <RecentVisitsPage /> : null}
        {activeView === "groups" ? <DashboardPage /> : null}
        {activeView === "tags" ? <TagsPage /> : null}
        {activeView !== "all-routes" &&
        activeView !== "recent-visits" &&
        activeView !== "groups" &&
        activeView !== "tags" ? (
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
