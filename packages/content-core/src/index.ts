import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const postMetadataSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().trim().min(1),
  publishedAt: z.string().date(),
  updatedAt: z.string().date().optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
  cover: z.string().optional(),
  draft: z.boolean().default(true),
});

export type PostMetadata = z.infer<typeof postMetadataSchema>;

export interface Post {
  metadata: PostMetadata;
  content: string;
  sourcePath: string;
}

export function parsePost(source: string, sourcePath = "unknown.md"): Post {
  const parsed = matter(source);
  return {
    metadata: postMetadataSchema.parse(parsed.data),
    content: parsed.content.trim(),
    sourcePath,
  };
}

export async function listPosts(
  directory: string,
  options: { includeDrafts?: boolean } = {},
): Promise<Post[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map(async (entry) => {
      const sourcePath = path.join(directory, entry.name);
      return parsePost(await readFile(sourcePath, "utf8"), sourcePath);
    });

  return (await Promise.all(files))
    .filter((post) => options.includeDrafts || !post.metadata.draft)
    .sort((a, b) => b.metadata.publishedAt.localeCompare(a.metadata.publishedAt));
}
