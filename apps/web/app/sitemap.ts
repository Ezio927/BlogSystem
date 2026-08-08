import type { MetadataRoute } from "next";

import { getAllPostSlugs, getPostBySlug } from "../lib/posts";

const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
);

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function getAllPosts() {
  return getAllPostSlugs()
    .map((slug) => getPostBySlug(slug))
    .filter((post) => post !== null);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

  const tags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort(
    (a, b) => a.localeCompare(b)
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: `${siteUrl}/posts`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${siteUrl}/tags`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7
    }
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/posts/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8
  }));

  const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${siteUrl}/tags/${encodeURIComponent(tag)}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6
  }));

  return [...staticRoutes, ...postRoutes, ...tagRoutes];
}