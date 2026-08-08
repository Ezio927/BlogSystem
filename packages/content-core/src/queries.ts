import type {
  AdjacentPosts,
  ArchiveGroup,
  Post,
  PostMeta,
  TagItem
} from "@open-blog/shared-types";

import { DuplicateSlugError } from "./errors";

export function toPostMeta(post: Post): PostMeta {
  return {
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    tags: post.tags,
    cover: post.cover,
    draft: post.draft,
    sourceFile: post.sourceFile
  };
}

export function sortPostsByPublishedAtDesc<T extends { publishedAt: string }>(
  posts: T[]
): T[] {
  return [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function sortPostsByPublishedAtAsc<T extends { publishedAt: string }>(
  posts: T[]
): T[] {
  return [...posts].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
}

export function assertUniqueSlugs(posts: Post[]): void {
  const slugMap = new Map<string, string[]>();

  for (const post of posts) {
    const existingFiles = slugMap.get(post.slug) ?? [];
    slugMap.set(post.slug, [...existingFiles, post.sourceFile]);
  }

  const duplicatedSlugs = Array.from(slugMap.entries()).filter(
    ([, files]) => files.length > 1
  );

  if (duplicatedSlugs.length === 0) {
    return;
  }

  const detail = duplicatedSlugs
    .map(([slug, files]) => `${slug}: ${files.join(", ")}`)
    .join("; ");

  throw new DuplicateSlugError(detail);
}

export function getPublishedPosts(posts: Post[]): Post[] {
  return sortPostsByPublishedAtDesc(posts.filter((post) => !post.draft));
}

export function getAllPostsIncludingDrafts(posts: Post[]): Post[] {
  return sortPostsByPublishedAtDesc(posts);
}

export function getAllPostMetasIncludingDrafts(posts: Post[]): PostMeta[] {
  return getAllPostsIncludingDrafts(posts).map(toPostMeta);
}

export function getDraftPosts(posts: Post[]): Post[] {
  return sortPostsByPublishedAtDesc(posts.filter((post) => post.draft));
}

export function getDraftPostMetas(posts: Post[]): PostMeta[] {
  return getDraftPosts(posts).map(toPostMeta);
}

export function getPostBySlugIncludingDrafts(
  posts: Post[],
  slug: string
): Post | null {
  return getAllPostsIncludingDrafts(posts).find((post) => post.slug === slug) ?? null;
}

export function getAllPostSlugsIncludingDrafts(posts: Post[]): string[] {
  return getAllPostsIncludingDrafts(posts).map((post) => post.slug);
}

export function getAllPostMetas(posts: Post[]): PostMeta[] {
  return getPublishedPosts(posts).map(toPostMeta);
}

export function getPostBySlug(posts: Post[], slug: string): Post | null {
  return getPublishedPosts(posts).find((post) => post.slug === slug) ?? null;
}

export function getPostsByTag(posts: Post[], tag: string): Post[] {
  return getPublishedPosts(posts).filter((post) => post.tags.includes(tag));
}

export function getAllTags(posts: Post[]): TagItem[] {
  const tagMap = new Map<string, number>();

  for (const post of getPublishedPosts(posts)) {
    for (const tag of post.tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

export function getArchiveGroups(posts: Post[]): ArchiveGroup[] {
  const groupMap = new Map<string, PostMeta[]>();

  for (const post of getPublishedPosts(posts)) {
    const year = post.publishedAt.slice(0, 4);
    const postsInYear = groupMap.get(year) ?? [];

    groupMap.set(year, [...postsInYear, toPostMeta(post)]);
  }

  return Array.from(groupMap.entries())
    .map(([year, postsInYear]) => ({
      year,
      posts: sortPostsByPublishedAtDesc(postsInYear)
    }))
    .sort((a, b) => b.year.localeCompare(a.year));
}

export function getAdjacentPosts(posts: Post[], slug: string): AdjacentPosts {
  const publishedPosts = getPublishedPosts(posts);
  const currentIndex = publishedPosts.findIndex((post) => post.slug === slug);

  if (currentIndex === -1) {
    return {
      previous: null,
      next: null
    };
  }

  return {
    previous: publishedPosts[currentIndex + 1]
      ? toPostMeta(publishedPosts[currentIndex + 1])
      : null,
    next: publishedPosts[currentIndex - 1]
      ? toPostMeta(publishedPosts[currentIndex - 1])
      : null
  };
}

export function getAllPostSlugs(posts: Post[]): string[] {
  return getPublishedPosts(posts).map((post) => post.slug);
}