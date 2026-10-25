kind: plan
task: MUTA-R2-001
round: 1
nonce: b515513ef8af930a
brief_sha: f21a5ee6c154ab30a232fb839cf187e7d8b269d2

# 应县木塔实时三维展陈｜R2 全貌体量连续性修复：一次性交付规划案
**身份**：首席设计与首席规划；**日期**：2026-10-25；**性质**：仅规划，不声称运行或审查本地源码。  
**受限输入**：只读取了 `handoff/briefs/MUTA-R2-001.md`（blob `f21a5ee6c154ab30a232fb839cf187e7d8b269d2`）、`handoff/spec/plan-spec.md`（`01a51bbde14c05b27df30364240d9fc9169540af`）、`handoff/spec/design-quality-bar.md`（`d11c1410d71c9ac2c8819b43ba82588ba2d7a738`）。所有其他仓库内容均未被网页版规划者读取；下述代码路径/函数来自简报引文，局部实现细节必须由本机执行者在 T01 核查，不得假装已经核验。

## 1. 需求、范围与非目标
### 1.1 需求与明确判断
用户原话的目标是消除「层与层之间断开、整体读起来像一摞悬空板」，使远观为「连续的一体化木构体量」，保留测量事实与实时性能。诊断：当前第一明层顶部至暗层起点有 2.30m 绝对缺项；各明层墙顶到正檐下缘又有 1.6–3.5m 缺项。**优先修复承重视觉链（柱—枋—斜撑—斗栱—檐），而不是加厚屋顶、调整灯光或用不透光板封空。**五明四暗的结构逻辑必须在剖视中仍可识别。

### 1.2 范围内
1. 四个明暗过渡结构带的连续构件（外槽、内槽、边枋/地栿/草栿、斜撑、短柱、次铺作）。首层 `[12.5,14.8]` 的断裂必须独立修复；`[14.8,17]` 与后续三个暗层联动。
2. 首层墙顶—檐口区域的合理补接；二、三、四层同理；五层 `[52.0,54.1]` 的攒尖屋面承托单独处理，**不得造第五个暗层**。
3. 程序化生成、去重/合批、剖切及分解分组归属；延续既有楼层分组和材质出口。
4. 自动化连续度扫描、八方视图、首层与典型暗层细节截图、室内剖视、性能、离线与响应式回归。
5. 新增几何参数的“估算/待核实”出处记录；UI 只做不破坏现有操作所必需的状态和说明修正。

### 1.3 范围外（硬禁止）
不变更任何已核实参数或其登记值：总高 67.31m、底层最远顶点距 30.27m、高径比 2.224（容差限仅用于验收，不是改值许可）、北测逐层面宽 9.553/9.148/8.800/8.439/8.004m、首层 56 柱及外槽 24 + 内槽 8 柱信息、层铺作跳数 7/7/6/5/4、斗栱 54 种、约 4m 台基等；不改裙檐支点、椽屋面接触、索引合并、台基 33m、瓦面法线方向、竖屏相机逻辑。不得采用下载模型/贴图/网络字体/CDN/外部依赖运行时资源；不做材质/照明/外观全盘推翻，不做外部摄影测量、真结构安全模拟、部署或 CI。维持 Three.js 0.186.1 + Vite 8.3.5 + JS ES Modules + 静态离线 SPA。

### 1.4 验收真值表
|ID|指标、方法、硬阈值|
|---|---|
|V1|八个正视角、0.1m 竖向离散扫描，在四层过渡带以及五层上部承托区，没有**连续 >0.8m** 的“外立面完全缺件”纵向带；仅首层裙檐下实物回廊豁免，扫描算法详见 §5.4。所有扫描出具 JSON+可视叠图。|
|V2|每个暗层近立面至少在每八角面上能辨识 **立柱/短柱、≥3 道标高枋、斜撑/叉手、斗栱或托梁** 四类，结构呈深色连贯带；每面视觉占有率（§5.4）≥0.28，在正视图中同尺度观察不会与背景成为一条通透空缝。|
|V3|一至四层原有 1.6–3.5m 屋檐下透空以有来源标注的构架填实；**不能以无纹理整面实心墙伪装木构**。首层 2.30m 空白必须消失。|
|V4|对锁定尺寸对象 `Object.is()`/深度快照对比，锁定数值零改动；总高、底径、各层面宽、柱计数、跳数、54 类不变；几何计算的高径比误差 ≤2%。|
|V5|同机高档 Chrome 155、1920×1080、DPR1，2s 预热后 10s RAF 采样中位 FPS ≥55；draw calls ≤450，triangles ≤1,200,000；记录旧值 59.88/101/489,360，仅作为简报基线，非本轮实测。|
|V6|剖视后可逐层数出五明四暗；双圈柱网、佛坛/造像无遮挡或可通过裁剪查看；拆分/还原、视角旋转无残留。|
|V7|1920×1080 与 390×844 完整显示塔刹至台基且可操作，另检查 375、768、1440px；0 水平滚动、0 控件遮挡。|
|V8|中文文案与新增构件注明“估算/待核实”；不把图像观察当作 3D 测绘精度；引用清单和估算参数表完整；运行时第三方请求 =0。|
|Q1|§3–4 与质量线 A–E 各项 PASS 或附具客观理由的 N/A；关键功能键盘操作、读屏名称、焦点、四态；FAIL 直接阻止交付。|
|D1|离线静态 SPA 可启动；`npm run build` exit0；必需静态检查/视觉证据/本机测试报告按 §8–9 落盘。|

### 1.5 环境与依赖
按简报：macOS 15 / Apple M5 Max / Node 26 / npm 11.12.1 / Chrome 155、无真机、无付费 API、无 TTY。所有验收为**本机执行 Agent 的后续责任**；网页版未运行。JS 项目已有 `buildStructure`, `buildLevelFrame`, `buildLevelWalls`, `buildAllRoofs`, `buildLevelBrackets`, `mergeSafe`, `pagoda.floors`；详细入口使用 T01 定位；不得臆造其他现存 API。

## 2. 线上调研、最高水准参照与学习结论
**调研日期** 2026-10-25，资料的能力描述来自下列公开一手资料；不能把展示型软件的摄影扫描精度等同于本项目程序化估算模型。

|参照（类型与可核对网址）|其最佳做法 / 本项目精确借鉴点|不照搬之处|
|---|---|---|
|**Smithsonian 3D Voyager**，博物馆 3D 展品查看器；https://3d.si.edu/es/how-use-3d-viewer 与 https://smithsonian.github.io/dpo-voyager/explorer/overview/ |导览、注释开关、材质/光线、测距及剖切可作为彼此独立的查看模式；本项目维持“全貌/剖视”之间明确可逆切换，关键构件在剖视里仍能点验。|不把多媒体文章、社交分享、复杂测量工具塞入本轮，防止主问题被功能噪音掩盖。|
|**CyArk Documentation**，文化遗产数字孪生；https://www.cyark.org/whatwedo/documentation/ |激光测距+地面/航拍摄影测量配合，是精确文物记录的参照；本项目借鉴**凭据与几何分层**：明确哪些是核实值，哪些仅用相片推测。|不宣称本项目达到毫米级/扫描级精度，亦不引入其数千万面模型与大贴图。|
|**Google Arts & Culture 3D Models**，建筑/展馆 3D 导览；https://artsandculture.google.com/project/3d-models |第一屏先传递完整轮廓、用户通过观察角度探索细节；本项目把**远景八方体量辨识**置于模型细节前。|不引入其联网内容、沉浸内容装饰或背景大场景。|
|**3D Heritage（WEAVE/5DCulture）**，文化资产在线查看器；https://www.3d-heritage.eu/en/about/ |对文化遗产模型“可检查/可测量”的展示标准；本项目用结构层与视觉验证证据串联远看和近看。|不增加在线存储、公开扫描数据上传或第三方查看器。|
|**Matterport Dollhouse / Trim**，建筑空间整体与剖视；https://support.matterport.com/s/article/How-To-Use-Dollhouse-Trim?language=en_US |剖视是**可撤销的显示过滤**而不是永久删除几何；本项目坚持原组内显隐与材质裁剪，返回全貌零丢件。|不引入其商业 SDK、楼层漫游或拍摄网格。|

