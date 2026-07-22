import path from "node:path";
import { listPosts } from "@open-blog/content-core";

export default async function StudioHome() {
  const posts = await listPosts(
    path.resolve(process.cwd(), "../../content/posts"),
    { includeDrafts: true },
  );

  return (
    <>
      <header>
        <p className="eyebrow">仅限本地访问</p>
        <h1>内容概览</h1>
        <p>当前版本用于验证 Studio 与公开博客读取同一份内容。</p>
      </header>
      <section className="cards">
        <article><strong>{posts.length}</strong><span>篇文章</span></article>
        <article><strong>{posts.filter((post) => post.metadata.draft).length}</strong><span>篇草稿</span></article>
      </section>
      <section>
        <h2>下一步</h2>
        <ol>
          <li>完成文章 schema 和迁移约定；</li>
          <li>实现安全的文件写入接口；</li>
          <li>加入编辑器、预览和发布编排。</li>
        </ol>
      </section>
    </>
  );
}
