# Ezio's Blog 公网访问

当前入口：<https://47.101.37.232/blog>。也可以输入 <http://47.101.37.232/blog>，会跳转 HTTPS。复用服务器现有、可验证的 IP 证书，无需购买域名。`/blog/` 会由 Next.js 规范为 `/blog`。

## 入口与更新

现有 Nginx 的 HTTP/HTTPS server 各增加一个博客 snippet include，只有 `/blog` 及其子路径进入博客。源站继续绑定 `100.76.66.55:3400`，保留 `/blog` 前缀。源码对应配置在 `deploy/nginx/`。没有更改 Landscape 路由、Tailscale Vault 入口、DNS 或安全组。博客代理不转发其他应用的 Cookie/Authorization，并覆盖 X-Real-IP 供聊天限流使用；本机写作后台3401/3402没有上传。

```bash
cd /home/ezio/projects/EzioBlog
bash scripts/prepare-blog.sh
bash scripts/publish-preview.sh
```

更新保留每个发布目录及 previous-release。无需重启 Nginx。未配置博客进程开机自启；服务器重启后需按 `docs/usage.md` 恢复博客进程。后台同步仅更新本地，上传仍需以上命令。

旧 Cloudflare Quick Tunnel 因实际出现断线而停用；不要再使用历史随机域名或运行 `scripts/start-public-preview.sh`。旧二进制保留用于历史恢复，不再是当前入口。502 的确切单次原因无法从用户截图外推：已观察到隧道断线，但本机改规则前的 ECS 实测也已走国内 IP DIRECT。

## 本机直连与恢复

Clash Verge 全局扩展脚本增加精确规则 `IP-CIDR,47.101.37.232/32,DIRECT,no-resolve`，并热加载当前运行配置，不重启代理。实测连接命中该规则且链为 DIRECT。Windows 系统代理设置不变；这条规则让经过 Clash 的 ECS 流量直接连接上海。

WSL `~/.config/wsl/proxy-env.sh` 同时为 `no_proxy`/`NO_PROXY` 添加 `47.101.37.232` 和 `100.76.66.55`；新终端自动加载，旧终端执行 `source ~/.config/wsl/proxy-env.sh`。实测 HTTPS 连接远端 IP 为47.101.37.232、HTTP200、TLS验证成功。

修改前的四个文件保存在 `~/.config/wsl/backups/ezio-blog-direct-20261113-193302/`，权限受限且不入 Git。`restore-paths.json` 记录原路径：WSL脚本、Windows Clash全局 `profiles/Script.js`、生成的 `clash-verge.yaml` 和服务的 `runtime/config.yaml`。恢复时依据映射复制回原位置，再通过 Clash Verge 重新加载配置；若之后已有其他设置变更，优先只移除本次精确 IP 规则和 WSL 两项绕过，避免用旧备份覆盖新设置。备份含已有代理凭据，不应分享或提交。

Nginx 的修改前文件及恢复指令记录在最新交接；回滚新入口时还需搭配回滚到旧根路径版本，否则旧隧道根地址不能读取新 `/blog` 构建。

## 保留限制

当前 IP 是临时使用入口，不是自有域名；实际大陆移动网络未单独验收。上海源站公开网站的备案要求不会因使用 IP 而自动免除，未声称已完成备案。既有说明见 [阿里云备案介绍](https://help.aliyun.com/zh/icp-filing/basic-icp-service/user-guide/icp-filing-application-overview)。

音乐现已完整关闭，旧接口及页面返回404，不再查询上游。生产依赖剩余4项 low；全量 lint 的116 errors/78 warnings 是既有债务，未将其描述为全部通过。素材授权与本地写作限制见 `docs/usage.md`。

## 小鲸鱼服务端配置

服务器凭据文件为 `~/apps/ezio-blog/private/chat.env`，目录0700、文件0600，位于发布目录和Git之外。来自本机已有 `api-run` DeepSeek 加密运行副本，经SSH标准输入传输，未写入命令行、构建包或日志。发布脚本由每版本Node通过 `--env-file-if-exists` 加载；文件不存在时博客仍能阅读，但聊天不可用。`CHAT_ALLOWED_ORIGIN=https://47.101.37.232`，`CHAT_TRUST_PROXY=1` 配合Nginx覆盖的 `X-Real-IP`。只配置非公开环境变量，不使用NEXT_PUBLIC密钥。

需要停用真实聊天时，将该文件移到私有备份位置，重新启动博客进程即可；恢复后同样重启。轮换密钥通过已有凭据管理入口完成，勿粘贴到聊天或提交到仓库。当前进程内限额在应用重启时重置，具体限额见AI说明。