**建筑研究与真实性核验**：UNESCO 世界遗产预备名单文字 https://whc.unesco.org/fr/listesindicatives/5803 明确应县木塔五层六檐、五明四暗、双圈柱与 67.31m；新闻实物立面/剖面可作为肉眼结构归属的辅助参照，但**新增构件尺寸不得由新闻图片直接认定为实测**。相关具体图可在已有 `references/photos/manifest.json` 中逐张按许可与视角核对（本轮网页未读取该仓库文件）。文化遗产重建证据纪律依据 **London Charter** https://www.london-charter.org/principles.html 与其细化文档 https://www.london-charter.org/documentation.html ：必须可追溯研究来源、估算依据、推断过程，区分现存状态/假设复原。

**设计系统与技术规范**：W3C WCAG 2.2 https://www.w3.org/TR/WCAG22/ （文字 4.5:1，界面图形 3:1；本项目触控≥44px）；Material 的动效缓动 https://m1.material.io/motion/duration-easing.html （`cubic-bezier(0.4,0,0.2,1)`）；Three.js 官方 `mergeGeometries` https://threejs.org/docs/pages/module-BufferGeometryUtils.html （合并要求属性/索引一致）、`InstancedMesh` https://threejs.org/docs/pages/InstancedMesh.html （重复件减少 calls）、`WebGLRenderer` https://threejs.org/docs/pages/WebGLRenderer （`renderer.info.render.calls/triangles`、local clipping）。官方剖切实例 https://threejs.org/examples/webgl_clipping_advanced.html 是验证材质裁剪的可查入口。技术 API 具体执行仍以本机已锁版本 0.186.1 为准，不把在线最新版当 0.186.1。

**2026 品类判断（由上述参照归纳，而非声称行业普查）**：主流优质文化遗产实时展陈强调“远观轮廓可信、近看结构层次、证据声明可追溯、交互简约、剖视可逆”；正在被淘汰的实践是单一光鲜贴图遮挡空构件、缺失来源的假精确、把观看体验做成拥挤的 3D 工程控制台。**完成标准**：即便关闭材质纹理、只以简化着色观察，远近两档仍存在贯通的柱—梁—铺作—屋檐关系，且估算证据与原数据完全隔离。

## 3. 设计语言与规范（本轮增量，不推翻现有页面）
原则：**结构可信度优先，UI 保守增量**。T01 若发现现有页面有设计令牌，先作变量名映射至同一个最终文件；不得创建两个并列令牌源。新文件与规则位置为 `src/styles/tokens.css`（若已有同职责文件则沿用旧路径而仅保留一处），三维参数另集中 `src/data/continuity-estimates.js`，不是第二份 UI 令牌。

### 3.1 令牌表（完整稳定值）
|类别/令牌|具体取值|使用规则|
|---|---|---|
|背景 `--bg-0/1/2/3`|`#121B22 / #19252D / #24343E / #31444D`|页面/侧板/浮层/悬停板；只给 DOM。|
|文字 `--fg-main/secondary/weak/inverse`|`#EDE9DE / #C9D1CE / #AEBDB9 / #121B22`|正文/说明/非禁用次标/浅金底深字；分别在 bg0/bg1/bg2 的对比度约14.36:1/10.04:1/6.59:1。|
|强调 `--accent/bright`|`#D19D5B / #FFD89B`|选中态边标/键盘焦点（明亮档）与高亮底；accent 在 bg0 约7.2:1。|
|语义 `--ok/warn/danger/info`|`#98DEBD / #FFD39A / #FFABA5 / #9ACDF2`|成功/待核实/错误/引导；永远附文字标记，非纯色提示。|
|边框 `--stroke-strong/soft`|`#AEBDB9 / #50636D`|可交互控件 1px 强边，对应 bg2 ≥6.5:1；弱边仅装饰分隔，不能用作可点击控件唯一边界。|
|禁用 `--fg-disabled`|`#71858C`|bg1 上约4.04:1（≥2:1）。|
|材质附加色 `--mat-frame/beam/brace/shadow/roof`|`#553A2B / #624533 / #493224 / #261D1B / #434E49`|**仅新增估算结构**的 sRGB 色值，实际材质必须走现有 makeWoodMaterial 等出口；不能无依据重染旧实测/既有几何。深色带通过构架密度产生而非黑色遮挡。|
|字体|`"Noto Sans CJK SC","Source Han Sans SC","PingFang SC","Microsoft YaHei",sans-serif`；数字 `"SFMono-Regular","Menlo","Consolas",monospace`；西文 `"Helvetica Neue","Arial",sans-serif`|显式字族栈，加载本机已有字体，不联网；数字 `font-variant-numeric:tabular-nums`、中西文 `font-feature-settings:"kern" 1,"palt" 1`。|
|字阶 6 级 `--text-xs/sm/md/lg/xl/2xl`|12/14/16/20/25/31px；行高 18/21/26/26/31/38px；字重 500/500/400/600/650/700；字距 .02em/.01em/0/-.01em/-.015em/-.02em|比例约1.25（12→14 作为紧凑辅助）；名称/辅助/正文/卡题/章节/大标题；标题行高约1.23、正文1.625；正文 max-width:40ch（中文）；数值行不超过 75ch。|
|间距 `--s1…--s9`|4/8/12/16/24/32/48/64/96px|图标-文 8、并组控件 8、按钮组 12、卡内部 16、页面边 24、主要区段 32、桌面超大留白 48；所有间距落到 4px 栅格。|
|圆角 `--r-xs/sm/md/lg/pill`|4/8/12/16/999px|标签 4、按钮 8、卡片 12、对话框 16、状态点 999。|
|描边/分隔|1px `--stroke-strong` 用交互边界；1px `--stroke-soft` 仅非交互分隔|同一块只选一种层次手段：分隔线 OR 间距，不叠加描边+阴影+底色。|
|阴影 `--shadow-0…4`|`none`; `0 2px 8px rgba(0,0,0,.16)`; `0 8px 24px rgba(0,0,0,.24)`; `0 16px 40px rgba(0,0,0,.32)`; `0 24px 64px rgba(0,0,0,.40)`|0 静态/1 提浮按钮/2 面板/3 弹层/4 紧急浮层；阴影函数里只在令牌定义 rgba。|
|z-index `--z-scene/hud/menu/dialog/toast`|0/10/20/30/40|画布/HUD/菜单/模态/状态通知；禁止散落数字。|
|动效 `--t-micro/state/enter`|100/180/260ms；`--ease-standard:cubic-bezier(.4,0,.2,1)`；`--ease-out:cubic-bezier(0,0,.2,1)`|交互反馈 ≤100ms，模式切换180ms，面板进入260ms；DOM 仅 opacity/transform；几何镜头不加无意义长动画；`prefers-reduced-motion:reduce` 动效时长0ms并禁止自动绕塔。|
|图标|自绘统一 SVG 24×24 viewBox，20px 实际图，stroke 1.75px，linecap/linejoin round，4px 的图标网格，禁 emoji|新增图标仅显示“层叠”“剖面”“信息”“关闭”；所有图标按钮 aria-label。|
|栅格|断点 ≤480 / 481–768 / 769–1024 / 1025–1440 / ≥1441px；桌面工具画布全宽，左右 inset 24/24/32/32/48px|画布可全幅；文字栏 `min(360px,calc(100vw - 48px))`；内容文案宽≤40ch；底部触控带不与塔基叠合。|

**重要**：三维物体的世界光照、色彩空间与现有材质算法不得被 DOM 令牌改写。所有新增 DOM 色值从唯一令牌源引用；若原 CSS 有变量，建立映射而非保留冲突定义。无外部图片/字体；`font-display:swap` 仅在项目已存在本地 font-face 时才适用，无本地 webfont 时标记 N/A（不能凭空创造 font-face）。

