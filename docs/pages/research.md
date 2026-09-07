# Research

入口：[ResearchPage.jsx](../../shared/renderer/pages/research/ResearchPage.jsx)。保留原权限判断、资源、聊天、统计、模拟和导出能力。

| 文件/组件组 | 职责 |
| --- | --- |
| `useResearchState.js` | 权限、子页、筛选、数据、选择与导出状态 |
| `useResearchEffects.js` | 页面激活时检查权限，权限满足后加载数据 |
| `research.actions.js` | 权限检查、分页加载、批量选择、导出 |
| `research.api.js` | `/admin/research` 下的请求和模拟对话流 |
| `research.utils.js` | 数据规范化、资源分组、统计和错误展示 |
| `research-download.js` | 下载链接和本地下载处理 |
| `components/ResearchResources*.jsx` | 资源列表/网格、选择、详情和解析结果 |
| `components/ResearchChats*.jsx` | 聊天列表、消息和反馈 |
| `components/ResearchStatistics*.jsx` | 统计表格、汇总与详情弹窗 |
| `components/Research*Export*Modal.jsx` | 全量和批量导出 |
| `components/ResearchSimulationView.jsx` | 用户模拟会话 |

## 权限与缓存

权限仍检查用户的 `research.access`，没有改动服务端请求路径和授权规则。账号变化或权限失效时保留原请求序号处理，避免旧请求覆盖新状态。

`services/signed-urls.js` 保留原签名 URL 缓存的键、20 分钟 TTL、600 条上限及 8 路并发限制。媒体懒加载在 `hooks/useResearchLazyLoad.js`。证据卡片已提升到 `features/evidence/`，普通对话无需再依赖 Research 页面。

资源/聊天分页、已选项、当前子页和筛选由应用层持有；各详情卡片、弹窗和模拟会话原有的局部状态保留原生命周期。

样式按布局、资源、聊天、统计、导出和模拟分区，由两端 CSS 入口固定顺序加载。

修改后重点回归：未登录/无权限/权限错误、筛选与加载更多、已选/全部导出、批量导出轮询、下载文件名、签名 URL 缓存、音视频预览和模拟会话流。
