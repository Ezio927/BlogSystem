# Ezio 博客采用交接 · 2026-11-13

## 2026-11-13 晚：个人头像、关闭音乐、DeepSeek 小鲸鱼与仓库采用（当前依据）

用户授权替换头像、完整关闭音乐、使用已有 DeepSeek API 与大肥鱼全局人设/桌宠素材增加博客聊天，并以正式博客替换 GitHub `Ezio927/BlogSystem` 当前内容，清理旧本地测试项目。本次从 `b1cd6ef` 继续，最终应用候选 **`2aee5168ff2502c01e43c4c31d5a496f181becb2`**，后续交接/发布快照提交不改变应用；用 `git rev-parse HEAD` 获取当前仓库提交。

### 当前使用

- 公网 **https://47.101.37.232/blog**，服务版本 `20261113T111824Z-2aee516`，构建ID `z_0Yw4YsCpAZu0J6vA-5a`。本地 http://127.0.0.1:3400/blog、写作后台 http://127.0.0.1:3401 均仍运行，后台未上传。
- `/mnt/e/project/头像2.jpg` 原样复制到两端 `public/avatar.jpg`，头像/favicon一致。公网文件SHA256 `d73c0a4cfd4e63fc76c432ac471fdd8851ba20bd7fd2a7aa94cbd11648241d81` 与原图一致。
- 两端音乐卡片、播放器/provider、阅读侧栏、导航、设置主动查询及音乐编辑入口均关闭；`/music`、`/api/music` 返回404。管理器Python音乐router不再挂载。旧未挂载组件可保留，不需再恢复音乐上游。
- 右下角换为“小鲸鱼”聊天，桌面/手机均可展开。形象直接使用大肥鱼桌宠的idle/blink/worry PNG，保留NOTICE署名与CC BY-NC-SA。是PNG表情切换和轻微CSS呼吸，不宣称移植完整桌宠动作系统。
- 以当前全局 `data/core/config.json` 的 persona.roleText 为性格依据精简为服务端博客人设；保留傲2娇8与软萌短句，去除QQ工具/私人关系与记忆/排班/故意乱答，坦诚AI身份。模型看不到本机文件、文章库、私有内容或工具，不是有阅读检索能力的客服。
- 只有手动发送调用官方 `https://api.deepseek.com/chat/completions`，服务端配置 `deepseek-flash`、thinking disabled。摸摸/喂食/展开不调用。聊天仅暂存在页面，刷新清空；失败保留输入，支持重试/收起/清空。后台旧宠物配置改为只读“小鲸鱼”说明，不读写密钥。

### 凭据与恢复

本机已有 `api-run` DPAPI 加密运行副本与服务端 `/models` 认证均通过。通过SSH stdin将已有key配置到服务器 `~/apps/ezio-blog/private/chat.env`（目录0700、文件0600），没有创建新账户、充值或切换其他供应商。文件在发布目录/Git之外；Node通过 `--env-file-if-exists` 加载。它是现有官方API的正常按量调用，不使用Command Code GOAT工程额度。`CHAT_ALLOWED_ORIGIN=https://47.101.37.232`、`CHAT_TRUST_PROXY=1`，Nginx覆盖 `X-Real-IP=$remote_addr`。

本次Nginx仅追加这一个header，原snippet备份在服务器 `~/apps/ezio-blog/nginx-backups/20261113-chat/ezio-blog-https.conf`，语法检查/reload通过；未restart共享服务。撤销AI可移走私有chat.env并重启博客；应用可回退 `previous-release`。若要撤销header，先核对无后续修改后恢复该备份并 `nginx -t`/reload。

本地运行命令在README和ai-companion.md；必须保留现有代理加载与 `NODE_OPTIONS=--use-env-proxy`（WSL直连官方域名曾DNS超时，上海直连正常）。本地start脚本显式设置Origin为127.0.0.1端口，避免Next将request.url归一localhost造成403。构建本地版本前先停止旧Node；本次api-run跨Windows/WSL重启时残留过一个旧Node，已核对cwd后结束并重新启动。不要仅凭tmux消失推断子进程已停止。

