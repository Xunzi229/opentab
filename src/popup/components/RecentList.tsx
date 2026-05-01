import { toDisplayRouteText } from "../../lib/url"
import type { RouteItem } from "../../types/route"

type RecentListProps = {
  items: RouteItem[]
}

export function RecentList({ items }: RecentListProps) {
  return (
    <section className="surface popup-card popup-recent-card">
      <div className="popup-section-head">
        <span className="popup-section-icon is-mint" aria-hidden="true">
          <svg fill="none" height="28" viewBox="0 0 28 28" width="28">
            <circle cx="14" cy="14" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M14 9.5v4.8l3.2 2.1" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </span>
        <div>
          <h2 className="popup-title">最近收藏</h2>
          <p className="popup-subtitle">这里展示最近写入本地存储的收藏记录。</p>
        </div>
      </div>

      <div className="popup-recent-stack">
        {items.length === 0 ? (
          <p className="popup-muted">还没有收藏，先从当前页面加一条吧。</p>
        ) : (
          items.slice(0, 1).map((item) => (
            <article className="popup-recent-item" key={item.id}>
              <span className="popup-recent-thumb" aria-hidden="true" />
              <div className="popup-recent-copy">
                <strong>{item.title}</strong>
                <a className="popup-link" href={item.url} rel="noreferrer" target="_blank" title={item.url}>
                  {toDisplayRouteText(item.path, item.url)}
                </a>
              </div>
              <button className="popup-more-button" title="更多" type="button">
                ⋮
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
