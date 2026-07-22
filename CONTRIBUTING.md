# 开发指南

## 开始开发

1. 从最新 `dev` 创建功能、修复或文档新分支；
2. 每次开发前一定先拉取最新 `dev` 分支；
3. 尽可能保持每个分支和 Pull Request 只处理一个主题；
4. 提交前执行 `pnpm check`；
5. 至少由一名其他成员评审；
6. CI 通过后使用 squash merge。

阶段开发完成后，由 `dev` 向 `main` 发起发布 Pull Request。除紧急修复外，不从其他分支直接向 `main` 合并。

## 分支命名

采用 `feat/fix/docs/test/chore` 命名规范，举例如下：

- `feat/content-core`
- `fix/post-rendering`
- `docs/deployment`
- `test/frontmatter`
- `chore/ci`

## Commit 格式

采用 Conventional Commits，务必维护清晰的提交日志。常用类型（`feat/fix/docs/test/chore`）如下：

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
- 不提交密钥、本机私有配置或本机绝对路径；
- `pnpm check` 全部通过。
