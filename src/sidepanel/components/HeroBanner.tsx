type HeroBannerProps = {
  title?: string
  description?: string
}

export function HeroBanner({
  title = "收藏网址，整理工作台",
  description = "从当前页一键收起，到按分组浏览和恢复工作区，这里集中管理你的常用网址与路由。"
}: HeroBannerProps) {
  return (
    <section className="surface hero-banner">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}
