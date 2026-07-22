# ADR 0005：Docker-first 部署

## 状态

已接受

## 决定

V1 首先支持 Docker 自托管，Caddy/Nginx 负责反向代理和 TLS。

## 原因

目标团队已有阿里云服务器，容器部署也便于其他服务器用户复用。

## 后果

Vercel 等平台是后续适配器，不阻塞 V1。