### 3.2 精确组件规格与九态
新增组件/既有组件被触及时统一基态：交互高度 **44px（移动与桌面）**、水平内边距 16、行内 icon 与文间距 8，边框 1px strong、半径8、正文14px/21px；`:hover` 仅 `@media (hover:hover) and (pointer:fine)`，背景从 bg1→bg3；`:active` bg3+scale(.98)、时长100ms；`:focus-visible` 外2px `--accent-bright` 描边 +2px offset，不被裁掉；选中为 accent 2px 左侧/下侧线与 `aria-pressed=true`，焦点环始终有别于选中；禁用 `aria-disabled=true`, disabled 文本 disabled 色+图标和文字“不可用”，不得只变灰。加载：带可读状态文本与 CSS 转动的16px线环（reduce-motion 下静态），超过1s“正在准备木塔结构…”，超过10s“仍在处理，可取消”；错误：danger 图标+文字“本地模型初始化未完成，请重新加载页面”；空：“当前视图没有可显示的构件，返回全貌查看”；成功：“已切换至全貌 / 已进入剖视”，`aria-live=polite`。按钮事件必须幂等、防连点，重复动画不叠加。

|ID/组件|结构、尺寸、语义、状态特例|
|---|---|
|C01 三维主视口|`<main>` 内画布 + 标题区 + 控制区，width/height:100%，min-height:0；canvas `role=img` `aria-label="应县木塔可旋转的三维模型；使用视角按钮或方向键观察"`，包含独立视觉隐藏操作说明。初始：完整远观。加载：在同位置显示文字+CSS 圈进度；WebGL 出错：显示带“重试渲染”的按钮；场景构件为空：呈空态引导，不黑屏。成功提示进入 live region。画布不吞掉 Tab。|
|C02 视图切换/剖视按钮组|沿用已有 DOM 结构，若缺则 `<div role=group aria-label="木塔视图">` 两个 button：“查看全貌”“查看剖面”；每个44px高，14px字重500，操作后 `aria-pressed` 同步且仅有一个 true。Tab→Enter/Space；Escape 剖视→全貌，恢复焦点。加载时 aria-busy；错误/空/成功复用 C01 状态块。|
|C03 楼层/暗层说明|只在原有信息栏存在时增补一段，不强加新侧栏；360px 宽上限、padding16、radius12、标题20px，文案16/26，行宽≤40ch；补件写“暗层构架：估算示意，非原样实测”。信息缺失时“该层构件说明待核实，仍可查看结构”；值错误时不展示假的厘米精度，显示“尺寸来源待核实”；成功带“已查看第 n 暗层”。|
|C04 证据标签|小标签（非按钮）高24、padding4×8、12px/18、radius4，warn 文色在 bg1；字面“估算构件·待核实”，随说明而非每木块浮动。异常无来源时显示“来源信息未核对”，不得藏匿。空态“当前视图无新增估算构件”。|
|C05 状态通知|右上固定或移动底部 safe-area 上方，max-width min(320px,100%-32px)、padding12/16、radius8、z40，role=status/错误 role=alert；成功180ms淡入、最长3s后隐藏；错误驻留至用户关闭；不能挡主视图或首屏操作。|
|C06 调试覆盖层（仅 `?diagnostics=1`）|只读 panel/可复制 JSON，宽 320、padding16、mono12px，渲染 calls/triangles/FPS/连续率表；非诊断状态完全不挂载。无检测数据时“诊断尚未采样”，错误时展示步骤“刷新后再采样”，采样成功显示 PASS/FAIL 文本而非红绿点。点击展开、收起键盘可达。|

**通用 9 态覆盖**：静态组件（如 C04）悬停/按下/聚焦/禁用为 **N/A（非交互语义）**，但空/加载/错误/成功内容仍由所属信息面板显示；无需伪造不可点击的按钮行为。C01 场景拖拽的 hover 为光标变化但键盘替代（左/右 ±15°，上/下俯仰 ±10°，`+`/`-` 缩放一级，R 返回全貌）。触屏无需 hover 才可发现操作。摄影图若在对照面板出现，仅引用现有本地许可文件，并带逐张 alt/版权；本轮默认不新增照片 UI。

## 4. 体验设计
### 4.1 信息架构与操作序列
仅一个 SPA 页面，最多两层：**模型画布** → 浮置视图切换/信息说明；诊断层通过 query 明确进入，普通用户看不到。主旅程：
1. 进入 SPA；立即看到“应县木塔·实时三维展陈”与“正在准备构架…”；渲染成功后 ≤2.5s 可操控；全塔从台基到塔刹都在首屏。
2. 默认透视三分之四视角；主视野可以辨认明层窗区与暗层**连续深色木构带**，而非五块断开的盘。交互控件总在首屏，用户拖拽/按钮改变角度，即时反馈。
3. “查看剖面”后以同一裁剪平面显露五明四暗和双圈柱网；用户点击“查看全貌”所有组恢复；两模式转换无造型跳变/闪白。
4. 点层级说明可读“实际测量数字”与“估算构架”不同可信级标签；任何未知不显示假测量。
次旅程：390×844 手机用大按钮切换全貌/剖视；用方向按钮（如现有界面有则沿用）或触控旋转；断网重载 bundle 可完整运行。

### 4.2 布局（与现有交互兼容的最小补丁）
```
1920×1080
[标题/辅助说明  max-width 40ch]      [信息/估算标签 320–360]
[                    三维全貌画布（主视觉）                  ]
[视图模式按钮 44高]                       [必要的操作提示]
390×844
[标题 16px / 简短信息]
[  可用纵向空间的三维木塔（塔刹—台基完整，不遮挡） ]
[底部安全区上方 两个视图按钮，均≥44px]
[可折叠证据简述，默认收起、无水平滚动]
```
≥1441 画布内边距48；1025–1440 32；769–1024 32、信息栏≤320；481–768 24、信息移底部可折叠；≤480 16、控制栏紧凑两列（各 `(宽-8)/2`，间隔8）、操作区底部留 safe-area+16。边栏若为现存持久侧栏，折叠时必须保留其所有入口。主画布与工具层用绝对定位或 grid 布局时，为画面预留控件安全区（桌面 bottom ≥88px、竖屏 bottom ≥136px）；维持现有竖屏自动后拉与取景中心下移算法。

### 4.3 反馈文案与无障碍
- 空：“这一层的估算构件暂时不可见。请切回全貌，或打开剖面查看柱网。”
- 加载：“正在生成木塔构架…”；超过1秒：“结构较复杂，正在完成程序化几何构建。”
- 错误：“浏览器未完成三维初始化。请选择‘重试渲染’，或刷新页面。”；只有 WebGL 不支持时写“当前浏览器无法使用 WebGL；请改用支持 WebGL 的 Chrome。”
- 成功：“全貌已恢复，所有楼层可见。” / “剖面已打开，可查看五明四暗。”
- 焦点从首屏标题跳转链接 → 模式按钮 → 信息栏按钮 → 其他既存工具；键盘全流程 Tab/Shift+Tab/Enter/Space/Esc；焦点环≥2px，zoom200% 无隐藏；背景画布不会成为键盘陷阱；所有说明用 `aria-describedby`；正常状态用 polite，致命错误用 alert；颜色状态带“通过/未通过/待核实”文字。
- 静止默认，转场只变 opacity/transform；reduce motion 全关且不降低可达性；切换轻操作反馈100ms内可见，300ms内完成 UI 切换（首次几何构建单独归加载流程）。

## 5. 技术实现、几何参数、数据流与边界
### 5.1 不动的原始标高
**唯一读取** `LEVEL_LAYOUT`：square base 0–1.6，octagonal base1.6–4，`eaveY=[10.5,16,25,34.5,44,54.1]`，apex57.31，finial67.31；`brightBands=[[4,12.5],[17,23.4],[26.2,32.8],[35.8,42.3],[45.2,52]]`；`hiddenBands=[[14.8,17],[23.4,26.2],[32.8,35.8],[42.3,45.2]]`。这些数组不改。现有檐 `EAVE_CONFIG` offset/rise/owner 及 `BRACKET_DROP=1.1` 不改；墙高 `colH*0.66` 的“实见墙顶”应在 T01 从**实际网格 boundingBox**测得，不能把 `brightBands.y1` 当作真实墙顶。

### 5.2 新增“过渡构架”三类，参数是估算不是历史测绘
**计算区间** `P1:[12.5,17.0]`, `P2:[23.4,26.2]`, `P3:[32.8,35.8]`, `P4:[42.3,45.2]`, `C5:[52.0,54.1]`。前四是“明—暗交接与暗层可见构架”，C5 是屋面下承托，必须归 bright-5 而非新造暗层。原则：**已有柱/梁与新件合并后只增加缺失段；不与旧几何叠一根完全相同的柱；所有估算物都可识别/可显隐**。

