import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { compile } from "@mdx-js/mdx";
import { NextResponse } from "next/server";

type CheckSeverity = "success" | "warning" | "error";

type CheckItem = {
  severity: CheckSeverity;
  scope: string;
  message: string;
  file?: string;
};

type ParsedFrontmatter = {
  data: Record<string, unknown>;
  body: string;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

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

function ensureInsideDirectory(parentDir: string, targetPath: string) {
  const resolvedParent = path.resolve(parentDir);
  const resolvedTarget = path.resolve(targetPath);
  const relativePath = path.relative(resolvedParent, resolvedTarget);

  return (
    relativePath.length > 0 &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
}

function parseScalarValue(rawValue: string): unknown {
  const value = rawValue.trim();

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (value === "") {
    return "";
  }

  return value;
}

function parseSimpleFrontmatter(fileContent: string): ParsedFrontmatter {
  if (!fileContent.startsWith("---\n") && !fileContent.startsWith("---\r\n")) {
    throw new Error("缺少 YAML frontmatter。");
  }

  const normalized = fileContent.replaceAll("\r\n", "\n");
  const closingIndex = normalized.indexOf("\n---\n", 4);

  if (closingIndex === -1) {
    throw new Error("frontmatter 未正确闭合。");
  }

  const yamlText = normalized.slice(4, closingIndex);
  const body = normalized.slice(closingIndex + "\n---\n".length);
  const lines = yamlText.split("\n");

  const data: Record<string, unknown> = {};
  let currentArrayKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (currentArrayKey && trimmed.startsWith("- ")) {
      const currentValue = data[currentArrayKey];

      if (Array.isArray(currentValue)) {
        currentValue.push(parseScalarValue(trimmed.slice(2)));
      }

      continue;
    }

    currentArrayKey = null;

    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1);

    if (!key) {
      continue;
    }

    if (rawValue.trim() === "") {
      data[key] = [];
      currentArrayKey = key;
      continue;
    }

    data[key] = parseScalarValue(rawValue);
  }

  return {
    data,
    body,
  };
}

