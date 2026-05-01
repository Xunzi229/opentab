import { useState } from "react"
import { getCurrentActiveTabSnapshot } from "../../lib/chrome"
import { getQuickAddIdleStatus } from "../../lib/popup-ui"
import { recordVisit } from "../../services/history-service"
import { saveRoute } from "../../services/route-service"

type QuickAddCardProps = {
  onRouteSaved: () => Promise<void> | void
}

export function QuickAddCard({ onRouteSaved }: QuickAddCardProps) {
  const [status, setStatus] = useState(getQuickAddIdleStatus())
  const [isSaving, setIsSaving] = useState(false)

  async function handleSaveCurrentPage() {
    setIsSaving(true)
    setStatus("正在读取当前页面...")

    try {
      const snapshot = await getCurrentActiveTabSnapshot()

      if (!snapshot) {
        setStatus("当前页面不支持收藏，只允许 http(s) 页面。")
        return
      }

      const route = await saveRoute(snapshot)
      await recordVisit({
        routeId: route.id,
        title: route.title,
        url: route.url
      })

      setStatus(`已收藏：${route.title}`)
      await onRouteSaved()
    } catch (error) {
      console.error(error)
      setStatus("收藏失败，请稍后重试。")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="surface popup-feature-card">
      <div className="popup-section-head">
        <span className="popup-section-icon is-indigo" aria-hidden="true">
          <svg fill="none" height="28" viewBox="0 0 28 28" width="28">
            <path d="M8 5.5h12a2 2 0 0 1 2 2v14l-8-4-8 4v-14a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
            <path d="M10.5 10.5h7" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </span>
        <div>
          <h2 className="popup-title">收藏当前页面</h2>
          <p className="popup-subtitle">读取当前激活标签页，将页面标题和地址保存到本地收藏。</p>
        </div>
      </div>

      <button className="popup-button popup-primary-cta" disabled={isSaving} onClick={() => void handleSaveCurrentPage()} type="button">
        {isSaving ? "收藏中..." : "+ 收藏当前页面"}
      </button>

      <div className="popup-status-row">
        <span className="popup-status-dot" aria-hidden="true" />
        <p className="popup-muted">{status}</p>
      </div>
    </section>
  )
}
