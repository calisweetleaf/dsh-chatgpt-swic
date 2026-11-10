# dsh-chatgpt-siwc

[English](README.md) | 简体中文

一个 DeepSeek Harness 插件：通过官方开源的 **Sign in with ChatGPT（SIWC）**
流程，用**你自己的 ChatGPT Plus/Pro 套餐**服务模型调用。流程为动态 OAuth
注册，之后使用签发的 OAuth 访问令牌调用**公共 Responses API**
（`https://api.openai.com/v1`）。

它本质上只是一层 API：一个 LLM 提供方路由、一张设置卡片、一个 CLI，仅此而已。

## 边界

- **不是 Codex 登录。** 不使用 `app_EMoam…` 客户端，不访问
  `chatgpt.com/backend-api/codex` 端点，不读取 `~/.codex/auth.json`，
  也不接触任何 Codex harness 状态。此插件唯一接触的令牌，是签发给本应用的、
  用户自己的 SIWC 令牌。
- **没有 sub2api，没有账户池。** 请求由适配器直接携带已登录账户的令牌发往公共
  API。一个账户的 client id 只会与该账户自己的令牌一起使用。
- **套餐用量是一项授权，而不是身份。** 仅登录不会启用任何功能：模型调用要求账户
  已授予的 scope 中包含套餐用量 scope（`chatgpt.tokens.use.direct`）。
  单应用上限由用户在 [ChatGPT 设置](https://chatgpt.com/settings/usage)中自行管理。

## 登录流程

1. **动态注册。** 首次登录以 `client_id=dynamic_agent_client`、本主机稳定的
   `ext_agent_host_id` 和 `agent_name_hint` 发起。回调会返回签发的
   `oaiapp_…` client id，它随账户一起保存，并用于授权码交换和之后的每次刷新。
2. **授权码 + PKCE（S256）**，回调地址是 `127.0.0.1` 上的本地回环监听器
   （路径 `/auth/callback`），每次尝试都使用新的 `state`/`nonce`。
   回环标签页会一直保持，直到流程验证完成，因此它最终显示的就是结果本身——
   “登录成功”或失败原因；同一安装的首次登录会且只会显示一次单应用上限提示。
   每个控制面请求（discovery、令牌、JWKS、模型）都有超时上限，保持中的页面也有
   自己的截止时间，所以任何一次登录都不会让标签页一直挂起。
3. **授权码交换**：在令牌端点带上 `resource=https://api.openai.com/v1`。
   不使用 client secret。
4. **ID 令牌验证**（JWKS、issuer、audience、nonce）。决定套餐用量是否开启的是
   已授予的 scope，而不是身份。
5. **刷新**采用标准 OAuth，按账户串行执行，轮换的令牌以原子方式替换。
   **退出登录**会先在 discovery 文档给出的撤销端点撤销，再清除本地令牌。

端点来自 OIDC discovery 文档
（`https://auth.openai.com/.well-known/openid-configuration`），读取失败时回退到
文档记载的生产环境值。

网络可达性：运行插件的机器需要能通过 HTTPS 访问上述端点——`auth.openai.com`
用于 discovery、令牌交换和 JWKS（以及 discovery 给出的撤销端点），
`api.openai.com`（或配置的 `apiBaseUrl`）用于模型列表和 Responses。
用于登录的浏览器需要能访问 OpenAI 的登录页面以及 `127.0.0.1` 上的本地回环监听器，
因此它必须运行在同一台机器上。“管理用量”链接会打开 `chatgpt.com/settings/usage`。

账户保存在 Harness 主目录下——`chatgpt-siwc/accounts.json`
（权限 `0600`，目录 `0700`），另有一个不含机密的 `host.json` 保存稳定的主机 ID。
写入是原子的并带跨进程锁，因此轮换的刷新令牌不会被两个进程重复使用。

## 安装与配置

这是一个普通的 DeepSeek Harness bundle 插件（主机版本 `>=0.2.2-rc.1 <0.3.0`）。DSH 始终是主机；本插件不包装、不分叉、也不启动它。

**通过 Web 客户端：** Plugins → 按包名、Git URL、tarball 或本地路径安装 → 按 DSH 提示重启 → 打开本插件卡片 → **使用 ChatGPT 登录**。

**通过终端**（`--profile` 必须写在 pnpm 参数之前）：

```bash
dsh plugin --profile web add dsh-chatgpt-siwc            # 发布到 npm 之后
dsh plugin --profile web add ./dsh-chatgpt-siwc-<ver>.tgz  # 打包好的 tarball
```

请安装打包后的 tarball 或 npm 包，而不是源码目录：发布的 `lib/` 无需在主机上构建。Node 模块路径上其他位置的旧副本（例如上级 `node_modules` 中的旧符号链接）可能遮蔽已安装的版本；插件启动时会记录 `dsh-chatgpt-siwc <版本> loaded from <路径>`，`dsh-chatgpt-siwc doctor` 也会输出同样信息，每次安装后请核对。

bundle 补丁（`cordis.patch.yml`，在 `package.json` 中以 `dsh.bundle.patch` 引用）插入一行：

```yaml
- insert:
    - id: dsh-chatgpt-siwc
      name: dsh-chatgpt-siwc
      config:
        provider: siwc-dsh-core
        agentNameHint: DSH SIWC
```

可选配置项：`apiBaseUrl`（仅限 `https://api.openai.com` 或本地回环主机）、`reasoningEffort`、`storePath`（覆盖账户文件路径）、`streamIdleTimeoutMs`（默认 120000）。各字段均为 volatile：提交的更改无需重启即可生效，重命名 `provider` 会以原子方式重新注册路由。

与所有 DSH 卡片一样，插件分为两部分。主机部分（`src/index.ts`）注册 `chatgpt` LLM 路由及其 Models 页目录项（`nativeAuth: oauth`，因此不显示 API key 输入框）、模型发现和 `siwcAccount` Typert remote；它在可选的 `ctx.inject(['settings'])` 子上下文中声明 `settings.configure({ auto: false }, ctx.fiber)`，因为它自带页面。浏览器部分（`src/client`，经 `dsh.client` 从 `./client` 导出提供）仅在 `ctx.configForms` 提供 `dsh-chatgpt-siwc` 命名空间时，把卡片注册到 `plugins.bundle.config` 插槽。插件列表的标题和简介以内联文本保存在 `locale/en.json` 与 `locale/zh.json` 中；每种语言的 `meta.detail` 指向随包发布的 Markdown 文档（英文为 `docs/DETAIL.md`，中文为 `docs/DETAIL.zh.md`）。

## 账户面板

插件页上的卡片显示连接状态、套餐访问、登录、重新连接、取消、刷新和断开连接。账户 remote 只返回身份和套餐信息，从不包含令牌内容。弹出窗口被拦截时，面板中会保留 **打开登录页面** 链接。

如果登录中断，卡片会写明停在哪一步（例如 *用授权换取访问令牌*）以及机器代码，主机日志中也有同样的一行。ChatGPT 签发的注册信息会在一次性授权码交换 **之前** 保存，因此重试会重新连接同一个应用，而不是在你的 ChatGPT 账户上再注册一个。浏览器和 DSH 必须在同一台机器上运行，因为回调地址是 `http://127.0.0.1:<端口>/auth/callback`。

## CLI

登录是交互式的，独立于模型调用路径之外——使用随附的 CLI（或设置卡片）完成：

```bash
dsh-chatgpt-siwc login [--no-browser] [--new]   # 默认复用本机已有注册，--new 才新注册
dsh-chatgpt-siwc doctor          # 不含令牌的 JSON：已加载版本、账户文件、注册、锁、端口
dsh-chatgpt-siwc status          # 账户的公开视图，不含令牌
dsh-chatgpt-siwc models          # 重建账户索引；列出模型 ID、名称及推理力度
dsh-chatgpt-siwc logout [--purge]
dsh-chatgpt-siwc help
```

面向人的输出支持英文和简体中文：传入 `--lang zh` 或 `--lang en`，或者让 CLI 根据
`LC_ALL` / `LC_MESSAGES` / `LANG` 自动判断（`zh_*` 选择中文）。例如：

```bash
dsh-chatgpt-siwc status --lang zh
LANG=zh_CN.UTF-8 dsh-chatgpt-siwc login
```

JSON 输出、错误码、模型 slug 和 URL 始终不翻译，任何命令都不会打印令牌。

## 模型索引与推理

获得套餐访问授权后，首次打开模型选择器会通过 `GET /v1/models` 获取账户的模型目录。之后打开选择器或切换模型时，仅查询账户的本地索引，不刷新令牌，也不请求模型目录。运行 `dsh-chatgpt-siwc models` 可重建默认端点的索引，并列出模型 ID、名称及服务端声明的推理力度，不输出凭据。DSH 的提供方发现功能会重建当前配置端点的索引。

可选力度以所选模型的目录记录为准。例如，仅当该模型声明支持 `ultra` 时才会显示。若端点未提供力度信息，选择器不会自行添加选项。插件会按所选值发送请求；如果缓存目录明确不支持该值，则拒绝请求，不会擅自降低力度。服务支持时返回的推理摘要并非模型的私有推理过程。

## 线上协议

适配器（`src/adapter.ts`）把 `serializeRequest` 的输出发送到 `POST /v1/responses`，
并把 SSE 流转换为 harness 的数据块。序列化器通过“不发送”来落实套餐用量契约：

- 每个请求都带 `store: false` 和 `stream: true`。
- 若请求包含原生 DSH 会话 ID，则将其用作 `prompt_cache_key`；无会话身份的请求不发送此字段。它不保证缓存命中。对话和时间上下文消息保留原有顺序；适配器不会向 instructions 添加时间戳。
- 账户界面和 CLI 可选择英语或简体中文。提供方调用不携带界面语言，因此插件生成的提供方错误同时包含中英文；上游详情和机器错误码保持原样。
- 系统提示词作为顶层 `instructions` 发送；system 消息会变成 instructions，
  而不会作为输入项。
- 从不发送：`max_output_tokens`、`temperature`、`top_p`、
  `prompt_cache_retention`、`truncation`、`metadata`、`user`。
- 只支持函数工具，不支持托管工具。图像和文件输入会在本地被拒绝
  （`UNSUPPORTED_CONTENT`），而不是被静默丢弃。
- 提供方的 `subscription_sharing_*` 失败（准入阶段或流中途）会以通俗的错误信息呈现，
  并指向“管理用量”。

## 开发

```bash
npm run build      # 服务端（tsconfig.build.json）+ 客户端 bundle（esbuild → lib/client.js）
npm run typecheck  # 两个项目，noEmit
npm test           # 先构建，再运行 vitest
```

客户端 bundle 复现了 harness 客户端模块产物格式（用
`window.__ModuleLoader__.load({ id, factory })` 包裹一个 CJS bundle；基础平台模块
保留为裸 require，由模块表提供）——按照 harness cookbook 中“adding a settings card”
一节的说明，harness 仓库之外的包需要自行构建这种结构。

测试套件覆盖了所有无需账户即可验证的内容：序列化器的线上协议和推理力度取值、
SSE 流转换（文本、推理、工具调用、回填、流中途失败、中止）、ID 令牌验证
（签名、nonce、过期、audience、密钥轮换）、针对伪造端点和真实本地回环监听器的
端到端 OAuth 客户端（授权 URL 契约、保持中的结果页、刷新轮换与拒绝、撤销、discovery）、
插件注册及由设置驱动的重新注册、设置卡片的暂存表单，以及所有词典（卡片、错误、
登录页面、CLI）的中英文一致性，和基于 `Accept-Language`、`--lang` 与 POSIX
locale 变量的语言选择。没有任何测试使用真实端点或账户；测试中的每个控制面请求都经过注入的伪造实现。
