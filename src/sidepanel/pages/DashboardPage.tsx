import { useCallback, useEffect, useMemo, useState } from "react"
import { DEFAULT_GROUP_ID, STORAGE_KEYS } from "../../lib/constants"
import { createGroup, deleteGroup, getGroupedRoutes, reorderGroups, renameGroup, toggleGroupLock, toggleGroupPin } from "../../services/group-service"
import { listVisits } from "../../services/history-service"
import { moveRouteToGroup, removeRoute, reorderRoutes, saveRoute, toggleRouteStar, updateRoute } from "../../services/route-service"
import { restoreAllRoutes, restoreRoute, sendAllTabsToGroup } from "../../services/tab-workspace-service"
import type { VisitRecord } from "../../types/history"
import { GroupSection } from "../components/GroupSection"
import { HeroBanner } from "../components/HeroBanner"
import { RecentTable } from "../components/RecentTable"
import { SearchBar } from "../components/SearchBar"
import { ViewToggle } from "../components/ViewToggle"

type GroupedRoutes = Awaited<ReturnType<typeof getGroupedRoutes>>

type DashboardPageProps = {
  viewMode: "grid" | "list"
  onViewModeChange: (mode: "grid" | "list") => void
}

export function DashboardPage({ viewMode, onViewModeChange }: DashboardPageProps) {
  const [searchText, setSearchText] = useState("")
  const [newGroupName, setNewGroupName] = useState("")
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [statusMessage, setStatusMessage] = useState("你可以在这里管理分组、路由和最近访问。")
  const [groups, setGroups] = useState<GroupedRoutes>([])
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [dragGroupOverId, setDragGroupOverId] = useState<string | null>(null)

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

  async function handleToggleLock(groupId: string) {
    try {
      await toggleGroupLock(groupId)
      setStatusMessage("分组锁定状态已更新。")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "更新锁定状态失败。")
    }
  }

  async function handleTogglePin(groupId: string) {
    try {
      await toggleGroupPin(groupId)
      setStatusMessage("分组置顶状态已更新。")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "更新置顶状态失败。")
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

  async function handleEditRoute(routeId: string, input: { title: string; url: string; note?: string; tags?: string; httpMethod?: string; repoUrl?: string; environments?: import("../../types/route").Environment[] }) {
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

  async function handleAddRoute(groupId: string, url: string) {
    try {
      await saveRoute({
        title: "",
        url,
        groupId
      })
      setStatusMessage("网址已添加到当前分组。")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "手动添加网址失败。")
    }
  }

  async function handleSendAllTabs() {
    try {
      const result = await sendAllTabsToGroup()
      if (result.savedCount === 0) {
        setStatusMessage("没有可收起的标签页。")
      } else {
        setStatusMessage(`已收起 ${result.savedCount} 个标签页${result.skippedCount > 0 ? `，跳过 ${result.skippedCount} 个` : ""}。`)
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "收起标签页失败。")
    }
  }

  async function handleRestoreRoute(url: string) {
    await restoreRoute(url)
    setStatusMessage("已在新标签页恢复。")
  }

  async function handleRestoreAllRoutes(routes: Array<{ url: string }>) {
    await restoreAllRoutes(routes)
    setStatusMessage(`已恢复 ${routes.length} 个路由到新标签页。`)
  }

  async function handleDeleteAllRoutes(routes: Array<{ id: string; url: string }>) {
    await restoreAllRoutes(routes)
    for (const route of routes) {
      await removeRoute(route.id)
    }
    setStatusMessage(`已恢复并删除 ${routes.length} 个路由。`)
  }

  async function handleDropRoute(draggedRouteId: string, targetRouteId: string) {
    try {
      const targetGroup = groups.find((group) => group.items.some((item) => item.id === targetRouteId))
      if (!targetGroup) return

      const orderedIds = targetGroup.items.map((item) => item.id)
      const fromIndex = orderedIds.indexOf(draggedRouteId)
      const toIndex = orderedIds.indexOf(targetRouteId)

      if (fromIndex === -1) {
        // dragged route is from another group — move it into this group first
        await moveRouteToGroup(draggedRouteId, targetGroup.id)
        // reload to get updated item list
        const refreshed = await getGroupedRoutes()
        const refreshedGroup = refreshed.find((g) => g.id === targetGroup.id)
        if (!refreshedGroup) return
        const ids = refreshedGroup.items.map((item) => item.id)
        const targetIdx = ids.indexOf(targetRouteId)
        const dragIdx = ids.indexOf(draggedRouteId)
        if (dragIdx !== -1 && targetIdx !== -1) {
          ids.splice(dragIdx, 1)
          ids.splice(targetIdx, 0, draggedRouteId)
          await reorderRoutes(targetGroup.id, ids)
        }
      } else {
        orderedIds.splice(fromIndex, 1)
        orderedIds.splice(toIndex, 0, draggedRouteId)
        await reorderRoutes(targetGroup.id, orderedIds)
      }

      setStatusMessage("路由排序已更新。")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "路由排序失败。")
    }
  }

  function handleGroupDragStart(e: React.DragEvent, groupId: string) {
    e.dataTransfer.setData("application/opentab-group", groupId)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleGroupDragOver(e: React.DragEvent, groupId: string) {
    if (e.dataTransfer.types.includes("application/opentab-group")) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      setDragGroupOverId(groupId)
    }
  }

  function handleGroupDragLeave() {
    setDragGroupOverId(null)
  }

  async function handleGroupDrop(e: React.DragEvent, targetGroupId: string) {
    e.preventDefault()
    setDragGroupOverId(null)
    const draggedGroupId = e.dataTransfer.getData("application/opentab-group")
    if (!draggedGroupId || draggedGroupId === targetGroupId) return

    try {
      const orderedIds = groups.map((group) => group.id)
      const fromIndex = orderedIds.indexOf(draggedGroupId)
      const toIndex = orderedIds.indexOf(targetGroupId)
      if (fromIndex === -1 || toIndex === -1) return

      orderedIds.splice(fromIndex, 1)
      orderedIds.splice(toIndex, 0, draggedGroupId)
      await reorderGroups(orderedIds)
      setStatusMessage("分组排序已更新。")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "分组排序失败。")
    }
  }

  return (
    <section className="page-stack">
      <HeroBanner />
      <header className="dashboard-head">
        <div>
          <h3>我的分组</h3>
          <p>这里使用更紧凑的一行式列表管理收藏，方便高频查看和快速操作。</p>
        </div>
        <div className="dashboard-toolbar">
          <SearchBar value={searchText} onChange={setSearchText} />
          <ViewToggle mode={viewMode} onChange={onViewModeChange} />
          <button className="route-text-button send-all-tabs-btn" onClick={handleSendAllTabs} type="button">
            收起所有标签
          </button>
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
      {groups.length === 0 ? (
        <section className="surface group-section">
          <div className="empty-guide">
            <h3>欢迎使用 OpenTab</h3>
            <p>开始收藏你的第一个路由吧</p>
            <p>提示：点击上方"收起所有标签"可以快速保存当前打开的标签页</p>
          </div>
        </section>
      ) : filteredGroups.length === 0 ? (
        <section className="surface group-section">
          <div className="section-head">
            <div>
              <h3>没有匹配的收藏</h3>
              <p>换个关键词试试。</p>
            </div>
          </div>
        </section>
      ) : (
        filteredGroups.map((group) => (
          <div
            className={`group-section-wrapper${dragGroupOverId === group.id ? " group-drag-over" : ""}`}
            draggable
            key={group.id}
            onDragLeave={handleGroupDragLeave}
            onDragOver={(e) => handleGroupDragOver(e, group.id)}
            onDragStart={(e) => handleGroupDragStart(e, group.id)}
            onDrop={(e) => void handleGroupDrop(e, group.id)}
          >
            <GroupSection
              description={`${group.count} 条路由`}
              editingName={editingGroupName}
              groups={groupOptions}
              id={group.id}
              isDefault={group.id === DEFAULT_GROUP_ID}
              isEditing={editingGroupId === group.id}
              isLocked={group.isLocked}
              items={group.items}
              onAddRoute={handleAddRoute}
              onCancelEdit={handleCancelEdit}
              onDeleteAllRoutes={handleDeleteAllRoutes}
              onDeleteGroup={handleDeleteGroup}
              onDeleteRoute={handleDeleteRoute}
              onDropRoute={handleDropRoute}
              onEditRoute={handleEditRoute}
              onEditingNameChange={setEditingGroupName}
              onMoveRouteGroup={handleMoveRouteGroup}
              onOpenAllRoutes={handleOpenAllRoutes}
              onRestoreAllRoutes={handleRestoreAllRoutes}
              onRestoreRoute={handleRestoreRoute}
              onSaveEdit={handleSaveEdit}
              onStartEdit={handleStartEdit}
              onToggleLock={handleToggleLock}
              onTogglePin={handleTogglePin}
              onToggleStar={handleToggleStar}
              pinned={group.pinned}
              title={group.name}
              viewMode={viewMode}
            />
          </div>
        ))
      )}
      <RecentTable rows={visits} />
    </section>
  )
}
