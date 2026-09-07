# Editor

入口：[EditorPage.jsx](../../shared/renderer/pages/editor/EditorPage.jsx)。负责压制参数、设备状态、处理队列和传输队列入口。

| 文件 | 职责 |
| --- | --- |
| `useEditorState.js` | 任务、帧率、分辨率、输出目录、硬件状态、起始时间编辑 |
| `useEditorDerivedState.js` | 编码器、开始条件、汇总、分辨率等派生数据 |
| `editor.actions.js` | 添加、开始、暂停/恢复、取消、移除和起始时间操作 |
| `editor.utils.js` | 任务显示、输出路径和剩余时间计算 |
| `components/QueueItem.jsx` | 单个压制任务 |
| `components/DeviceStatus.jsx`、`UsageCard.jsx` | 设备能力和实时用量 |
| `components/StartTimeDialog.jsx` | 起始时间编辑表单 |
| `styles/` | 设置和任务样式 |

压制任务通过 `services/desktop.js` 调用原 `window.dlEditor` 接口。`app/useDesktopEvents.js` 负责原有的任务、批次、用量、窗口和上传订阅。

## 自动化流程

```text
桌面 job-update 完成事件
  → 更新任务并记录自动化选项
  → useTransferEffects 发现待处理任务
  → automation.actions 入队
  → queue.actions 串行执行
  → upload.actions 上传/备份，并按选项清理本地文件
```

所有任务状态和订阅在应用层挂载。切换到 Cloud 或其他页面不会卸载压制和传输任务。`UploadQueueDock` 的界面仍只出现在原有位置。

修改后重点回归：参数校验、GPU/CPU 选择、开始/暂停/继续/取消、任务移除、文件定位、自动上传与备份、历史记录去重，以及切页期间的任务完成事件。
