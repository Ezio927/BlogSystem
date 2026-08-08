import { getAllPostSlugs, getPostBySlug } from "../../lib/posts";

const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
);

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getAllPosts() {
  return getAllPostSlugs()
    .map((slug) => getPostBySlug(slug))
    .filter((post) => post !== null);
}

export function GET(): Response {
  const posts = getAllPosts();

  const items = posts
    .map((post) => {
      const postUrl = `${siteUrl}/posts/${post.slug}`;

      return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${postUrl}</link>
  <guid>${postUrl}</guid>
  <description>${escapeXml(post.summary)}</description>
  <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
</item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Open Blog</title>
    <link>${siteUrl}</link>
    <description>Open Blog RSS Feed</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}