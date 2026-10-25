<!-- sflipmloop-handoff
kind: brief
task: MUTA-R2-001
round: 1
nonce: b515513ef8af930a
-->

# 应县木塔 3D 展陈 · 第二轮优化简报

## 任务（一句话）

优化应县木塔实时三维展陈的**全貌观感**：消除「层与层之间断开、整体读起来像一摞悬空板」的体量断裂感，
让塔身在远观时读作**连续的一体化木构体量**；同时不破坏已核实的实测比例、不牺牲实时性能。

## 现状观察（本机实测，量化）

问题不在屋顶、材质或光照，而在**竖向的层间空隙**：

- 明层墙顶 → 下一明层楼板之间：一层 **4.50 m**、二层 2.80 m、三层 3.00 m、四层 2.90 m、五层→攒尖顶 **5.31 m**。
- 其中一层的 4.50 m 里，有 **2.30 m 完全没有任何构件**（暗层带起点 14.8 m 高于一层墙顶 12.5 m）。
- 明层墙顶低于本层正檐：一层 3.50 m、二层 1.60 m、三层 1.70 m、四层 1.70 m —— 墙顶到檐口之间是裸露的空气。
- 暗层目前只有：一圈细草栿（截面 0.22×0.26 m）+ 内外槽交叉斜撑（0.15×0.12 m）。在 30 m 尺度的立面上几乎读不出来。
- 后果：每一层读作一片「带屋檐的薄板」，板与板之间被空气隔开 → 悬空感。

**实物依据**：应县木塔的暗层是**实心构架带**——内外槽柱、草栿/地栿/梁枋、斜撑、叉手、铺作层层叠叠，
立面上呈一条密集深色带；明层与暗层之间**没有裸露空气**。仓库 `references/photos/` 有 12 张
Wikimedia Commons 实拍（CC BY / CC BY-SA，逐张署名见 `references/photos/manifest.json`），
可作为体量与层间连续性比对的依据。

## 可判定的验收条件

- **V1 竖向连续**：全貌机位下，一层墙顶至五层墙顶之间，沿塔身外轮廓**不得存在高度 > 0.8 m 且完全无构件的竖向空白带**（一层裙檐下的回廊除外，那是实物本就开敞的空间）。建议实现可量化的自检：按 0.1 m 步长扫描 y，统计与外轮廓相交的构件覆盖量，要求连续。
- **V2 暗层成「带」**：每个暗层在立面上呈连续构架带（草栿+斜撑+铺作+柱），视觉密度须与明层的窗棂/墙相当，不得读作空档。
- **V3 墙顶与檐口填实**：现状 1.6–3.5 m 的裸空白必须被平座、腰檐或铺作填实。
- **V4 比例不动**：通高 **67.31 m**、底层最远顶点距 **30.27 m**、高径比 **2.224**（±2%）、逐层收分（北测面阔 9.553 / 9.148 / 8.800 / 8.439 / 8.004 m）、各层铺作跳数 **7/7/6/5/4**、斗栱 **54 种** —— 全部保持。
- **V5 性能不退**：高档 1920×1080 @DPR1、10 s 采样，中位 FPS ≥ 55、draw calls ≤ 450、三角形 ≤ 1.2 M。现状：**59.88 FPS / 101 calls / 489 360 三角形**。
- **V6 内部仍可读**：剖视模式下五明四暗、双圈柱网、佛坛与造像仍清晰可辨。
- **V7 双视口成立**：1920×1080 与 390×844 均成立（竖屏已有自动后拉取景，勿破坏）。
- **V8 诚实度不受影响**：中文文案、「估算 / 待核实」标注不受影响；**不得因补结构而暗示「已实测」**。

## 约束（不可动的硬边界）

- **不得改动**任何已核实数值：通高 / 底径 / 高径比 / 逐层面宽 / 柱数（外槽 24 + 内槽 8，首层共 56）/ 铺作跳数 7-7-6-5-4 / 斗栱 54 种 / 台基约 4 m / 塔身底径 30.27 m。
- **不得引入**外部模型、贴图、字体、CDN —— 全部程序生成，运行时第三方请求须为 0。
- 技术栈固定：Three.js **0.186.1** + Vite **8.3.5**，纯 JS + ES Module，无框架，无 TypeScript。
- 交付形态：静态 SPA，可离线运行；**无 CI、不部署**。
- 目录与模块职责沿用现状划分（见下）。

