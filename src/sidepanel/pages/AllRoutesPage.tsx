import { useCallback, useEffect, useMemo, useState } from "react"
import { DEFAULT_GROUP_ID, STORAGE_KEYS } from "../../lib/constants"
import { formatDateTime, isWithinLastDays } from "../../lib/time"
import { toCurl, toFetch, toRepoDisplayName } from "../../lib/env-utils"
import { toDisplayRouteText, toFaviconUrl } from "../../lib/url"
import { getGroupedRoutes } from "../../services/group-service"
import { moveRouteToGroup, removeRoute, toggleRouteStar, updateRoute } from "../../services/route-service"
import { restoreRoute } from "../../services/tab-workspace-service"
import type { Environment } from "../../types/route"

type GroupedRoutes = Awaited<ReturnType<typeof getGroupedRoutes>>
type FilterKey = "all" | "starred" | "recent7" | "recent30" | "inactive"

type AllRoutesPageProps = {
  viewMode: "grid" | "list"
  onViewModeChange: (mode: "grid" | "list") => void
}

type EditDraft = {
  title: string
  url: string
  note: string
  tags: string
  httpMethod: string
  repoUrl: string
  environments: Environment[]
}

function cloneEnvironments(environments?: Environment[]) {
  return (environments ?? []).map((env) => ({ ...env }))
}

function makeEditDraft(item: GroupedRoutes[number]["items"][number]): EditDraft {
  return {
    title: item.title,
    url: item.url,
    note: item.note ?? "",
    tags: item.tags.join(", "),
    httpMethod: item.httpMethod ?? "GET",
    repoUrl: item.repoUrl ?? "",
    environments: cloneEnvironments(item.environments)
  }
}

function toHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function toVisitSummary(visitCount: number) {
  return visitCount > 0 ? `近 7 天访问 ${visitCount} 次` : "近 7 天暂无访问"
}

