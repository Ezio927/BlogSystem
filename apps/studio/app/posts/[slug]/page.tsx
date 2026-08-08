import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeletePostButton } from "./DeletePostButton";
import {
  getAllPostSlugsIncludingDrafts,
  getPostBySlugIncludingDrafts,
} from "../../../lib/posts";

type StudioPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPostSlugsIncludingDrafts().map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: StudioPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlugIncludingDrafts(slug);

  if (!post) {
    return {
      title: "文章不存在",
    };
  }

  return {
    title: `管理文章：${post.title}`,
  };
}

export default async function StudioPostDetailPage({
  params,
}: StudioPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlugIncludingDrafts(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Post Detail</p>
          <h1>{post.title}</h1>
          <p>{post.summary}</p>
        </div>

        <div className="header-actions">
          <Link className="secondary-button" href="/posts">
            返回文章列表
          </Link>

          <Link className="primary-button" href={`/posts/${slug}/edit`}>
            编辑文章
          </Link>
        </div>
      </header>

      <section className="status-panel">
        <div>
          <span className={post.draft ? "status-dot warning" : "status-dot"} />
          <strong>{post.draft ? "草稿文章" : "已发布文章"}</strong>
        </div>

        <p>
          Slug：<code>{post.slug}</code>
        </p>
      </section>

      <section className="studio-card">
        <h2>Frontmatter</h2>

        <dl className="meta-grid">
          <div>
            <dt>标题</dt>
            <dd>{post.title}</dd>
          </div>

          <div>
            <dt>Slug</dt>
            <dd>
              <code>{post.slug}</code>
            </dd>
          </div>

          <div>
            <dt>摘要</dt>
            <dd>{post.summary}</dd>
          </div>

          <div>
            <dt>发布时间</dt>
            <dd>{post.publishedAt}</dd>
          </div>

          <div>
            <dt>更新时间</dt>
            <dd>{post.updatedAt}</dd>
          </div>

          <div>
            <dt>状态</dt>
            <dd>{post.draft ? "草稿" : "已发布"}</dd>
          </div>

          <div>
            <dt>封面</dt>
            <dd>{post.cover ? <code>{post.cover}</code> : "未设置"}</dd>
          </div>

          <div>
            <dt>源文件</dt>
            <dd>
              <code>{post.sourceFile}</code>
            </dd>
          </div>

          <div>
            <dt>标签</dt>
            <dd>
              {post.tags.length > 0 ? (
                <span className="post-tag-list">
                  {post.tags.map((tag) => (
                    <em key={tag}>{tag}</em>
                  ))}
                </span>
              ) : (
                "无标签"
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="studio-card">
        <h2>Markdown 正文</h2>

        <pre className="markdown-source">
          <code>{post.content}</code>
        </pre>
      </section>

      <DeletePostButton slug={post.slug} title={post.title} />
    </div>
  );
}