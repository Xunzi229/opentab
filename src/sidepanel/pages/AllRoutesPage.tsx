import { useCallback, useEffect, useMemo, useState } from "react"
import { DEFAULT_GROUP_ID, STORAGE_KEYS } from "../../lib/constants"
import { getGroupedRoutes } from "../../services/group-service"
import { moveRouteToGroup, removeRoute, toggleRouteStar, updateRoute } from "../../services/route-service"
import { HeroBanner } from "../components/HeroBanner"
import { RouteCard } from "../components/RouteCard"
import { SearchBar } from "../components/SearchBar"
import { ViewToggle } from "../components/ViewToggle"

type GroupedRoutes = Awaited<ReturnType<typeof getGroupedRoutes>>

export function AllRoutesPage() {
  const [searchText, setSearchText] = useState("")
  const [groups, setGroups] = useState<GroupedRoutes>([])
  const [statusMessage, setStatusMessage] = useState("这里会汇总所有分组中的收藏。")

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

  const allItems = useMemo(() => groups.flatMap((group) => group.items), [groups])

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) {
      return allItems
    }

    return allItems.filter((item) => {
      const note = item.note?.toLowerCase() ?? ""
      return (
        item.title.toLowerCase().includes(keyword) ||
        item.path.toLowerCase().includes(keyword) ||
        item.url.toLowerCase().includes(keyword) ||
        note.includes(keyword)
      )
    })
  }, [allItems, searchText])

  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name
      })),
    [groups]
  )

  async function handleToggleStar(routeId: string) {
    await toggleRouteStar(routeId)
    setStatusMessage("星标状态已更新。")
  }

  async function handleDeleteRoute(routeId: string) {
    await removeRoute(routeId)
    setStatusMessage("路由已删除。")
  }

  async function handleMoveRouteGroup(routeId: string, groupId: string) {
    await moveRouteToGroup(routeId, groupId || DEFAULT_GROUP_ID)
    setStatusMessage("路由分组已更新。")
  }

  async function handleEditRoute(routeId: string, input: { title: string; url: string; note?: string; tags?: string }) {
    try {
      await updateRoute(routeId, input)
      setStatusMessage("路由已更新。")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "更新路由失败。")
    }
  }

  async function handleOpenAllRoutes(urls: string[]) {
    const validUrls = urls.filter(Boolean)
    await Promise.all(validUrls.map((url, index) => chrome.tabs.create({ url, active: index === 0 })))
    setStatusMessage(`已批量打开 ${validUrls.length} 个地址。`)
  }

  return (
    <section className="page-stack">
      <HeroBanner title="全部收藏" description="这里汇总所有分组中的网址，适合全局搜索、批量查看和快速整理。" />
      <header className="dashboard-head">
        <div>
          <h3>全部收藏</h3>
          <p>共 {allItems.length} 条收藏，支持全局搜索、移动分组、编辑和删除。</p>
        </div>
        <div className="dashboard-toolbar">
          <SearchBar value={searchText} onChange={setSearchText} />
          <ViewToggle />
        </div>
      </header>
      <section className="surface group-section">
        <div className="section-head">
          <div>
            <h3>全局视图</h3>
            <p>{statusMessage}</p>
          </div>
          <div className="group-actions">
            <button
              className="route-text-button"
              disabled={filteredItems.length === 0}
              onClick={() => void handleOpenAllRoutes(filteredItems.map((item) => item.url))}
              type="button"
            >
              批量打开当前结果
            </button>
          </div>
        </div>
        {filteredItems.length === 0 ? (
          <div className="empty-state">没有匹配的收藏，换个关键词试试。</div>
        ) : (
          <div className="route-list">
            {filteredItems.map((item) => (
              <RouteCard
                groupId={item.groupId}
                groups={groupOptions}
                icon={item.icon}
                id={item.id}
                key={item.id}
                note={item.note}
                tags={item.tags}
                onDelete={handleDeleteRoute}
                onEdit={handleEditRoute}
                onMoveGroup={handleMoveRouteGroup}
                onToggleStar={handleToggleStar}
                path={item.path}
                starred={item.starred}
                title={item.title}
                url={item.url}
                visitCount={item.visitCount}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