export function AllRoutesPage({ viewMode, onViewModeChange }: AllRoutesPageProps) {
  const [searchText, setSearchText] = useState("")
  const [groups, setGroups] = useState<GroupedRoutes>([])
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusMessage, setStatusMessage] = useState("这里已汇总所有分组中的收藏，适合全局搜索、批量查看和快速整理。")
  const [menuRouteId, setMenuRouteId] = useState<string | null>(null)
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)

  const loadData = useCallback(async () => {
    const nextGroups = await getGroupedRoutes()
    setGroups(nextGroups)
  }, [])

  useEffect(() => {
    void loadData()

    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== "local") {
        return
      }

      if (changes[STORAGE_KEYS.routes] || changes[STORAGE_KEYS.groups] || changes[STORAGE_KEYS.visits]) {
        void loadData()
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [loadData])

  const allItems = useMemo(
    () =>
      groups.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          groupName: group.name
        }))
      ),
    [groups]
  )

  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name
      })),
    [groups]
  )

  const groupNameById = useMemo(() => new Map(groupOptions.map((group) => [group.id, group.name])), [groupOptions])

  const filterStats = useMemo(
    () => ({
      all: allItems.length,
      starred: allItems.filter((item) => item.starred).length,
      recent7: allItems.filter((item) => item.visitCount > 0).length,
      recent30: allItems.filter((item) => isWithinLastDays(item.updatedAt, 30)).length,
      inactive: allItems.filter((item) => item.visitCount === 0).length
    }),
    [allItems]
  )

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return allItems.filter((item) => {
      const note = item.note?.toLowerCase() ?? ""
      const tags = item.tags.join(" ").toLowerCase()
      const groupName = item.groupName.toLowerCase()
      const matchedKeyword =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.path.toLowerCase().includes(keyword) ||
        item.url.toLowerCase().includes(keyword) ||
        note.includes(keyword) ||
        tags.includes(keyword) ||
        groupName.includes(keyword)

      if (!matchedKeyword) {
        return false
      }

      switch (activeFilter) {
        case "starred":
          return item.starred
        case "recent7":
          return item.visitCount > 0
        case "recent30":
          return isWithinLastDays(item.updatedAt, 30)
        case "inactive":
          return item.visitCount === 0
        default:
          return true
      }
    })
  }, [activeFilter, allItems, searchText])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const pagedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredItems, pageSize]
  )

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const pageAllSelected = pagedItems.length > 0 && pagedItems.every((item) => selectedIdSet.has(item.id))

  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter, pageSize, searchText])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    const availableIds = new Set(allItems.map((item) => item.id))
    setSelectedIds((current) => current.filter((id) => availableIds.has(id)))
    if (editingRouteId && !availableIds.has(editingRouteId)) {
      setEditingRouteId(null)
      setEditDraft(null)
    }
    if (menuRouteId && !availableIds.has(menuRouteId)) {
      setMenuRouteId(null)
    }
  }, [allItems, editingRouteId, menuRouteId])

  async function handleToggleStar(routeId: string) {
    await toggleRouteStar(routeId)
    setStatusMessage("收藏星标状态已更新。")
  }

  async function handleDeleteRoute(routeId: string) {
    await removeRoute(routeId)
    setSelectedIds((current) => current.filter((id) => id !== routeId))
    setStatusMessage("收藏条目已删除。")
  }

  async function handleMoveRouteGroup(routeId: string, groupId: string) {
    await moveRouteToGroup(routeId, groupId || DEFAULT_GROUP_ID)
    setStatusMessage("收藏所在分组已更新。")
  }

  async function handleEnvChange(routeId: string, envName: string) {
    const route = allItems.find((item) => item.id === routeId)
    if (!route) return
    await updateRoute(routeId, { title: route.title, url: route.url, activeEnv: envName })
    setStatusMessage(`当前环境已切换到 ${envName}。`)
  }

  async function handleEditRoute(
    routeId: string,
    input: {
      title: string
      url: string
      note?: string
      tags?: string
      httpMethod?: string
      repoUrl?: string
      environments?: Environment[]
    }
  ) {
    try {
      await updateRoute(routeId, input)
      setStatusMessage("收藏信息已更新。")
      setEditingRouteId(null)
      setEditDraft(null)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "更新收藏失败。")
    }
  }

  async function handleOpenAllRoutes(urls: string[]) {
    const validUrls = urls.filter(Boolean)
    await Promise.all(validUrls.map((url, index) => chrome.tabs.create({ url, active: index === 0 })))
    setStatusMessage(`已批量打开 ${validUrls.length} 个地址。`)
  }

  async function handleRestoreRoute(url: string) {
    await restoreRoute(url)
    setStatusMessage("已在新标签页恢复该收藏。")
  }

  function handleToggleSelect(routeId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(routeId) ? current : [...current, routeId]
      }

      return current.filter((id) => id !== routeId)
    })
  }

  function handleTogglePageSelection(checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...pagedItems.map((item) => item.id)]))
      }

      const pageIds = new Set(pagedItems.map((item) => item.id))
      return current.filter((id) => !pageIds.has(id))
    })
  }

  async function handleBulkAction(action: string) {
    if (!action) {
      return
    }

    if (action === "open-current") {
      await handleOpenAllRoutes(filteredItems.map((item) => item.url))
      return
    }

    if (action === "open-selected") {
      const selectedUrls = allItems.filter((item) => selectedIdSet.has(item.id)).map((item) => item.url)
      await handleOpenAllRoutes(selectedUrls)
      return
    }

    if (action === "clear-selection") {
      setSelectedIds([])
      setStatusMessage("已清空当前选择。")
    }
  }

  function handleStartEdit(routeId: string) {
    const route = allItems.find((item) => item.id === routeId)
    if (!route) {
      return
    }

    setEditingRouteId(routeId)
    setEditDraft(makeEditDraft(route))
    setMenuRouteId(routeId)
  }

  function handleCancelEdit() {
    setEditingRouteId(null)
    setEditDraft(null)
  }

  async function handleSaveEdit() {
    if (!editingRouteId || !editDraft) {
      return
    }

    await handleEditRoute(editingRouteId, {
      title: editDraft.title,
      url: editDraft.url,
      note: editDraft.note,
      tags: editDraft.tags,
      httpMethod: editDraft.httpMethod,
      repoUrl: editDraft.repoUrl || undefined,
      environments: editDraft.environments.length > 0 ? editDraft.environments : undefined
    })
  }

  return (
    <section className="page-stack all-routes-page">
      <section className="surface all-routes-hero">
        <div className="all-routes-hero-copy">
          <div className="all-routes-hero-title-row">
            <h2>全部收藏</h2>
            <span className="all-routes-count-pill">共 {allItems.length} 条收藏</span>
          </div>
          <p>这里已汇总所有分组中的网址，适合全局检索、批量查看和快速整理。</p>
        </div>
        <div className="all-routes-hero-art" aria-hidden="true">
          <span className="all-routes-glow all-routes-glow-a" />
          <span className="all-routes-glow all-routes-glow-b" />
          <span className="all-routes-glow all-routes-glow-c" />
          <div className="all-routes-hero-folder">
            <div className="all-routes-hero-folder-core" />
            <div className="all-routes-hero-folder-star" />
          </div>
        </div>
      </section>

      <section className="all-routes-toolbar">
        <label className="all-routes-search" htmlFor="all-routes-search">
          <input
            id="all-routes-search"
            className="all-routes-search-input"
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="搜索网址名称、地址或备注..."
            type="search"
            value={searchText}
          />
          <span className="all-routes-search-icon" aria-hidden="true">
            ⌕
          </span>
        </label>
        <div className="all-routes-view-toggle" role="tablist" aria-label="视图切换">
          <button
            className={viewMode === "grid" ? "is-active" : ""}
            onClick={() => onViewModeChange("grid")}
            type="button"
          >
            <span aria-hidden="true">⊞</span>
          </button>
          <button
            className={viewMode === "list" ? "is-active" : ""}
            onClick={() => onViewModeChange("list")}
            type="button"
          >
            <span aria-hidden="true">☰</span>
          </button>
        </div>
      </section>

      <section className="surface all-routes-filter-surface">
        <div className="all-routes-filters" role="tablist" aria-label="收藏筛选">
          {[
            { key: "all" as const, label: "全部", count: filterStats.all },
            { key: "starred" as const, label: "收藏夹", count: filterStats.starred },
            { key: "recent7" as const, label: "最近 7 天", count: filterStats.recent7 },
            { key: "recent30" as const, label: "最近 30 天", count: filterStats.recent30 },
            { key: "inactive" as const, label: "无访问记录", count: filterStats.inactive }
          ].map((filter) => (
            <button
              key={filter.key}
              className={`all-routes-filter-chip${activeFilter === filter.key ? " is-active" : ""}`}
              onClick={() => setActiveFilter(filter.key)}
              type="button"
            >
              <span>{filter.label}</span>
              <strong>{filter.count}</strong>
            </button>
          ))}
        </div>
        <select
          className="all-routes-bulk-select"
          defaultValue=""
          onChange={(event) => {
            void handleBulkAction(event.target.value)
            event.target.value = ""
          }}
        >
          <option value="">批量操作</option>
          <option value="open-current">打开当前结果</option>
          <option value="open-selected">打开选中项</option>
          <option value="clear-selection">清空选择</option>
        </select>
      </section>

      <section className="surface all-routes-table-surface">
        <div className="all-routes-status-row">
          <div className="all-routes-status-copy">
            <strong>{statusMessage}</strong>
            <span>
              当前筛选 {filteredItems.length} 条，已选中 {selectedIds.length} 条。
            </span>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="empty-guide all-routes-empty">
            <h3>没有匹配的收藏</h3>
            <p>可以换一个关键词，或者切换上面的筛选条件再试试。</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="all-routes-grid">
            {pagedItems.map((item) => {
              const faviconUrl = toFaviconUrl(item.url, item.icon)
              const displayPath = toDisplayRouteText(item.path, item.url)
              const menuOpen = menuRouteId === item.id

              return (
                <article className="all-routes-grid-card" key={item.id}>
                  <div className="all-routes-grid-card-head">
                    <label className="all-routes-check">
                      <input
                        checked={selectedIdSet.has(item.id)}
                        onChange={(event) => handleToggleSelect(item.id, event.target.checked)}
                        type="checkbox"
                      />
                    </label>
                    <button
                      className={`route-icon-button all-routes-star-button${item.starred ? " is-starred" : ""}`}
                      onClick={() => void handleToggleStar(item.id)}
                      title={item.starred ? "取消星标" : "设为星标"}
                      type="button"
                    >
                      {item.starred ? "★" : "☆"}
                    </button>
                  </div>
                  <div className="all-routes-grid-card-main">
                    <img alt="" className="all-routes-site-icon" src={faviconUrl} />
                    <div className="all-routes-site-copy">
                      <a className="all-routes-site-title" href={item.url} rel="noreferrer" target="_blank">
                        {item.title}
                      </a>
                      <a className="all-routes-site-link" href={item.url} rel="noreferrer" target="_blank">
                        {displayPath}
                      </a>
                      <div className="all-routes-site-meta">
                        <span className="all-routes-group-tag">{item.groupName}</span>
                        <span>{toVisitSummary(item.visitCount)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="all-routes-grid-card-footer">
                    <button className="route-text-button restore-btn" onClick={() => void handleRestoreRoute(item.url)} type="button">
                      恢复
                    </button>
                    <button className="route-text-button" onClick={() => setMenuRouteId(menuOpen ? null : item.id)} type="button">
                      更多
                    </button>
                    <button className="route-text-button is-danger" onClick={() => void handleDeleteRoute(item.id)} type="button">
                      删除
                    </button>
                  </div>
                  {menuOpen ? (
                    <div className="all-routes-more-panel">
                      <div className="all-routes-more-row">
                        <span>分组</span>
                        <select
                          className="route-select"
                          onChange={(event) => void handleMoveRouteGroup(item.id, event.target.value)}
                          value={item.groupId}
                        >
                          {groupOptions.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {item.environments && item.environments.length > 0 ? (
                        <div className="all-routes-env-list">
                          {item.environments.map((env) => (
                            <button
                              key={env.name}
                              className={`env-tag${env.name === item.activeEnv ? " active" : ""}`}
                              onClick={() => void handleEnvChange(item.id, env.name)}
                              type="button"
                            >
                              {env.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="all-routes-more-actions">
                        <button className="route-text-button" onClick={() => handleStartEdit(item.id)} type="button">
                          编辑
                        </button>
                        <button
                          className="route-text-button"
                          onClick={() => void navigator.clipboard.writeText(toCurl(item.url, item.httpMethod, item.headers))}
                          type="button"
                        >
                          复制 cURL
                        </button>
                        <button
                          className="route-text-button"
                          onClick={() => void navigator.clipboard.writeText(toFetch(item.url, item.httpMethod, item.headers))}
                          type="button"
                        >
                          复制 fetch
                        </button>
                        {item.repoUrl ? (
                          <a className="route-text-button" href={item.repoUrl} rel="noreferrer" target="_blank">
                            {toRepoDisplayName(item.repoUrl)}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="all-routes-table">
            <div className="all-routes-table-head">
              <div className="all-routes-col-checkbox">
                <label className="all-routes-check">
                  <input
                    checked={pageAllSelected}
                    onChange={(event) => handleTogglePageSelection(event.target.checked)}
                    type="checkbox"
                  />
                </label>
              </div>
              <div className="all-routes-col-info">网站信息</div>
              <div className="all-routes-col-time">收藏时间</div>
              <div className="all-routes-col-visit">访问</div>
              <div className="all-routes-col-actions">操作</div>
            </div>

            {pagedItems.map((item) => {
              const faviconUrl = toFaviconUrl(item.url, item.icon)
              const displayPath = toDisplayRouteText(item.path, item.url)
              const menuOpen = menuRouteId === item.id
              const isEditing = editingRouteId === item.id && editDraft

              return (
                <article className="all-routes-row-card" key={item.id}>
                  <div className="all-routes-row-main">
                    <div className="all-routes-col-checkbox">
                      <label className="all-routes-check">
                        <input
                          checked={selectedIdSet.has(item.id)}
                          onChange={(event) => handleToggleSelect(item.id, event.target.checked)}
                          type="checkbox"
                        />
                      </label>
                    </div>

                    <div className="all-routes-col-info">
                      <div className="all-routes-site-block">
                        <img alt="" className="all-routes-site-icon" src={faviconUrl} />
                        <div className="all-routes-site-copy">
                          <a className="all-routes-site-title" href={item.url} rel="noreferrer" target="_blank" title={item.title}>
                            {item.title}
                          </a>
                          <div className="all-routes-site-line">
                            <a className="all-routes-site-link" href={item.url} rel="noreferrer" target="_blank" title={item.url}>
                              {displayPath}
                            </a>
                          </div>
                          <div className="all-routes-site-meta">
                            <span className="all-routes-group-tag">{item.groupName}</span>
                            {item.note ? <span className="all-routes-note-chip">{item.note}</span> : null}
                            {item.tags.length > 0 ? <span className="all-routes-note-chip">#{item.tags.join(" #")}</span> : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="all-routes-col-time">
                      <strong>{formatDateTime(item.createdAt)}</strong>
                      <span>{toHostname(item.url)}</span>
                    </div>

                    <div className="all-routes-col-visit">
                      <strong>{item.visitCount > 0 ? `${item.visitCount} 次` : "0 次"}</strong>
                      <span>{toVisitSummary(item.visitCount)}</span>
                    </div>

                    <div className="all-routes-col-actions">
                      <button
                        className={`route-icon-button all-routes-star-button${item.starred ? " is-starred" : ""}`}
                        onClick={() => void handleToggleStar(item.id)}
                        title={item.starred ? "取消星标" : "设为星标"}
                        type="button"
                      >
                        {item.starred ? "★" : "☆"}
                      </button>
                      <button
                        className="route-text-button all-routes-more-button"
                        onClick={() => setMenuRouteId(menuOpen ? null : item.id)}
                        type="button"
                      >
                        ⋮
                      </button>
                      <button className="route-text-button restore-btn" onClick={() => void handleRestoreRoute(item.url)} type="button">
                        恢复
                      </button>
                      <button className="route-text-button is-danger" onClick={() => void handleDeleteRoute(item.id)} type="button">
                        删除
                      </button>
                    </div>
                  </div>

                  {menuOpen ? (
                    <div className="all-routes-more-panel">
                      <div className="all-routes-more-row">
                        <span>切换分组</span>
                        <select
                          className="route-select"
                          onChange={(event) => void handleMoveRouteGroup(item.id, event.target.value)}
                          value={item.groupId}
                        >
                          {groupOptions.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {item.environments && item.environments.length > 0 ? (
                        <div className="all-routes-more-row">
                          <span>环境</span>
                          <div className="all-routes-env-list">
                            {item.environments.map((env) => (
                              <button
                                key={env.name}
                                className={`env-tag${env.name === item.activeEnv ? " active" : ""}`}
                                onClick={() => void handleEnvChange(item.id, env.name)}
                                type="button"
                              >
                                {env.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="all-routes-more-actions">
                        <button className="route-text-button" onClick={() => handleStartEdit(item.id)} type="button">
                          编辑
                        </button>
                        <button
                          className="route-text-button"
                          onClick={() => void navigator.clipboard.writeText(toCurl(item.url, item.httpMethod, item.headers))}
                          type="button"
                        >
                          复制 cURL
                        </button>
                        <button
                          className="route-text-button"
                          onClick={() => void navigator.clipboard.writeText(toFetch(item.url, item.httpMethod, item.headers))}
                          type="button"
                        >
                          复制 fetch
                        </button>
                        {item.repoUrl ? (
                          <a className="route-text-button" href={item.repoUrl} rel="noreferrer" target="_blank">
                            查看仓库
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {isEditing ? (
                    <div className="all-routes-inline-editor">
                      <div className="all-routes-edit-grid">
                        <label className="webdav-field">
                          <span>名称</span>
                          <input
                            className="group-input"
                            onChange={(event) => setEditDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                            value={editDraft.title}
                          />
                        </label>
                        <label className="webdav-field">
                          <span>地址</span>
                          <input
                            className="group-input"
                            onChange={(event) => setEditDraft((current) => (current ? { ...current, url: event.target.value } : current))}
                            value={editDraft.url}
                          />
                        </label>
                        <label className="webdav-field">
                          <span>备注</span>
                          <input
                            className="group-input"
                            onChange={(event) => setEditDraft((current) => (current ? { ...current, note: event.target.value } : current))}
                            value={editDraft.note}
                          />
                        </label>
                        <label className="webdav-field">
                          <span>标签</span>
                          <input
                            className="group-input"
                            onChange={(event) => setEditDraft((current) => (current ? { ...current, tags: event.target.value } : current))}
                            value={editDraft.tags}
                          />
                        </label>
                        <label className="webdav-field">
                          <span>HTTP 方法</span>
                          <select
                            className="route-select"
                            onChange={(event) => setEditDraft((current) => (current ? { ...current, httpMethod: event.target.value } : current))}
                            value={editDraft.httpMethod}
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                          </select>
                        </label>
                        <label className="webdav-field">
                          <span>仓库地址</span>
                          <input
                            className="group-input"
                            onChange={(event) => setEditDraft((current) => (current ? { ...current, repoUrl: event.target.value } : current))}
                            value={editDraft.repoUrl}
                          />
                        </label>
                      </div>

                      <div className="all-routes-edit-envs">
                        <div className="all-routes-edit-env-head">
                          <strong>环境配置</strong>
                          <button
                            className="route-text-button"
                            onClick={() =>
                              setEditDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      environments: [...current.environments, { name: "", url: "" }]
                                    }
                                  : current
                              )
                            }
                            type="button"
                          >
                            添加环境
                          </button>
                        </div>
                        {editDraft.environments.length > 0 ? (
                          <div className="all-routes-edit-env-grid">
                            {editDraft.environments.map((env, index) => (
                              <div className="all-routes-edit-env-row" key={`${item.id}-${index}`}>
                                <input
                                  className="group-input"
                                  onChange={(event) =>
                                    setEditDraft((current) => {
                                      if (!current) return current
                                      const environments = [...current.environments]
                                      environments[index] = { ...environments[index], name: event.target.value }
                                      return { ...current, environments }
                                    })
                                  }
                                  placeholder="环境名称"
                                  value={env.name}
                                />
                                <input
                                  className="group-input"
                                  onChange={(event) =>
                                    setEditDraft((current) => {
                                      if (!current) return current
                                      const environments = [...current.environments]
                                      environments[index] = { ...environments[index], url: event.target.value }
                                      return { ...current, environments }
                                    })
                                  }
                                  placeholder="环境地址"
                                  value={env.url}
                                />
                                <button
                                  className="route-text-button is-danger"
                                  onClick={() =>
                                    setEditDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            environments: current.environments.filter((_, currentIndex) => currentIndex !== index)
                                          }
                                        : current
                                    )
                                  }
                                  type="button"
                                >
                                  删除环境
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="all-routes-edit-empty">暂无环境配置。</p>
                        )}
                      </div>

                      <div className="all-routes-edit-actions">
                        <button className="route-text-button is-primary" onClick={() => void handleSaveEdit()} type="button">
                          保存修改
                        </button>
                        <button className="route-text-button" onClick={handleCancelEdit} type="button">
                          取消
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}

        <footer className="all-routes-pagination">
          <span>共 {filteredItems.length} 条</span>
          <div className="all-routes-pagination-controls">
            <button
              className="route-text-button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              ‹
            </button>
            <span className="all-routes-page-indicator">{currentPage}</span>
            <button
              className="route-text-button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              type="button"
            >
              ›
            </button>
          </div>
          <select
            className="all-routes-page-size"
            onChange={(event) => setPageSize(Number(event.target.value))}
            value={pageSize}
          >
            <option value={10}>10 条/页</option>
            <option value={20}>20 条/页</option>
            <option value={50}>50 条/页</option>
          </select>
        </footer>
      </section>
    </section>
  )
}
