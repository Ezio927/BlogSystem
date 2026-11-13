# Ezio's Blog

我的个人博客，基于 [XingHuiSama / XHBlogs](https://github.com/heiehiehi/XinghuisamaBlogs) 定制。公开阅读与本地写作后台分开运行。

- 博客：<https://47.101.37.232/blog>
- 本地博客：<http://127.0.0.1:3400/blog>
- 本地写作：<http://127.0.0.1:3401>，后台不开放公网

采用原版视觉和 Markdown 写作；关闭音乐、AI 日报及原作者的自动部署流程。右下角小鲸鱼使用 DeepSeek，只有手动发送聊天才调用模型。头像使用自己的本地素材。

## 启动

需要 Node.js 24 和 Python 3.10+。在项目根目录执行：

```bash
(cd XHBlogs && npm ci)
bash scripts/local-manager-setup.sh
bash scripts/prepare-blog.sh
bash scripts/start-blog.sh
```

另开终端运行 `python3 scripts/local-manager.py`。本机如需真实 AI 聊天，使用已有凭据入口启动博客：`api-run run deepseek -- bash -lc 'source ~/.config/wsl/proxy-env.sh; NODE_OPTIONS=--use-env-proxy bash scripts/start-blog.sh'`。不要在两个终端同时占用3400端口。没有密钥时阅读照常可用，聊天会提示暂不可用。

## 写作与更新

后台新建/编辑 → 保存草稿或发布加入待处理队列 → 更新本地 → 页面重载后同步 XHBlogs。Markdown 同步后刷新本地博客即可读取；站点配置修改需要构建重启。

上海 ECS 使用独立版本目录和现有 Nginx `/blog` 入口。执行 `bash scripts/prepare-blog.sh && bash scripts/publish-preview.sh` 更新；本地保存不等于公网更新。推送 GitHub 不触发部署。

- [完整使用与恢复](docs/usage.md)
- [公网、代理与服务器配置](docs/public-preview.md)
- [AI 小鲸鱼：人设、限额与密钥](docs/ai-companion.md)
- [维护交接与验证记录](docs/handoff.md)

## 来源与许可

保留 [CC BY-NC 4.0](LICENSE) 和原作者署名。小鲸鱼形象另遵循素材目录中的 CC BY-NC-SA 4.0 与署名说明；字体保留各自许可。壁纸等原版临时素材的说明见使用文档。

[原作者中文说明](docs/upstream-readme.zh.md)与[英文说明](docs/upstream-readme.en.md)作为历史来源保留，其中 Vercel、每日选刊及原始升级步骤不适用于此版本。

此仓库此前用于 BlogSystem 工作流验证；旧文件已由本博客替换，旧提交历史保留供恢复。
