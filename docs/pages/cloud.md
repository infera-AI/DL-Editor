# Cloud

入口：[CloudPage.jsx](../../shared/renderer/pages/cloud/CloudPage.jsx)，保留原组件名 `CloudRepository`。

| 文件 | 职责 |
| --- | --- |
| `useCloudState.js` | 仓库、日期、媒体/解析状态筛选和分页结果 |
| `useCloudEffects.js` | 页面激活或认证/筛选变化时加载 |
| `cloud.actions.js` | 仓库切换、列表加载、归档删除 |
| `cloud.api.js` | 列表请求和删除请求 |
| `cloud-query.js` | 查询参数、日期范围、分页结果规范化 |
| `cloud.utils.js` | 筛选、统计、稳定键和菜单位置 |
| `repository-format.js` | 文件大小、时长、拍摄时间及状态展示 |
| `components/` | 列表行、网格卡片、文件图标、筛选图标和指标 |

DL Repository 使用 `/device/files`，DL Rawdata 使用 `/memory/raw-data`。API 解析、分页上限、筛选字段、删除请求的参数和方法保持原样。

Cloud 状态在应用层保留。搜索框、视图切换和菜单等原组件内部状态仍属于 `CloudRepository`。登录完成后由 `app/session.actions.js` 刷新当前仓库。

样式在 `styles/repository.css` 和 `styles/files.css`，由平台 CSS 入口统一加载。

修改后重点回归：两种仓库切换、日期与状态筛选、分页、列表/网格、右键操作菜单、Rawdata 删除、拍摄时间优先级，以及退出/重新登录后的加载。
