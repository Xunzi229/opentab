export function PrivacyPage() {
  return (
    <section className="surface options-card">
      <h3>隐私说明</h3>
      <ul>
        <li>默认只记录路由元数据，不抓取页面正文。</li>
        <li>本地存储优先，后续同步功能由用户显式开启。</li>
        <li>访问记录是否保留会在设置中提供开关。</li>
      </ul>
      <p className="options-help">这部分后续还会补充 URL 敏感参数说明和同步范围说明。</p>
    </section>
  )
}