### 验证与审查

- 两端Sol生产构建/tsc通过；集成公共Turbopack最终构建与类型检查通过。64项博客单元完整检查和8项管理器测试通过；审查后新增3项UTF-8/转义字节边界回归，相关5项helper测试再次通过（累计67项不同博客测试）。目标聊天eslint通过；未重新做无关全库lint，既有全量lint未通过的历史限制仍保留。
- 完整真实写作：创建草稿→保存→刷新重开→富文本检查→发布队列→同步→阅读→修改已发布文章→刷新看到更新，6步证据通过；草稿404，验收临时文章已清除。
- 本地两端桌面/手机12组头像/无音乐检查通过，0音乐请求/0JS错误；旧宠物设置在线/离线与桌面/手机8组只读面板通过。最终公网20组页面检查通过，无JS错误/破图/水平溢出。
- 公网真实HTTP验证：首页/文章200，404、音乐页面/API404、编辑页/草稿路径/管理器接口404，Landscape仍200，头像字节匹配。聊天拒绝请求403/415/400/413符合预期，缺key503在独立候选已验证。部署包和当前Git/前端产物用实际key逐字节扫描无命中（571个路径），常见密钥形式扫描也无命中。
- 聊天mock真实浏览器：桌面/手机各9次显式发送，验证HTML当纯文本、无自动调用、失败保留、重试一致、等待禁重复、上下文限额、收起/清空和视口边界。公网和本地各1次真实DeepSeek生成均成功；公网约721ms，本地约1154ms（单次观察，不是性能承诺）。公网答“我是博客里的 AI 小鲸鱼呀，由 DeepSeek 驱动，随时陪你聊聊。”。总计2次真实生成，其他聊天测试用mock；/models验证不生成内容。
- 独立Astra审查 `d9ae7c8` 无阻断安全发现，指出中文历史可能字符数合法但JSON超16KiB。原Sol修复 `63e181b`，独立复核5测试通过；最终构建和真实/模拟浏览器补验通过。服务进程限额每IP6/min、40/hour、全局300/24h、并发3；重启重置，不宣称持久账单硬上限。
- 关键证据 `artifacts/companion-live-public.json`、`companion-live-local.json`、`companion-public-1440.png`、`companion-public-390.png`、`public-browser.json`、`companion-browser.json`、`writing-browser.json`、`no-music-browser.json`、`personalized-http.json`。主上下文实际查看两种宽度真实回复截图。

### GitHub 与旧项目

正式源码继续放 `/home/ezio/projects/EzioBlog`，远端采用 https://github.com/Ezio927/BlogSystem。用正式文件树替换远端main的旧文件，包括移除旧.github工作流；以原远端main `646d85d5a1cea2891cacd42b2e4005430a925308` 为父提交生成正常快进提交，不强推、不抹掉旧历史，不上传本地采用分支的无关中间历史或私有运行数据。GitHub推送不触发部署。最新远端/本地main SHA以 `git log -1` 为准，原集成分支保留恢复检查点。

原 `/home/ezio/projects/BlogSystem` 和 `/home/ezio/worktrees/BlogSystem` 已移到 `/home/ezio/archives/blogsystem-retired-20261113/{main,worktrees}`；22个linked worktree执行git repair，连同主检出的23个HEAD与dirty/untracked状态逐一比对一致。另有本地全部refs和远端旧main的bundle，均verify通过；归档含原未提交资料，不入公开Git。只停止原测试项目工作目录下10个旧预览进程，3100/3200/3300不再提供；旧Harness源目录未改。恢复方法在归档README。

本次两路Sol分别完成头像/音乐/后台说明与聊天/API/测试，主上下文负责集成、运行凭据、Nginx、上线、真实验收、仓库采用和归档，Astra独立审查。没有新增DeepSeek工程Worker调用，DeepSeek本轮仅为产品聊天能力。额外人工介入0次；有限修复为本地Origin归一、UTF8预算和跨Windows/WSL旧进程残留，均已处理。

