import { useMemo, useState } from "react"
import { toDisplayRouteText } from "../../lib/url"

type RouteCardProps = {
  id: string
  title: string
  url: string
  path: string
  note?: string
  starred?: boolean
  visitCount?: number
  groupId?: string
  groups: Array<{
    id: string
    name: string
  }>
  onToggleStar: (routeId: string) => void
  onDelete: (routeId: string) => void
  onMoveGroup: (routeId: string, groupId: string) => void
  onEdit: (routeId: string, input: { title: string; url: string; note?: string }) => Promise<void>
}

export function RouteCard({
  id,
  title,
  url,
  path,
  note,
  starred = false,
  visitCount = 0,
  groupId,
  groups,
  onToggleStar,
  onDelete,
  onMoveGroup,
  onEdit
}: RouteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftUrl, setDraftUrl] = useState(url)
  const [draftNote, setDraftNote] = useState(note ?? "")
  const displayPath = useMemo(() => toDisplayRouteText(path, url), [path, url])

  function handleCancelEdit() {
    setDraftTitle(title)
    setDraftUrl(url)
    setDraftNote(note ?? "")
    setIsEditing(false)
  }

  async function handleSaveEdit() {
    await onEdit(id, {
      title: draftTitle,
      url: draftUrl,
      note: draftNote
    })
    setIsEditing(false)
  }

  return (
    <article className="route-row">
      <div className="route-row-main">
        {isEditing ? (
          <div className="route-edit-grid">
            <input
              className="group-input"
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="名称"
              value={draftTitle}
            />
            <input
              className="group-input"
              onChange={(event) => setDraftUrl(event.target.value)}
              placeholder="https://example.com/path"
              value={draftUrl}
            />
            <input
              className="group-input"
              onChange={(event) => setDraftNote(event.target.value)}
              placeholder="备注（可选）"
              value={draftNote}
            />
          </div>
        ) : (
          <>
            <div className="route-row-titlebar">
              <a className="route-title-link" href={url} rel="noreferrer" target="_blank" title={title}>
                {title}
              </a>
              {starred ? <span className="route-badge">已星标</span> : null}
            </div>
            <a className="route-link" href={url} rel="noreferrer" target="_blank" title={url}>
              {displayPath}
            </a>
            <div className="route-row-meta">
              <span>访问 {visitCount} 次</span>
              {note ? <span>{note}</span> : null}
            </div>
          </>
        )}
      </div>
      <div className="route-row-actions">
        <button
          className={`route-icon-button${starred ? " is-starred" : ""}`}
          onClick={() => onToggleStar(id)}
          type="button"
          title={starred ? "取消星标" : "设为星标"}
        >
          {starred ? "★" : "☆"}
        </button>
        <select
          className="route-select"
          onChange={(event) => onMoveGroup(id, event.target.value)}
          value={groupId}
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        {isEditing ? (
          <>
            <button className="route-text-button is-primary" onClick={handleSaveEdit} type="button">
              保存
            </button>
            <button className="route-text-button" onClick={handleCancelEdit} type="button">
              取消
            </button>
          </>
        ) : (
          <button className="route-text-button" onClick={() => setIsEditing(true)} type="button">
            编辑
          </button>
        )}
        <button className="route-text-button is-danger" onClick={() => onDelete(id)} type="button">
          删除
        </button>
      </div>
    </article>
  )
}
