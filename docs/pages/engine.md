# Engine

入口：[EnginePage.jsx](../../shared/renderer/pages/engine/EnginePage.jsx)。根据应用级解锁状态展示 `EngineGate` 或 `EngineWorkspace`。

| 文件 | 职责 |
| --- | --- |
| `useEngineState.js`、`engine.actions.js` | 解锁输入、错误、解锁与锁定 |
| `components/EngineWorkspace.jsx` | 本地搜索、健康状态、索引查看及工作区状态 |
| `engine.api.js` | Engine HTTP 请求、QA 流和响应合并 |
| `engine.utils.js`、`engine-progress.js` | 结果、媒体、推理阶段和状态展示 |
| `components/EngineSearch*.jsx` | 搜索结果、支持信息及媒体预览 |
| `components/EngineTestView.jsx`、`EngineIndexResult.jsx` | 索引检查 |
| `components/EngineQuery*.jsx` | 保留原有 QA 结果展示组件 |

Engine 服务地址仍来自 `VITE_DL_ENGINE_API_BASE_URL`，默认 `http://127.0.0.1:8787`。健康检查、搜索、QA 和媒体代理继续通过原请求/IPC 入口。

工作区中的对话模式复用 `ConversationWorkspace`，默认 `queryMode="agent"`，并传入 `embedded`。解锁状态位于应用层，工作区原有内部状态继续随组件挂载和卸载。

共享样式位于 `styles/`。`platform-styles/results.css` 保留两端已有的 Engine 样式差异，不因本次重构增加或移除展示样式。

修改后重点回归：解锁/锁定、健康状态重试、搜索结果、媒体偏移播放、索引查看、Vespa 开关、Agent 对话，以及切页时流订阅处理。
