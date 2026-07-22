# Docker 部署

当前部署文件用于验证 Web 应用能够容器化运行。域名、TLS、镜像仓库和自动发布将在部署迭代中进一步完善。

## 本地构建

```powershell
docker compose -f deploy/compose.yaml build
docker compose -f deploy/compose.yaml up -d
```

默认通过 <http://localhost:8080> 访问 Caddy。

## 生产环境前置条件

- 具有公网 IP 的服务器；
- Docker Engine 与 Compose；
- 安全组和防火墙开放 80/443；
- 域名 DNS 指向服务器（正式 HTTPS 推荐）；
- CI 使用的部署凭据保存在 GitHub Secrets。

## 备份

至少备份：

- `content/`
- `config/`
- `public/uploads/`
- 未提交的本地草稿

Git 不能替代未提交内容和外部图片资源的备份。