新增 `src/data/continuity-estimates.js`（只读调用，完全不写既有 M 表）：
```js
export const CONTINUITY_ESTIMATES = Object.freeze({
  provenance: 'visual-structure-estimate; not measured',
  sources: ['references/photos/manifest.json',
    'https://whc.unesco.org/fr/listesindicatives/5803'],
  perimeterLedgerBeamWidthM: 0.24,
  perimeterLedgerBeamHeightM: 0.30,
  intermediateLedgerMaxStepM: 0.74,
  postWidthM: 0.25,
  braceWidthM: 0.18,
  braceDepthM: 0.16,
  gapClosureOverlapM: 0.08,
  facadeDepthLimitM: 1.20,
  topEavePlinthDepthM: 0.20,
  certainty: 'estimate',
  measurementDatum: 'visual alignment only; no survey'
});
```
所有数值为**初始渲染估算值**；不得以之覆盖柱数、跳数、面宽等已核实值。分支 U02 指定相片冲突时的数值取舍。八角形每边重用已有 `outer.vertices` / `inner.vertices`、`outerEdges`、`innerEdges`；不得重新推定面宽或生成不同比例的八角形。

**构架布局算法（执行默认必须照做）**：
A. 对每个 P 区间，生成两道主要外周连续枋，中心标高 `y0+0.16` 与 `y1-0.20`，再在中间插入均匀枋，使任两中心间距 `≤0.74m`（`n=ceil((y1-y0-.36)/.74)`，共 `n+1` 道）；厚度0.30m、高程容许搭接0.08m；仅为可见表层的**结构梁条**，绝不填平八角整面。
B. 每个可见八角面按**既有 24 外槽柱的周向位置**分为 3 跨，每跨端点设短柱/连接柱：`x,z` 由该位置所在上、下层**既有已生成柱网**的同编号点线性内收插值得到；若某编号不存在，沿本层已证实八角面边线按1/3、2/3点插值并标记估算，**不能更改登记柱数**。柱沿 y 跨全段，高度 `max(0,y1-y0)`，截面0.25×0.25m；如与已存在柱段共线且三维包围盒重叠率≥90%，不重复生成实体，只给该段添加语义索引。
C. 每八角面 3 跨放**每跨一组 V/人字斜撑**，由跨两端低位 `y0+0.20` 收束至跨中 `y1-0.30`；对太狭窄 (<1.2m 高) 的局部高度取消斜撑，保留水平托木；深度方向使用已有槽位内偏0.32m而非飘在栏杆外；不出现穿透窗棂、佛像/佛坛。斜撑名义厚0.18×0.16m。照片证据不足时形制仅标“结构示意”，不声称真实撑式。
D. 在每段顶部距上檐下至少0.20m的可见区域添**托木与小铺作过渡层**：调用现有 `buildLevelBrackets`/已定义 profile/材质映射重新布件；**不新增任何“跳数”到正式铺作 ledger**，新增的是简化承托件 `isEstimatedSupplement=true`，节点按原有位置对齐；若会与现有斗栱重复，则仅增 2 道收边枋（0.24×0.30m）并登记“补撑，不新增正式斗栱”；已有斗栱种类数量与现有 profile 不变。
E. 首层 P1 `[12.5,14.8]` 必须用连续梁+短柱+斜撑补足，P1 后半段与原有暗层 `[14.8,17]` 复用几何/去重；**不能因旧 hidden 区段起点14.8就只处理旧暗层**。墙到檐口之间真实屋檐下剩余缺口：用靠柱头的**透空木枋+承托层**桥接，原窗/门格不封；计算每层墙顶时采用 mesh boundingBox，不用改墙高度因子0.66硬伸墙导致窗变形。
F. P2–P4 同法；C5 只做第五层屋面下收边、8面短柱与托木，绝不标为暗层。裙檐 10.5m 的底层回廊和台基不加填充。
G. 以端点融合（同材质/轴向/顶点距离≤0.02m）删重，对新旧几何碰撞分类：与旧件共线重合≥90%直接删除新件；相交但非重合且属于有效榫卯承托允许接触，**穿越门窗/造像或离开框架外缘1.2m**即 FAIL 并回退新增件。根本原则：以已测塔身为锚，不反过来移动已测部位迎合新估算物。

### 5.3 模块精确契约与生命周期
|位置|职责/新接口|要求|
|---|---|---|
|`src/data/continuity-estimates.js`| `CONTINUITY_ESTIMATES` frozen 常量|仅 estimated provenance；M 注册项目 **0 改动**。|
|`src/geometry/columns.js` 或同职责新 `src/geometry/interlevel-continuity.js`|`buildInterlevelContinuity(structure, {layout, estimates, existingColumnRecords}) -> {pieces, records, byOwner, diagnostics}`|每个 `piece={geometry, materialKey, ownerGroup, kind, bandId, certainty:'estimate', sourceIds, bbox}`；`record={id,bandId,kind,faceIndex,y0,y1,sourceIds}`；`diagnostics={added,skippedDuplicates,collisions,continuousYRanges}`；纯生成函数不得改传入 structure。|
|`src/geometry/columns.js` `buildLevelFrame()`|原返回 `{columns,beams,braces,columnRecords}` 不变|若增加新字段必须可选，禁止破坏已有调用；优先外层组合新 module 后挂载，避免改变旧函数签名。|
|`src/geometry/brackets.js`|`buildLevelBrackets()` 和 `bracketProfileForLevel()`|正式 ledger/跳数/54种不变；补件记录走 `supplementLedger`，不可混入正式斗栱统计。|
|`src/geometry/balustrade.js`|`buildAllBalustrades()`|不拉伸台面覆盖洞口，不改变扶手。|
|既有三维组装入口（T01 本机查找 `pagoda.floors` 的真实文件）|`attachEstimatedContinuity(pagoda, continuity)`|P1→hidden-1，P2→hidden-2，P3→hidden-3，P4→hidden-4；C5→bright-5；不可塞 `globalGroup`。保留每明/暗可单独显隐的原组；分解只移动 ownerGroup。|
|既有几何合并处 `mergeSafe(list)`|同材质/owner/可见层合并几何|所有新增 Box/Extrude 保持兼容索引状态；必要时 `mergeSafe` 统一，**不可把已有索引巨量膨胀成非索引**；草栿和撑的材质相同时合批，少量多实例同形转 InstancedMesh。|
|新增 `src/validation/continuity-metrics.js`|`analyzeContinuity({records,structure,views,stepM:.1}) -> {pass,perBand,perView,failRanges,estimatedOnly}`|测试模块独立于 DOM，见 §5.4；任何缺失 records 不默认为 pass。|
|现有 UI 样式或新 `src/styles/tokens.css`|token root/theme|唯一 DOM 令牌；只触及本轮相关组件。|
|既有视图切换/材质裁剪调用点|`setViewMode('whole'|'section')`|若已存在等价行为**复用**，不重写；不改变裁剪平面随相机方位的约定；新对象继承 clippingPlanes 与 clipShadows。|
|新增 `scripts/verify-continuity.mjs`、测试文件、`reports/MUTA-R2-001/`|批量断层自检、证据归档|无 CI、不部署；使用既有 npm/Node/Chrome。|

**数据流**：固定参数和组网 → buildStructure() → 旧 frame/roof/walls/brackets → `buildInterlevelContinuity` → 坐标/碰撞/来源校核 → 同材质合并 → 按 ownerGroup 加入塔组 → WebGL 实时渲染/剖切 → 只读诊断/截图/JSON 报告；本轮不新增浏览器持久化，刷新回默认全貌。未识别参数/缺少材质时走 §7 分支；任何新增估算构件生成失败，仅本地诊断强制 FAIL、显示无损旧模型加错误说明，不偷偷当作 V1 PASS。

