# Open Blog

一个本地优先、面向具备基础开发和部署能力用户的开源个人博客系统。博客拥有者在本地 Studio 编辑内容，通过 Git 管理版本，并将公开博客部署到自己的 Docker 服务器。

> 当前处于早期开发阶段。项目名称、配置格式和公共 API 在 V1 前可能调整。

## 项目目标

- 公网博客与本地管理器分离；
- Markdown 内容维护一份，前台与 Studio 共同读取；
- 本地编辑、预览和发布，管理器不暴露到公网；
- Docker 优先部署，并为后续部署适配器保留接口；
- 用户内容、公开配置和秘密配置相互分离。

详细范围见 [需求文档](docs/requirements.md)，技术边界见 [架构文档](docs/architecture.md)。

## 仓库结构

```text
apps/web              公网博客
apps/studio           本地内容管理器
packages/content-core 内容模型与读取能力
packages/feature-api  可选功能扩展契约
packages/shared-types 公共类型
packages/ui           共享 UI
content               唯一的用户内容源
config                公开站点配置
deploy                Docker 与反向代理示例
docs                  需求、架构和协作文档
```

## 环境要求

- Node.js 22+
- Corepack（Node.js 自带）
- Git
- Docker Desktop 或 Docker Engine（仅部署时需要）

## 本地开发

```powershell
corepack enable
pnpm install
pnpm dev
```

- 公网博客：<http://localhost:3000>
- 本地 Studio：<http://localhost:3001>

执行全部质量检查：

```powershell
pnpm check
```

## 开发流程

日常开发从 `dev` 创建短生命周期分支，通过 Pull Request 合并回 `dev`；阶段版本再由 `dev` 合并到 `main`。禁止直接向两个长期分支推送功能代码，具体约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 部署

V1 以 Docker 自托管为主要目标。当前容器配置是可验证的基础模板，生产部署细节见 [部署文档](docs/deployment.md)。

## 路线图

V1 优先完成“编辑 → 预览 → Git 发布 → Docker 公网访问”的闭环。

## License

[MIT](LICENSE)
