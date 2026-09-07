# 开发文档

这组文档对应 2026-09-07 的前端模块拆分。

| 文档 | 用途 |
| --- | --- |
| [architecture.md](architecture.md) | 目录职责、依赖方向、状态与副作用生命周期 |
| [development.md](development.md) | 安装、开发、构建、测试和新增页面 |
| [components.md](components.md) | 公用 UI、认证、传输、对话与证据模块 |
| [refactoring.md](refactoring.md) | 兼容性约束、迁移映射及验证结果 |
| [migration-map.md](migration-map.md) | 原 App.jsx 的函数与目标文件对照 |
| [Editor](pages/editor.md) | 压制设置、设备状态和后台任务 |
| [Cloud](pages/cloud.md) | 仓库、筛选、分页和文件操作 |
| [Delphi](pages/delphi.md) | 对话模式、会话和流式响应 |
| [Guess](pages/guess.md) | 长期记忆反馈与值编辑 |
| [Engine](pages/engine.md) | 解锁、搜索、索引检查与对话 |
| [Research](pages/research.md) | 权限、资源、聊天、统计、模拟和导出 |

修改一个页面时，先查看对应页面文档。涉及跨页面状态或后台队列时，同时查看架构文档中的生命周期约束。
