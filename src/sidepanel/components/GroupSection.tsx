import { useState } from "react"
import { RouteCard } from "./RouteCard"
import { ShareDialog } from "./ShareDialog"

type GroupSectionProps = {
  id: string
  title: string
  description: string
  isCollapsed?: boolean
  isDefault?: boolean
  isLocked?: boolean
  pinned?: boolean
  items: Array<{
    id: string
    title: string
    url: string
    path: string
    icon?: string
    note?: string
    tags: string[]
    visitCount: number
    starred: boolean
    groupId?: string
    environments?: import("../../types/route").Environment[]
    activeEnv?: string
  }>
  groups: Array<{
    id: string
    name: string
  }>
  isEditing: boolean
  editingName: string
  onEditingNameChange: (value: string) => void
  onStartEdit: (groupId: string, currentName: string) => void
  onCancelEdit: () => void
  onSaveEdit: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onToggleCollapsed: (groupId: string) => Promise<void>
  onToggleLock: (groupId: string) => Promise<void>
  onTogglePin: (groupId: string) => Promise<void>
  onToggleStar: (routeId: string) => void
  onDeleteRoute: (routeId: string) => void
  onMoveRouteGroup: (routeId: string, groupId: string) => void
  onEditRoute: (
    routeId: string,
    input: {
      title: string
      url: string
      note?: string
      tags?: string
      httpMethod?: string
      repoUrl?: string
      environments?: import("../../types/route").Environment[]
    }
  ) => Promise<void>
  onOpenAllRoutes: (urls: string[]) => Promise<void>
  onAddRoute: (groupId: string, url: string) => Promise<void>
  onRestoreRoute: (url: string) => void
  onRestoreAllRoutes: (routes: Array<{ url: string }>) => Promise<void>
  onDeleteAllRoutes: (routes: Array<{ id: string; url: string }>) => Promise<void>
  onDropRoute?: (draggedRouteId: string, targetRouteId: string) => void
  onEnvChange?: (routeId: string, envName: string) => void
  viewMode?: "grid" | "list"
}

