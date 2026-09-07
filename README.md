# DL Studio

Windows 与 macOS 桌面客户端，使用 Electron、React 和 Vite。两端共用 `shared/renderer/` 中的前端源码，各自保留主进程、依赖安装与安装包构建入口。

- [开发与构建](docs/development.md)
- [架构与状态归属](docs/architecture.md)
- [公用组件与功能模块](docs/components.md)
- [页面文档与索引](docs/README.md)
- [本次拆分及验证记录](docs/refactoring.md)
- [Windows 说明](Windows/README.md) · [Mac 说明](Mac/README.md)

请检出完整仓库，再进入 `Windows/` 或 `Mac/` 执行原有 npm 命令。共用前端无需单独安装依赖。
