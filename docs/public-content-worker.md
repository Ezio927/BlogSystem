# 公共内容读取回归测试记录

对象：`XHBlogs/lib/publicContent.mjs` 的 `readPublicMarkdown(collection, slug, root)` 与 `listPublicFiles(collection, root)`。

测试文件：`XHBlogs/lib/publicContent.test.mjs`（`node:test`，真实文件系统，每个用例使用 `mkdtemp` 独立临时目录并在 `t.after` 中递归清理）。

运行：

```bash
cd XHBlogs && node --test lib/publicContent.test.mjs
```

结果（2026-11-13）：12 个用例全部通过，0 失败，退出码 0；临时目录清理后无残留。

覆盖范围：

- 已发布内容（posts、chatters）原样返回并出现在列表中。
- 缺失 slug、空/空白、含空格、路径穿越（`../`、`sub/`）、`./..`、非字符串 slug 返回 null；未知/非法 collection 返回 null 或空列表；collection 目录缺失时安全返回。
- 中文及其他 Unicode slug 可读可列。
- `draft: true`（布尔）与 `draft: "true"` / `'true'`（字符串）在读取与列表中均不暴露。
- draft 目录既不能作为 collection 访问，也不能通过嵌套路径或同名 slug 读到。
- 符号链接 Markdown 文件、作为 collection 的符号链接目录、collection 内的符号链接目录项均被拒绝，且不出现在列表中。
- 同一进程内修改文件后立即读到新内容（无缓存/无需重启），发布状态切换即时生效。
- 非 Markdown（`.txt`、`.png`、`.markdown`、大写 `.MD`、隐藏 `.hidden.md`）不进入列表。

产品缺陷：未发现。实现按预期拒绝符号链接与草稿，未修改生产源码。