## 环境事实（已核实，直接用）

macOS 15（darwin 25.4.0）· arm64 · **Apple M5 Max（Metal 4）** · Node v26.0.0 · npm 11.12.1 ·
Google Chrome 155 · 188 GiB 可用 · 无付费 API · 无真机 · 无 TTY。

## 既有约定（现状接口；规划案可在其上定死新接口）

- 几何纯函数：`buildStructure()` → 结构描述；`buildLevelFrame(structure, levelIndex, opts)` → `{columns, beams, braces, columnRecords}`；`buildLevelWalls()` → `{walls, lattice, floors}`；`buildAllRoofs(structure, opts)`；`buildAllBalustrades()`；`buildLevelBrackets()` → `{placements, ledger}`。
- 材质：`src/materials/*` 导出 `makeWoodMaterial` / `makeStoneMaterial` / `makeTileMaterial` / `makeIronMaterial` / `makeGoldMaterial` / `makePaintedWoodMaterial` / `makeRoofTileMaterial`。
- 尺寸登记：`src/data/dimensions.js` 每条 M 记录带 `valueM / estimateM / certainty / measurementDatum / sourceIds`。
- 几何合并：`mergeSafe(list)`（自动统一索引状态）。
- 楼层分组：`pagoda.floors['bright-1'..'bright-5','hidden-1'..'hidden-4']` + `globalGroup`，剖切/分解按 group 可见性控制。
- 剖切：统一裁剪平面（`renderer.localClippingEnabled`），平面法线跟随相机方位。

## 已做过 / 已定，别推翻

1. 裙檐内端必须落在**塔身外槽柱线**（落副阶环会退化成 0.9 m 薄片）。
2. 椽必须贴在屋面**之下**（举折曲面是凸的，直弦椽会穿出瓦面；现下压 0.26 m）。
3. 令栱用 `extrudeProfile` 保持索引几何（`ExtrudeGeometry` 是唯一非索引几何，会让合并时全体转非索引，顶点 ×3）。
4. 台基下层方形边长 33 m（不是 40 m；实照里台基只略宽于副阶柱环）。
5. 屋面法线必须朝上（索引绕序 `a,c,b` / `a,d,c`）。
6. 竖屏取景：相机沿当前朝向后拉 + 取景中心下移，保证整塔避开底部操作条。

## 本轮明确不做

不改已核实数值；不引入外部资产；不做「假装精测」的文案升级；不做工程/结构安全仿真；不部署、不配 CI。

## 规格与质量线（网页直接读这两份，不必另找）

- `handoff/spec/plan-spec.md`
- `handoff/spec/design-quality-bar.md`

## 交付要求

规划案写入 `handoff/plans/MUTA-R2-001.md`，必须含：设计语言与令牌、可判定的视觉验收标准、
**逐件任务拆解**（每项七要素：目标 / 前置与输入 / 具体操作 / 完成产物 / 即时核验 / 失败排查 / 完成条件）、
未知信息的调查入口与分支（查什么、查完决定什么、默认取什么值）、验收要求。
不确定处写成条件分支，**零提问**；「高级感」等不可判定措辞一律换成具体数值。

