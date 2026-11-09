## 通过 ChatGPT 登录

此插件添加一个 **chatgpt** 模型提供方，通过 OpenAI 官方的 Sign in with ChatGPT 流程和公共 Responses API 使用你自己的 ChatGPT 套餐。

1. 打开此插件的卡片，选择 **使用 ChatGPT 登录**。
2. 在浏览器中同意此应用及 **ChatGPT 套餐** 访问。
3. 回到这里：卡片显示 *已连接*，模型选择器中会列出 ChatGPT 模型。

登录信息只保存在本机（Harness 主目录中仅所有者可读的文件）。令牌只发送到 `api.openai.com`。请求计入你的 ChatGPT 套餐额度；可随时在 ChatGPT 设置中查看或断开此应用。

如果登录中断，卡片会显示停在哪一步。`dsh-chatgpt-siwc doctor` 会输出不含令牌的诊断报告。

与 OpenAI 或 DeepSeek 无隶属或背书关系。