# Ezio's Blog：服务器写作与私网访问

## 日常写作

内容源与后台都运行在上海 ECS。公网只提供阅读：<https://47.101.37.232/blog>。后台和 Python API 分别只监听服务器 `127.0.0.1:3401`、`127.0.0.1:3402`。

连接已有 Tailscale，在 WSL 中执行：

```bash
cd /home/ezio/projects/EzioBlog
bash scripts/connect-manager.sh
```

保持终端打开，在浏览器访问 <http://127.0.0.1:3401/drafts>。现有 `shanghai` SSH 别名指向 Tailscale `100.76.66.55`；SSH 同时转发两个端口，只绑定本机回环地址。断开隧道不停止服务器。若提示本机端口被占用，先核对已有隧道，不要再次启动旧本地后台。

1. 新建或打开文章，编辑标题、摘要、标签和正文。
2. 「存为草稿」只保存到服务器私有草稿目录；刷新后可以重开。
3. 在富文本编辑区检查排版；这是现有的所见即所得预览，不是公网样式的独立预览页。
4. 点击发布或更新公开文章。成功后刷新公网文章即可看到变化，不需要待处理队列、更新本地、同步 XHBlogs 或上传服务器。

文章、杂谈、关于以及说说是动态内容。站点主题/标识、相册、友链、项目等编译期配置目前需代码更新和构建，服务器后台会显示只读说明。音乐、AI 日报、评论仍保持关闭。

## 内容位置与边界

服务器根目录：`~/apps/ezio-blog/`。

| 路径 | 用途 |
| --- | --- |
| `content/posts`、`content/chatters`、`content/moments` | 唯一已发布内容源 |
| `content/app/about/about.md` | 关于页面正文 |
| `content/manager_data/drafts` | 私有草稿，不在静态资源目录 |
| `content/manager_data/recovery` | 覆盖/删除前的恢复副本 |
| `current` → `releases/<版本>` | 公网阅读程序 |
| `manager-current` → `manager-releases/<版本>` | 私有写作程序 |
| `manager-venv`、`manager-wheels` | 专用 Python 环境及离线依赖 |
| `private/chat.env` | 公网小鲸鱼的服务端凭据，不上传 Git |

阅读程序通过 `XHBLOGS_CONTENT_ROOT` 读取 `content`，后台通过 `EZIO_CMS_ROOT` 写入同一个目录。应用发布不复制本机文章到此目录，也不替换其中的草稿。保存保留原子替换、内容版本冲突检查和覆盖前副本；两个旧页面同时编辑时，后保存的旧版本会被拒绝。

后台保留 Host/Origin 检查，SSH 隧道复用现有本机 Origin。没有新增公网管理路由、密码登录页面或 Nginx 后台代理。

## 程序更新

这些是维护命令，日常发表文章不需要执行。

```bash
# 公开阅读程序
bash scripts/prepare-blog.sh
bash scripts/publish-preview.sh

# 私有后台程序
bash scripts/prepare-manager.sh
bash scripts/publish-manager.sh
```

构建需要本机 Node 24 和已安装的依赖。公开程序与后台分别保留前一版本路径：`previous-release`、`previous-manager-release`。`publish-preview.sh` 要求持久内容已存在；缺少时拒绝发布，不会用仓库示例文章重新初始化。

服务器无法从当前在线 pip 源取得包，因此后台使用上传的 wheels 离线安装。若以后确实修改 Python 依赖，先在兼容的 Linux/Python 3.12 环境下载依赖到独立目录，再上传 `manager-wheels`；不要上传 `.venv` 或凭据。当前 requirements 未因迁移升级。

## 运行、停止与恢复

服务器 tmux 会话：`ezio-blog-preview`（公开阅读）、`ezio-blog-manager`（私有后台）。后台由专用 Python supervisor 启动生产 Node 和单个 Uvicorn 进程；Ctrl+C 会终止其两个子进程组。

```bash
# 仅停止后台，不影响阅读；等待3401/3402释放后再启动
ssh shanghai 'tmux send-keys -t ezio-blog-manager C-c'
```

重新发布当前程序可恢复服务。若回滚程序，先读取对应 `previous-*` 文件并确认目标存在，再停止该应用、切换相应 current 链接并用该版本 Node 启动。**阅读程序回滚时仍必须设置 `XHBLOGS_CONTENT_ROOT=$HOME/apps/ezio-blog/content`**；程序回滚不回滚文章。后台启动使用其 release 内 `server-manager.py`，同时设置 `EZIO_MANAGER_NODE` 为对应 `runtime/manager-node-<版本>`。

进程持续独立于本机隧道运行，但目前仍使用 tmux，尚未配置服务器重启后的自动启动。服务器重启后需恢复这两个服务。

本机旧数据与服务器迁移前内容已备份，精确位置见交接。`~/.config/ezio-blog/server-authoring` 标记使 `scripts/local-manager.py` 拒绝误启动。`EZIO_ALLOW_LOCAL_MANAGER=1` 仅用于明确的隔离测试或恢复，不应与服务器后台并行写作；标记不是删除本机数据。

## 来源与保留限制

博客采用 XHBlogs，旧 BlogSystem 工作流原型已归档。保留原项目 CC BY-NC 4.0、素材各自署名与许可；小鲸鱼形象使用 CC BY-NC-SA 4.0，字体保留许可证。原版背景素材尚未逐项独立核验授权。没有恢复原作者的自动部署、AI 日报或音乐功能。

全库 lint 的历史问题仍见交接，生产构建不跳过类型检查。公网 AI 的人设、限额和凭据说明见 [AI 小鲸鱼](ai-companion.md)；本次迁移没有改变它的模型或额度配置。
