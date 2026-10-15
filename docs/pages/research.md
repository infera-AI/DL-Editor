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

## 四个 agent 的对话查看

Chats 顶部支持 All、Laura、Dario、Jane、Bella 和 Legacy / Unknown。数量由后端按当前用户、日期范围统计，按会话归属筛选后再分页；过滤条件同样传入全量聊天导出。旧服务器没有 `agent_filtering` 能力时，仍可浏览所有聊天，并提示更新后端后使用 agent 筛选。

身份映射与 App 一致：`chat → laura`、`task → dario`、`retrieval / memory → jane`、`companion → bella`。缺少或无效的归属进入 Legacy / Unknown，不从 `query_mode` 推断身份。Laura 的转交不改变会话归属，消息优先显示 `answered_by`，缺省使用会话所属 agent。

详情保留完整对话、时间、证据和反馈；确认卡片显示已保存的快照及结果。Activity 汇总转交、任务工具调用、状态和错误，均为只读记录。切换筛选会清空选择，并作废旧数据请求，防止异步结果覆盖新筛选。

Chats 和 Simulation 的对话正文都隐藏卡片类型占位文字。候选任务卡片（按 `TaskCandidateCard` 或 `TaskCandidate` 对象类型识别）只在 Activity / 操作记录中展示，不占用对话行；转交和操作确认卡片仍在对话中显示，模拟中的按钮继续使用原卡片操作。旧接口只有系统占位消息、没有卡片快照时，Activity 保留该条记录并标记未提供详情，不将它丢弃或伪造为真实任务。

## 四角色沙盒模拟

Simulation 的使用顺序是：选择受试用户 → 从真实任务新建沙盒（或选择已有环境）→ 选择 Laura / Dario / Jane / Bella → 新建会话或直接输入。四个 agent 在同一环境里共享任务副本，各自保留独立会话历史；Laura 转交仍在 Laura 会话内回答。受试用户和角色在创建会话后固定。

任务创建、修改、删除、完成、确认和撤销复用 App 后端的原有 agent 与领域服务，实际写入沙盒。记忆、画像和近况只读受试用户数据。新建环境重新复制当前真实任务和相关状态；已有环境及会话继续保留。旧版记忆问答记录可在环境列表的“旧版模拟记录（只读）”中查看。

会话中的转交卡片和任务确认卡片可点击，也可以输入确认、取消或撤销；发生版本冲突时重新加载卡片。Stop 取消当前生成，已经完成的沙盒操作仍保留，可以按 App 的撤销规则处理。

右侧包括“对话 / 上下文 / 操作记录”。上下文可以查看当前任务副本，也可以选择某一轮开始时持久化的任务和个人背景快照；实际记忆证据仍随回答展示。操作记录展示当前会话的工具与卡片，以及同一环境中各会话产生的任务变化。

前端接口集中在 `research.api.js`；`ResearchSimulationView.jsx` 管理环境、角色、会话和流；`ResearchSimulationContext.jsx` 展示上下文与变化。请求结果受用户、环境、角色和加载序号约束，避免旧请求覆盖当前选择。刷新凭据不重置正在进行的模拟。所有沙盒能力要求配套部署新版后端及环境表。

验证：`node shared/testing/research-agents.test.cjs`；平台构建后可执行 `node_modules/.bin/electron ../shared/testing/research-agents-smoke.cjs .`，使用隔离 fixture 验证筛选、转交、导出条件与请求竞争。
