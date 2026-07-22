# 系统架构

## 1. 上下文

```text
博客拥有者                        GitHub                         公网访客
┌──────────────┐        push     ┌──────────────┐     deploy    ┌──────────────┐
│ Local Studio │ ──────────────→ │ Repository   │ ────────────→ │ Docker Web   │
│ 127.0.0.1    │                 │ CI/CD        │               │ Caddy/HTTPS  │
└──────┬───────┘                 └──────────────┘               └──────────────┘
       │ read/write
       ▼
┌──────────────┐
│ content/     │
│ config/      │
└──────────────┘
```

## 2. 代码边界

- `apps/web`：只负责公开展示，不包含本地管理权限；
- `apps/studio`：本地管理界面，后续负责内容写入和发布编排；
- `packages/content-core`：文章模型、校验、排序和查询；
- `packages/feature-api`：可选能力契约与插槽名称；
- `packages/shared-types`：跨应用稳定类型；
- `packages/ui`：无业务状态的共享组件；
- `content`：用户内容唯一事实来源；
- `config`：可公开的站点配置；
- `.env`：不得提交的秘密配置。

## 3. 内容模型

文章由 YAML frontmatter 和 Markdown 正文组成。V1 元数据：

```yaml
---
title: "文章标题"
slug: "hello-world"
summary: "文章摘要"
publishedAt: "2026-07-22"
updatedAt: "2026-07-22"
tags:
  - Next.js
cover: "/uploads/hello-world.webp"
draft: false
---
```

`slug` 是公开 URL 的稳定标识。重命名 slug 属于可能破坏外部链接的操作。

## 4. 扩展边界

V1 不实现动态插件加载。`feature-api` 仅定义稳定契约：

- `CommentProvider`
- `ImageStorageProvider`
- `AnalyticsProvider`
- `DeployProvider`
- `FeatureSlot`

预留插槽：`aside`、`player`、`global-effect`、`comments` 和 `footer`。扩展不得直接修改内容解析规则，也不得默认获得文件系统或部署凭据。

## 5. 安全边界

- Studio 仅监听 `127.0.0.1`；
- Web 构建产物不包含服务器或 Git 密钥；
- GitHub Actions 凭据使用 Repository Secrets；
- 文件操作必须解析并校验目标路径仍位于博客工作区；
- 外部命令使用参数数组，禁止拼接未经校验的 shell 字符串；
- Markdown 中的原始 HTML 默认不受信任。

## 6. 部署边界

V1 采用 Docker-first：Web 构建为独立容器，由 Caddy/Nginx 提供 TLS 和反向代理。部署自动化后续通过 `DeployProvider` 编排，不进入内容核心。

## 7. 可观测性与失败处理

- CI 输出 lint、类型检查、测试和构建日志；
- Web 暴露健康检查端点；
- 发布流程分阶段报告状态；
- 写文件使用临时文件和原子替换策略；
- Git push 失败不得删除或覆盖本地内容。
