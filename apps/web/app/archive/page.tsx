import type { Metadata } from "next";
import Link from "next/link";

import { getArchiveGroups } from "../../lib/posts";

export const metadata: Metadata = {
  title: "归档",
  description: "按年份浏览已发布文章。"
};

export default function ArchivePage() {
  const groups = getArchiveGroups();

  return (
    <main className="list-page">
      <section className="page-header">
        <p className="eyebrow">Archive</p>
        <h1>归档</h1>
        <p className="intro">按年份浏览已发布文章。</p>
      </section>

      {groups.length > 0 ? (
        <section className="archive-list">
          {groups.map((group) => (
            <div className="archive-group" key={group.year}>
              <h2>{group.year}</h2>

              <div className="archive-posts">
                {group.posts.map((post) => (
                  <Link
                    className="archive-post"
                    href={`/posts/${post.slug}`}
                    key={post.slug}
                  >
                    <time dateTime={post.publishedAt}>{post.publishedAt}</time>
                    <span>{post.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <p className="empty-state">还没有归档文章。</p>
      )}
    </main>
  );
}