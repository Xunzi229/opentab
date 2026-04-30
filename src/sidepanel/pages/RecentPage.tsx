import { useCallback, useEffect, useMemo, useState } from "react"
import { STORAGE_KEYS } from "../../lib/constants"
import { formatDateTime } from "../../lib/time"
import { toDisplayRouteText, toFaviconUrl } from "../../lib/url"
import { getVisits, saveVisits } from "../../repositories/local-repo"
import type { VisitRecord } from "../../types/history"

export function RecentPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [search, setSearch] = useState("")

  const loadData = useCallback(async () => {
    const data = await getVisits()
    setVisits(data.sort((a, b) => b.visitedAt.localeCompare(a.visitedAt)))
  }, [])

  useEffect(() => {
    void loadData()

    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== "local") {
        return
      }
      if (changes[STORAGE_KEYS.visits]) {
        void loadData()
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [loadData])

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return visits
    }
    const keyword = search.trim().toLowerCase()
    return visits.filter(
      (v) => v.title.toLowerCase().includes(keyword) || v.url.toLowerCase().includes(keyword)
    )
  }, [visits, search])

  const handleClear = async () => {
    await saveVisits([])
  }

  return (
    <section className="recent-page page-stack">
      <div className="page-header">
        <div>
          <h3>最近访问</h3>
          <p className="page-header-desc">共 {visits.length} 条访问记录</p>
        </div>
        <button
          className="route-text-button is-danger clear-btn"
          disabled={visits.length === 0}
          onClick={handleClear}
          type="button"
        >
          清空
        </button>
      </div>

      <input
        className="search-input"
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索标题或链接..."
        type="text"
        value={search}
      />

      {filtered.length === 0 ? (
        <div className="empty-state">
          {visits.length === 0 ? "暂无访问记录，收藏并访问页面后这里会开始累计数据。" : "没有匹配的记录。"}
        </div>
      ) : (
        <div className="visit-list">
          {filtered.map((visit) => (
            <div className="visit-item" key={visit.id}>
              <div className="visit-item-main">
                <div className="visit-item-title-row">
                  <img alt="" className="route-favicon" src={toFaviconUrl(visit.url)} />
                  <a
                    className="route-title-link"
                    href={visit.url}
                    rel="noreferrer"
                    target="_blank"
                    title={visit.title}
                  >
                    {visit.title}
                  </a>
                </div>
                <a
                  className="route-link route-link-inline"
                  href={visit.url}
                  rel="noreferrer"
                  target="_blank"
                  title={visit.url}
                >
                  {toDisplayRouteText(visit.path, visit.url)}
                </a>
              </div>
              <span className="visit-item-time">{formatDateTime(visit.visitedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
