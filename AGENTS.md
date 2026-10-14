# AGENTS.md

本仓库是轻作独立 `official.seed-audio` 插件，提供基于火山引擎 Seed Audio 1.0 模型的音频创作能力，支持对话配音、旁白朗读与场景化音效生成。它依赖轻作 0.3.0 / 插件 API 1.2；桌面底座和市场目录在其他仓库维护。

## 项目边界

- `ui/` 包含提示词、音频格式、采样率与语速调节界面，以及在线试听播放器；`tests/` 包含提示词校验、音频生成与异常处理测试；`scripts/pack-plugin.mjs` 生成平台制品和目录片段。
- manifest 的权限必须保持最小：`files: true`、`credentials: ['volcengine-ark-key']`、`network: ['https://openspeech.bytedance.com', 'https://ark.cn-beijing.volces.com']`。
- SDK 1.2.0 tarball 随项目固定保存，并在发布时对照固定 Release 校验；不要改用浮动版本或运行时下载。

## 开发与验证

```sh
npm ci --ignore-scripts
npm test
npm run pack
```

单元测试使用虚拟响应验证音频合成与错误处理契约，不发送真实计费请求。

## 实现与安全约定

- 官方模式只使用 manifest 声明的凭据和 origin。密钥保存、清除和网络调用由可信宿主执行，插件页面不能回显密钥。
- 保持用户确认、任务取消和错误提示语义；失败只在用户明确操作时重试。
- 不要把凭据、访问令牌或 `.env*` 写入仓库；`release/`、`output/` 和 `node_modules/` 是生成物。

## 用户可见文案

- 界面与说明里只写用户需要知道的内容，不混入实现机制、内部数据流或底层调用说明。
- 保持安静状态：状态提示只在出错、合成中或完成时出现。
