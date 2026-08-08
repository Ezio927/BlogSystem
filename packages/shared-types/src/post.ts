export type PostFrontmatter = {
  title: string;
  slug: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  cover?: string;
  draft: boolean;
};

export type Post = PostFrontmatter & {
  content: string;
  sourceFile: string;
};

export type PostMeta = PostFrontmatter & {
  sourceFile: string;
};

export type TagItem = {
  name: string;
  count: number;
};

export type ArchiveGroup = {
  year: string;
  posts: PostMeta[];
};

export type AdjacentPosts = {
  previous: PostMeta | null;
  next: PostMeta | null;
};