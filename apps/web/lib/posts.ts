import { createContentService } from "@open-blog/content-core";

import { postsRoot } from "./paths";

const contentService = createContentService({
  postsRoot
});

export const getAllPosts = contentService.getAllPosts;
export const getAllPostMetas = contentService.getAllPostMetas;
export const getPostBySlug = contentService.getPostBySlug;
export const getPostsByTag = contentService.getPostsByTag;
export const getAllTags = contentService.getAllTags;
export const getArchiveGroups = contentService.getArchiveGroups;
export const getAdjacentPosts = contentService.getAdjacentPosts;
export const getAllPostSlugs = contentService.getAllPostSlugs;

export type {
  AdjacentPosts,
  ArchiveGroup,
  Post,
  PostMeta,
  TagItem
} from "@open-blog/content-core";