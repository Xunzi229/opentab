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
    note?: string
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
  onEditRoute: (routeId: string, input: { title: string; url: string; note?: string }) => Promise<void>
  onOpenAllRoutes: (urls: string[]) => Promise<void>
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
  onOpenAllRoutes
}: GroupSectionProps) {
  const itemUrls = items.map((item) => item.url)

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
          <button
            className="route-text-button"
            disabled={itemUrls.length === 0}
            onClick={() => void onOpenAllRoutes(itemUrls)}
            type="button"
          >
            批量打开
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
      <div className="route-list">
        {items.map((item) => (
          <RouteCard
            groupId={item.groupId}
            groups={groups}
            id={item.id}
            key={item.id}
            note={item.note}
            onDelete={onDeleteRoute}
            onEdit={onEditRoute}
            onMoveGroup={onMoveRouteGroup}
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
