import {
  createContentService,
  type ArchiveGroup,
  type Post,
  type PostMeta,
  type TagItem
} from "@open-blog/content-core";

import { postsRoot } from "./paths";

const contentService = createContentService({
  postsRoot
});

export const getAllPosts = contentService.getAllPosts;
export const getAllPostMetas = contentService.getAllPostMetas;
export const getPostBySlug = contentService.getPostBySlug;

export const getAllPostsIncludingDrafts =
  contentService.getAllPostsIncludingDrafts;

export const getAllPostMetasIncludingDrafts =
  contentService.getAllPostMetasIncludingDrafts;

export const getDraftPosts = contentService.getDraftPosts;
export const getDraftPostMetas = contentService.getDraftPostMetas;

export const getPostBySlugIncludingDrafts =
  contentService.getPostBySlugIncludingDrafts;

export const getPostsByTag = contentService.getPostsByTag;
export const getAllTags = contentService.getAllTags;
export const getArchiveGroups = contentService.getArchiveGroups;
export const getAdjacentPosts = contentService.getAdjacentPosts;
export const getAllPostSlugs = contentService.getAllPostSlugs;

export const getAllPostSlugsIncludingDrafts =
  contentService.getAllPostSlugsIncludingDrafts;

export const validateContent = contentService.validateContent;

export type { ArchiveGroup, Post, PostMeta, TagItem };