import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import type {
  AdjacentPosts,
  ArchiveGroup,
  Post,
  PostMeta,
  TagItem
} from "@open-blog/shared-types";

import { parsePostFrontmatter } from "./frontmatter";
import {
  assertUniqueSlugs,
  getAdjacentPosts as queryAdjacentPosts,
  getAllPostMetas as queryAllPostMetas,
  getAllPostMetasIncludingDrafts as queryAllPostMetasIncludingDrafts,
  getAllPostSlugs as queryAllPostSlugs,
  getAllPostSlugsIncludingDrafts as queryAllPostSlugsIncludingDrafts,
  getAllPostsIncludingDrafts as queryAllPostsIncludingDrafts,
  getAllTags as queryAllTags,
  getArchiveGroups as queryArchiveGroups,
  getDraftPostMetas as queryDraftPostMetas,
  getDraftPosts as queryDraftPosts,
  getPostBySlug as queryPostBySlug,
  getPostBySlugIncludingDrafts as queryPostBySlugIncludingDrafts,
  getPostsByTag as queryPostsByTag,
  getPublishedPosts
} from "./queries";

export type ContentServiceOptions = {
  postsRoot: string;
};

export type ContentService = {
  /**
   * 获取已发布文章。
   *
   * 注意：为了兼容 Web 端现有行为，这里不包含 draft。
   */
  getAllPosts: () => Post[];

  /**
   * 获取已发布文章元数据。
   */
  getAllPostMetas: () => PostMeta[];

  /**
   * 根据 slug 获取已发布文章。
   */
  getPostBySlug: (slug: string) => Post | null;

  /**
   * 获取包含草稿在内的全部文章。
   *
   * 主要给 Studio 管理端使用。
   */
  getAllPostsIncludingDrafts: () => Post[];

  /**
   * 获取包含草稿在内的全部文章元数据。
   *
   * 主要给 Studio 管理端使用。
   */
  getAllPostMetasIncludingDrafts: () => PostMeta[];

  /**
   * 获取草稿文章。
   */
  getDraftPosts: () => Post[];

  /**
   * 获取草稿文章元数据。
   */
  getDraftPostMetas: () => PostMeta[];

  /**
   * 根据 slug 获取文章，包含草稿。
   *
   * 主要给 Studio 管理端使用。
   */
  getPostBySlugIncludingDrafts: (slug: string) => Post | null;

  getPostsByTag: (tag: string) => Post[];
  getAllTags: () => TagItem[];
  getArchiveGroups: () => ArchiveGroup[];
  getAdjacentPosts: (slug: string) => AdjacentPosts;
  getAllPostSlugs: () => string[];

  /**
   * 获取包含草稿在内的全部 slug。
   *
   * 主要给 Studio 管理端静态路由使用。
   */
  getAllPostSlugsIncludingDrafts: () => string[];

  validateContent: () => void;
};

function getPostFileNames(postsRoot: string): string[] {
  if (!fs.existsSync(postsRoot)) {
    return [];
  }

  return fs
    .readdirSync(postsRoot)
    .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"))
    .sort((a, b) => a.localeCompare(b));
}

function readPostFile(postsRoot: string, fileName: string): Post {
  const filePath = path.join(postsRoot, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return parsePostFrontmatter(data, content, fileName);
}

function readAllPosts(postsRoot: string): Post[] {
  const posts = getPostFileNames(postsRoot).map((fileName) =>
    readPostFile(postsRoot, fileName)
  );

  assertUniqueSlugs(posts);

  return posts;
}

export function createContentService(
  options: ContentServiceOptions
): ContentService {
  const { postsRoot } = options;

  function getAllParsedPosts(): Post[] {
    return readAllPosts(postsRoot);
  }

  return {
    getAllPosts() {
      return getPublishedPosts(getAllParsedPosts());
    },

    getAllPostMetas() {
      return queryAllPostMetas(getAllParsedPosts());
    },

    getPostBySlug(slug: string) {
      return queryPostBySlug(getAllParsedPosts(), slug);
    },

    getAllPostsIncludingDrafts() {
      return queryAllPostsIncludingDrafts(getAllParsedPosts());
    },

    getAllPostMetasIncludingDrafts() {
      return queryAllPostMetasIncludingDrafts(getAllParsedPosts());
    },

    getDraftPosts() {
      return queryDraftPosts(getAllParsedPosts());
    },

    getDraftPostMetas() {
      return queryDraftPostMetas(getAllParsedPosts());
    },

    getPostBySlugIncludingDrafts(slug: string) {
      return queryPostBySlugIncludingDrafts(getAllParsedPosts(), slug);
    },

    getPostsByTag(tag: string) {
      return queryPostsByTag(getAllParsedPosts(), tag);
    },

    getAllTags() {
      return queryAllTags(getAllParsedPosts());
    },

    getArchiveGroups() {
      return queryArchiveGroups(getAllParsedPosts());
    },

    getAdjacentPosts(slug: string) {
      return queryAdjacentPosts(getAllParsedPosts(), slug);
    },

    getAllPostSlugs() {
      return queryAllPostSlugs(getAllParsedPosts());
    },

    getAllPostSlugsIncludingDrafts() {
      return queryAllPostSlugsIncludingDrafts(getAllParsedPosts());
    },

    validateContent() {
      getAllParsedPosts();
    }
  };
}