下一步以实际写作内容为主；暂不继续扩展功能。素材署名、原背景素材授权待确认、未设置开机自启及未单独验收大陆移动网络等原限制继续保留。以下均为历史记录。

## 2026-11-13 较早记录：Ezio's Blog 直接 ECS 入口（历史）

当前公网地址 **https://47.101.37.232/blog**，HTTP 同路径跳转 HTTPS。名称改为 **Ezio's Blog**。旧 Quick Tunnel 已停止，不再使用下文历史随机域名。应用提交 `ebced22ae3677962ab70ab991ad826b08949d9b3`，部署候选 `8afc1977e32e1b9232cc91b29b7451360e21d2bb`，服务器版本 `20261113T103956Z-8afc197`，构建 ID `p4UjDRL4v93NfK-Ylt_cu`。测试提交 `ea0694994e01d17f3100337cccb297db5d770911`；后续仅调整 HTTP 跳转保留查询串与文档，不影响应用构建。

- Next 标准 basePath 固定 `/blog`，Next Link/router 自动处理，原生API、图片、字体、宠物、模型及 Markdown 本地链接显式适配。根路径版不再是当前启动地址。本机博客 http://127.0.0.1:3400/blog，后台仍 http://127.0.0.1:3401。
- 复用现有 Nginx 的80/443和现有可验证 IP 证书，只新增 `/blog` include；未操作 DNS、安全组或证书签发。私网源站仍100.76.66.55:3400；服务器没有3401/3402监听，Tailscale Vault 原入口未变，Landscape 返回200。
- 修改 `/etc/nginx/sites-available/agent-workflow-smoke` 与 `/etc/nginx/conf.d/landscape-https.conf` 各一行 include，新增 `/etc/nginx/snippets/ezio-blog-{http,https}.conf`。前者虽然有历史项目名，仅共享 Nginx 入口加入博客，旧 Harness 源码未改。原件备份在服务器 `/home/ezio/apps/ezio-blog/nginx-backups/20261113T104055Z/`。`nginx -t` 通过后 reload，未 restart。systemctl 提示既有 unit/drop-in磁盘变更，未为本次做无关 daemon-reload；实际 Nginx 新规则已验证生效。
- 若撤销 Nginx 集成，先核对无后续修改，再按备份 `restore-paths.json` 恢复两文件，移除本次两个 snippet，`sudo -n nginx -t && sudo -n systemctl reload nginx`。若有后续更改，只移除本次 include。应用回滚按 usage.md 切回 previous-release；旧版本监听根路径，需同步撤销 `/blog` 入口。停用的 Cloudflare 二进制保留，旧URL不保证可恢复。
- 本机 Clash Verge 增加精确 `47.101.37.232/32 → DIRECT`，全局扩展保存以免切换配置丢失；运行配置热加载通过，真实连接命中该精确规则。WSL no_proxy/NO_PROXY增加公网IP和Tailscale IP。修改前探测已命中 cn_ip DIRECT，不能声称之前实测经过东京，也不能把用户那次502确诊为代理所致；旧隧道日志确有断线。四个配置的原件备份位于 `~/.config/wsl/backups/ezio-blog-direct-20261113-193302/`，敏感备份不入库；具体说明及恢复见 public-preview.md。Windows注册表代理设置未改。
- 验证：Sol独立实现27单测、两端tsc、webpack构建、生命周期检查；集成生产Turbopack构建和类型检查成功。构建有既有动态文件trace及Edge弃用提示；本次只核对打包无.env/backend配置/manager_data，未为无实际故障提示全面重构。
- 实际公网桌面/手机20组检查通过，无JS错误/破图/水平溢出；专项7页、274个同源请求及字体/宠物/模型资源通过，全部留在/blog，无双前缀。专项mock了音乐返回以隔离路径检查，普通20页检查未mock；音乐上游不可用的历史限制仍存在。9项HTTP检查通过：首页、文章、尾斜杠、404、草稿目录/编辑器/写入与AI接口及Landscape。另验证HTTP跳转保留查询串、TLS正常和直连远端IP47.101.37.232。初次HTTP脚本将GET /api/chat误期待404（实际405，因为仅POST路由）；按真实POST停用语义修正检查后返回404，没有据此修改应用。
- 截图 `artifacts/home-1440.png`、`home-390.png`、`reading-1440.png`、`reading-390.png`；结果 `public-browser.json`、`subpath-browser.json`、`direct-http.json`。主上下文实际查看桌面/手机截图。未验收真实大陆手机网络。
- 独立 Astra 在隔离worktree审查8afc197，无阻断，相关22项测试通过。建议HTTP跳转保留查询串，已修复并对实际公网Location复验。Sol独立worktree完成应用及测试提交fe87350/b32d88e；主上下文完成Nginx、代理、部署和公网验收。没有新增DeepSeek调用。额外人工介入0次；代理管道初次路径不符与YAML缩进检查失败均有限纠正，未加载无效配置或重启共享代理。

