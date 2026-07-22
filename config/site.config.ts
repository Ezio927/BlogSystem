import type { SiteConfig } from "@open-blog/shared-types";

export const siteConfig = {
  title: "Open Blog",
  description: "一个本地优先的个人博客",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  language: "zh-CN",
  author: {
    name: "博客作者",
    bio: "在这里填写个人简介。",
    avatar: "/avatar.svg",
  },
  socialLinks: [],
  features: {
    search: false,
    comments: false,
    analytics: false,
  },
} satisfies SiteConfig;
