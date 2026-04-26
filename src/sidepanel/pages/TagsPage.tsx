import { useCallback, useEffect, useState } from "react"
import { STORAGE_KEYS } from "../../lib/constants"
import { createTag, deleteTag, listTags, renameTag } from "../../services/tag-service"
import { HeroBanner } from "../components/HeroBanner"

type TagSummary = Awaited<ReturnType<typeof listTags>>[number]

export function TagsPage() {
  const [tags, setTags] = useState<TagSummary[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingTagName, setEditingTagName] = useState("")
  const [statusMessage, setStatusMessage] = useState("这里可以统一管理标签名称，以及标签和路由的关系。")

  const loadData = useCallback(async () => {
    const nextTags = await listTags()
    setTags(nextTags)
  }, [])

  useEffect(() => {
    void loadData()

    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== "local") {
        return
      }

      if (changes[STORAGE_KEYS.tags] || changes[STORAGE_KEYS.routes]) {
        void loadData()
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [loadData])

  async function handleCreateTag() {
    try {
      await createTag(newTagName)
      setNewTagName("")
      setStatusMessage("标签已创建。")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "创建标签失败。")
    }
  }

  async function handleRenameTag(tagId: string) {
    try {
      await renameTag(tagId, editingTagName)
      setEditingTagId(null)
      setEditingTagName("")
      setStatusMessage("标签名称已更新。")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "更新标签失败。")
    }
  }

  async function handleDeleteTag(tagId: string) {
    await deleteTag(tagId)
    setStatusMessage("标签已删除，相关路由中的这个标签也已移除。")
  }

  return (
    <section className="page-stack">
      <HeroBanner title="标签管理" description="这里集中管理标签，方便统一命名、清理冗余和维护分类体系。" />
      <section className="surface group-section">
        <div className="section-head">
          <div>
            <h3>标签列表</h3>
            <p>{statusMessage}</p>
          </div>
        </div>
        <div className="group-create-row">
          <input
            className="group-input"
            onChange={(event) => setNewTagName(event.target.value)}
            placeholder="输入新的标签名称"
            value={newTagName}
          />
          <button className="route-text-button is-primary" onClick={handleCreateTag} type="button">
            新建标签
          </button>
        </div>
        <div className="tag-list">
          {tags.length === 0 ? <div className="empty-state">还没有标签，先去编辑一条路由试试。</div> : null}
          {tags.map((tag) => (
            <div className="tag-row" key={tag.id}>
              {editingTagId === tag.id ? (
                <>
                  <input
                    className="group-input"
                    onChange={(event) => setEditingTagName(event.target.value)}
                    value={editingTagName}
                  />
                  <button className="route-text-button is-primary" onClick={() => void handleRenameTag(tag.id)} type="button">
                    保存
                  </button>
                  <button
                    className="route-text-button"
                    onClick={() => {
                      setEditingTagId(null)
                      setEditingTagName("")
                    }}
                    type="button"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <div className="tag-row-main">
                    <span className="route-badge">#{tag.name}</span>
                    <span className="route-row-meta">{tag.routeCount} 条路由</span>
                  </div>
                  <div className="group-actions">
                    <button
                      className="route-text-button"
                      onClick={() => {
                        setEditingTagId(tag.id)
                        setEditingTagName(tag.name)
                      }}
                      type="button"
                    >
                      重命名
                    </button>
                    <button className="route-text-button is-danger" onClick={() => void handleDeleteTag(tag.id)} type="button">
                      删除
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}