新会话先按本节核对仓库/进程，后续章节是历史证据。项目分支 `feat/ezio-adoption`，没有推送或合并 main。启动/更新命令见 usage.md 和 public-preview.md。

## 2026-11-13 较早记录：Afterglow Journal 公网临时预览（历史）

用户随后授权全英文站名和公网临时访问，后台不公开；因此下文原始私网交付记录是历史检查点。本次代码候选 `4469170b08b2e76bd0eb007f9de2e7f7596aad92`，构建 ID `OXSLpig5EBT-na_XgDIec`，服务器版本 `20261113T101522Z-4469170`。其后的测试/文档提交不改变部署代码。

- 站名 **Afterglow Journal**。公网地址 <https://prefers-optimize-pound-cycling.trycloudflare.com/>，无需 Tailscale；私网3400和本地写作3401仍保留。
- 在 ECS 用户目录增加官方 cloudflared 2026.11.0（发布文件 SHA256 已验证）与 `ezio-blog-public-tunnel` tmux 会话，独立随机 HTTPS 域名只转发博客3400。没有改变密码管理器的 Tailscale443入口、Nginx、安全组、系统配置；后台未上传或暴露。启动/停止/恢复见 `docs/public-preview.md`。
- 按影响修复：Next16.4.6及相关依赖补丁；移除公网未使用的编辑器/AI依赖及停用评论依赖；音乐查询数量与数字ID边界；播放恢复、初次静音、旧请求拒绝、空歌词重取；存储被拒绝时页面仍可见且可切换主题。两端同源组件保持一致。
- 公网生产依赖 audit：0 critical/high/moderate、4 low（数学渲染链）。全量 lint 未通过：116 errors、78 warnings；新版 ESLint 报告更多一次性 effect 初始化，未为数字清零做全面重构。没有将 lint 报错等同已发生故障。
- 验证：两端最终生产构建及其类型检查通过；18项内容测试、8项管理器测试通过；10项本地HTTP/中文与重复目录锚点检查通过。Sol 真实浏览器复现并复验生命周期问题，留有 `tests/browser-lifecycle.cjs`；运行时需独立空闲工作区。
- 公网13项HTTP检查通过，包括首页/文章200、后台页面/草稿目录/写入接口404；不经过代理的 HTTPS 直连200、TLS验证为0。公网源站只监听 Tailscale3400，后台端口不在服务器上监听。外部 web 工具无法打开临时域名，因此可达证据采用真实 curl、Python HTTP 和 Chromium，不声称外部 web 工具验证成功。
- 浏览器检查发现原脚本在 DOMContentLoaded 后固定等待1.2秒可能在公网捕获尚未完成加载的空白动画。已加真实 hydration 和首页内容可见条件，再检查桌面/手机。实际首次加载后页面恢复正常；隧道和外部素材首载延迟仍存在。最终20组桌面/手机检查通过，无页面脚本错误或水平溢出。截图和最终结果保留于 `artifacts/home-1440.png`、`home-390.png`、`public-browser.json`。
- 音乐追加修复：公网目视发现空列表，真实上游返回业务码405“操作频繁”。`4469170` 增加成功10分钟/失败30秒的100项元数据缓存和同ID请求合并；5项新增缓存测试、聚焦 lint/类型检查及更新后的公网生产构建通过。缓存不能解除已有上游限流，也不会让已打开页面自动重试。部署后真实请求仍返回 upstream_unavailable，页面显示暂不可用；缓存命中已验证，更新后又完成首页/音乐页×桌面/手机4组聚焦浏览器检查，无脚本错误，不能将此描述为所有曲目播放已验证。
- Sol 独立实现提交 `d0ba6ae`、`4757ad4`，集成成 `a9cb3ec`、`3ff33ad`；Astra 独立审查 `4c63a80`、`a9cb3ec`、`3ff33ad`，空歌词边缘循环修复后无剩余阻断；又独立复查 `4469170` 缓存与API边界通过。主上下文负责命名、依赖、隧道及实际公网验收。本次未另行调用 DeepSeek；额外人工介入0次。
- 临时地址在隧道重启后改变，不保证长期可用或各地区连通性；未测试真实大陆移动网络。上海源站备案限制与第三方素材授权限制仍保留，没有声称隧道豁免备案，也没有购买域名/服务或配置开机自启。

