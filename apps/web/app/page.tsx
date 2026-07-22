import path from "node:path";
import Link from "next/link";
import { listPosts } from "@open-blog/content-core";
import { siteConfig } from "../../../config/site.config";

export default async function HomePage() {
  const postsDirectory = path.resolve(process.cwd(), "../../content/posts");
  const posts = await listPosts(postsDirectory);

  return (
    <>
      <section className="hero">
        <p className="eyebrow">{siteConfig.author.name}</p>
        <h1>{siteConfig.title}</h1>
        <p>{siteConfig.description}</p>
      </section>
      <section>
        <h2>最新文章</h2>
        <div className="post-list">
          {posts.map(({ metadata }) => (
            <article className="post-card" key={metadata.slug}>
              <time dateTime={metadata.publishedAt}>{metadata.publishedAt}</time>
              <h3><Link href={`/posts/${metadata.slug}`}>{metadata.title}</Link></h3>
              <p>{metadata.summary}</p>
              <ul className="tags">
                {metadata.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
