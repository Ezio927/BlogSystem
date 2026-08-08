import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

type CreatePostPayload = {
  title?: unknown;
  slug?: unknown;
  summary?: unknown;
  publishedAt?: unknown;
  updatedAt?: unknown;
  cover?: unknown;
  tags?: unknown;
  draft?: unknown;
  content?: unknown;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function pathExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findWorkspaceRoot() {
  let current = process.cwd();

  while (true) {
    const contentPostsPath = path.join(current, "content", "posts");

    if (await pathExists(contentPostsPath)) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      throw new Error("无法定位工作区根目录：未找到 content/posts。");
    }

    current = parent;
  }
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeYamlString(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function formatYamlString(value: string) {
  return `"${escapeYamlString(value)}"`;
}

function buildPostFile(payload: {
  title: string;
  slug: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  cover: string;
  tags: string[];
  draft: boolean;
  content: string;
}) {
  const frontmatterLines = [
    "---",
    `title: ${formatYamlString(payload.title)}`,
    `slug: ${formatYamlString(payload.slug)}`,
    `summary: ${formatYamlString(payload.summary)}`,
    `publishedAt: ${formatYamlString(payload.publishedAt)}`,
    `updatedAt: ${formatYamlString(payload.updatedAt)}`,
    "tags:",
    ...payload.tags.map((tag) => `  - ${formatYamlString(tag)}`),
    `cover: ${formatYamlString(payload.cover)}`,
    `draft: ${payload.draft ? "true" : "false"}`,
    "---",
    "",
  ];

  const normalizedContent = payload.content.trimEnd();

  return `${frontmatterLines.join("\n")}${normalizedContent}\n`;
}

export async function POST(request: NextRequest) {
  let body: CreatePostPayload;

  try {
    body = (await request.json()) as CreatePostPayload;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "请求体不是合法 JSON。",
      },
      {
        status: 400,
      },
    );
  }

  const title = toStringValue(body.title);
  const slug = toStringValue(body.slug);
  const summary = toStringValue(body.summary);
  const publishedAt = toStringValue(body.publishedAt);
  const updatedAt = toStringValue(body.updatedAt);
  const cover = toStringValue(body.cover);
  const tags = parseTags(body.tags);
  const draft = typeof body.draft === "boolean" ? body.draft : true;
  const content = typeof body.content === "string" ? body.content : "";

  if (!title) {
    return NextResponse.json(
      {
        ok: false,
        message: "标题不能为空。",
      },
      {
        status: 400,
      },
    );
  }

  if (!slug) {
    return NextResponse.json(
      {
        ok: false,
        message: "Slug 不能为空。",
      },
      {
        status: 400,
      },
    );
  }

  if (!slugPattern.test(slug)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Slug 只能包含小写字母、数字和短横线，例如：my-first-post。",
      },
      {
        status: 400,
      },
    );
  }

  if (!content.trim()) {
    return NextResponse.json(
      {
        ok: false,
        message: "正文内容不能为空。",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const workspaceRoot = await findWorkspaceRoot();
    const postsDir = path.resolve(workspaceRoot, "content", "posts");
    const targetPath = path.resolve(postsDir, `${slug}.mdx`);

    const relativePath = path.relative(postsDir, targetPath);

    if (
      relativePath.startsWith("..") ||
      path.isAbsolute(relativePath) ||
      !targetPath.startsWith(`${postsDir}${path.sep}`)
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "非法文章路径。",
        },
        {
          status: 400,
        },
      );
    }

    if (await pathExists(targetPath)) {
      return NextResponse.json(
        {
          ok: false,
          message: `文章 ${slug}.mdx 已存在。`,
        },
        {
          status: 409,
        },
      );
    }

    await mkdir(postsDir, {
      recursive: true,
    });

    const fileContent = buildPostFile({
      title,
      slug,
      summary,
      publishedAt,
      updatedAt,
      cover,
      tags,
      draft,
      content,
    });

    await writeFile(targetPath, fileContent, {
      encoding: "utf8",
      flag: "wx",
    });

    return NextResponse.json({
      ok: true,
      slug,
      message: "文章创建成功。",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "文章创建失败。",
      },
      {
        status: 500,
      },
    );
  }
}