## 位置与恢复点

- 项目：`/home/ezio/projects/EzioBlog`；集成分支：`feat/ezio-adoption`。
- 本地参考快照：`5b77defeaa94036d63ab39cac8c975863ac6f791`，分支 `adoption/upstream`。这是经过凭据清理的本地参考快照，不宣称是官方仓库的某个提交。
- 最终已验证代码：`82259b1bea5146358a375bc37e37a20209e4cd99`；其后的本交接提交仅更新文档。用 `git log -1` 获取包含交接的提交。
- 采用记录与开始时间见 `docs/adoption.md`。BlogSystem、旧 Harness、原参考目录及其既有工作区未修改；没有推送或合并到任何 main。

## 已实现且实际验证

保留原版视觉、阅读、音乐和宠物，改为 Ezio 的个人标识。关闭每日选刊的展示、管理和 Agent 接收；评论、GitHub OAuth 和公网 AI 接口停用。宠物使用本地固定回复。保留许可、来源与素材署名。

写作使用原版管理器：新建 → 存为草稿 → 刷新重新打开 → 在富文本区检查排版 → 正式发布加入队列 → 更新本地 → 页面重载后同步 XHBlogs → 阅读 → 编辑已发布文章 → 再次同步并刷新阅读。浏览器完整执行通过；草稿返回404且不进入列表，测试文章已清除。没有独立的公开页式草稿预览，采用编辑器的所见即所得体验。

内容读写具有路径与符号链接边界、修订冲突检查、单文件原子保存和覆盖前副本。后台只监听127.0.0.1并检查 Host/Origin。同步只写固定的相邻博客目录，不清空目录；Markdown 同步后立即可读，TypeScript 配置仍需构建重启。同步不是跨所有文件的整体事务。

## 当前访问与操作

- ECS 私网预览：<http://100.76.66.55:3400/>，需要有访问权限的 Tailscale 设备。它不是公网链接。
- WSL 本地博客：<http://127.0.0.1:3400/>；管理器：<http://127.0.0.1:3401/>；内部 Python API：127.0.0.1:3402。
- 交付时三个页面地址均返回200，进程仍在运行。WSL 的 tmux 会话为 `ezio-blog-web`、`ezio-blog-manager`；服务器为 `ezio-blog-preview`。未设置开机自启。

从项目目录分别执行 `bash scripts/start-blog.sh` 和 `python3 scripts/local-manager.py` 启动本地服务；已运行时不要重复启动。构建使用 `bash scripts/prepare-blog.sh`。上传私网预览使用 `bash scripts/publish-preview.sh`，本地同步不会自动上传。

ECS 使用 `~/apps/ezio-blog/` 的独立版本目录、每版本 Node 二进制及 current 链接。当前服务版本 `20261113T092148Z-82259b1`，构建 ID `p1ntbbUiGtDNrHnNmc9yy`。只监听 Tailscale 地址3400；未改系统 Node、Nginx、DNS、80/443、其他服务或全局代理。原有版本和 previous-release 保留。停止与回退方法见 `docs/usage.md`，失败不会自动回退。