### 5.4 防“平面板错觉”的双重检测
**检测 A（构件存在性，可靠输入：渲染前的实际 records + 新旧几何 bbox）**：
- 对八个外立面面心方位 `φ=π/8+kπ/4`，各取该八角面沿边线 32 个等距抽样点；沿外墙径向深度 `[-0.20m,1.20m]` 的射线与真实已渲染 mesh 交（世界坐标、含实例 worldMatrix），跳过台基/地面/装饰文字/UI；仅统计有效 columns/beams/braces/brackets/roof 的 AABB 粗筛后做精确 ray intersection，**不能只用整体 AABB 判命中**。
- `y` 自 P1 到 C5 的目标区间每 0.1m（含两端），判定 `hits(y,view)`：32 采样射线中至少 1 个碰到结构才算“该高度非完全无构件”；对每个 view 的连续零命中 y 步长并段，**长度 >0.8m 则 V1 FAIL**。另外每段中间 70% 高度的可见样本占有比 `occupiedSamples/totalSamples ≥0.28`，单角落柱不能冒充“密集带”，否则 V2 FAIL。报告分别给 `maxBlankRunM`、`centerOccupancy`、逐 `band/view` 的采样数。首层 skirt 下回廊只豁免 y∈[4,10.5]，**P1 无任何豁免**。
- 切割模拟：在 whole 模式检测后再按 section 组显隐做一次，不以“整面实墙封洞”完成 V1 而牺牲 V6。明层正窗区不参加暗层中心占有率。

**检测 B（真实投影/人眼核验）**：
- 针对 `φ=0°,45°,90°,135°,180°,225°,270°,315°` 建同目标点、固定焦距的正交立面截图；每张都带 y 标尺与 P1–C5 区间黄色调试线（只在诊断截图）；另取一张距塔适当位置的全貌透视，观察是否能数出完整塔身。
- 本机脚本把截图中塔身从 y=12.5 到 y=54.1 的投影区域与照片对照，逐 P 区段记录“有无完全通天的背景空带、是否出现结构穿出屋瓦、阴影是否吞噬支撑、深带是否比明层更空”；这些**人工观察项目不得伪装成程序自动 PASS**。保存同机变更前/变更后同角同光截图，图片大小无默认滤镜。
- 量化的“深带”不靠调低亮度作弊：将新构件暂时设为单一中性灰、关闭复杂材质光照作 A 测试；A 通过后再回正常光照作 B。不得用背景同色平板遮掩。

### 5.5 性能、边界和禁令
合批 owner/material/kind 组合，保持可分楼层；新增增量预算 **≤180 draw calls、≤400,000 triangles**（这是增量预算，最终仍以 V5 为硬闸门）；各暗层所有共形重复件优先一次 `InstancedMesh` 或合并；避免对每根木条创建独立材质/阴影灯。首次可交互≤2.5s，CLS≤0.1，轻操作≤300ms、100ms先反馈；10s 采样中位FPS。禁止空黑页、假留白套板、临时粘贴 CDN、下载扫描资产、改变屋顶弯曲与法线、创建超密网格、通过关掉部分暗层换 FPS、无限重试 shader 编译。
几何世界单位米，缺失坐标/NaN/Infinity/零长 beam：跳过新增件并登记 `reason`，测试 FAIL；未知 `levelIndex` 抛明确 Error；过短撑长 <0.35m 则不生成；每次构建独立局部数组，避免重复运行追加两次；切换剖视时不重新 build 几何；性能测试 warmup 固定、焦点可见、禁后台节流；浏览器 WebGL 不可用给 C01 错误态。所有异步操作加 abort/error 兜底；没有列表>200，故虚拟滚动 N/A；不新增表单及破坏性操作，删除确认 N/A；离线无服务端并发写入，网络失败 N/A 但任何外部请求为失败。

## 6. 逐件任务拆解（依赖序、含八要素，执行即验）
**固定顺序：T01→T02→T03→T04→T05→T06→T07→T08→T09→T10→T11→T12。每项除规格七要素外额外显式写“目标”，所有命令在仓库根目录执行。**

### T01 基线冻结与旧接口实查（依赖：无；规范 V4/V5/V6、C01）
- **目标**：保存一份不会被模型优化污染的现状事实。
- **前置/输入**：main 当前工作树、简报包含的函数/摘录。
- **操作**：本机只在自身工作环境检查 `package.json`、真实源码中 `buildStructure/buildLevelFrame/buildLevelWalls/buildAllRoofs/buildLevelBrackets/mergeSafe/pagoda.floors` 的调用处及 CSS 真源；`rg -n 'buildStructure|buildLevelFrame|buildLevelWalls|buildAllRoofs|buildLevelBrackets|mergeSafe|pagoda\.floors|clippingPlanes' src`；`git rev-parse HEAD && git status --short`；记录原相机位置/FOV/采光与 WebGLStats 的取得方式；用 Chrome 在固定角度拍 baseline 和剖面截图、原性能/结构读数。
- **相关位置**：`src/data/dimensions.js:324-346`, `src/data/structure.js:319-360`, `src/geometry/columns.js:180-250`, `src/geometry/brackets.js:158-181`；其他路径以 rg 结果为准。
- **产物**：`reports/MUTA-R2-001/baseline.json`, `baseline-whole.png`, `baseline-section.png`, `inventory.md`。
- **即时自查**：baseline.json 包含 git SHA、上述数值及 GPU 型号、视角参数、1920×1080 DPR1。
- **测试方式**：原有测试命令（若 `package.json` 有 `test` 用 `npm test`；否则 `node --test` 搜到的测试，不伪造成功）；记录完整退出码/输出。
- **完成条件**：T01 不改业务代码，给出可复用可视参考机位和原结构计数快照；出现冲突按 U01 处理。

### T02 UI 令牌单源与新增参数登记（依赖 T01；规范 §3/A1–A4/E）
- **目标**：固定新增几何的证据身份，避免 UI 设计失控。
- **前置/输入**：T01 现有 CSS 真源/维度常量。
- **操作**：新增 `continuity-estimates.js` 字段按 §5.2；如 CSS 已有 token 文件则并入之，否则新增 `src/styles/tokens.css` 并在现有入口 import 一次；将相关面板硬编码色彩映射令牌，**禁止顺手改全站配色**；新增构件来源记录到 `records`。
- **相关位置**：`src/data/dimensions.js`（只读对照）、`src/styles/*`（本机真实路径）。
- **产物**：新估算表、唯一 DOM token 源、`reports/MUTA-R2-001/estimates.md` 参数→证据→不确定标签映射。
- **即时自查**：用 `git diff -- src/data/dimensions.js src/data/structure.js` 检查 M 数值未变；CSS 令牌仅一处真源。
- **测试方式**：Node `assert.deepStrictEqual` 对 V4 锁定基线；设计 token 色差脚本抽查 ≥4.5/3/2 比例。
- **完成条件**：所有估算数值与核实值严格分离，来源可追踪，V4 锁定零漂移。

### T03 过渡标高生成与碰撞登记（依赖 T02；规范 §5.1–5.3/V1/V4）
- **目标**：生成一份纯数据形式的 P1–P4、C5 分层施工清单。
- **前置/输入**：结构八角面、真实柱记录、原标高。
- **操作**：实现 `buildInterlevelContinuity` 的坐标、插值、枋中心序列、ownerGroup、`certainty/sourceIds`，暂不装入场景；严格按 §5.2 A/B 与 §5.3 返回接口，构件 ID `cont:P2:face03:ledger04` 稳定可预测；对 duplicate 先粗 bbox 再方向/端点判重。
- **相关位置**：`src/geometry/interlevel-continuity.js`（新）、`columns.js`、`structure.js`。
- **产物**：纯函数、`diagnostics` 的 json 可序列化记录。
- **即时自查**：P1 包含 y∈[12.5,14.8] 的正厚度件、P4/C5 可见；所有 y 范围内坐标有限数。
- **测试方式**：Node test 五区间、8面、唯一 id、不越界、无同轴重复、C5 owner bright-5；输入冻结对象始终相等。
- **完成条件**：全部区间生成确定性结构目录，不存在“空白标高留待后补”。

### T04 外周梁枋与短柱入模（依赖 T03；规范 V1/V3、--mat-beam、§5.2 A/B）
- **目标**：将 2.30m 绝对缺件段消除，形成连续承托骨架。
- **前置/输入**：T03 目录、原木材出口。
- **操作**：沿八角每边生成真实 indexed 盒/修边构件，插入所有主/次枋与跨位短柱；复用 `makeWoodMaterial`，bbox 穿出 1.2m 的拒绝；拼接至正确 hidden floor 组，最上层归 bright-5。
- **相关位置**：`interlevel-continuity.js`、现有塔装配入口（T01 定位）。
- **产物**：增量几何在整体模式真实显示、楼层组可查到新增件。
- **即时自查**：第一个 12.5–14.8 区段在正视中可见至少3道横向构件且无“漂浮短板”。
- **测试方式**：几何 bbox 和 8 面对称、临时斜视截图，Node 简单投影占有率检查。
- **完成条件**：V1 中第一空段没有连续 >0.8m 空高，所有新件有 owner 和来源。

