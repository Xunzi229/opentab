import { useState } from "react"
import { formatGroupRouteCount, getCollapseGlyph } from "../../lib/group-ui"
import { RouteCard } from "./RouteCard"
import { ShareDialog } from "./ShareDialog"

function ToolbarIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="toolbar-icon" aria-hidden="true">
      {children}
    </span>
  )
}

type GroupSectionProps = {
  id: string
  title: string
  routeCount: number
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
  routeCount,
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
    <section className={`surface group-workbench${isCollapsed ? " is-collapsed" : " is-expanded"}`}>
      <div className="group-workbench-row">
        <div className="group-workbench-main">
          <div className="group-workbench-mark" aria-hidden="true">
            <span className="group-workbench-mark-core" />
          </div>
          <div className="group-workbench-copy">
            {isEditing ? (
              <div className="group-edit-row">
                <input className="group-input" onChange={(event) => onEditingNameChange(event.target.value)} value={editingName} />
                <button className="route-text-button is-primary button-pill" onClick={() => onSaveEdit(id)} type="button">
                  保存
                </button>
                <button className="route-text-button button-pill" onClick={onCancelEdit} type="button">
                  取消
                </button>
              </div>
            ) : (
              <>
                <h3>{title}</h3>
                <p>{formatGroupRouteCount(routeCount)}</p>
              </>
            )}
          </div>
        </div>

        <div className="group-workbench-side">
          <div className="group-workbench-controls">
            <button
              aria-label={isCollapsed ? `expand group ${title}` : `collapse group ${title}`}
              className="group-collapse-btn button-square"
              onClick={() => void handleToggleCollapsed()}
              title={isCollapsed ? "展开分组" : "收起分组"}
              type="button"
            >
              <ToolbarIcon>{getCollapseGlyph(isCollapsed)}</ToolbarIcon>
            </button>
            <button
              className={`lock-btn button-square${isLocked ? " locked" : ""}`}
              onClick={() => void onToggleLock(id)}
              title={isLocked ? "解锁分组" : "锁定分组"}
              type="button"
            >
              <ToolbarIcon>
                <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
                  <path d="M5.5 6V4.8a2.5 2.5 0 1 1 5 0V6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
                  <rect height="6.8" rx="1.8" stroke="currentColor" strokeWidth="1.4" width="9" x="3.5" y="6" />
                </svg>
              </ToolbarIcon>
            </button>
            <button
              className={`pin-btn button-square${pinned ? " pinned" : ""}`}
              onClick={() => void onTogglePin(id)}
              title={pinned ? "取消置顶" : "置顶分组"}
              type="button"
            >
              <ToolbarIcon>
                <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
                  <path d="M10.8 2.8 13 5l-2.2 1.6-.8 2.7-2.3-2.3-2.7.8L3.4 5 6 4.2 8.3 2l2.5.8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.2" />
                  <path d="m7.8 8.2-3.6 5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
                </svg>
              </ToolbarIcon>
            </button>
          </div>

          <span className="group-workbench-divider" aria-hidden="true" />

          <div className="group-workbench-toolbar">
            <button className="route-text-button button-pill" onClick={() => setShowManualForm((value) => !value)} type="button">
              <ToolbarIcon>+</ToolbarIcon>
              手动添加网址
            </button>
            <button
              className="route-text-button button-pill"
              disabled={itemUrls.length === 0}
              onClick={() => void onOpenAllRoutes(itemUrls)}
              type="button"
            >
              <ToolbarIcon>
                <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
                  <path d="M6 3.5h6.5V10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
                  <path d="m12.5 3.5-9 9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
                  <path d="M10 12.5H3.5V6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
                </svg>
              </ToolbarIcon>
              批量打开
            </button>
            <button
              className="route-text-button restore-all-btn button-pill"
              disabled={items.length === 0}
              onClick={() => void onRestoreAllRoutes(items.map((item) => ({ url: item.url })))}
              type="button"
            >
              全部恢复
            </button>
            <button
              className="route-text-button restore-delete-btn button-pill"
              disabled={items.length === 0}
              onClick={() => void onDeleteAllRoutes(items.map((item) => ({ id: item.id, url: item.url })))}
              type="button"
            >
              恢复并删除
            </button>
            {!isEditing ? (
              <button
                className="route-text-button button-pill button-accent"
                disabled={isLocked}
                onClick={() => onStartEdit(id, title)}
                type="button"
              >
                重命名
              </button>
            ) : null}
            <button
              className="route-text-button button-pill button-accent"
              disabled={items.length === 0}
              onClick={() => setShowShare(true)}
              type="button"
            >
              分享
            </button>
            {!isDefault ? (
              <button
                className="route-text-button is-danger button-pill"
                disabled={isLocked}
                onClick={() => onDeleteGroup(id)}
                type="button"
              >
                删除分组
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {!isCollapsed ? (
        <div className="group-workbench-content">
          {showManualForm ? (
            <div className="manual-route-panel group-workbench-panel">
              <input
                className="group-input manual-route-input"
                onChange={(event) => setManualUrl(event.target.value)}
                placeholder="手动输入网址，例如 https://example.com"
                value={manualUrl}
              />
              <button
                className="route-text-button is-primary button-pill"
                disabled={!manualUrl.trim()}
                onClick={() => void handleAddRoute()}
                type="button"
              >
                添加
              </button>
              <button className="route-text-button button-pill" onClick={handleCancelManualForm} type="button">
                取消
              </button>
            </div>
          ) : null}

          {items.length === 0 ? <p className="group-workbench-empty">这个分组里还没有路由。</p> : null}

          {!items.length ? null : (
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
          )}
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
