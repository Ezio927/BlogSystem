import { access, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

type UpdatePostPayload = {
  title?: unknown;
  summary?: unknown;
  publishedAt?: unknown;
  updatedAt?: unknown;
  cover?: unknown;
  tags?: unknown;
  draft?: unknown;
  content?: unknown;
};

async function pathExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function getTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function assertSafeSlug(slug: string) {
  if (!slug) {
    throw new Error("Slug is required.");
  }

  if (
    slug.includes("/") ||
    slug.includes("\\") ||
    slug.includes("..") ||
    path.isAbsolute(slug)
  ) {
    throw new Error("Invalid slug.");
  }
}

function getPostsDirectory() {
  /**
   * 兼容两种启动位置：
   *
   * 1. 从 monorepo 根目录启动：
   *    process.cwd() = BlogSystem
   *    content/posts
   *
   * 2. 从 apps/studio 启动：
   *    process.cwd() = BlogSystem/apps/studio
   *    ../../content/posts
   */
  const cwd = process.cwd();

  if (cwd.endsWith(path.join("apps", "studio"))) {
    return path.resolve(cwd, "../../content/posts");
  }

  return path.resolve(cwd, "content/posts");
}

function assertPathInsideDirectory(parentDirectory: string, filePath: string) {
  const resolvedParentDirectory = path.resolve(parentDirectory);
  const resolvedFilePath = path.resolve(filePath);
  const relativePath = path.relative(resolvedParentDirectory, resolvedFilePath);

  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Invalid post file path.");
  }
}

async function getExistingPostFilePath(postsDirectory: string, slug: string) {
  const mdFilePath = path.join(postsDirectory, `${slug}.md`);
  const mdxFilePath = path.join(postsDirectory, `${slug}.mdx`);

  assertPathInsideDirectory(postsDirectory, mdFilePath);
  assertPathInsideDirectory(postsDirectory, mdxFilePath);

  const mdExists = await pathExists(mdFilePath);
  const mdxExists = await pathExists(mdxFilePath);

  if (mdExists && mdxExists) {
    throw new Error(
      `存在重复的文章文件：${slug}.md 和 ${slug}.mdx。请先删除其中一个。`,
    );
  }

  if (mdxExists) {
    return mdxFilePath;
  }

  if (mdExists) {
    return mdFilePath;
  }

  throw new Error(`文章文件不存在：${slug}.md 或 ${slug}.mdx`);
}

function yamlString(value: string) {
  return JSON.stringify(value);
}

function serializePostToMarkdown(input: {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  cover: string;
  tags: string[];
  draft: boolean;
  content: string;
}) {
  const frontmatterLines: string[] = [];

  frontmatterLines.push(`title: ${yamlString(input.title)}`);
  frontmatterLines.push(`slug: ${yamlString(input.slug)}`);

  if (input.summary) {
    frontmatterLines.push(`summary: ${yamlString(input.summary)}`);
  }

  if (input.publishedAt) {
    frontmatterLines.push(`publishedAt: ${yamlString(input.publishedAt)}`);
  }

  if (input.updatedAt) {
    frontmatterLines.push(`updatedAt: ${yamlString(input.updatedAt)}`);
  }

  if (input.cover) {
    frontmatterLines.push(`cover: ${yamlString(input.cover)}`);
  }

  if (input.tags.length > 0) {
    frontmatterLines.push("tags:");

    for (const tag of input.tags) {
      frontmatterLines.push(`  - ${yamlString(tag)}`);
    }
  } else {
    frontmatterLines.push("tags: []");
  }

  frontmatterLines.push(`draft: ${input.draft ? "true" : "false"}`);

  return `---\n${frontmatterLines.join("\n")}\n---\n\n${input.content.trim()}\n`;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const decodedSlug = decodeURIComponent(slug);

    assertSafeSlug(decodedSlug);

    const payload = (await request.json()) as UpdatePostPayload;

    const title = getString(payload.title);
    const summary = getString(payload.summary);
    const publishedAt = getString(payload.publishedAt);
    const updatedAt = getString(payload.updatedAt);
    const cover = getString(payload.cover);
    const tags = getTags(payload.tags);
    const draft = getBoolean(payload.draft);
    const content = typeof payload.content === "string" ? payload.content : "";

    if (!title) {
      return NextResponse.json(
        {
          message: "标题不能为空。",
        },
        {
          status: 400,
        },
      );
    }

    const postsDirectory = getPostsDirectory();
    const filePath = await getExistingPostFilePath(postsDirectory, decodedSlug);

    const markdown = serializePostToMarkdown({
      slug: decodedSlug,
      title,
      summary,
      publishedAt,
      updatedAt,
      cover,
      tags,
      draft,
      content,
    });

    await writeFile(filePath, markdown, "utf8");

    return NextResponse.json({
      ok: true,
      slug: decodedSlug,
      filePath,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "保存文章失败。",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const decodedSlug = decodeURIComponent(slug);

    assertSafeSlug(decodedSlug);

    const postsDirectory = getPostsDirectory();
    const filePath = await getExistingPostFilePath(postsDirectory, decodedSlug);

    assertPathInsideDirectory(postsDirectory, filePath);

    await unlink(filePath);

    return NextResponse.json({
      ok: true,
      slug: decodedSlug,
      filePath,
      message: "文章已删除。",
    });
  } catch (error) {
    console.error(error);

    const message = error instanceof Error ? error.message : "删除文章失败。";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      {
        status: message.includes("文章文件不存在") ? 404 : 500,
      },
    );
  }
}