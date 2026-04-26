type HeroBannerProps = {
  title?: string
  description?: string
}

export function HeroBanner({
  title = "收藏网址，提升效率",
  description = "从当前页一键收藏，到按分组浏览和恢复工作区，这里已经开始承接真实收藏数据。"
}: HeroBannerProps) {
  return (
    <section className="surface hero-banner">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}
