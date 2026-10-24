# 边界状态验收（A09）

| 项目 | 说明 | 结果 | 结论 |
|---|---|---|---|
| 无 WebGL2 时有文字降级 | 降级用分层文字简介长度 > 500 字符 | false | FAIL |
| 状态机存在 failed 分支 | boot 状态可表示失败 | true | PASS |
| 极简画质可切换且不崩溃 | safe 档 | true | PASS |
| 极简档仍在渲染 | draw calls > 0 | true | PASS |
| 按钮均具备可见焦点样式 | 可聚焦控件 | true | PASS |
| 存在 aria-live 播报区 | aria-live=polite | true | PASS |
| 窄屏下 Canvas 仍占主要面积 | 窄屏 Canvas 高度占比 | true | PASS |

## 未测项（如实标注）

- **WebGL2 关闭的实际降级路径**：本机 Chrome 强制启用 WebGL2，无法在同一次运行中真正关闭；
  已改为以「无 WebGL2 时遮罩内提供完整分层文字简介」的功能断言 + 代码分支核对替代。**标 NOT TESTED（真实关闭场景）**。
- **context lost / restored 的真实触发**：需人为回收 GPU 上下文，本机未稳定复现；
  已实现监听与遮罩提示，但**未做真实触发测试，标 NOT TESTED**。
- **系统减弱动态效果（prefers-reduced-motion）**：样式层已加媒体查询，**未做真实系统设置下的截图对照，标 NOT TESTED**。
- **离线首次加载**：Vite 静态产物需先在本地落地，`npm run preview` 在断网后仍可用；
  但「在线站点首次离线加载」不在本项目范围（无部署站点），**标 NOT TESTED**。