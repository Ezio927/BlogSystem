# 本地开发

## 环境

使用 Node.js 22+。项目通过根目录 `packageManager` 字段固定 pnpm 版本。

```powershell
corepack enable
pnpm install
pnpm dev
```

## 端口

- Web：3000
- Studio：3001

Studio 开发命令显式绑定 `127.0.0.1`。如需局域网联调，必须临时、明确地修改监听地址，并确认防火墙策略。

## 质量检查

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

## 开发优先级

1. 固定文章 schema；
2. 实现内容解析与查询；
3. 实现公开页面；
4. 实现 Studio 写入；
5. 实现安全的 Git 发布；
6. 完成 Docker 自动部署。
