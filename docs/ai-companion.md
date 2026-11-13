# 博客 AI 小鲸鱼

公网 `XHBlogs/components/CyberCat.tsx` 现在是默认收起的“小鲸鱼”聊天伙伴。原本的 `coal` 组件入口名称保留以便接续布局；管理器的独立 CyberCat 与本地宠物没有修改。

点击右下角展开后可看本页最近8条消息、发送文字、收起或清空会话。摸摸和喂小鱼只产生本地反应；挂载、展开、挂机均不调用 AI。失败保留输入，点击“重试发送”重发相同问题。发送等待期间禁止重复提交和清空，仍可收起。会话不写 localStorage、Cookie、文件或数据库，刷新后清空；送出的对话内容由 DeepSeek 处理。回复始终以纯文本显示，无法执行返回的 HTML 或脚本。

## 服务端配置

只在运行 Web 的 Node 服务端提供以下环境变量；不要加 `NEXT_PUBLIC_` 前缀，不写入 Git 或浏览器配置：

| 变量 | 用途 |
| --- | --- |
| `DEEPSEEK_API_KEY` | 必需；未配置时聊天返回友好503，页面和本地互动照常工作。 |
| `DEEPSEEK_MODEL` | 可选，缺省 `deepseek-flash`。由服务器选择，客户端不能覆盖。 |
| `CHAT_ALLOWED_ORIGIN` | 对公网反向代理部署必须显式设为实际 origin，例如 `https://47.101.37.232`，不包含 `/blog` 路径。启动脚本默认使用 `http://127.0.0.1:$PORT`；单独运行 Next 时缺省使用请求 URL 的 origin，某些 Next 启动模式会把它归一为 localhost，因此用127.0.0.1访问时需显式配置。 |
| `CHAT_TRUST_PROXY` | 缺省关闭，所有访客共享本进程的本地额度。设为 `1` 时仅接受 `X-Real-IP` 中一个合法 IP；必须确保可信 Nginx 覆盖此头且客户端不能绕过代理访问 Node。 |

Nginx 应设置 `proxy_set_header X-Real-IP $remote_addr;`，不能使用客户端自带的 X-Real-IP。此实现不信任 `X-Forwarded-For` 来识别访客，也不使用 forwarded 头自建 Origin 白名单。来源检查是浏览器同源边界，不是登录认证；额度限制承担公开接口的成本保护。

接口是 `POST /blog/api/chat`，JSON：`{ "messages": [{ "role": "user", "content": "你好，小鲸鱼" }] }`，成功只返回 `{ "reply": "..." }`。只接受 user/assistant 文字消息，不接受客户端 system、工具、额外请求字段或工具参数。最多8条、每条1000个JS字符、总长6000字符且最后一条必须是 user；实际 UTF-8 请求体始终最多16KiB；客户端也按序列化UTF-8字节数裁剪完整旧回合，保留当前输入。请求必须有相符的 Origin、JSON 媒体类型，cross-site 请求拒绝；响应 `Cache-Control: no-store`。

固定通过原生 fetch 请求 `https://api.deepseek.com/chat/completions`，关闭 thinking 和流式传输，`max_tokens: 400`，30秒超时，不跟随上游重定向。系统性格在 `XHBlogs/lib/server/companionPersona.mjs`：傲2娇8、软萌短句，闲聊通常10–30字、整次尽量60字以内，认真求助尽量200字以内。每次显式提问正面回应，坦诚是AI，不假装认识访客、联网或操作本机。运行时不会读取私人角色文件、关系记忆、文章、工具或任何私人内容源，API key也不作为模型上下文。

本进程滚动额度：每访客6次/分钟及40次/小时，所有访客合计300次/24小时，最多3个并发上游请求。被受理的上游尝试（包括失败）消耗额度，因额度/并发拒绝的请求返回429和 `Retry-After`。重启会重置计数，多个实例各自计数；这不是分布式账单上限。上游错误、响应格式错误与超时均转换为简短中文提示，不把密钥、原始错误、上游响应体或本机路径返回访客，也不记录聊天日志。

本机 WSL 沿用已有 `api-run` 加密配置和代理，不需要在源码中复制 key。已配置该环境时，可从仓库根启动：

```sh
api-run run deepseek -- bash -lc 'source ~/.config/wsl/proxy-env.sh; NODE_OPTIONS=--use-env-proxy bash scripts/start-blog.sh'
```

需要 Node 支持 `--use-env-proxy`；该选项只使既有代理环境对原生fetch生效，不更改官方 API 地址。服务器可直接访问官方接口时不需要代理。`scripts/start-blog.sh` 默认设置本地端口对应的 Origin；公网运行必须保留服务器显式配置的 `CHAT_ALLOWED_ORIGIN`，不应使用本地缺省值。单独 `next start` 的本地短测请设 `CHAT_ALLOWED_ORIGIN=http://127.0.0.1:<端口>`。

## 角色素材

只复制原素材 `idle.png`、`blink.png`、`worry.png` 到 `XHBlogs/public/pets/little-whale/`，没有改写源素材。保留原 `NOTICE-PC2005.txt`，界面中有直接署名链接。角色为社区二创形象，非 DeepSeek 官方形象；素材沿用 CC BY-NC-SA 4.0，不因代码许可改变为 MIT。出处与详细署名见公开 NOTICE。此实现仅做 CSS 展示，没有新增衍生图片或视频处理。

## 本地检查

从 `XHBlogs` 目录运行：

```sh
node --test lib/companionSession.test.mjs lib/server/companionChat.test.mjs
npx eslint components/CyberCat.tsx lib/companionSession.mjs lib/companionSession.test.mjs lib/server/companionChat.mjs lib/server/companionChat.test.mjs lib/server/companionPersona.mjs app/api/chat/route.ts
npx tsc --noEmit
npm run build -- --webpack
```

单元测试全部使用假 key 和离线上游替身，不会访问官方接口。检查实际字节流、来源/消息限制、超时、错误脱敏、所有额度窗口、并发释放和短上下文裁剪。

生产服务启动后，从仓库根运行独立 `tests/browser-companion.cjs`。它 mock 显式聊天请求以检查首屏无调用、摸摸/喂食无调用、纯文本回复、失败重试、上下文边界、清空/收起保留、桌面/手机适配与图片加载；另对真实本地接口发送应在调用上游前被拒绝的请求。设置 `CHAT_HTTP_WITHOUT_KEY=1` 可额外确认未配置 key 的503，真实有key服务不要开启此选项。

```sh
BLOG_BASE_URL=http://127.0.0.1:3480/blog node tests/browser-companion.cjs
```

浏览器沿用本机已有 Playwright Core/Chromium；可用 `PLAYWRIGHT_MODULE` 和 `CHROMIUM_EXECUTABLE` 指定路径。结果与截图写入忽略的 `artifacts/companion-*`。单独实现worktree保留旧layout的hidden-md外层，只有该worktree短测可设置 `COMPANION_REVEAL_MOBILE=1` 解除该测试页面中的外层隐藏；最终正式布局由集成人移除此外层，默认浏览器测试应不需要此选项。

需要真实调用时使用 `BLOG_BASE_URL=https://47.101.37.232/blog node tests/browser-companion-live.cjs`；它会明确发送一次真实消息并保留桌面/手机截图，正常验收不要反复运行以免无谓消耗。
