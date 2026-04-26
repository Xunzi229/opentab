import { useMemo, useState } from "react"
import { formatDateTime } from "../../lib/time"
import { toDisplayRouteText, toFaviconUrl } from "../../lib/url"
import type { VisitRecord } from "../../types/history"

const DEFAULT_VISIBLE_ROWS = 5

type RecentTableProps = {
  rows: VisitRecord[]
}

export function RecentTable({ rows }: RecentTableProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const visibleRows = useMemo(
    () => (isExpanded ? rows : rows.slice(0, DEFAULT_VISIBLE_ROWS)),
    [isExpanded, rows]
  )

  return (
    <section className="surface recent-table">
      <div className="recent-table-head">
        <div>
          <h3>最近访问</h3>
          <p>默认显示 5 行，展开后可查看完整最近访问记录。</p>
        </div>
        {rows.length > DEFAULT_VISIBLE_ROWS ? (
          <button className="route-text-button" onClick={() => setIsExpanded((value) => !value)} type="button">
            {isExpanded ? "收起" : "展开"}
          </button>
        ) : null}
      </div>
      <table>
        <thead>
          <tr>
            <th>名称</th>
            <th>路由地址</th>
            <th>最后访问时间</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="popup-muted" colSpan={3}>
                暂无访问记录，收藏并访问页面后这里会开始累计数据。
              </td>
            </tr>
          ) : (
            visibleRows.map((row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td>
                  <div className="recent-link-wrap">
                    <img alt="" className="route-favicon" src={toFaviconUrl(row.url)} />
                    <a className="route-link" href={row.url} rel="noreferrer" target="_blank" title={row.url}>
                      {toDisplayRouteText(row.path, row.url)}
                    </a>
                  </div>
                </td>
                <td>{formatDateTime(row.visitedAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
