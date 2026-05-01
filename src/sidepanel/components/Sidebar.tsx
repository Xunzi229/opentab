export type SidepanelView =
  | "all-routes"
  | "recent-visits"
  | "groups"
  | "tags"
  | "backup"

type SidebarProps = {
  activeView: SidepanelView
  onChange: (view: SidepanelView) => void
}

const items: Array<{ key: SidepanelView; label: string }> = [
  { key: "all-routes", label: "全部收藏" },
  { key: "groups", label: "我的分组" },
  { key: "backup", label: "备份与同步" }
]

export function Sidebar({ activeView, onChange }: SidebarProps) {
  return (
    <aside className="sidepanel-sidebar">
      <h1 className="sidepanel-brand">OpenTab</h1>
      <p className="sidepanel-brand-copy">把常用网址收拢成一个可恢复、可管理的工作台。</p>
      <nav className="sidepanel-nav">
        {items.map((item) => (
          <button
            className={`sidepanel-nav-item${activeView === item.key ? " is-active" : ""}`}
            key={item.key}
            onClick={() => onChange(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
