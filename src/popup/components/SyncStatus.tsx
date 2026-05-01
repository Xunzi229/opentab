import { formatPopupSavedCount } from "../../lib/popup-ui"

type SyncStatusProps = {
  routeCount: number
}

export function SyncStatus({ routeCount }: SyncStatusProps) {
  return (
    <section className="popup-footer-bar">
      <button className="popup-footer-link" type="button">
        <span aria-hidden="true">💡</span>
        使用帮助
      </button>
      <button className="popup-footer-link" type="button">
        <span aria-hidden="true">↗</span>
        打开官网
      </button>
      <p className="popup-footer-copy">{formatPopupSavedCount(routeCount)}</p>
    </section>
  )
}
