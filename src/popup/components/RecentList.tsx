import { toDisplayRouteText } from "../../lib/url"
import type { RouteItem } from "../../types/route"

type RecentListProps = {
  items: RouteItem[]
}

export function RecentList({ items }: RecentListProps) {
  return (
    <section className="surface popup-card">
      <h2 className="popup-title">最近收藏</h2>
      <p className="popup-subtitle">这里展示最近写入本地存储的收藏记录。</p>
      <ul className="popup-list" style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <li className="popup-muted">还没有收藏，先从当前页面加一条吧。</li>
        ) : (
          items.map((item) => (
            <li className="popup-list-item" key={item.id}>
              <div className="popup-list-content">
                <span>{item.title}</span>
                <a className="popup-link" href={item.url} rel="noreferrer" target="_blank" title={item.url}>
                  {toDisplayRouteText(item.path, item.url)}
                </a>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
