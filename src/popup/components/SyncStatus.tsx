type SyncStatusProps = {
  routeCount: number
}

export function SyncStatus({ routeCount }: SyncStatusProps) {
  return (
    <section className="surface popup-card">
      <h2 className="popup-title">同步状态</h2>
      <p className="popup-subtitle">当前使用本地存储，后续会在 options 页面接入 Chrome Sync。</p>
      <p className="popup-muted" style={{ marginTop: 10 }}>
        已保存 {routeCount} 条收藏
      </p>
    </section>
  )
}
