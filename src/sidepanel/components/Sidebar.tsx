export function Sidebar() {
  const items = ["全部收藏", "最近访问", "我的分组", "标签管理", "导入 / 导出", "设置"]

  return (
    <aside className="sidepanel-sidebar">
      <h1 className="sidepanel-brand">OpenTab</h1>
      <p className="sidepanel-brand-copy">把常用后台路由收拢成一个可恢复的工作台。</p>
      <nav className="sidepanel-nav">
        {items.map((item, index) => (
          <button
            className={`sidepanel-nav-item${index === 2 ? " is-active" : ""}`}
            key={item}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  )
}
