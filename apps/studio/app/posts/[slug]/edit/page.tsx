import Link from "next/link";
import { notFound } from "next/navigation";

import { getPostBySlugIncludingDrafts } from "../../../../lib/posts";
import { EditPostForm } from "./EditPostForm";

type EditPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getStringField(source: object, key: string) {
  const value = (source as Record<string, unknown>)[key];

  return typeof value === "string" ? value : "";
}

function getBooleanField(source: object, key: string) {
  const value = (source as Record<string, unknown>)[key];

  return typeof value === "boolean" ? value : false;
}

function getStringArrayField(source: object, key: string) {
  const value = (source as Record<string, unknown>)[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const post = getPostBySlugIncludingDrafts(decodedSlug);

  if (!post) {
    notFound();
  }

  const title = getStringField(post, "title");
  const summary = getStringField(post, "summary");
  const publishedAt = getStringField(post, "publishedAt");
  const updatedAt = getStringField(post, "updatedAt");
  const cover = getStringField(post, "cover");
  const content =
    getStringField(post, "content") || getStringField(post, "body");
  const draft = getBooleanField(post, "draft");
  const tags = getStringArrayField(post, "tags");

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Content / Posts / Edit</p>
          <h1>编辑文章</h1>
          <p>修改文章内容后，点击保存会写回本地 Markdown 文件。</p>
        </div>

        <div className="header-actions">
          <Link className="secondary-button" href={`/posts/${decodedSlug}`}>
            返回详情
          </Link>
        </div>
      </header>

      <section className="status-panel">
        <div>
          <span className="status-dot" />
          <strong>编辑状态</strong>
        </div>
        <p>
          正在编辑 <code>{decodedSlug}</code>
          {draft ? <em className="draft-badge">草稿</em> : null}
        </p>
      </section>

      <EditPostForm
        slug={decodedSlug}
        initialValues={{
          title,
          summary,
          publishedAt,
          updatedAt,
          cover,
          tags,
          draft,
          content,
        }}
      />
    </div>
  );
}