===== src/data/dimensions.js:324-346 （共 377 行）=====
 324|export const LEVEL_LAYOUT = Object.freeze({
 325|  groundY: 0,
 326|  squareBase: Object.freeze({ y0: 0, y1: 1.6 }),
 327|  octagonalBase: Object.freeze({ y0: 1.6, y1: 4.0 }),
 328|  eaveY: Object.freeze([10.5, 16.0, 25.0, 34.5, 44.0, 54.1]),
 329|  apexY: 57.31,
 330|  finialTopY: 67.31,
 331|  /** 五个明层的展示带 y 区间 */
 332|  brightBands: Object.freeze([
 333|    Object.freeze({ y0: 4.0, y1: 12.5 }),
 334|    Object.freeze({ y0: 17.0, y1: 23.4 }),
 335|    Object.freeze({ y0: 26.2, y1: 32.8 }),
 336|    Object.freeze({ y0: 35.8, y1: 42.3 }),
 337|    Object.freeze({ y0: 45.2, y1: 52.0 })
 338|  ]),
 339|  /** 四个暗层的 y 区间 */
 340|  hiddenBands: Object.freeze([
 341|    Object.freeze({ y0: 14.8, y1: 17.0 }),
 342|    Object.freeze({ y0: 23.4, y1: 26.2 }),
 343|    Object.freeze({ y0: 32.8, y1: 35.8 }),
 344|    Object.freeze({ y0: 42.3, y1: 45.2 })
 345|  ])
 346|});