### T05 斜撑/叉手与铺作承托（依赖 T04；规范 V2/V3/V4）
- **目标**：把四个暗层从“横线”提升为多层木构暗带。
- **前置/输入**：T04 枋/柱、旧 brackets/profile、照片来源清单。
- **操作**：按 §5.2 C/D 加 24 跨人字构架与顶托木；与旧正式 bracket ledger 完全分账；遇到真实旧构件重合删新增件而不挪旧件；暗层内部保留透视缝，入口不封墙；按 manifest 视角逐张核对形态（用已在库照片，不下载新图）。
- **相关位置**：`src/geometry/brackets.js:158-181`, `src/geometry/columns.js:180-204`, 新增模块。
- **产物**：四层都有“枋+柱+斜撑+托层”，`supplementLedger` 和证据表。
- **即时自查**：每个暗层 8 面都能识别四类构件；正式 `nTiao`、54 种值不变。
- **测试方式**：`node --test` 新增层级测试 + 典型暗层放大截图，检查视觉占有率≥0.28。
- **完成条件**：V2/V3 PASS，无整面墙、无构件悬空或穿窗。

### T06 第五层屋面下承托与细节防回归（依赖 T05；规范 V3/V4）
- **目标**：补足 52–54.1m，保持攒尖顶及檐下构造。
- **前置/输入**：T05 几何模板、C5 标高。
- **操作**：C5 以“第五层檐下承托”生成短柱/圈枋/托木；不生成 hidden-5，不更动 eaveY[5]/apexY/finialTopY；验证裙檐仍锚定外槽柱，椽在瓦面下0.26m，33m 方基台、屋面索引顺序、竖屏取景原样保留。
- **相关位置**：`src/data/structure.js:319-360`（不改测值）、`src/geometry/roofs*`（仅实查/不可任改）、`balustrade.js`。
- **产物**：完整顶层衔接、`roof-regression.md`。
- **即时自查**：全景第五层顶部不出现“空托盘”，塔顶不变高。
- **测试方式**：V4 锁定测试，屋瓦朝上法线、檐下接触、无 hidden-5。
- **完成条件**：C5 观感连续而历史楼层分类保持五明四暗。

### T07 合批、裁剪与生命周期（依赖 T06；规范 V5/V6、§5.3/5.5）
- **目标**：新细节不造成 FPS 断崖，不让剖切“吃掉”暗层。
- **前置/输入**：所有几何与分组。
- **操作**：按 owner+material 合并；Indexed BufferGeometry 合法合并，遇非索引先局部 normalize，不把已有所有网格 unindex；相同件 `InstancedMesh` 共几何/材质；新材质继承局部裁剪；`dispose` 可重复构建资源不泄漏；保持原 `globalGroup` 与旧控制不变。
- **相关位置**：`mergeSafe(list)` 的真实文件、现有 pagoda 装配与 renderer 创建处。
- **产物**：一套无重复 draw 的结构 mesh，`diagnostics` new draw/tri stats。
- **即时自查**：剖面退出后新增件与旧件都回原位，正反旋转一致。
- **测试方式**：重复进入/退出 20 次验证数量恒定，逐 layer 显隐9组，`renderer.info` 10s 采样。
- **完成条件**：V5/6 PASS；final calls≤450、tri≤1.2M、FPS≥55。

### T08 自动连续度与尺寸/证据回归（依赖 T07；规范 V1–V4/V8）
- **目标**：不靠“看起来差不多”的主观过闸。
- **前置/输入**：world matrix 已更新，八面面向/区间。
- **操作**：实现 §5.4 A `analyzeContinuity` 与逐 y=0.1m 的八面射线检查；增加 `scripts/verify-continuity.mjs` 生成 `coverage.json` 和每区间最坏 case；建立锁定维度测试、正式铺作 ledger 测试、sourceIds/C5 归属测试。
- **相关位置**：`src/validation/continuity-metrics.js`（新）、`scripts/verify-continuity.mjs`（新）、测试目录（T01 实查）。
- **产物**：`reports/MUTA-R2-001/coverage.json`、自动 PASS/FAIL 文字。
- **即时自查**：故意把 P1 中间段新件暂时从测试 fixtures 移除 → 测试必须 FAIL；还原后 PASS。
- **测试方式**：`node --test` 含正向/负向/边界0.8m（>而不是≥）用例。
- **完成条件**：8 面×5 带全通，最大空带≤0.8m、占有率≥0.28、未修复版本可被测试拦截。

### T09 交互/无障碍/文案最小修补（依赖 T08；规范 §3–4/C01–C06/A–C）
- **目标**：几何修复不破坏观览，给估算件可追溯说明。
- **前置/输入**：现有 UI、模式控件、tokens。
- **操作**：将 C04 “估算构件·待核实”挂到既有层介绍；必要时加 C05 现成状态区；剖面/全貌按钮按 §3.2 改 aria-pressed/live；CSS :focus-visible、禁用、loading/error/empty/success 四态；未使用的功能不新增菜单；诊断覆盖层仅 query 开启；移动断点按 §4.2。
- **相关位置**：T01 定位的 DOM 入口/CSS 文件；`src/styles/tokens.css`。
- **产物**：可键盘切换且信息来源标清的 UI。
- **即时自查**：Tab→Enter 打开剖面→Esc 返回全貌，焦点仍可见；无中文文案暗示新增件是测量值。
- **测试方式**：Chrome 键盘人工录屏/截图、DevTools accessibility tree 与 200% zoom 检查。
- **完成条件**：Q1、V6、V7、V8 PASS，重现旧操作的入口齐全。

### T10 真浏览器视觉对照与八机位细修（依赖 T09；规范 V1–V3、A3/A5/F）
- **目标**：在相同光线/相机下直接证明“板分离”消失。
- **前置/输入**：T01 baseline、T08 指标。
- **操作**：Chrome 155 桌面 1920×1080@DPR1 截正/侧/斜 8 向 + whole + section；视图固定 tower center/zoom；390×844 和375/768/1440 截屏；人工核验每层衔接、屋面不穿帮、暗层密度、5明4暗，依据现有 manifest 中许可照片逐张记录“匹配/尚存疑义”，不直接复制外部图片。
- **相关位置**：所有新几何与装配、`reports/MUTA-R2-001/visual/`。
- **产物**：变更前/后同角拼图、8 张立面、剖面、手机宽度截图、`visual-review.md`。
- **即时自查**：拼图能从相同镜头直接识别修复；没有贴片挡天空骗过指标。
- **测试方式**：按 §8 视觉清单逐项打勾；照片证据不足则标签保留“估算”。
- **完成条件**：所有截图可复核且无人工标出的 blocker。

### T11 真实性能/离线/构建回归（依赖 T10；规范 V5/V7/V8/D）
- **目标**：实测工程门槛全部通过。
- **前置/输入**：Chrome 155、Vite，T01 前后基线。
- **操作**：`npm install --offline` 仅在 node_modules 存在且锁文件/npm cache 支持时运行，否则原环境 `npm ci` 按依赖可得性执行但不得加入运行时 CDN；`npm run build`；`npm run dev -- --host 127.0.0.1` 实测，另 `npm run preview -- --host 127.0.0.1` 验证静态产物。DevTools Network 保存 HAR：所有跨 origin 请求0，禁网刷新构建页面仍运行（localhost served assets 属于本机资源，完全“文件协议双击运行”不是需求）；2s warmup +10s FPS/calls/tri；计时首屏≤2.5s、CLS≤.1；检查错误分支。
- **相关位置**：`package.json`（不动版本锁）、`reports/MUTA-R2-001/performance.json`、`network.har`。
- **产物**：完整终端输出、性能记录、HAR、Chrome 实测表。
- **即时自查**：平均 FPS 不替代中位 FPS；CPU 限速与浏览器后台时重测并标明环境。
- **测试方式**：T08 Node 测试、build、真实 DOM/画布交互、离线 network/foreign origin 稽核。
- **完成条件**：所有 V5/7/8/D1 达标；如不达标只回到 T07 优化新增构件，不碰实测比例。

