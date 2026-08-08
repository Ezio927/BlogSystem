import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import { writeFileAtomic } from "../../../../lib/file-system";
import { assertPathInsideDirectory, configRoot } from "../../../../lib/paths";

export const runtime = "nodejs";

type SiteSocialLink = {
  label: string;
  url: string;
};

type SiteConfig = {
  name: string;
  description: string;
  author: string;
  avatar?: string;
  socials: SiteSocialLink[];
};

const siteConfigPath = path.join(configRoot, "site.json");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRequiredString(
  data: Record<string, unknown>,
  key: string,
): string {
  const value = data[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} 不能为空。`);
  }

  return value.trim();
}

function normalizeOptionalString(
  data: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = data[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized === "" ? undefined : normalized;
}

function isProbablyValidUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeSocials(value: unknown): SiteSocialLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const socials: SiteSocialLink[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const label = typeof item.label === "string" ? item.label.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";

    if (label === "" && url === "") {
      continue;
    }

    if (label === "") {
      throw new Error("社交链接名称不能为空。");
    }

    if (url === "") {
      throw new Error(`社交链接「${label}」的 URL 不能为空。`);
    }

    if (!isProbablyValidUrl(url)) {
      throw new Error(`社交链接「${label}」的 URL 必须是 http 或 https 地址。`);
    }

    socials.push({
      label,
      url,
    });
  }

  return socials;
}

function normalizeSiteConfig(value: unknown): SiteConfig {
  if (!isRecord(value)) {
    throw new Error("站点配置必须是一个 JSON 对象。");
  }

  const name = normalizeRequiredString(value, "name");
  const description = normalizeRequiredString(value, "description");
  const author = normalizeRequiredString(value, "author");
  const avatar = normalizeOptionalString(value, "avatar");
  const socials = normalizeSocials(value.socials);

  if (name.length > 80) {
    throw new Error("博客名称不能超过 80 个字符。");
  }

  if (description.length > 200) {
    throw new Error("简介不能超过 200 个字符。");
  }

  if (author.length > 80) {
    throw new Error("作者名称不能超过 80 个字符。");
  }

  if (avatar && avatar.length > 500) {
    throw new Error("头像地址不能超过 500 个字符。");
  }

  if (socials.length > 20) {
    throw new Error("社交链接不能超过 20 个。");
  }

  return {
    name,
    description,
    author,
    avatar,
    socials,
  };
}

async function readSiteConfig(): Promise<SiteConfig> {
  assertPathInsideDirectory(configRoot, siteConfigPath);

  const raw = await readFile(siteConfigPath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  return normalizeSiteConfig(parsed);
}

export async function GET() {
  try {
    const config = await readSiteConfig();

    return NextResponse.json({
      ok: true,
      config,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "读取站点配置失败。",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    assertPathInsideDirectory(configRoot, siteConfigPath);

    const body: unknown = await request.json();
    const config = normalizeSiteConfig(body);

    const jsonText = `${JSON.stringify(config, null, 2)}\n`;

    await writeFileAtomic(siteConfigPath, jsonText);

    return NextResponse.json({
      ok: true,
      config,
      message: "站点配置已保存。",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "保存站点配置失败。",
      },
      {
        status: 400,
      },
    );
  }
}