# 开发、构建与回归

## 安装和启动

检出完整仓库。选择本机平台目录执行：

```sh
cd Windows
# macOS 使用 cd Mac
npm ci
npm run dev
```

开发地址仍为 `http://127.0.0.1:5173`，端口被占用时继续报错。只复制单个平台文件夹将缺少 `shared/` 源码。无需在根目录或 `shared/` 下运行 npm install。

项目继续使用现有 React、Vite、Electron 及锁文件版本。前端拆分没有增加生产依赖。

## 构建入口

| 平台 | 命令 | 输出 |
| --- | --- | --- |
| 两端 | `npm run build` | 当前平台的 `dist/` |
| Windows | `npm run dist` | `release/DL-Studio-Windows-Setup-${version}.exe` 及 blockmap |
| Windows | `npm run pack` | `release/win-unpacked/` |
| Mac | `npm run dist` | 由原 `electron-builder.config.cjs` 生成安装包 |
| Mac | `npm run dist:arm64` / `npm run dist:x64` | 对应架构安装包 |

共享前端在 Vite 构建时进入本端 `dist/`。安装包无需在运行时访问仓库中的 `shared/`，也无需修改 Electron 主进程或打包文件白名单。

现有环境变量继续生效，包括 `VITE_INFERA_API_BASE_URL`、`VITE_DL_ENGINE_API_BASE_URL`、`VITE_DEV_SERVER_URL`，以及原有主进程、安装包和发布环境变量。请求地址及认证协议没有迁移到新的配置格式。

## 自动构建与发布

[release-installers.yml](../.github/workflows/release-installers.yml) 保持原样：

- `v*` tag 和手动触发条件保持一致。
- Windows x64、macOS arm64/x64 的平台矩阵与工作目录保持一致。
- 各任务仍在对应平台目录执行 `npm ci`，无需新的根目录安装步骤。
- 安装包名称、输出目录、GitHub 产物、发布上传、OSS 更新清单逻辑保持一致。

不要为了本机验证去触发 tag 发布。macOS 原生安装包与捆绑二进制应在 Mac 或原有 Mac CI runner 上验证。

## 检查命令

以下命令均从当前平台目录执行：

```sh
npm run build
npm run smoke
npm run test:app-shell
npm run test:conversation-modes
node scripts/renderer-modules.test.cjs
```

其余主进程回归测试继续保留在本端 `scripts/*.test.cjs`。Windows PowerShell 可执行全部测试：

```powershell
Get-ChildItem -LiteralPath scripts -Filter '*.test.cjs' | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Test failed: $($_.Name)" }
}
```

实际渲染回归使用当前平台安装的 Electron，先构建再执行：

```sh
npx --no-install electron ../shared/testing/renderer-smoke.cjs .
```

它在隐藏窗口中通过 `file://` 加载真实构建产物，使用隔离的本地接口模拟，检查六页导航、主题、压制暂停/恢复、后台自动传输、队列持久化、流式对话、Engine 解锁、token 刷新和退出/登录。网络请求会被阻止，文件上传、删除与服务返回由测试夹具模拟；它不能替代真实后端或原生编解码回归。

`renderer-modules.test.cjs` 检查源码导入存在性、精确大小写、循环依赖和页面边界。`smoke` 还会检查构建 HTML 引用的 JS/CSS 文件确实存在，并使用支持安装后 `file://` 加载的相对路径。

## 新增或修改页面

1. 在 `shared/renderer/pages/<page>/` 中维护页面入口、私有组件、`*.api.js`、工具、状态和 actions。
2. 需要跨页面保留的状态由 `useApplication` 调用对应 state hook；组件临时状态留在组件内部。
3. 页面切换在 `app/navigation.js` 和 `app/PageContent.jsx` 注册。公用能力提取到 `features/` 或基础目录。
4. 样式加入对应分区，通过两端 `styles.css` 在相同位置导入；已有导入顺序不变。
5. 更新对应页面文档并运行两端构建、结构检查和受影响的行为检查。

## 本机环境问题

本次验证曾遇到两类环境限制：沙箱阻止 esbuild 子进程，以及 Windows 解压构建工具缓存时无权创建 macOS dylib 符号链接。前者通过允许构建进程启动解决；后者先使用任务临时缓存验证，再将 Windows 工具放回标准缓存。最终使用不带临时环境变量的原构建命令验证。没有关闭签名/资源编辑步骤，没有修改项目构建配置来规避错误。

遇到缓存权限错误时，应修复本机缓存或符号链接权限，或使用正确准备的本机工具缓存。不要将个人缓存绝对路径提交到 Vite、打包配置或 workflow。