### T12 报告、证据审计与交付提交（依赖 T11；规范 §8–10/F/G）
- **目标**：让下一位仅凭仓库证据判断完成/不完成。
- **前置/输入**：所有 JSON、截图、原始日志、git diff。
- **操作**：按 §9 写 `reports/MUTA-R2-001/report.md`（必须含 SHA/环境/命令/原始 PASS+FAIL 数量/形态对照/四态+键盘截图/性能/未知项调查/偏离/风险）；`git diff --check`；`git status --short`；仅提交本轮范围的改动，不上传 node_modules/dist/临时 Chrome profile。
- **相关位置**：`reports/MUTA-R2-001/`、所有新增/更改过的源文件。
- **产物**：完成报告、测试/审美可视证据、git commit SHA。
- **即时自查**：每个 V1–V8/Q1/D1 均有独立证据链接，质量线 A–E 无未填项。
- **测试方式**：复跑 Node test/build + 手工全貌→剖面→全貌；最终 `git diff --check` exit0。
- **完成条件**：§8 交付闸门所有项目 PASS 才写 `READY_FOR_DELIVERY`；否则写 `NEEDS_FIX: [失败项]` 并保留真实日志，不能假交付。

## 7. 未知信息的调查入口与固定分支
### 7.0 完整未知表
|编号|类型|具体未知|受影响位置|
|---|---|---|---|
|U01|有入口|现有模块装配入口、npm 测试命令、CSS 真源、当前相机和诊断接口位置|T01/T02/T07|
|U02|有入口|现有 CC 照片是否足以判别人字斜撑、承托层的形制与暗层密度|T05/T10|
|U03|有入口|实际 wall mesh 墙顶、已有柱与 bracket 的重叠几何范围|T03/T04|
|U04|有入口|当前锁版 three 合并/裁剪接口及真实 WebGL 统计获取|T07/T11|
|U05|无入口（本机实测才知道）|修改后真实 FPS、calls、triangles、首屏/CLS|T07/T11|
|U06|无入口（本机真实查看）|各朝向光照中暗带是否被阴影吞没、窗是否被遮挡|T10|
|U07|无入口（本机可测）|本机字体候选、Chrome headless 截图/键盘自动化能力|T09/T10|

### 7.1 有入口（每项五件事）
**U01**
- 问题：实际从哪个文件创建 `pagoda.floors`、调用 mergeSafe/裁剪，现有 npm script 与 CSS 令牌在哪？
- 查哪里：本机 `rg -n 'pagoda\.floors|mergeSafe|localClippingEnabled|buildLevelWalls|makeWoodMaterial' src`、`cat package.json`、`rg -n '(--bg-|:root|@media)' src`。
- 怎么判断：找到唯一装配调用栈、package scripts 和现存 CSS 真源，记录行号到 inventory。
- 分支：若入口明确，原处附加新模块；若找不到装配函数，用 `rg -n 'buildStructure\(' . --glob '!node_modules/**'` 定位主入口，仍找不到则**保守只提交纯函数/测试、标未完成而不盲改架构**。
- 查找限时：10 分钟；默认不改旧分组 API，报告记录失败路径。

**U02**
- 问题：12 张现有实拍是否可看清四暗层斜撑方向、屋檐下实梁条的形制？
- 查哪里：本机 `references/photos/manifest.json` 与同目录已授权照片；辅助 UNESCO 描述 https://whc.unesco.org/fr/listesindicatives/5803。
- 怎么判断：逐张列照片文件名/许可/能看清的具体构件；**只有照片可见，不等于任何具体断面尺寸“已测”**。
- 分支：若可辨斜撑方向，按最清楚的相同层照片布相应交错方向，参数仍标 estimate；若不可辨，用 §5.2 “3跨人字撑+水平托木”默认视觉结构**示意**并在文案注明缺少实测证据；**绝不从照片外推实测柱断面**。
- 查找限时：15分钟；默认 `certainty='estimate'`，来源只有照片及研究，注明推定。

**U03**
- 问题：实际明层墙网格最高点是不是简报中的 brightBands.y1？已有柱/斗栱哪些高度段已填？
- 查哪里：本机 `src/geometry/columns.js:236-250`、`src/data/structure.js:358-360`，运行时 `Box3.setFromObject(mesh)`；结构构件的 `columnRecords`。
- 怎么判断：记录每明层 `wallMaxY`, `columnTopY`, `eaveBottomY` 三列，差值 >0.1 则真实缺口存在。
- 分支：若真实墙顶低于 band.y1，则**按实际 wallMaxY→本层正檐铺作底面**补短枋/托件，不提高明层测量标高；若相等仍按 P1–C5 默认带，避免双补；重叠≥90% 跳过新增件。
- 查找限时：10分钟；默认只在已暴露的空域添加估算物，遇模糊宁可记录 gap FAIL 不造假墙。

**U04**
- 问题：Three 0.186.1 下 indexed 合批、InstancedMesh、clippingPlanes 与 renderer.info 能否按预期工作？
- 查哪里：项目锁包 `node_modules/three/package.json`、`node_modules/three/examples/jsm/utils/BufferGeometryUtils.js`；官方 https://threejs.org/docs/pages/module-BufferGeometryUtils.html、https://threejs.org/docs/pages/InstancedMesh.html、https://threejs.org/docs/pages/WebGLRenderer 及官方 clipping example。
- 怎么判断：本机日志打印 `THREE.REVISION==='186'`，真实返回 merged.geometry.index 不空，裁剪进退 20 次完整，renderer.info 有 counts。
- 分支：若 merge 支持原索引，按组 merge；否则新几何本身保留索引、分材质小批量 InstancedMesh，最终 V5 不达标则回滚新增过细件，**不回滚测量值**。
- 查找限时：15分钟；默认使用现有 mergeSafe，不改依赖版本。

### 7.2 无公开固定入口（本机调查 + 决策 + 默认）
**U05** 待查：新模型高档 Chrome 中位 FPS、draw calls、triangles 及首屏/CLS 各是多少？怎么查：本机固定 Chrome 155、1920×1080@DPR1，通过 `renderer.info`、RAF 2s warmup+10s、Performance API、Chrome trace。受影响决策：是否可维持所有重复件单独 mesh。若 FPS≥55 且 calls≤450 且三角≤1.2M，保留精度；否则依次合并同材质→InstancedMesh→减少非外观关键内槽装饰细分（不能去掉双圈柱网）→重测。**默认**：不宣布通过，按性能失败处理并写“使用保守默认：需优化/复测”。
**U06** 待查：八方向全景、剖视、明窗是否存在被新增木条遮挡或暗层在阴影中失去辨识？怎么查：本机真实 Chrome 8视角截图及同机 baseline 比对、黑白中灰调试材质截图。受影响决策：是否调整新增木条相对柱线内退0.32m。若穿窗或黑带吞没，则仅把新撑**向槽内退最多0.18m（总≤1.2m 限）**、降低新增层内部自阴影优先级，绝不移动原柱/屋檐；否则维持0.32m。**默认**：按存在问题处理，不以自动 V1 PASS 覆盖人工 FAIL，登记“未能视觉证实”。
**U07** 待查：本机可用中文命名字体和 Chrome 截图/CDP 输入方式？怎么查：本机 `fc-list`（有命令则运行），macOS `system_profiler SPFontsDataType`（过慢则跳过）、Chrome DevTools 的 computed font / `document.fonts.check` 与内建 Headless CLI；测试字体切换前后标题宽度。受影响决策：选哪个离线字体与截图方案。若 Noto Sans CJK SC 已装则选其，若没有但 PingFang SC 已装则选 PingFang SC，否则 Microsoft YaHei/Arial 兜底并记录；若 CDP 可用则使用 CDP 采样，若不能则 Chrome headless `--screenshot` 辅以 DevTools 手动记录、标记自动化工具未验证。**默认**：PingFang SC + 明确 fallback；所有截图与性能仍需有人眼/浏览器证据，不得因工具缺失宣称 PASS。

### 7.3 收尾条件
U01–U07 每项在 `reports/MUTA-R2-001/report.md` 有“入口/观察/命中哪条分支/采用默认与否/实际证据”。7.1 真入口缺失不能代以凭空编造；7.2 未证实不等于自动成功。以上已经给定所有决策分支，不需要问用户。

