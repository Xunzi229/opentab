import { useMemo, useState } from "react"
import { toDisplayRouteText, toFaviconUrl } from "../../lib/url"

type RouteCardProps = {
  id: string
  title: string
  url: string
  path: string
  icon?: string
  note?: string
  tags?: string[]
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
  onEdit: (routeId: string, input: { title: string; url: string; note?: string; tags?: string }) => Promise<void>
}

export function RouteCard({
  id,
  title,
  url,
  path,
  icon,
  note,
  tags = [],
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
  const [draftTags, setDraftTags] = useState(tags.join(", "))
  const displayPath = useMemo(() => toDisplayRouteText(path, url), [path, url])
  const faviconUrl = useMemo(() => toFaviconUrl(url, icon), [icon, url])

  function handleCancelEdit() {
    setDraftTitle(title)
    setDraftUrl(url)
    setDraftNote(note ?? "")
    setDraftTags(tags.join(", "))
    setIsEditing(false)
  }

  async function handleSaveEdit() {
    await onEdit(id, {
      title: draftTitle,
      url: draftUrl,
      note: draftNote
      ,
      tags: draftTags
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
            <input
              className="group-input"
              onChange={(event) => setDraftTags(event.target.value)}
              placeholder="标签，多个用逗号分隔"
              value={draftTags}
            />
          </div>
        ) : (
          <div className="route-row-summary">
            <img alt="" className="route-favicon" src={faviconUrl} />
            <a className="route-title-link" href={url} rel="noreferrer" target="_blank" title={title}>
              {title}
            </a>
            <a className="route-link route-link-inline" href={url} rel="noreferrer" target="_blank" title={url}>
              {displayPath}
            </a>
            <span className="route-row-meta">近 7 天访问 {visitCount} 次</span>
            {note ? <span className="route-row-note" title={note}>{note}</span> : null}
            {tags.length > 0 ? <span className="route-row-note" title={tags.join(", ")}>#{tags.join(" #")}</span> : null}
            {starred ? <span className="route-badge">已星标</span> : null}
          </div>
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
