# Guess

入口：[GuessPage.jsx](../../shared/renderer/pages/guess/GuessPage.jsx)。负责长期记忆猜测列表、详情、反馈和纠正值编辑。

| 文件 | 职责 |
| --- | --- |
| `useGuessState.js` | 列表、关联记忆、注册表、选中项、请求序号 |
| `useGuessEffects.js` | 页面激活和账号变化时加载 |
| `guess.actions.js` | 获取关联数据、提交反馈、更新列表选择 |
| `guess.api.js` | guesses、items、registry 和反馈端点 |
| `guess-value.js` | 标量、布尔、列表、JSON 的识别、校验和转换 |
| `guess.utils.js` | 时间筛选、排序、状态标签和移除后的选择 |
| `guess.constants.js` | 筛选项、枚举选项和中文标签 |
| `components/` | 值展示、选项 chips、编辑器和列表按钮 |

接口仍为 `/memory/long-term/guesses`、`/memory/long-term/items`、`/memory/long-term/registry`，反馈使用原 `/respond` 路径和幂等键。

业务数据与选中项在应用层保留；页面内部的筛选、草稿和操作提示继续保留原有组件生命周期。请求序号和冲突错误处理没有更改。

修改后重点回归：待反馈/确认/不确定等状态、时间筛选、枚举和自由输入、JSON 校验、重复提交、冲突响应，以及反馈后列表选中项。
