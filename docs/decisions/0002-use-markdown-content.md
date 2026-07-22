# ADR 0002：使用 Markdown 作为内容源

## 状态

已接受

## 决定

文章正文使用 Markdown，元数据使用 YAML frontmatter，并存储在 Git 仓库中。

## 原因

内容便于迁移、审查、版本管理和静态构建，不需要数据库。

## 后果

需要稳定 schema、迁移策略和安全的 Markdown 渲染规则。
