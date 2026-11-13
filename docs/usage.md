# Ezio's Blog：本地写作与临时预览

本项目直接采用 XHBlogs 0.4.5 的原版界面。旧 BlogSystem 已归档为工作流验证记录，不是本博客的代码基础。每日选刊展示、管理入口和 Agent 接收已关闭；小鲸鱼使用已有 DeepSeek API 凭据；写作后台不调用公开聊天服务。音乐已关闭；右下角小鲸鱼使用 DeepSeek，只有手动发送才调用。评论暂不启用。

## 首次准备与启动

需要 Node.js 20.9+、Python 3.10+。当前 WSL 使用已有 Node 24；不修改系统 Node。

```bash
cd /home/ezio/projects/EzioBlog
(cd XHBlogs && npm ci)
bash scripts/local-manager-setup.sh
bash scripts/prepare-blog.sh
bash scripts/start-blog.sh
```

博客：<http://127.0.0.1:3400/blog>。另开终端启动后台：

```bash
cd /home/ezio/projects/EzioBlog
python3 scripts/local-manager.py
```

后台：<http://127.0.0.1:3401>，Python API 仅监听127.0.0.1:3402。启动脚本会在退出时停止自己的两个子进程；端口冲突会明确退出，不会停止其他服务。

## 写作和发布

沿用原版后台队列操作：新建或编辑文章 → 保存草稿 → 在富文本编辑区检查排版 → 点击发布加入待处理队列 → 顶栏待处理操作中「更新本地」 →「同步 XHBlogs」并确认。

- 原版编辑器是所见即所得的富文本界面，可粘贴 Markdown；目前没有独立的“与公开页完全一致”草稿预览按钮。编辑页隐藏悬浮播放器和宠物，避免遮挡保存/发布。
- 草稿保存在 `my-blog-manager/manager_data/drafts/`，不进入公开博客。
- 后台的 `posts/`、`chatters/` 是编辑来源，`XHBlogs/` 是同步输出；避免两边分别修改同一篇文章。
- 同步不会先删除整个目标目录；覆盖前保留恢复副本。过期编辑会报冲突，重新打开最新内容再编辑。
- 成功同步后刷新本地博客即可读取新文章/更新正文；无需为 Markdown 更新重新构建。站点配置、相册/友链等 TypeScript 数据变更仍需重新执行构建并重启博客。
- 后台「同步 XHBlogs」不上传服务器。ECS 更新是下一步独立操作，避免把本地保存误认为上线。

## 上海 ECS 临时预览

已追加独立公网 HTTPS 临时入口，具体地址、启动和停止方法见 [公网预览说明](public-preview.md)。下述 Tailscale 地址仍用于私网访问；后台保持本地运行。

使用已有 SSH 别名 `shanghai`。博客单独放在 `~/apps/ezio-blog/`，使用独立 Node 二进制、版本目录和 `ezio-blog-preview` tmux 会话，只绑定服务器 Tailscale IPv4 的3400端口。管理后台、私有草稿、凭据不会上传。新增 Nginx 的 `/blog` 入口，复用现有80/443及证书；不更改其他应用路由、DNS或安全组。

```bash
cd /home/ezio/projects/EzioBlog
bash scripts/prepare-blog.sh
bash scripts/publish-preview.sh
```

命令最后输出公网和源站地址。公网入口为 https://47.101.37.232/blog，无需 Tailscale；源站私网地址需要 Tailscale 权限。

当前地址：<http://100.76.66.55:3400/blog>。若代理返回502，让该私网地址绕过代理；命令行可用 `curl --noproxy '*' http://100.76.66.55:3400/blog` 排查。已为上海 ECS 添加精确 DIRECT 规则，并在 WSL 增加代理绕过，备份与恢复见公网说明。预览由 tmux 保持，未配置服务器重启后自动启动；本地后台同样依赖 WSL 持续运行。

停止临时预览：`ssh shanghai 'tmux kill-session -t ezio-blog-preview'`。恢复上一版时读取服务器 `~/apps/ezio-blog/previous-release`，将 `current` 链接切回对应目录，以 `runtime/node-<对应版本目录名>` 和同一 Tailscale 监听地址重启该会话；版本目录保留，不自动清理。首次部署没有上一版，停止会话即可撤销访问。

## 许可、个性信息和限制

代码沿用 CC BY-NC 4.0，保留作者来源和修改说明；大肥鱼动画另有 CC BY-NC-SA 4.0，字体包含 SIL OFL 许可。参考壁纸和头像仍作为临时预览素材，未对所有第三方素材作独立授权核验；正式公开前应换成自己的素材或确认授权。没有冒用原作者的联系方式或备案号。

站名为「Ezio's Blog」。音乐卡片、播放器、导航、设置查询及API均关闭；旧音乐路径返回404。小鲸鱼的人设、频率限制和服务端配置见 [AI说明](ai-companion.md)。原版的全量 lint 债务单独记录，不代表类型检查或生产构建被跳过。

## 项目仓库与旧测试项目

正式源码仓库使用 https://github.com/Ezio927/BlogSystem；当前开发目录仍为 `/home/ezio/projects/EzioBlog`。仓库名称沿用旧测试项目，但默认分支文件已整体替换，原Git历史保留。推送代码不会触发服务器部署。

旧本地主检出与22个worktree已移到 `/home/ezio/archives/blogsystem-retired-20261113/`，未提交内容完整保留并验证；旧预览进程已停止。不要再从旧路径启动测试博客，恢复方法在归档README。旧Harness项目未修改。

本地更新配置或代码时，先停止旧博客Node再构建、重启。`api-run`跨Windows/WSL启动时，关闭tmux可能仍留下Node子进程；用 `ss -ltnp 'sport = :3400'` 核对监听PID及其 `/proc/<PID>/cwd`，只对属于本博客的进程发送SIGTERM，确认端口释放后启动。不要停止其他项目进程。
