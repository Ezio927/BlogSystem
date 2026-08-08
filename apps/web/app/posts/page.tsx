import type { Metadata } from "next";
import Link from "next/link";

import { getAllPosts } from "../../lib/posts";

export const metadata: Metadata = {
  title: "全部文章",
  description: "按发布时间浏览所有文章。"
};

export default function PostsPage() {
  const posts = getAllPosts();

  return (
    <main className="list-page">
      <section className="page-header">
        <p className="eyebrow">Posts</p>
        <h1>全部文章</h1>
        <p className="intro">按发布时间浏览所有文章。</p>
      </section>

      {posts.length > 0 ? (
        <section className="posts-list">
          {posts.map((post) => (
            <Link key={post.slug} href={`/posts/${post.slug}`} className="post-card">
              <p className="post-date">{post.publishedAt}</p>
              <h2>{post.title}</h2>
              <p>{post.summary}</p>

              {post.tags.length > 0 ? (
                <div className="tag-row" aria-label="文章标签">
                  {post.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
        </section>
      ) : (
        <p className="empty-state">还没有发布文章。</p>
      )}
    </main>
  );
}