import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAllTags, getPostsByTag } from "../../../lib/posts";

type TagPageProps = {
  params: Promise<{
    tag: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTags().map((tag) => ({
    tag: tag.name
  }));
}

export async function generateMetadata({
  params
}: TagPageProps): Promise<Metadata> {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);
  const posts = getPostsByTag(tag);

  if (posts.length === 0) {
    return {};
  }

  return {
    title: tag,
    description: `共 ${posts.length} 篇文章。`
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);
  const posts = getPostsByTag(tag);

  if (posts.length === 0) {
    notFound();
  }

  return (
    <main className="list-page">
      <section className="page-header">
        <p className="eyebrow">Tag</p>
        <h1>{tag}</h1>
        <p className="intro">共 {posts.length} 篇文章。</p>
      </section>

      <section className="posts-list">
        {posts.map((post) => (
          <Link className="post-card" href={`/posts/${post.slug}`} key={post.slug}>
            <p className="post-date">{post.publishedAt}</p>
            <h2>{post.title}</h2>
            <p>{post.summary}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}