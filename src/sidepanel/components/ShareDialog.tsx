import { useCallback, useRef, useState } from "react"
import "./ShareDialog.css"

type ShareDialogProps = {
  groupName: string
  routes: Array<{ url: string; title: string; icon?: string }>
  onClose: () => void
}

export function ShareDialog({ groupName, routes, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const shareUrl = (() => {
    const payload = JSON.stringify({ name: groupName, routes })
    const encoded = btoa(payload)
    return `${chrome.runtime.getURL("share.html")}#${encoded}`
  })()

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      inputRef.current?.select()
      document.execCommand("copy")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [shareUrl])

  return (
    <div
      className="share-dialog-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
      }}
      role="dialog"
      aria-modal
    >
      <div className="share-dialog">
        <h3>分享分组</h3>
        <p className="share-dialog-meta">
          {groupName} - {routes.length} 条路由
        </p>
        <div className="share-dialog-row">
          <input
            readOnly
            ref={inputRef}
            value={shareUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            className="route-text-button is-primary"
            onClick={() => void handleCopy()}
            type="button"
          >
            复制
          </button>
        </div>
        <div className="share-dialog-actions">
          {copied && <span className="share-dialog-copy-feedback">已复制到剪贴板</span>}
          <button className="route-text-button" onClick={onClose} type="button">
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
