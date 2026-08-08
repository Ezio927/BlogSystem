import fs from "node:fs";
import path from "node:path";

import { configRoot } from "./paths";

export type SiteSocialLink = {
  label: string;
  url: string;
};

export type SiteConfig = {
  name: string;
  description: string;
  author: string;
  avatar?: string;
  socials: SiteSocialLink[];
};

const sitePath = path.join(configRoot, "site.json");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
  data: Record<string, unknown>,
  key: string,
  fileName: string
): string {
  const value = data[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fileName} 缺少有效的 ${key}`);
  }

  return value.trim();
}

function readOptionalString(
  data: Record<string, unknown>,
  key: string
): string | undefined {
  const value = data[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue === "" ? undefined : normalizedValue;
}

function readSocials(value: unknown): SiteSocialLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => {
      const label = typeof item.label === "string" ? item.label.trim() : "";
      const url = typeof item.url === "string" ? item.url.trim() : "";

      return {
        label,
        url
      };
    })
    .filter((item) => item.label !== "" && item.url !== "");
}

export function getSiteConfig(): SiteConfig {
  if (!fs.existsSync(sitePath)) {
    throw new Error(`找不到站点配置文件：${sitePath}`);
  }

  const raw = fs.readFileSync(sitePath, "utf8");
  const parsedData: unknown = JSON.parse(raw);

  if (!isRecord(parsedData)) {
    throw new Error("config/site.json 必须是一个 JSON 对象");
  }

  return {
    name: readRequiredString(parsedData, "name", "config/site.json"),
    description: readRequiredString(parsedData, "description", "config/site.json"),
    author: readRequiredString(parsedData, "author", "config/site.json"),
    avatar: readOptionalString(parsedData, "avatar"),
    socials: readSocials(parsedData.socials)
  };
}