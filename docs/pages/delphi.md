# Delphi

入口：[DelphiPage.jsx](../../shared/renderer/pages/delphi/DelphiPage.jsx)。该页面负责提供首选模式 `plain`、标题和登录回调；对话实现共用于 Engine。

| 模块 | 职责 |
| --- | --- |
| `features/conversation/ConversationWorkspace.jsx` | 会话列表、草稿、模式选择和流式交互 |
| `ConversationMessage.jsx`、`ConversationStreamTurn.jsx` | 历史消息、正在生成的回答 |
| `conversation.api.js` | 会话列表、详情、流式输入和认证重试 |
| `conversation-modes.mjs` | 模式发现、参数能力、缓存和会话隔离 |
| `features/evidence/` | 回答引用的证据卡片和媒体解析 |

## 请求与生命周期

- 从 `/conversation/query-modes` 获取服务端模式和能力。
- 列表和详情请求携带 `query_mode`。
- 输入流使用 `/conversation/sessions/{sessionCode}/input/mode/{mode}/stream`。
- 桌面环境优先通过 IPC 获取流事件；浏览器备用实现继续使用 SSE。
- 会话状态留在对话组件内部；token、模式变化和组件卸载时仍按原逻辑失效旧请求。

页面间只复用对话组件，不共享同一个会话 state。服务端返回的模式标识不应在页面中另建一套枚举。

修改后重点回归：模式发现失败与兼容回退、切换模式后的会话隔离、新建/历史对话、流式回答、证据展示、token 刷新重试，以及 Delphi/Engine 之间切换。
