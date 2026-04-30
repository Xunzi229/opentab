import { useState } from "react"
import { RouteCard } from "./RouteCard"

type GroupSectionProps = {
  id: string
  title: string
  description: string
  isDefault?: boolean
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
  onToggleStar: (routeId: string) => void
  onDeleteRoute: (routeId: string) => void
  onMoveRouteGroup: (routeId: string, groupId: string) => void
  onEditRoute: (routeId: string, input: { title: string; url: string; note?: string; tags?: string }) => Promise<void>
  onOpenAllRoutes: (urls: string[]) => Promise<void>
  onAddRoute: (groupId: string, url: string) => Promise<void>
  onRestoreRoute: (url: string) => void
  onRestoreAllRoutes: (routes: Array<{ url: string }>) => Promise<void>
  onDeleteAllRoutes: (routes: Array<{ id: string; url: string }>) => Promise<void>
}

export function GroupSection({
  id,
  title,
  description,
  isDefault = false,
  items,
  groups,
  isEditing,
  editingName,
  onEditingNameChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteGroup,
  onToggleStar,
  onDeleteRoute,
  onMoveRouteGroup,
  onEditRoute,
  onOpenAllRoutes,
  onAddRoute,
  onRestoreRoute,
  onRestoreAllRoutes,
  onDeleteAllRoutes
}: GroupSectionProps) {
  const [manualUrl, setManualUrl] = useState("")
  const [showManualForm, setShowManualForm] = useState(false)
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
            <h3>{title}</h3>
          )}
          <p>{description}</p>
        </div>
        <div className="group-actions">
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
          {!isEditing && (
            <button className="route-text-button" onClick={() => onStartEdit(id, title)} type="button">
              重命名
            </button>
          )}
          {!isDefault && (
            <button className="route-text-button is-danger" onClick={() => onDeleteGroup(id)} type="button">
              删除分组
            </button>
          )}
        </div>
      </div>
      {showManualForm ? (
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
      <div className="route-list">
        {items.map((item) => (
          <RouteCard
            groupId={item.groupId}
            groups={groups}
            id={item.id}
            icon={item.icon}
            key={item.id}
            note={item.note}
            tags={item.tags}
            onDelete={onDeleteRoute}
            onEdit={onEditRoute}
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
    </section>
  )
}
