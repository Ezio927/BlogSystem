import type { Metadata } from "next";

import { getSiteConfig } from "../../lib/site";

export const metadata: Metadata = {
  title: "关于",
  description: "关于这个博客项目和作者信息。"
};

export default function AboutPage() {
  const site = getSiteConfig();

  return (
    <main className="list-page">
      <section className="page-header">
        <p className="eyebrow">About</p>
        <h1>关于</h1>
        <p className="intro">这里记录这个博客项目的目标和作者信息。</p>
      </section>

      <section className="article-content">
        <p>
          这是一个用 Next.js 搭建的个人博客。当前版本使用 Markdown
          内容文件作为文章来源，并通过本地内容目录读取和渲染。
        </p>

        <h2>我为什么做这个博客</h2>

        <p>
          通过亲手完成一个真实项目，可以更清楚地理解页面、路由、数据、样式和内容管理之间的关系。
        </p>

        <h2>关于作者</h2>

        <p>
          本站作者是 {site.author}。我会在这里记录技术学习、项目实践和日常思考。
        </p>
      </section>
    </main>
  );
}