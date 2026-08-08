import Link from "next/link";

import { getAllPosts } from "../lib/posts";
import { getSiteConfig } from "../lib/site";

export default function HomePage() {
  const site = getSiteConfig();
  const posts = getAllPosts().slice(0, 5);

  return (
    <main className="home-page">
      <section className="hero">
        <p className="eyebrow">个人博客</p>
        <h1>{site.name}</h1>
        <p className="intro">{site.description}</p>
      </section>

      <section className="posts-section">
        <div className="section-header">
          <h2>最新文章</h2>
          <Link href="/posts">查看全部</Link>
        </div>

        {posts.length > 0 ? (
          <div className="posts-list">
            {posts.map((post) => (
              <Link
                className="post-card"
                href={`/posts/${post.slug}`}
                key={post.slug}
              >
                <p className="post-date">{post.publishedAt}</p>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">还没有发布文章。</p>
        )}
      </section>
    </main>
  );
}