===== src/data/structure.js:319-327 （共 438 行）=====
 319|  const EAVE_CONFIG = [
 320|    { offset: 0.9, rise: 2.1, innerRingMode: 'outer', ownerLevel: 1, name: '一层下檐（裙檐）' },
 321|    { offset: 2.0, rise: 3.0, innerRingMode: 'scaled', ownerLevel: 1, name: '一层上檐' },
 322|    { offset: 1.9, rise: 2.8, innerRingMode: 'scaled', ownerLevel: 2, name: '二层檐' },
 323|    { offset: 1.8, rise: 2.6, innerRingMode: 'scaled', ownerLevel: 3, name: '三层檐' },
 324|    { offset: 1.7, rise: 2.4, innerRingMode: 'scaled', ownerLevel: 4, name: '四层檐' },
 325|    { offset: 1.5, rise: null, innerRingMode: 'apex', ownerLevel: 5, name: '五层攒尖顶' }
 326|  ];
 327|  const eaves = eaveY.map((y, i) => {

===== src/data/structure.js:342-360 （共 438 行）=====
 342|
 343|    return {
 344|      index: i,
 345|      name: cfg.name,
 346|      y,
 347|      ownerLevel: cfg.ownerLevel,
 348|      isApex,
 349|      offset: cfg.offset,
 350|      rise: cfg.rise,
 351|      innerRingMode: cfg.innerRingMode,
 352|      ring,
 353|      innerRingVertices,
 354|      apexY: isApex ? layout.apexY : null
 355|    };
 356|  });
 357|
 358|  // 各层柱顶标高 = 本层正檐的铺作底面（檐口标高 − 铺作高）
 359|  const BRACKET_DROP = 1.1;
 360|  levels.forEach((lv) => {

===== src/geometry/columns.js:180-210 （共 421 行）=====
 180|  // ── 暗层构架：草栿 + 斜撑（属于下一层的暗层带）
 181|  const hidden = structure.hiddenFloors.find((h) => h.belowLevel === levelIndex);
 182|  if (hidden) {
 183|    const hy = hidden.band.y0;
 184|    const top = hidden.band.y1;
 185|    // 草栿（暗层顶部圈梁）
 186|    outerEdges.forEach((e) => {
 187|      beams.push(makeEdgeBeam({ edge: e, y: top - 0.2, width: 0.22, height: 0.26 }));
 188|    });
 189|    innerEdges.forEach((e) => {
 190|      beams.push(makeEdgeBeam({ edge: e, y: top - 0.2, width: 0.2, height: 0.24 }));
 191|    });
 192|    // 内外槽斜撑：交叉 V 形
 193|    outerEdges.forEach((oe, i) => {
 194|      const ie = innerEdges[i];
 195|      const oBase = { x: oe.mid.x, y: hy + 0.2, z: oe.mid.z };
 196|      const iTop = { x: ie.mid.x, y: top - 0.34, z: ie.mid.z };
 197|      const iBase = { x: ie.mid.x, y: hy + 0.2, z: ie.mid.z };
 198|      const oTop = { x: oe.mid.x, y: top - 0.34, z: oe.mid.z };
 199|      const b1 = makeBrace({ from: oBase, to: iTop, width: 0.15, height: 0.12 });
 200|      const b2 = makeBrace({ from: iBase, to: oTop, width: 0.15, height: 0.12 });
 201|      if (b1) braces.push(b1);
 202|      if (b2) braces.push(b2);
 203|    });
 204|  }
 205|
 206|  return { columns, beams, braces, columnRecords };
 207|}
 208|
 209|/**
 210| * 造柱础（石础）：柱脚下的一个小石块。

===== src/geometry/columns.js:236-250 （共 421 行）=====
 236|
 237|  const topY = lv.columnTopY ?? lv.band.y1;
 238|  const colH = topY - lv.band.y0;
 239|
 240|  // ── 外檐墙（内收 0.30 m，让柱子露出）
 241|  const outerRing = offsetPolygon(lv.outer.vertices, -0.30);
 242|  const outerEdges = octagonEdges(outerRing);
 243|  const wallH = colH * 0.66;
 244|  const wallT = 0.36;
 245|
 246|  outerEdges.forEach((e) => {
 247|    const ax = e.a.x, az = e.a.z, bx = e.b.x, bz = e.b.z;
 248|    const len = Math.hypot(bx - ax, bz - az);
 249|    const angle = -Math.atan2(bz - az, bx - ax);
 250|

===== src/geometry/balustrade.js:30-49 （共 126 行）=====
  30|  if (!lv || !lv.balustrade) return { rail, post, deck };
  31|  const builtCorners = opts.builtCorners ?? new Set();
  32|
  33|  const B = EST.balustrade;
  34|  const width = lv.balustrade.width;
  35|  const y = lv.band.y0;
  36|
  37|  // 平座台面：柱线外扩 width 的八角环
  38|  const outline = offsetPolygon(lv.outer.vertices, width);
  39|  const edges = octagonEdges(outline.map((p) => ({ ...p, y })));
  40|
  41|  // 台面（中间留出塔身空洞：用八角环做成 8 块梯形板）
  42|  edges.forEach((e) => {
  43|    const ax = e.a.x, az = e.a.z, bx = e.b.x, bz = e.b.z;
  44|    const len = Math.hypot(bx - ax, bz - az);
  45|    const geo = new THREE.BoxGeometry(len, 0.16, width);
  46|    geo.rotateY(-Math.atan2(bz - az, bx - ax));
  47|    geo.translate((ax + bx) / 2, y + 0.08, (az + bz) / 2);
  48|    deck.push(geo);
  49|  });

===== src/geometry/brackets.js:158-181 （共 338 行）=====
 158| * 各层的铺作配置（据 M26 / H05，逐层不同形制）。
 159| * 出挑总长为 ESTIMATE；五层柱头里/外跳取 M25 北测值 0.680 / 0.700。
 160| */
 161|export function bracketProfileForLevel(levelIndex) {
 162|  const B = EST.bracket;
 163|  switch (levelIndex) {
 164|    case 1:
 165|      return { nTiao: 3, angCount: 2, hasShuatou: true, hasTuofeng: true, jumpLen: 0.62, outward: 2.0 };
 166|    case 2:
 167|      return { nTiao: 3, angCount: 2, hasShuatou: true, hasTuofeng: true, jumpLen: 0.58, outward: 1.85 };
 168|    case 3:
 169|      return { nTiao: 3, angCount: 0, hasShuatou: true, hasTuofeng: true, jumpLen: 0.52, outward: 1.6 };
 170|    case 4:
 171|      return { nTiao: 2, angCount: 0, hasShuatou: true, hasTuofeng: true, jumpLen: 0.55, outward: 1.25 };
 172|    case 5:
 173|      return {
 174|        nTiao: 1, angCount: 0, hasShuatou: true, hasTuofeng: true, jumpLen: 0.34,
 175|        outward: B.fifthLayerJump.outer
 176|      };
 177|    default:
 178|      return { nTiao: 2, angCount: 0, hasShuatou: true, hasTuofeng: true, jumpLen: 0.4, outward: 1.0 };
 179|  }
 180|}
 181|

----- 交接文件统计：6030 字符 / 6514 字节（预算 12000 字符）-----
