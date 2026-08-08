import type { Post, PostFrontmatter } from "@open-blog/shared-types";

import { PostFrontmatterError } from "./errors";

type RawFrontmatter = Record<string, unknown>;

const legacyFields = ["date", "excerpt", "published"];

function isRecord(value: unknown): value is RawFrontmatter {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
  frontmatter: RawFrontmatter,
  key: keyof PostFrontmatter,
  fileName: string
): string {
  const value = frontmatter[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new PostFrontmatterError(fileName, `缺少有效的 ${key}`);
  }

  return value.trim();
}

function normalizeDateField(
  frontmatter: RawFrontmatter,
  key: "publishedAt" | "updatedAt",
  fileName: string
): string {
  const value = frontmatter[key];
  let normalizedValue: string;

  if (value instanceof Date) {
    normalizedValue = value.toISOString().slice(0, 10);
  } else if (typeof value === "string") {
    normalizedValue = value.trim();
  } else {
    throw new PostFrontmatterError(fileName, `缺少有效的 ${key}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    throw new PostFrontmatterError(
      fileName,
      `${key} 格式无效，应为 YYYY-MM-DD，当前值为：${normalizedValue}`
    );
  }

  return normalizedValue;
}

function normalizeTags(value: unknown, fileName: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new PostFrontmatterError(fileName, "tags 必须是字符串数组");
  }

  return Array.from(
    new Set(
      value
        .map((tag) => {
          if (typeof tag !== "string") {
            throw new PostFrontmatterError(fileName, "tags 中的每一项都必须是字符串");
          }

          return tag.trim();
        })
        .filter((tag) => tag.length > 0)
    )
  );
}

function normalizeCover(value: unknown, fileName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new PostFrontmatterError(fileName, "cover 必须是字符串");
  }

  const cover = value.trim();

  if (cover === "") {
    return undefined;
  }

  if (cover.includes("\\") || cover.includes("..")) {
    throw new PostFrontmatterError(fileName, "cover 不能包含反斜杠或上级目录路径");
  }

  if (!cover.startsWith("/uploads/")) {
    throw new PostFrontmatterError(
      fileName,
      "cover 必须使用 /uploads/ 开头，例如 /uploads/hello-world.webp"
    );
  }

  return cover;
}

function normalizeDraft(value: unknown, fileName: string): boolean {
  if (typeof value !== "boolean") {
    throw new PostFrontmatterError(fileName, "draft 必须是 boolean");
  }

  return value;
}

function assertNoLegacyFields(frontmatter: RawFrontmatter, fileName: string): void {
  const usedLegacyFields = legacyFields.filter((field) => field in frontmatter);

  if (usedLegacyFields.length > 0) {
    throw new PostFrontmatterError(
      fileName,
      `检测到旧字段 ${usedLegacyFields.join(
        ", "
      )}，请改用 V1 schema：summary、publishedAt、updatedAt、draft`
    );
  }
}

function normalizeSlug(value: string, fileName: string): string {
  const slug = value.trim();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new PostFrontmatterError(
      fileName,
      `slug 格式无效，当前值为 ${slug}。请使用小写字母、数字和连字符，例如 hello-world`
    );
  }

  return slug;
}

export function parsePostFrontmatter(
  rawFrontmatter: unknown,
  content: string,
  fileName: string
): Post {
  if (!isRecord(rawFrontmatter)) {
    throw new PostFrontmatterError(fileName, "frontmatter 必须是对象");
  }

  assertNoLegacyFields(rawFrontmatter, fileName);

  const title = readRequiredString(rawFrontmatter, "title", fileName);
  const slug = normalizeSlug(
    readRequiredString(rawFrontmatter, "slug", fileName),
    fileName
  );
  const summary = readRequiredString(rawFrontmatter, "summary", fileName);
  const publishedAt = normalizeDateField(rawFrontmatter, "publishedAt", fileName);
  const updatedAt = normalizeDateField(rawFrontmatter, "updatedAt", fileName);
  const tags = normalizeTags(rawFrontmatter.tags, fileName);
  const cover = normalizeCover(rawFrontmatter.cover, fileName);
  const draft = normalizeDraft(rawFrontmatter.draft, fileName);
  const normalizedContent = content.trim();

  if (normalizedContent === "") {
    throw new PostFrontmatterError(fileName, "正文内容不能为空");
  }

  return {
    title,
    slug,
    summary,
    publishedAt,
    updatedAt,
    tags,
    cover,
    draft,
    content: normalizedContent,
    sourceFile: fileName
  };
}