## 8. 本机验收动作、回归与一票否决
### 8.1 必须运行的命令与预期
1. `node --version && npm --version && git rev-parse HEAD`：记录事实；版本期望 Node26/npm11。
2. `npm test`（若项目有 test 脚本）或 `node --test <T01定位的测试路径>`：现有与新增用例 **全部 PASS**；数量从测试 TAP 报告 machine-read 汇总，不能人工手写“xx/xx”。
3. `node scripts/verify-continuity.mjs`：stdout `V1 PASS; V2 PASS` 且 `coverage.json` 包括每视角各段 `maxBlankRunM≤0.8`、`centerOccupancy≥0.28`。若脚本需调用浏览器几何上下文，入口应连接本机 headless Chrome，不得编假 world matrices。
4. `npm run build`：exit0、dist 仅本地静态资源，原版本不改变。
5. `npm run dev -- --host 127.0.0.1`，再用 Chrome 开 `http://127.0.0.1:5173/`；如果真实 Vite 端口不同，以终端输出为准并记录，不瞎写端口。另 `npm run preview -- --host 127.0.0.1` 做产物回归。
6. `git diff --check && git status --short`：无尾空格/不可控文件。
7. 若 `npm run build` 不能通过，**禁止以 Vite dev 可跑作为可交付替代**。

### 8.2 必须亲自启动的操作
- 初次打开全貌：记录首屏、全塔完整取景，8方正视和透视；观察 P1 缺口不再存在，一层到五层连续。
- 剖切：切 whole→section→whole 20 次；五明四暗、内外槽、佛坛造像都可查；确认恢复后新增带不是幽灵/额外残留。
- 键盘：只用 Tab/Shift+Tab/Enter/Space/Esc 与方向键完成视图切换、回全貌、焦点检查；读屏控制名字可读。
- 1920×1080 和390×844；375/768/1440 下检查页面横滚、按钮44×44、100/200% zoom；移动端是 Chrome 模拟器，**不是声称真机测试**。
- 正常/空/加载/错误/成功状态各一次：可通过诊断参数触发的受控 demo/test fixture，真实用户界面默认不残留 fixture；错误需可恢复/可重试。
- 高档固定视角保持窗口前台10s，保存真实 `renderer.info` 和 FPS 数列，别只截数字 HUD。
- DevTools Network offline 模拟、DevTools accessibility tree、console error/rejection、请求源名单；非 local origin request 必须为0。

### 8.3 回归保护与视觉硬清单
**比例与古建**：V4 全部原始值、台基33m、裙檐锚外槽、椽低瓦0.26m、令栱索引、瓦法线向上、檐布局与五明四暗、正式斗栱跳数和54种不动。**外观**：八角八方全部没有悬空薄板；暗层均有密集木构但不是纯实心封条；门窗洞/栏杆/造像无穿越；屋瓦下结构实际接续。**UI（质量线逐条证据）**：A1 字阶/字重/行宽，A2 正/反颜色实际 contrast 数字，A3 间距/限宽，A4 圆角/阴影/z-index，A5 图标与本地图片 alt；B1 九态、B2 反馈≤100ms、B3 位置及模式明确、B4 真文案、B5 375–1920；C 焦点/语义/读屏/reduced-motion/200%；D 首屏/CLS/10s FPS、仅 transform/opacity 动画；E 唯一 tokens/命名/无死代码。每项写 `PASS|N/A|FAIL` 和对应截图/命令/计算输出；任何非合理的 N/A 视 FAIL。

### 8.4 不合格与交付条件
任一 V1–V8/Q1/D1 FAIL → **NEEDS_FIX**，即使纯测试全绿也不能宣布交付。自动扫描通过但人工看仍像悬空板 → V1 视觉项 FAIL；人为封墙欺骗空带 → V2/V6 FAIL；新件没估算标记 → V8 FAIL；无真实 Chrome 证据、没测 FPS → V5 UNVERIFIED，按不可交付。**交付需所有硬门槛实测通过，并把证据与源码关联同一 SHA。**

## 9. 首次交付文件、证据与报告合同
最终仓库应有（若本机已有等效同职责文件，以已有真路径为准并在报告作映射）：`src/data/continuity-estimates.js`、`src/geometry/interlevel-continuity.js`、`src/validation/continuity-metrics.js`、相关既有结构装配/样式的最小补丁、`scripts/verify-continuity.mjs`、新增 `test/continuity.test.js`（若现有 tests 目录则放同目录）、唯一 DOM token 真源、`reports/MUTA-R2-001/`。**禁提交外部资源与大体积生成缓存**，截图以实际证据大小和仓库惯例记录。

报告固定位置 `reports/MUTA-R2-001/report.md`，必须含：
1. 本次真实源码 SHA、T01 原始 SHA、分支、依赖版本、浏览器/GPU/DPR/分辨率；
2. `CHANGELOG` 按文件逐条记录变化、旧锁定值的“零改变”逐项对比；
3. 调研来源摘要、照片 manifest 逐张对应、全部新增构件估算登记；
4. T01–T12 各自进度 + V1–V8/Q1/D1 逐一 PASS/FAIL/UNVERIFIED 与证据路径；
5. 完整原样终端测试输出另存 `tests.log`；机器统计 `passed/failed/skipped` 从 TAP/runner 读取，不写死；build log、退出码；
6. 原始 10s FPS 帧时间序列、FPS 中位数、calls/triangles、初次可交互与 CLS；原本基线与本轮数列分开标注；
7. `coverage.json` 逐 y/每面每 band 与负向用例失败演示；
8. `visual/whole-before.png`, `whole-after.png`, `section-after.png`, `view-00..view-07.png`, `mobile-390.png`, `mobile-375.png`, `zoom-200.png`, `states.png`，并写每图相机/viewport/DPR；
9. 网络 zero third-party 验证 HAR（如无 HAR 导出，保存 CDP `requestWillBeSent` 原始 JSON），读屏和键盘路径结果、A–E 逐条对照；
10. U01–U07 调查记录、采用默认原因、任何规划偏离、已知限制；尾部只能为 `READY_FOR_DELIVERY` 或 `NEEDS_FIX: ...`。

首次交付严禁把“尚未真机验证”“未做工程力学校核”“新撑方向只是照片推测”悄悄删去。**本轮本身不部署、不做 CI**，所以“公网体验验证”明确标 N/A，不是 PASS。若现有项目没有 CI，则绝对不加工作流。

## 10. 执行 Agent 遇困处置、优先级与停机条件
执行方仅你一个，**不得再回头找网页版规划者，也不得反问用户**。按顺序处理冲突：①V4 文物核实尺寸/屋檐既定约束不可改；②不损坏旧交互/剖切与证据诚实；③V1–V3 体量连续；④V5 性能和无障碍；⑤表面微细节。遇到 API 与文档冲突，以本机锁版运行事实为准：先 `rg` / 看本机源码 / 做隔离最小复现，再替换为等效可运行函数；在报告标注“偏离 §X：原约定→实际→替代→回归证据”，不能称原规划已照做。遇到照片模糊，按 U02 默认生成**标估算**示意，不造“考古定论”；遇到性能不达标，先减少新增重复 draw 与几何细分，不能改变已核实比例或删除四暗层；遇到正视仍有空带，以覆盖指标和透视截图双重定位，高优修缺，不用调暗背景凑效果。若外部网络不可用，严格只用项目本地依赖/已有照片，按已有环境跑；不得以外部 CDN 解除困难。

**停止的两种合法状态**：（A）所有验收证据齐 → 提交并报告 READY_FOR_DELIVERY；（B）本机客观限制导致部分项无法完成 → 保持代码、提交真实失败证据和明确 NEEDS_FIX，绝不谎称跑过 Chrome/自动测试或把未知数当数值通过。提交后本机执行者不要求网页继续规划。

---
**最终决策一句话**：保持应县木塔一切已核实尺寸与既定渲染管线，以**24 柱槽位配准的程序化梁枋、短柱、斜撑与托木**填充四个明暗过渡与第五层屋面承托，确保八向 0.1m 扫描、照片对照、剖切及 55FPS 四重闭环；凡无法从测量确认者一律明确“估算”。
