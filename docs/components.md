# 公用组件与功能模块

## 公用 UI

| 文件 | 主要输入 | 用途 |
| --- | --- | --- |
| `components/Metric.jsx` | `icon`、`label`、`value` | 指标图标、名称和值 |
| `components/DurationValue.jsx` | `value`、`referenceValue` | 按统一规则展示时长 |
| `components/PlaceholderPage.jsx` | `title` | 未匹配导航的占位页面 |
| `app/AppChrome.jsx` | 导航、账号、主题、窗口状态及回调 | 导航栏、账号入口、信息和主题按钮 |
| `app/AppInfoDialog.jsx` | 应用信息、设备、更新状态及回调 | 软件信息、更新与日志操作 |

```jsx
import { Metric } from "../../components/Metric.jsx";

<Metric icon={<Clock3 size={16} />} label="处理中" value={activeCount} />
```

组件内不发起业务请求，具体事件由调用方传入。页面专属弹窗仍放在所属页面，避免在拆分时改变表单和交互行为。

## 对话

`features/conversation/ConversationWorkspace.jsx` 同时供 Delphi 和 Engine 使用。

| 参数 | 语义 |
| --- | --- |
| `authState` | 当前认证信息 |
| `queryMode` | 首选模式；Delphi 为 `plain`，Engine 为 `agent` |
| `allowModeSwitch` | 是否显示服务端提供的模式选择 |
| `embedded` | 是否嵌入 Engine 布局 |
| `onLogin` | 请求打开登录界面 |
| `title`、`subtitle` | 展示文字 |

会话请求与流处理在 `conversation.api.js`，模式发现、能力检查、参数生成和会话隔离在 `conversation-modes.mjs`。模式缓存按认证 token 隔离。组件保留原来的请求失效检查和会话状态生命周期。

## 证据

`features/evidence/EvidenceList.jsx` 与 `EvidenceCard.jsx` 从原 Research 组件提升而来，继续保留原 CSS 类名。

```jsx
<EvidenceList
  evidences={message.evidences}
  token={authState.token}
  resolveUrl={resolveConversationEvidenceUrl}
/>
```

`resolveUrl` 可指定对应业务的签名 URL 解析器，默认使用 Research 解析器。列表和卡片不导入 Research 页面。媒体类型、时间偏移转换在 `evidence.utils.js`，共享的缓存和并发队列在 `services/signed-urls.js`。

## 认证与传输

- `features/auth/LoginDialog.jsx` 是受控表单；state、actions、effects、API 和存储分别有独立文件。登录完成后的跨页面刷新由 `app/session.actions.js` 协调。
- `features/transfers/components/AutomationOptions.jsx` 展示自动上传、备份和清理选项。
- `UploadQueueDock.jsx` 接收队列、可操作状态和回调；`TransferQueueItem.jsx` 展示单个任务。
- 队列状态由 `useTransferState` 在应用层持有。入队、队列调度和单次上传分别位于 `automation.actions.js`、`queue.actions.js`、`upload.actions.js`。

## 提取新公用组件

只有存在明确复用时才提升组件。业务专属的字段编辑、筛选、导出表单留在页面目录。基础组件不能导入页面；复用业务状态和请求时优先创建独立 `features/` 模块。
