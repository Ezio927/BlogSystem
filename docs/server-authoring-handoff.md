# 服务器写作交接 · 2026-11-16

## 当前入口与唯一内容源

用户批准将后台迁至 ECS，经私网在本机访问，发布后公网直接读取。应用候选 `d6c0b64`（此前部署脚本 `0e4f22a`、应用集成 `acb1268`），后续文档/浏览器验收提交不改变应用。

- 公网：<https://47.101.37.232/blog>
- 私网写作：Tailscale 在线时运行 `bash scripts/connect-manager.sh`，然后打开 <http://127.0.0.1:3401/drafts>。
- SSH 别名 `shanghai` 实际目标是 `100.76.66.55`。WSL 的 `ezio-blog-manager-tunnel` tmux 会话已维持3401/3402转发；本机端口监听进程是ssh，不是本地编辑器。
- ECS公开程序：`~/apps/ezio-blog/releases/20261116T065651Z-d6c0b64`，tmux `ezio-blog-preview`，监听Tailscale3400。
- ECS后台：`~/apps/ezio-blog/manager-releases/20261116T065718Z-d6c0b64`，tmux `ezio-blog-manager`，生产Node与单个Python API只监听127.0.0.1的3401/3402。
- 两端使用 `~/apps/ezio-blog/content`。Python `EZIO_CMS_ROOT` 与Node `XHBLOGS_CONTENT_ROOT` 指向这里；`EZIO_CMS_MODE=server` 开启直接发布。静态配置只读、旧同步/队列关闭。

正常写作：保存草稿 → 富文本区查看排版 → 发布到博客/更新公开文章 → 公网刷新。仍无独立公网样式草稿预览页。静态站点配置需修改代码并构建，不会被描述为即时生效。

## 数据迁移与恢复

迁移前停止本机后台。原本地文章/配置/草稿及恢复副本完整备份在：

`/home/ezio/.local/share/ezio-blog/migrations/20261116T153743/`

内有原始两端内容、原服务器内容包、`content-manifest.json` 与合并后副本。服务器迁移前备份在 `~/apps/ezio-blog/migration-backups/20261116/`。

合并没有内容冲突。2篇已发布文章（欢迎页和用户刚发布的Landscape）与3篇草稿已迁移，41个文件逐一SHA256对比一致。Landscape公网实际200，其他三稿及私有JSON路径404。原有本机文件均保留，尤其原未跟踪 `my-blog-manager/posts/portfolio-20261116-landscape-ai-editing.md` 没有被覆盖、删除或代为提交。

本机标记 `~/.config/ezio-blog/server-authoring`（0600）防止误启动旧写入源；正常入口改用隧道。标记可在明确恢复时撤销，或用 `EZIO_ALLOW_LOCAL_MANAGER=1` 在隔离环境启动旧后台；不要与服务器并行写同一批内容。

程序与内容分离：两个publish脚本只上传程序；公开部署必须设置持久根。回退程序也保留该环境变量，不能重新使用release里附带的旧示例文章。恢复内容前先停止后台、备份迁移后新增数据，再选择需要恢复的具体文件。不要把整个迁移快照覆盖回去而丢弃新写作。

## 验证与审查

Sol独立工作区 `/home/ezio/worktrees/EzioBlog/server-authoring` 完成应用，提交 `044eba2`、`a35af8a`；主上下文集成、备份迁移、运行脚本与真实部署。两端webpack生产构建及tsc通过；16项Python测试、后台10路由standalone检查、公网tree动态/草稿/符号链接检查、32项公共lib测试通过。复用同一候选构建产物，部署前确认standalone依赖为实体目录，无越界符号链接。

Astra独立审查初版发现：发布提交后的草稿清理异常被误报失败；后台中文slug未解码；公网tree仍静态。三项在a35af8a修复，独立复核16项Python及两套runtime检查通过，无新增阻断。发布后清理失败返回成功+warning；仅同内容且未并发变化的残留草稿可协调新版本，真正并发编辑仍冲突。

真实浏览器验收脚本 `tests/browser-server-authoring.cjs` 通过私网隧道写入并读取公网，使用独立临时文章并在最后核验标题后清除。证据在 `artifacts/server-authoring/`；最新结果以 `browser-result.json` 为准。验收不调用DeepSeek或变更真实用户文章。

最终真实浏览器闭环通过：保存私有草稿/404、刷新重开、直接发布、公网阅读、编辑已发布文章并刷新、模拟发布失败保留草稿并重试、旧版本冲突、跨站Origin拒绝、旧sync拒绝、灵境动态响应和只读配置。0页面JS错误，临时文章已清除。首轮只因把灵境的悬停标题当作常驻文本而误判，修正测试选择器后通过；没有为该误判修改产品代码。截图已实际查看。

最终HTTP：首页、Landscape文章、灵境及另一Landscape产品均200；其他原草稿、私有JSON路径和公网editor均404。服务器监听确认3401/3402仅回环。验收后原始41个迁移文件仍逐一hash一致，新增仅验收过程的私有恢复副本；原本地未跟踪文章也保持原字节。两端runtime检查已加入GitHub check任务，CI不调用线上服务或模型。

## 维护限制

- 服务器pip在线源无法取得包，已从本机下载wheels上传到专用 `manager-wheels`，离线安装到 `manager-venv`，pip check通过。未升级本项目声明依赖，未修改系统Python/Node。
- 服务仍通过tmux运行，服务器重启后不会自动启动；本机隧道断开不影响服务器进程。
- 本次未改Nginx、服务器安全组、DNS、共享daemon、其他产品或模型凭据。后台未加入公网代理。
- 现有全库lint债务未扩大为重构；草稿卡片摘要仍可能显示原HTML标签，属于既有展示问题。
- 本轮额外人工介入0次。没有调用DeepSeek工程Worker或产品模型；Sol负责应用，Astra独立审查，主上下文负责集成与运行验证。

日常操作与发布/恢复命令见 [usage.md](usage.md)。后续维护先核对服务器content，不能把本地旧posts/草稿当作最新源。
