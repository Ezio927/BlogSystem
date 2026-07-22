# ADR 0001：使用 Next.js

## 状态

已接受

## 决定

公网 Web 与本地 Studio 均使用 Next.js App Router、React 和 TypeScript。

## 原因

团队可以共享技术栈、类型和 UI 能力，且 Next.js 同时支持服务端渲染、静态生成和容器部署。

## 后果

两个应用需要独立构建；框架升级必须经过 CI 和兼容性验证。
