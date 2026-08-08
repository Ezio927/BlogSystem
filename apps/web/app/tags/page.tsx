import type { Metadata } from "next";
import Link from "next/link";

import { getAllTags } from "../../lib/posts";

export const metadata: Metadata = {
  title: "标签",
  description: "按主题浏览文章。"
};

export default function TagsPage() {
  const tags = getAllTags();

  return (
    <main className="list-page">
      <section className="page-header">
        <p className="eyebrow">Tags</p>
        <h1>标签</h1>
        <p className="intro">按主题浏览文章。</p>
      </section>

      {tags.length > 0 ? (
        <section className="tag-list">
          {tags.map((tag) => (
            <Link
              className="tag-card"
              href={`/tags/${encodeURIComponent(tag.name)}`}
              key={tag.name}
            >
              <span>{tag.name}</span>
              <strong>{tag.count}</strong>
            </Link>
          ))}
        </section>
      ) : (
        <p className="empty-state">还没有可用标签。</p>
      )}
    </main>
  );
}