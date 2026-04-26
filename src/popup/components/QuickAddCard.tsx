import { useState } from "react"
import { getCurrentActiveTabSnapshot } from "../../lib/chrome"
import { recordVisit } from "../../services/history-service"
import { saveRoute } from "../../services/route-service"

type QuickAddCardProps = {
  onRouteSaved: () => Promise<void> | void
}

export function QuickAddCard({ onRouteSaved }: QuickAddCardProps) {
  const [status, setStatus] = useState("准备就绪")
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
    <section className="surface popup-card">
      <h2 className="popup-title">收藏当前路由</h2>
      <p className="popup-subtitle">读取当前激活标签页，将页面标题和地址保存到本地收藏。</p>
      <div style={{ marginTop: 12 }}>
        <button className="popup-button" disabled={isSaving} onClick={handleSaveCurrentPage} type="button">
          {isSaving ? "收藏中..." : "+ 收藏当前页面"}
        </button>
      </div>
      <p className="popup-muted" style={{ marginTop: 10 }}>
        {status}
      </p>
    </section>
  )
}