function isValidDateText(value: string) {
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function pushRequiredStringCheck(
  checks: CheckItem[],
  data: Record<string, unknown>,
  key: string,
  file: string,
) {
  const value = data[key];

  if (typeof value !== "string" || !value.trim()) {
    checks.push({
      severity: "error",
      scope: "frontmatter",
      file,
      message: `${key} 不能为空，且必须是字符串。`,
    });
  }
}

async function checkMdxCompile(body: string, file: string, checks: CheckItem[]) {
  try {
    await compile(body, {
      outputFormat: "function-body",
      development: false,
    });
  } catch (error) {
    checks.push({
      severity: "error",
      scope: "mdx",
      file,
      message:
        error instanceof Error
          ? `MDX 编译失败：${error.message}`
          : "MDX 编译失败。",
    });
  }
}

export async function GET() {
  const checks: CheckItem[] = [];

  try {
    const workspaceRoot = await findWorkspaceRoot();
    const postsDir = path.resolve(workspaceRoot, "content", "posts");

    if (!(await pathExists(postsDir))) {
      return NextResponse.json({
        ok: false,
        summary: {
          errors: 1,
          warnings: 0,
          successes: 0,
          total: 1,
        },
        checks: [
          {
            severity: "error",
            scope: "workspace",
            message: "content/posts 目录不存在。",
          },
        ] satisfies CheckItem[],
      });
    }

    const entries = await readdir(postsDir, {
      withFileTypes: true,
    });

    const postFiles = entries
      .filter((entry) => entry.isFile())
      .filter((entry) => entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    if (postFiles.length === 0) {
      checks.push({
        severity: "warning",
        scope: "content",
        message: "content/posts 中暂无文章文件。",
      });
    }

    const slugToFiles = new Map<string, string[]>();

    for (const file of postFiles) {
      const targetPath = path.resolve(postsDir, file);

      if (!ensureInsideDirectory(postsDir, targetPath)) {
        checks.push({
          severity: "error",
          scope: "security",
          file,
          message: "文章路径越界。",
        });

        continue;
      }

      let content: string;

      try {
        content = await readFile(targetPath, "utf8");
      } catch (error) {
        checks.push({
          severity: "error",
          scope: "filesystem",
          file,
          message:
            error instanceof Error
              ? `读取文件失败：${error.message}`
              : "读取文件失败。",
        });

        continue;
      }

      let parsed: ParsedFrontmatter;

      try {
        parsed = parseSimpleFrontmatter(content);
      } catch (error) {
        checks.push({
          severity: "error",
          scope: "frontmatter",
          file,
          message:
            error instanceof Error ? error.message : "frontmatter 解析失败。",
        });

        continue;
      }

      const { data, body } = parsed;

      pushRequiredStringCheck(checks, data, "title", file);
      pushRequiredStringCheck(checks, data, "slug", file);
      pushRequiredStringCheck(checks, data, "summary", file);
      pushRequiredStringCheck(checks, data, "publishedAt", file);
      pushRequiredStringCheck(checks, data, "updatedAt", file);

      const slug = data.slug;

      if (typeof slug === "string" && slug.trim()) {
        if (!slugPattern.test(slug)) {
          checks.push({
            severity: "error",
            scope: "frontmatter",
            file,
            message: "slug 只能包含小写字母、数字和短横线。",
          });
        }

        const filenameSlug = file.replace(/\.(md|mdx)$/u, "");

        if (filenameSlug !== slug) {
          checks.push({
            severity: "warning",
            scope: "content",
            file,
            message: `文件名 slug「${filenameSlug}」与 frontmatter slug「${slug}」不一致。`,
          });
        }

        const files = slugToFiles.get(slug) ?? [];
        files.push(file);
        slugToFiles.set(slug, files);
      }

      const publishedAt = data.publishedAt;

      if (typeof publishedAt === "string" && !isValidDateText(publishedAt)) {
        checks.push({
          severity: "error",
          scope: "frontmatter",
          file,
          message: "publishedAt 必须是 YYYY-MM-DD 格式的有效日期。",
        });
      }

      const updatedAt = data.updatedAt;

      if (typeof updatedAt === "string" && !isValidDateText(updatedAt)) {
        checks.push({
          severity: "error",
          scope: "frontmatter",
          file,
          message: "updatedAt 必须是 YYYY-MM-DD 格式的有效日期。",
        });
      }

      if (!Array.isArray(data.tags)) {
        checks.push({
          severity: "error",
          scope: "frontmatter",
          file,
          message: "tags 必须是数组。",
        });
      } else {
        for (const tag of data.tags) {
          if (typeof tag !== "string" || !tag.trim()) {
            checks.push({
              severity: "error",
              scope: "frontmatter",
              file,
              message: "tags 中不能包含空值或非字符串值。",
            });

            break;
          }
        }
      }

      if (typeof data.draft !== "boolean") {
        checks.push({
          severity: "error",
          scope: "frontmatter",
          file,
          message: "draft 必须是 boolean。",
        });
      }

      if (!body.trim()) {
        checks.push({
          severity: "warning",
          scope: "content",
          file,
          message: "正文为空。",
        });
      } else {
        await checkMdxCompile(body, file, checks);
      }
    }

    for (const [slug, files] of slugToFiles.entries()) {
      if (files.length > 1) {
        checks.push({
          severity: "error",
          scope: "content",
          message: `slug「${slug}」重复：${files.join(", ")}。`,
        });
      }
    }

    const errors = checks.filter((check) => check.severity === "error").length;
    const warnings = checks.filter((check) => check.severity === "warning").length;

    if (errors === 0) {
      checks.unshift({
        severity: "success",
        scope: "content",
        message:
          warnings === 0
            ? `已校验 ${postFiles.length} 篇文章，未发现问题。`
            : `已校验 ${postFiles.length} 篇文章，未发现阻塞问题，但存在 ${warnings} 个警告。`,
      });
    }

    const successes = checks.filter((check) => check.severity === "success").length;

    return NextResponse.json({
      ok: errors === 0,
      summary: {
        errors,
        warnings,
        successes,
        total: checks.length,
        posts: postFiles.length,
      },
      checks,
    });
  } catch (error) {
    const fallbackChecks: CheckItem[] = [
      {
        severity: "error",
        scope: "system",
        message: error instanceof Error ? error.message : "校验失败。",
      },
    ];

    return NextResponse.json(
      {
        ok: false,
        summary: {
          errors: 1,
          warnings: 0,
          successes: 0,
          total: 1,
        },
        checks: fallbackChecks,
      },
      {
        status: 500,
      },
    );
  }
}