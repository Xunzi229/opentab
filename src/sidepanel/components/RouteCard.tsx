import { useMemo, useState } from "react"
import { toCurl, toFetch, toRepoDisplayName } from "../../lib/env-utils"
import { toDisplayRouteText, toFaviconUrl } from "../../lib/url"
import type { Environment } from "../../types/route"

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return text
  return (
    <>
      {text.slice(0, index)}
      <mark className="search-highlight">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  )
}

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
  highlightQuery?: string
  environments?: Environment[]
  activeEnv?: string
  repoUrl?: string
  httpMethod?: string
  headers?: Record<string, string>
  groups: Array<{
    id: string
    name: string
  }>
  onToggleStar: (routeId: string) => void
  onDelete: (routeId: string) => void
  onMoveGroup: (routeId: string, groupId: string) => void
  onEdit: (routeId: string, input: { title: string; url: string; note?: string; tags?: string; httpMethod?: string; repoUrl?: string; environments?: Environment[] }) => Promise<void>
  onRestore: (url: string) => void
  onDropRoute?: (draggedRouteId: string, targetRouteId: string) => void
  onEnvChange?: (routeId: string, envName: string) => void
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
  environments,
  activeEnv,
  repoUrl,
  httpMethod,
  headers,
  onToggleStar,
  onDelete,
  onMoveGroup,
  onEdit,
  onRestore,
  onDropRoute,
  onEnvChange,
  highlightQuery
}: RouteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftUrl, setDraftUrl] = useState(url)
  const [draftNote, setDraftNote] = useState(note ?? "")
  const [draftTags, setDraftTags] = useState(tags.join(", "))
  const [editHttpMethod, setEditHttpMethod] = useState(httpMethod ?? "GET")
  const [editRepoUrl, setEditRepoUrl] = useState(repoUrl ?? "")
  const [editEnvironments, setEditEnvironments] = useState<Environment[]>(environments ?? [])
  const [dragOver, setDragOver] = useState(false)
  const displayPath = useMemo(() => toDisplayRouteText(path, url), [path, url])
  const faviconUrl = useMemo(() => toFaviconUrl(url, icon), [icon, url])

  function handleDragStart(event: React.DragEvent) {
    event.dataTransfer.setData("application/opentab-route", JSON.stringify({ routeId: id, groupId }))
    event.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(event: React.DragEvent) {
    if (event.dataTransfer.types.includes("application/opentab-route")) {
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      setDragOver(true)
    }
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setDragOver(false)
    const raw = event.dataTransfer.getData("application/opentab-route")
    if (!raw || !onDropRoute) return
    try {
      const { routeId: draggedRouteId } = JSON.parse(raw) as { routeId: string; groupId: string }
      if (draggedRouteId !== id) {
        onDropRoute(draggedRouteId, id)
      }
    } catch {
      // ignore malformed drag data
    }
  }

  function handleCancelEdit() {
    setDraftTitle(title)
    setDraftUrl(url)
    setDraftNote(note ?? "")
    setDraftTags(tags.join(", "))
    setEditHttpMethod(httpMethod ?? "GET")
    setEditRepoUrl(repoUrl ?? "")
    setEditEnvironments(environments ?? [])
    setIsEditing(false)
  }

  async function handleSaveEdit() {
    await onEdit(id, {
      title: draftTitle,
      url: draftUrl,
      note: draftNote,
      tags: draftTags,
      httpMethod: editHttpMethod,
      repoUrl: editRepoUrl || undefined,
      environments: editEnvironments.length > 0 ? editEnvironments : undefined
    })
    setIsEditing(false)
  }

  return (
    <article
      className={`route-row${dragOver ? " drag-over" : ""}`}
      draggable
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
    >
      <div className="route-row-main">
        {isEditing ? (
          <div className="route-edit-grid">
            <input className="group-input" onChange={(event) => setDraftTitle(event.target.value)} placeholder="名称" value={draftTitle} />
            <input className="group-input" onChange={(event) => setDraftUrl(event.target.value)} placeholder="https://example.com/path" value={draftUrl} />
            <input className="group-input" onChange={(event) => setDraftNote(event.target.value)} placeholder="备注（可选）" value={draftNote} />
            <input className="group-input" onChange={(event) => setDraftTags(event.target.value)} placeholder="标签，多个用逗号分隔" value={draftTags} />

            <div className="edit-field">
              <label>HTTP 方法</label>
              <select value={editHttpMethod} onChange={(event) => setEditHttpMethod(event.target.value)}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div className="edit-field">
              <label>代码仓库</label>
              <input placeholder="https://github.com/..." value={editRepoUrl} onChange={(event) => setEditRepoUrl(event.target.value)} />
            </div>

            <div className="edit-field">
              <label>环境配置</label>
              {editEnvironments.map((env, index) => (
                <div key={`${env.name}-${index}`} className="env-edit-row">
                  <input
                    value={env.name}
                    placeholder="名称"
                    onChange={(event) => {
                      const next = [...editEnvironments]
                      next[index] = { ...next[index], name: event.target.value }
                      setEditEnvironments(next)
                    }}
                  />
                  <input
                    value={env.url}
                    placeholder="URL"
                    onChange={(event) => {
                      const next = [...editEnvironments]
                      next[index] = { ...next[index], url: event.target.value }
                      setEditEnvironments(next)
                    }}
                  />
                  <button
                    className="remove-env-btn"
                    onClick={() => setEditEnvironments(editEnvironments.filter((_, envIndex) => envIndex !== index))}
                    type="button"
                  >
                    x
                  </button>
                </div>
              ))}
              <button className="add-env-btn" onClick={() => setEditEnvironments([...editEnvironments, { name: "", url: "" }])} type="button">
                + 添加环境
              </button>
            </div>
          </div>
        ) : (
          <div className="route-row-summary">
            <img alt="" className="route-favicon" src={faviconUrl} />
            <a className="route-title-link" href={url} rel="noreferrer" target="_blank" title={title}>
              {highlightQuery ? highlightText(title, highlightQuery) : title}
            </a>
            <a className="route-link route-link-inline" href={url} rel="noreferrer" target="_blank" title={url}>
              {displayPath}
            </a>
            <span className="route-row-meta">近 7 天访问 {visitCount} 次</span>
            {note ? <span className="route-row-note" title={note}>{note}</span> : null}
            {tags.length > 0 ? <span className="route-row-note" title={tags.join(", ")}>#{tags.join(" #")}</span> : null}
            {starred ? <span className="route-badge">已星标</span> : null}
            {environments?.length ? (
              <div className="env-tags">
                {environments.map((env) => (
                  <button
                    key={env.name}
                    className={`env-tag${env.name === activeEnv ? " active" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onEnvChange?.(id, env.name)
                    }}
                    title={env.url}
                    type="button"
                  >
                    {env.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="route-row-actions">
        <button
          className={`route-icon-button${starred ? " is-starred" : ""}`}
          onClick={() => onToggleStar(id)}
          title={starred ? "取消星标" : "设为星标"}
          type="button"
        >
          {starred ? "*" : "+"}
        </button>

        <select className="route-select" onChange={(event) => onMoveGroup(id, event.target.value)} value={groupId}>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <button
          className="route-action-btn dev-btn"
          onClick={() => void navigator.clipboard.writeText(toCurl(url, httpMethod, headers))}
          title="复制 cURL"
          type="button"
        >
          {"{}"}
        </button>
        <button
          className="route-action-btn dev-btn"
          onClick={() => void navigator.clipboard.writeText(toFetch(url, httpMethod, headers))}
          title="复制 fetch"
          type="button"
        >
          fn
        </button>

        {repoUrl ? (
          <a
            className="route-action-btn dev-btn"
            href={repoUrl}
            onClick={(event) => event.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
            title={`仓库: ${toRepoDisplayName(repoUrl)}`}
          >
            {"</>"}
          </a>
        ) : null}

        {isEditing ? (
          <>
            <button className="route-text-button is-primary button-pill" onClick={() => void handleSaveEdit()} type="button">
              保存
            </button>
            <button className="route-text-button button-pill" onClick={handleCancelEdit} type="button">
              取消
            </button>
          </>
        ) : (
          <button className="route-text-button button-pill" onClick={() => setIsEditing(true)} type="button">
            编辑
          </button>
        )}

        <button className="route-text-button restore-btn button-pill" onClick={() => onRestore(url)} type="button">
          恢复
        </button>
        <button className="route-text-button is-danger button-pill" onClick={() => onDelete(id)} type="button">
          删除
        </button>
      </div>
    </article>
  )
}
