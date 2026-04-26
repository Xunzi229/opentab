import { formatDateTime } from "../../lib/time"
import { toDisplayRouteText } from "../../lib/url"
import type { VisitRecord } from "../../types/history"

type RecentTableProps = {
  rows: VisitRecord[]
}

export function RecentTable({ rows }: RecentTableProps) {
  return (
    <section className="surface recent-table">
      <h3>最近访问</h3>
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
                暂无访问记录，收藏并访问页面后这里会开始积累数据。
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td>
                  <a className="route-link" href={row.url} rel="noreferrer" target="_blank" title={row.url}>
                    {toDisplayRouteText(row.path, row.url)}
                  </a>
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
