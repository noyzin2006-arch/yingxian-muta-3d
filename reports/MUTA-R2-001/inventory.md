# T01 接口实查清单（inventory）

> 规划 §7.0 U01 的交付物：现有模块装配入口、npm 测试命令、CSS 真源、当前相机与诊断接口位置。
> 查找方式：`rg -n 'buildStructure|buildLevelFrame|buildLevelWalls|buildAllRoofs|buildLevelBrackets|mergeSafe|pagoda\.floors|clippingPlanes' src`（见本轮终端记录）。

## 装配入口（唯一）

| 事项 | 位置 |
|---|---|
| 主装配函数 | `src/geometry/building.js` → `buildPagoda(opts)` |
| 场景树根 | `src/main.js` → `stage.scene.add(pagoda.root)` |
| 楼层分组 | `src/geometry/building.js` → `ensureFloor('bright-N' / 'hidden-N')` + `globalGroup` |
| 分组消费 | `src/main.js`（逐层显隐）、`src/render/section.js`（剖切/分解位移） |

## 几何模块

| 函数 | 位置 | 本轮是否改签名 |
|---|---|---|
| `buildStructure()` | `src/data/structure.js:238` | 否（只新增 `wallTops` 等**返回字段**，不改参数） |
| `buildLevelFrame()` | `src/geometry/columns.js:95` | 否（`{columns,beams,braces,columnRecords}` 不变；record **新增** y0/y1 字段） |
| `buildLevelWalls()` | `src/geometry/columns.js:230` | 否（新增返回 `wallMaxY`） |
| `buildAllWalls()` | `src/geometry/columns.js` | 否（新增返回 `wallTops`） |
| `buildAllRoofs()` | `src/geometry/roof.js:309` | 否 |
| `buildLevelBrackets()` / `bracketProfileForLevel()` | `src/geometry/brackets.js:192 / 161` | **否**（正式 ledger / 跳数 / 54 种完全不动） |
| `mergeSafe()` | `src/geometry/mesh-profile.js:269` | 否 |
| **新增** `buildInterlevelContinuity()` | `src/geometry/interlevel-continuity.js` | 新增 |

## CSS 令牌真源

- **唯一来源**：`src/app/ui.css` 的 `:root`（本轮由 13 个变量扩到 49 个；规划 §3.1 的令牌**名**落进同一处，未新建第二个令牌文件）。
- 引入方式：`src/main.js` 顶部 `import './app/ui.css'`（单次引入）。

## npm 脚本（未改动版本锁）

```
dev     vite --host 127.0.0.1
build   vite build
preview vite preview --host 127.0.0.1
test    node --test 'tests/*.test.js'
check   npm run test && npm run build
```

## 相机与诊断接口

| 项 | 位置 |
|---|---|
| 相机限制 | `src/render/scene.js` → `CAMERA_LIMITS`（fov 45、near 0.15、far 350、极角 0.20–1.51、距离 12–185） |
| 机位预设 | `src/render/camera.js` → `CAMERA_PRESETS`（8 个） |
| 竖屏自适应 | `src/render/scene.js` → `ensureFits()`（沿当前朝向后拉 + 取景中心下移） |
| 调试接口 | `src/main.js` → `window.__yingxianDebug`（`?debug=1` 或开发模式） |

## 本轮新增的调试能力（只读，不影响产品行为）

| 方法 | 用途 |
|---|---|
| `getContinuityRecords()` | 新增估算件的世界包围盒记录 |
| `getAllStructuralRecords()` | 既有结构 + 新增件的全部记录（连续度检测 A 用） |
| `getContinuityDiagnostics()` | 生成器诊断（新增/去重/碰撞/连续区间） |
| `setCamera()` / `getCamera()` | 设定近正交立面机位（OrbitControls 距离夹取需注意） |
| `getScene()` | 场景遍历（验收脚本用） |
| `?nocontinuity=1` | **可复现的 A/B 对照开关**：关闭本轮新增过渡构架 |

> `?nocontinuity=1` 是本轮为「变更前/变更后同角同光对照」引入的诊断开关，
> 默认路径完全不启用，不改变正常用户看到的内容。
