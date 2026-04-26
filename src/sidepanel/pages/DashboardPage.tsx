import { useCallback, useEffect, useMemo, useState } from "react"
import { DEFAULT_GROUP_ID, STORAGE_KEYS } from "../../lib/constants"
import { createGroup, deleteGroup, getGroupedRoutes, renameGroup } from "../../services/group-service"
import { listVisits } from "../../services/history-service"
import { moveRouteToGroup, removeRoute, toggleRouteStar, updateRoute } from "../../services/route-service"
import type { VisitRecord } from "../../types/history"
import { GroupSection } from "../components/GroupSection"
import { HeroBanner } from "../components/HeroBanner"
import { RecentTable } from "../components/RecentTable"
import { SearchBar } from "../components/SearchBar"
import { Sidebar } from "../components/Sidebar"
import { ViewToggle } from "../components/ViewToggle"

type GroupedRoutes = Awaited<ReturnType<typeof getGroupedRoutes>>

export function DashboardPage() {
  const [searchText, setSearchText] = useState("")
  const [newGroupName, setNewGroupName] = useState("")
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [statusMessage, setStatusMessage] = useState("你可以在这里管理分组、路由和最近访问。")
  const [groups, setGroups] = useState<GroupedRoutes>([])
  const [visits, setVisits] = useState<VisitRecord[]>([])

  const loadData = useCallback(async () => {
    const [nextGroups, nextVisits] = await Promise.all([getGroupedRoutes(), listVisits()])
    setGroups(nextGroups)
    setVisits(nextVisits.slice(0, 10))
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

  const filteredGroups = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) {
      return groups
    }

    return groups
      .map((group) => {
        const items = group.items.filter((item) => {
          const note = item.note?.toLowerCase() ?? ""
          return (
            item.title.toLowerCase().includes(keyword) ||
            item.path.toLowerCase().includes(keyword) ||
            item.url.toLowerCase().includes(keyword) ||
            note.includes(keyword)
          )
        })

        return {
          ...group,
          items,
          count: items.length
        }
      })
      .filter((group) => group.items.length > 0)
  }, [groups, searchText])

  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name
      })),
    [groups]
  )

  async function handleCreateGroup() {
    try {
      await createGroup(newGroupName)
      setNewGroupName("")
      setStatusMessage("新分组已创建。")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "创建分组失败。")
    }
  }

  function handleStartEdit(groupId: string, currentName: string) {
    setEditingGroupId(groupId)
    setEditingGroupName(currentName)
  }

  function handleCancelEdit() {
    setEditingGroupId(null)
    setEditingGroupName("")
  }

  async function handleSaveEdit(groupId: string) {
    try {
      await renameGroup(groupId, editingGroupName)
      setEditingGroupId(null)
      setEditingGroupName("")
      setStatusMessage("分组名称已更新。")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "更新分组失败。")
    }
  }

  async function handleDeleteGroup(groupId: string) {
    try {
      await deleteGroup(groupId)
      setStatusMessage("分组已删除，原有路由已移动到默认分组。")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "删除分组失败。")
    }
  }

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

  async function handleEditRoute(routeId: string, input: { title: string; url: string; note?: string }) {
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
    <main className="sidepanel-layout">
      <Sidebar />
      <section className="sidepanel-content">
        <HeroBanner />
        <header className="dashboard-head">
          <div>
            <h3>我的分组</h3>
            <p>这里使用列表方式管理收藏，更适合高频查看、批量打开和后续维护。</p>
          </div>
          <div className="dashboard-toolbar">
            <SearchBar value={searchText} onChange={setSearchText} />
            <ViewToggle />
          </div>
        </header>
        <section className="surface group-section">
          <div className="section-head">
            <div>
              <h3>分组管理</h3>
              <p>分组名称必须唯一。你可以在这里创建分组，并把路由移动到更合适的位置。</p>
            </div>
          </div>
          <div className="group-create-row">
            <input
              className="group-input"
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="输入新的分组名称"
              value={newGroupName}
            />
            <button className="route-text-button is-primary" onClick={handleCreateGroup} type="button">
              新建分组
            </button>
          </div>
          <p className="dashboard-status">{statusMessage}</p>
        </section>
        {filteredGroups.length === 0 ? (
          <section className="surface group-section">
            <div className="section-head">
              <div>
                <h3>还没有可展示的收藏</h3>
                <p>先在 popup 中收藏当前页面，或者换个关键词再试。</p>
              </div>
            </div>
          </section>
        ) : (
          filteredGroups.map((group) => (
            <GroupSection
              description={`${group.count} 条路由`}
              editingName={editingGroupName}
              groups={groupOptions}
              id={group.id}
              isDefault={group.id === DEFAULT_GROUP_ID}
              isEditing={editingGroupId === group.id}
              items={group.items}
              key={group.id}
              onCancelEdit={handleCancelEdit}
              onDeleteGroup={handleDeleteGroup}
              onDeleteRoute={handleDeleteRoute}
              onEditRoute={handleEditRoute}
              onEditingNameChange={setEditingGroupName}
              onMoveRouteGroup={handleMoveRouteGroup}
              onOpenAllRoutes={handleOpenAllRoutes}
              onSaveEdit={handleSaveEdit}
              onStartEdit={handleStartEdit}
              onToggleStar={handleToggleStar}
              title={group.name}
            />
          ))
        )}
        <RecentTable rows={visits} />
      </section>
    </main>
  )
}
