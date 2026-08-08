import Link from "next/link";

import {
  getAllPostMetasIncludingDrafts,
  getAllTags,
} from "../../lib/posts";

const plannedFeatures = [
  "删除文章前进行确认",
  "本地图片导入",
  "发布前内容校验",
];

const completedFeatures = [
  "新建文章",
  "编辑文章元数据和正文",
  "Markdown 实时预览",
  "草稿和发布状态切换",
];

export default function StudioPostsPage() {
  const posts = getAllPostMetasIncludingDrafts();
  const tags = getAllTags();

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Content</p>
          <h1>文章管理</h1>
          <p>
            当前已通过 <code>packages/content-core</code> 读取本地 Markdown
            内容。此页面会显示已发布文章和草稿文章。
          </p>
        </div>

        <div className="header-actions">
          <Link className="secondary-button" href="/checks">
            发布前校验
          </Link>

          <Link className="primary-button" href="/posts/new">
            新建文章
          </Link>
        </div>
      </header>

      <section className="status-panel">
        <div>
          <span className="status-dot" />
          <strong>内容读取状态</strong>
        </div>
        <p>
          已读取 <strong>{posts.length}</strong> 篇文章，
          <strong>{tags.length}</strong> 个标签。
        </p>
      </section>

      {posts.length > 0 ? (
        <section className="studio-card">
          <h2>文章列表</h2>

          <div className="post-table" role="table" aria-label="文章列表">
            <div className="post-table-row post-table-head" role="row">
              <span role="columnheader">标题</span>
              <span role="columnheader">Slug</span>
              <span role="columnheader">发布时间</span>
              <span role="columnheader">标签</span>
            </div>

            {posts.map((post) => (
              <div className="post-table-row" role="row" key={post.slug}>
                <span role="cell">
                  <strong>
                    <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                  </strong>
                  <small>{post.summary}</small>
                </span>

                <span role="cell">
                  <code>{post.slug}</code>
                </span>

                <span role="cell">
                  {post.publishedAt}
                  {post.draft ? <em className="draft-badge">草稿</em> : null}
                </span>

                <span role="cell" className="post-tag-list">
                  {post.tags.length > 0
                    ? post.tags.map((tag) => <em key={tag}>{tag}</em>)
                    : "无标签"}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="empty-state">
          <h2>暂无文章</h2>
          <p>
            如果 content 目录中已有文章，请确认文章 frontmatter 符合 V1
            schema，并确认 Studio 的文章目录路径配置正确。
          </p>

          <Link className="primary-button" href="/posts/new">
            创建第一篇文章
          </Link>
        </section>
      )}

      <section className="studio-card">
        <h2>已完成文章功能</h2>
        <ul className="feature-list">
          {completedFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="studio-card">
        <h2>V1 后续文章功能清单</h2>
        <ul className="feature-list">
          {plannedFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="studio-card">
        <h2>标签概览</h2>

        {tags.length > 0 ? (
          <div className="tag-cloud">
            {tags.map((tag) => (
              <span className="tag-pill" key={tag.name}>
                {tag.name}
                <strong>{tag.count}</strong>
              </span>
            ))}
          </div>
        ) : (
          <p>暂无标签。</p>
        )}
      </section>
    </div>
  );
}