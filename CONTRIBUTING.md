# 贡献指南

## 开始开发

1. 从最新 `main` 创建分支；
2. 保持每个分支和 Pull Request 只处理一个主题；
3. 提交前执行 `pnpm check`；
4. 至少由一名其他成员评审；
5. CI 通过后使用 squash merge。

## 分支命名

- `feat/content-core`
- `fix/post-rendering`
- `docs/deployment`
- `test/frontmatter`
- `chore/ci`

## Commit 格式

采用 Conventional Commits：

- `feat: add post metadata parser`
- `fix: reject invalid post slug`
- `docs: clarify Docker deployment`
- `test: cover draft filtering`
- `chore: update CI`

## 公共接口

修改文章格式、共享类型、扩展接口或部署协议前，需在 Issue 或 ADR 中说明兼容性影响，并由三名成员共同确认。

## 完成定义

- 功能满足对应验收条件；
- 新逻辑有相称的测试；
- 文档同步更新；
- 不提交密钥或本机绝对路径；
- `pnpm check` 全部通过。