export function GroupSection({
  id,
  title,
  description,
  isCollapsed = false,
  isDefault = false,
  isLocked = false,
  pinned = false,
  items,
  groups,
  isEditing,
  editingName,
  onEditingNameChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteGroup,
  onToggleCollapsed,
  onToggleLock,
  onTogglePin,
  onToggleStar,
  onDeleteRoute,
  onMoveRouteGroup,
  onEditRoute,
  onOpenAllRoutes,
  onAddRoute,
  onRestoreRoute,
  onRestoreAllRoutes,
  onDeleteAllRoutes,
  onDropRoute,
  onEnvChange,
  viewMode = "list"
}: GroupSectionProps) {
  const [manualUrl, setManualUrl] = useState("")
  const [showManualForm, setShowManualForm] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const itemUrls = items.map((item) => item.url)

  async function handleAddRoute() {
    await onAddRoute(id, manualUrl)
    setManualUrl("")
    setShowManualForm(false)
  }

  function handleCancelManualForm() {
    setManualUrl("")
    setShowManualForm(false)
  }

  async function handleToggleCollapsed() {
    if (!isCollapsed) {
      handleCancelManualForm()
    }

    await onToggleCollapsed(id)
  }

  return (
    <section className="surface group-section">
      <div className="section-head">
        <div>
          {isEditing ? (
            <div className="group-edit-row">
              <input
                className="group-input"
                onChange={(event) => onEditingNameChange(event.target.value)}
                value={editingName}
              />
              <button className="route-text-button is-primary" onClick={() => onSaveEdit(id)} type="button">
                保存
              </button>
              <button className="route-text-button" onClick={onCancelEdit} type="button">
                取消
              </button>
            </div>
          ) : (
            <h3>
              {title}
              {isLocked ? <span className="lock-icon" title="已锁定">🔒</span> : null}
              {pinned ? <span className="pin-icon" title="已置顶">📌</span> : null}
            </h3>
          )}
          <p>{description}</p>
        </div>
        <div className="group-actions">
          <button
            aria-label={isCollapsed ? `expand group ${title}` : `collapse group ${title}`}
            className="group-collapse-btn"
            onClick={() => void handleToggleCollapsed()}
            title={isCollapsed ? "展开分组" : "收起分组"}
            type="button"
          >
            {isCollapsed ? "v" : "^"}
          </button>
          <button
            className={`lock-btn${isLocked ? " locked" : ""}`}
            onClick={() => void onToggleLock(id)}
            title={isLocked ? "解锁分组" : "锁定分组"}
            type="button"
          >
            {isLocked ? "🔒" : "🔓"}
          </button>
          <button
            className={`pin-btn${pinned ? " pinned" : ""}`}
            onClick={() => void onTogglePin(id)}
            title={pinned ? "取消置顶" : "置顶分组"}
            type="button"
          >
            📌
          </button>
          <button className="route-text-button" onClick={() => setShowManualForm((value) => !value)} type="button">
            手动添加网址
          </button>
          <button
            className="route-text-button"
            disabled={itemUrls.length === 0}
            onClick={() => void onOpenAllRoutes(itemUrls)}
            type="button"
          >
            批量打开
          </button>
          <button
            className="route-text-button restore-all-btn"
            disabled={items.length === 0}
            onClick={() => void onRestoreAllRoutes(items.map((item) => ({ url: item.url })))}
            type="button"
          >
            全部恢复
          </button>
          <button
            className="route-text-button restore-delete-btn"
            disabled={items.length === 0}
            onClick={() => void onDeleteAllRoutes(items.map((item) => ({ id: item.id, url: item.url })))}
            type="button"
          >
            恢复并删除
          </button>
          {!isEditing ? (
            <button
              className="route-text-button"
              disabled={isLocked}
              onClick={() => onStartEdit(id, title)}
              type="button"
            >
              重命名
            </button>
          ) : null}
          <button
            className="route-text-button"
            disabled={items.length === 0}
            onClick={() => setShowShare(true)}
            type="button"
          >
            分享
          </button>
          {!isDefault ? (
            <button
              className="route-text-button is-danger"
              disabled={isLocked}
              onClick={() => onDeleteGroup(id)}
              type="button"
            >
              删除分组
            </button>
          ) : null}
        </div>
      </div>
      {!isCollapsed && showManualForm ? (
        <div className="manual-route-panel">
          <input
            className="group-input manual-route-input"
            onChange={(event) => setManualUrl(event.target.value)}
            placeholder="手动输入网址，例如 https://example.com"
            value={manualUrl}
          />
          <button
            className="route-text-button is-primary"
            disabled={!manualUrl.trim()}
            onClick={() => void handleAddRoute()}
            type="button"
          >
            添加
          </button>
          <button className="route-text-button" onClick={handleCancelManualForm} type="button">
            取消
          </button>
        </div>
      ) : null}
      {!isCollapsed ? (
        <div className={viewMode === "grid" ? "route-list route-grid" : "route-list route-list-view"}>
          {items.map((item) => (
            <RouteCard
              activeEnv={item.activeEnv}
              environments={item.environments}
              groupId={item.groupId}
              groups={groups}
              id={item.id}
              icon={item.icon}
              key={item.id}
              note={item.note}
              tags={item.tags}
              onDelete={onDeleteRoute}
              onDropRoute={onDropRoute}
              onEdit={onEditRoute}
              onEnvChange={onEnvChange}
              onMoveGroup={onMoveRouteGroup}
              onRestore={onRestoreRoute}
              onToggleStar={onToggleStar}
              path={item.path}
              starred={item.starred}
              title={item.title}
              url={item.url}
              visitCount={item.visitCount}
            />
          ))}
        </div>
      ) : null}
      {showShare ? (
        <ShareDialog
          groupName={title}
          routes={items.map((item) => ({ url: item.url, title: item.title, icon: item.icon }))}
          onClose={() => setShowShare(false)}
        />
      ) : null}
    </section>
  )
}
