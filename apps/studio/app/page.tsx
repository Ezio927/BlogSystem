import Link from "next/link";

const cards = [
  {
    title: "文章管理",
    description: "新建、编辑、删除 Markdown 文章，管理草稿与发布状态。",
    href: "/posts",
    action: "管理文章"
  },
  {
    title: "站点配置",
    description: "编辑博客名称、头像、简介、社交链接等公开配置。",
    href: "/settings",
    action: "编辑配置"
  },
  {
    title: "发布流程",
    description: "发布前校验内容，运行构建检查，并通过 Git 推送更新。",
    href: "/publish",
    action: "查看发布"
  }
];

export default function StudioHomePage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <p className="eyebrow">Local-first Studio</p>
        <h1>本地博客管理工作台</h1>
        <p>
          Studio 用于在本机创建、编辑、预览和发布内容。V1
          以文件系统中的 Markdown 与公开配置作为唯一事实来源。
        </p>
      </section>

      <section className="card-grid">
        {cards.map((card) => (
          <article key={card.href} className="studio-card">
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <Link href={card.href}>{card.action}</Link>
          </article>
        ))}
      </section>

      <section className="status-panel">
        <div>
          <span className="status-dot" />
          <strong>运行边界</strong>
        </div>
        <p>
          Studio 应默认只监听 <code>127.0.0.1</code>，不作为公网管理后台使用。
          Web 应用的公开展示与本地管理权限保持分离。
        </p>
      </section>
    </div>
  );
}