## 检查证据

- 博客生产构建及类型检查通过；管理器生产构建（webpack，含类型检查）通过。
- `XHBlogs` 中 `node --test lib/*.test.mjs`：18项通过，其中12项由 DeepSeek 实际编写并执行。
- `my-blog-manager` 中 `python -m unittest discover -s tests -p 'manager*_test.py' -v`：8项通过。
- 真实浏览器：本地10个页面×桌面/手机共20组通过，无页面脚本错误或水平溢出；写作闭环通过；7项HTTP检查和中文文件名/重复标题/数字后缀目录锚点通过。
- ECS 最新版本：主页、文章、404 × 桌面/手机共6组通过；重复更新服务成功验证。曾发生的代理502通过当前调用绕过私网代理解决，未改全局配置。
- 全量 `npm run lint` **未通过：109 errors、78 warnings**。构建没有跳过类型错误。未为消除原项目广泛的类型风格和 hooks 问题做全面重构；不把本候选描述为所有静态检查全绿。管理器全量 lint 未单独验收。
- 浏览器脚本在 `tests/browser-*.cjs`；使用现有 Playwright 和 Chromium，没有安装 skills。机器相关浏览器路径可通过脚本支持的环境变量调整。JSON 与截图在忽略入库的 `artifacts/`，包括 `writing-browser.json`、`public-browser.json`、`http-anchors.json`、`ecs-browser.json`。
- 关键截图：`artifacts/ecs-home-1440.png`、`ecs-home-390.png`、`ecs-reading-1440.png`、`editor-saved.png`。编辑器截图包含验收临时文章，不代表文章仍保留。

## 模型协作与审查

- Astra 主上下文：采用范围、前端适配、集成、真实浏览器验收和隔离的 ECS 部署。
- Sol（`gpt-6.1-sol`）：独立 `local-manager` 工作区完成管理器存储、同步、队列身份、界面及测试，提交已 cherry-pick；未并发修改集成工作区。
- DeepSeek：Command Code GOAT 的 `deepseek/deepseek-v4.1-flash`，保留 `NODE_OPTIONS=--use-env-proxy`，在独立 `public-content` 工作区真实编辑、运行12项公开查询测试并提交 `6b17ab7da7b0ba9e02fe1165988a646f51a0e11a`。集成提交 `5514132`。不是主会话代写的 Worker 成果，未切换另行付费 API。
- 独立 Astra（`gpt-6-astra`）在 detached `adoption-review` 工作区审查具体候选 `8d2a52c` 及后续修复，未参与实现。发现的运行中 Node 被覆盖问题已改为每版本二进制；管理器隐含外部 AI 路径已关闭。编辑器遮挡、Unicode 路由解码和预览优雅退出等待均完成针对性复查，无剩余阻断发现。审查者独立运行8项管理器和12项查询测试通过；运行环境与视觉由主上下文验证。
- 自本轮开始授权后，额外人工介入0次。主要排查：外部字体构建依赖改为许可随附的本地字体；编辑器播放器遮挡发布按钮；浏览器脚本适配原版队列重载；代理绕过；部署覆盖运行中二进制及停止监听时序。均有限修复并按影响范围复验。

## 保留限制及下一步

当前是可实际写作、阅读的私有预览。没有购买域名、办理正式公开上线或开启新付费服务。正式公开前，优先确定个人头像/壁纸及联系方式，替换临时素材或确认其授权；原项目 CC BY-NC 4.0、大肥鱼素材 CC BY-NC-SA 4.0 和字体许可继续保留。音乐仍依赖原版外部来源，未逐首验证播放。不要把临时预览素材的存在理解为全部素材授权已核验。

新上下文先读本文件与 `docs/usage.md`，核对 Git 和运行进程后接续。没有待完成的功能扩展任务；最值得的下一步是用户实际体验此版本并提供自己的个人资料与素材，再决定正式域名和公网发布安排。
