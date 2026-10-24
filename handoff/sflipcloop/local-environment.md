# 本机环境事实（已核实，2026-10-25）

> 用途：写入执行报告，并在实施时作为硬约束；也是审计网页规划「性能预算」是否贴合本机的依据。

## 硬件 / 系统

| 项 | 实测值 | 取得方式 |
|---|---|---|
| OS | macOS 15（darwin 25.4.0），arm64 | `uname` / 系统信息 |
| GPU | **Apple M5 Max**，Metal 4 支持，Retina 3456×2234 | `system_profiler SPDisplaysDataType` |
| 磁盘可用 | 约 188 GiB | `df -h ~` |
| 内存 | 未采集（按 M5 Max 常规配置推定为高带宽统一内存，**属推定**） | — |

> **对性能预算的含义**：本机为高端 GPU/WebGL 环境，**不应**按中端设备设定质量下限；
> 规划中的「中端/低端降级档」属于跨设备发布需求，需在本机通过 `devicePixelRatio` 上限、
> 阴影贴图尺寸、后期开关、斗栱 LOD、实例化等手段实现可切换。

## 运行时

| 项 | 版本 |
|---|---|
| Node.js | v26.0.0 |
| npm | 11.12.1 |
| Python | 3.9.6 |
| Homebrew | 可用（`/opt/homebrew`） |
| gh CLI | 2.95.0（已登录 `noyzin2006-arch`，scopes: gist / read:org / repo / workflow） |
| git | 已用 |

## npm 当前稳定版（`npm view <pkg> version`）

| 包 | latest | dist-tags |
|---|---|---|
| `three` | **0.186.1** | latest = 0.186.1 |
| `vite` | **8.3.5** | — |

> 规划若给出其他版本号，需说明理由；本机可直接 `npm install` 验证。

## 浏览器

| 浏览器 | 版本 | 用途 |
|---|---|---|
| Google Chrome | **155.0.8059.86** | 真实视觉验收、帧率测量 |
| Safari | 已安装（版本未采集） | WebKit 兼容性抽查 |
| 会话内置 Browser（Chromium） | 可自动化 | 截图、控制台/网络诊断、交互验收 |

## 已知约束

- 仓库 `noyzin2006-arch/yingxian-muta-3d` 为 **private**；不建 CI、不建公开仓库、不自动发布。
- 网页版 ChatGPT 的一次性规划产物位于 `handoff/sflipcloop/plan.md` 与 `handoff/sflipcloop/status.json`，
  由网页端通过 GitHub 连接器写入，本机只读回。
- 本机 `github` MCP server（`https://api.githubcopilot.com/mcp/`）已启用，但其工具未在本轮直接暴露，
  读写一律走 `gh` CLI 与网页连接器。
