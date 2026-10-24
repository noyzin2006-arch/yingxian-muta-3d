/**
 * src/data/dimensions.js
 *
 * 尺寸登记表 —— 全部米。
 *
 * 每条记录同时携带三个互相独立的字段，UI 与几何层都必须区分：
 *   valueM      已核实 / 已公布的数值；未核实则为 null
 *   estimateM   本项目为施工演示采用的临时估值（几何一律用它）
 *   certainty   published | academic | estimate | unverified
 *   measurementDatum 这条数值是在哪条测线上量的 —— 不同测线不可直接互相比较
 *
 * 依据：
 *   - handoff/sflipcloop/plan.md            §4.2 实测尺寸数据表（M01–M42）
 *   - handoff/sflipcloop/plan-audit.md       本机独立核实与补强
 *   - handoff/sflipcloop/reference-dimensions.md
 *
 * 铁律：任何不得以「实测」名义出现在 UI 上的数字，其 certainty 不得为 published/academic。
 */

export const CERTAINTY = Object.freeze({
  PUBLISHED: 'published',   // 官方/公开口径
  ACADEMIC: 'academic',     // 有方法描述的学术实测或推算
  ESTIMATE: 'estimate',     // 本项目临时估值，非文物实测
  UNVERIFIED: 'unverified'  // 未核实，未取得可靠数值
});

export const CERTAINTY_LABEL = Object.freeze({
  published: '公开值',
  academic: '学术实测/推算',
  estimate: '本项目估算',
  unverified: '待核实'
});

/** 一条尺寸记录 */
function d(name, opts) {
  return {
    name,
    valueM: null,
    estimateM: null,
    certainty: CERTAINTY.UNVERIFIED,
    sourceIds: [],
    measurementDatum: null,
    note: '',
    ...opts
  };
}

export const dimensions = Object.freeze({
  // ── 总体 ────────────────────────────────────────────────
  M01: d('地面至刹顶通高', {
    valueM: 67.31, certainty: CERTAINTY.PUBLISHED, sourceIds: ['H01', 'H02', 'H03'],
    measurementDatum: '地面（塔基底面）至铁刹宝珠顶',
    note: '广泛使用的通高/复原口径；不等同 2026 年现状逐点实测。'
  }),
  M02: d('底层直径', {
    valueM: 30.27, certainty: CERTAINTY.PUBLISHED, sourceIds: ['H02', 'H03'],
    measurementDatum: '底层塔身整体最远顶点距（对角径）',
    note: '公开值未说明穿过哪两个角柱轴线；本模型以「底层塔身最远顶点距」为同口径基准。'
  }),
  M03: d('首层石砌台基地上总高', {
    estimateM: 4.0, certainty: CERTAINTY.ESTIMATE, sourceIds: ['H14'],
    measurementDatum: '塔基地面至台基顶面',
    note: '约值，非测绘；本机补强：省文物局亦记「建在 4 米高的石砌台基上」。'
  }),
  M04: d('台基地面以下深度', {
    estimateM: 2.0, certainty: CERTAINTY.ESTIMATE, sourceIds: ['H03'],
    measurementDatum: '地面以下不可见部分', note: '报道「仅深入地下部分就达 2 米」；剖切中标为估。'
  }),
  M05: d('石台基上下总厚度', {
    valueM: null, estimateM: 6.4, certainty: CERTAINTY.ESTIMATE, sourceIds: ['H03'],
    measurementDatum: '台基上下总厚', note: '来源给出的是「超过 6.4 m」下限，标签不得写成精确 6.4。'
  }),

  // ── 台基形制 ───────────────────────────────────────────
  M06: d('下层方形石基边长', {
    estimateM: 40.0, certainty: CERTAINTY.ESTIMATE, sourceIds: ['H01', 'H03', 'L01'],
    measurementDatum: '下层方形基座正方形边长',
    note: 'H01/H03 只证实方形；约 40 m 出自学术结构文献。四个方向均有月台。'
  }),
  M07: d('上层八角石基对角宽', {
    estimateM: 35.47, certainty: CERTAINTY.ESTIMATE, sourceIds: ['H03', 'L01'],
    measurementDatum: '上层八角基座对角径',
    note: '与 M02（塔身）不同构件、不同测线，不得混同。正东/正西/正南三向有月台。'
  }),
  M08: d('下层基座出露高度 / 上层八角基座高度', {
    estimateM: 1.6, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '地面→1.6 / 1.6→4.0', note: '非测绘；与 M03 合计 4.0。'
  }),
  M09: d('须弥座束腰、上下枭混、叠涩层高', {
    estimateM: 0.3, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '位于 M08 内部', note: '层高组合 [0.30,0.28,0.45,0.27,0.30]，勿重复加高；逐层位置见 structure.js。'
  }),
  M10: d('月台伸出长度 / 宽度', {
    estimateM: 2.4, certainty: CERTAINTY.ESTIMATE, sourceIds: ['L01'],
    measurementDatum: '自台基边向外', note: '上层八角基：东/西/南三向月台，延伸 2.4 m / 宽 8 m；其余月台 1.2 m。'
  }),

  // ── 柱网 ───────────────────────────────────────────────
  M11: d('明层一至五外槽柱线每面面阔', {
    valueM: 9.5472, certainty: CERTAINTY.ACADEMIC, sourceIds: ['H04', 'H05', 'L02'],
    measurementDatum: '外槽柱线，每面「明间+两次间」总长（正八边形边长 s）',
    note: '研究假说值 [31.2,30,28.8,27.6,26] 营造尺 × 0.306 m；与北测实测均值最大偏差 0.60%（见 plan-audit §2.1）。逐层见 LEVELS。'
  }),
  M12: d('外槽柱线对角径（由 M11 推导）', {
    valueM: 24.95, certainty: CERTAINTY.ACADEMIC, sourceIds: ['H04', 'H05'],
    measurementDatum: '外槽柱线八角对角距',
    note: 'd = s / sin(π/8)；与 M02（塔身最远顶点距 30.27）不是同一条测线。逐层见 LEVELS。'
  }),
  M13: d('外槽每面三开间分配（明:次:次）', {
    estimateM: 0.42, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '面阔内三段比例', note: 'E = 明 0.42 : 次 0.29 : 次 0.29；不是实测。'
  }),
  M14: d('各层柱头/柱脚标高与逐层柱高', {
    estimateM: null, certainty: CERTAINTY.UNVERIFIED, sourceIds: [],
    measurementDatum: '台基顶面为 0 起算', note: '临时层位见 structure.js 的 LEVEL_LAYOUT，全部标 ESTIMATE。'
  }),
  M15: d('首层内槽八角直径', {
    estimateM: 10.25, certainty: CERTAINTY.ESTIMATE, sourceIds: ['L03'],
    measurementDatum: '内槽柱网对角径', note: '上层内槽半径按外槽逐级缩放，标估。'
  }),
  M16: d('首层柱数', {
    valueM: 56, certainty: CERTAINTY.ACADEMIC, sourceIds: ['H03', 'H14'],
    measurementDatum: '24 副阶 + 24 外槽 + 8 内槽',
    note: '是数量不是米。柱径：副阶 E 0.55 / 外槽 E 0.65 / 内槽 E 0.56。'
  }),
  M17: d('二至五明层外槽/内槽柱数', {
    valueM: 24, certainty: CERTAINTY.ACADEMIC, sourceIds: ['H14'],
    measurementDatum: '每层外槽 24 根 / 内槽 8 根', note: '不能由首层 56 推导每层都 56。'
  }),
  M18: d('立柱侧脚', {
    estimateM: 0.6, certainty: CERTAINTY.ESTIMATE, sourceIds: ['H04', 'L04'],
    measurementDatum: '柱脚相对柱头的水平内收',
    note: '本机补强：明层自一至五侧脚收束 6/2/2/2/2 寸，平座二、三、五层约 2/2/1 寸（1 寸 ≈ 0.0306 m）。模型按层高反算逐层区分，非统一角度。'
  }),

  // ── 檐与屋面 ───────────────────────────────────────────
  M19: d('首层下檐 / 上檐檐口标高', {
    estimateM: 10.5, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '台基顶面起算', note: 'E = 10.5 / 16.0，恰组成底层重檐。'
  }),
  M20: d('二至五明层檐口标高', {
    estimateM: 25.0, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '台基顶面起算', note: 'E = 25.0 / 34.5 / 44.0 / 54.1。'
  }),
  M21: d('各檐自柱线外挑出距离', {
    estimateM: 2.2, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '柱线多边形外法向偏移量',
    note: 'E = [2.2, 2.0, 1.9, 1.8, 1.7, 1.5]；自柱线量起，与 M02 的「最远顶点距」不同口径。'
  }),
  M22: d('屋面起坡 / 折点 / 上举 / 角端起翘', {
    estimateM: 1.1, certainty: CERTAINTY.ESTIMATE, sourceIds: ['L05'],
    measurementDatum: '檐口至内檩的径向抬升', note: 'E：径向抬升 1.1–2.7 m（按檐可用高度截断），角端上翘 0.12–0.30 m。'
  }),
  M23: d('平座外圈宽度', {
    estimateM: 1.4, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '自外墙面向外的法向宽度', note: 'E 1.4–1.8 m；须在出檐之内且不侵入门洞。'
  }),
  M24: d('平座铺作层厚度 / 斜撑', {
    estimateM: 1.3, certainty: CERTAINTY.ESTIMATE, sourceIds: ['H01', 'H03'],
    measurementDatum: '暗层结构带厚度', note: 'E 结构层厚 1.3–2.2 m；叉手对角支撑为示意。'
  }),

  // ── 斗栱 ───────────────────────────────────────────────
  M25: d('五层柱头铺作里跳 / 外跳总尺寸', {
    valueM: 0.68, certainty: CERTAINTY.ACADEMIC, sourceIds: ['H05'],
    measurementDatum: '铺作自栌斗出跳总长',
    note: '两组并存：北测 0.680/0.700，陈测 0.71/0.74；默认取北测，不取平均。'
  }),
  M26: d('各层铺作数与出跳级数', {
    estimateM: null, certainty: CERTAINTY.UNVERIFIED, sourceIds: ['H05'],
    measurementDatum: '—', note: '须生成至少 3 类可视不同原型；typeId 不代表 54 种已精确几何。'
  }),
  M27: d('斗口宽 / 斗高 / 斗底宽', {
    estimateM: 0.34, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '栌斗 / 散斗', note: 'E：斗宽 0.34、高 0.19、底宽 0.28。'
  }),
  M28: d('材宽 / 材厚', {
    estimateM: 0.257, certainty: CERTAINTY.ESTIMATE, sourceIds: ['H05'],
    measurementDatum: '五层单材宽',
    note: '由 H05 的 0.306 m 营造尺假说换算：足材 0.3672、单材 0.2570，厚 0.153–0.184 m。' +
      '论文本身即为尺度假说而非实测，故按「估算」标注。'
  }),
  M29: d('昂长 / 昂起角 / 耍头长', {
    estimateM: 1.0, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '—', note: 'E：昂长 1.0–1.7 m、抬角 10–22°、耍头 0.6–0.9 m。'
  }),
  M30: d('斗栱真实断面分布', {
    estimateM: null, certainty: CERTAINTY.UNVERIFIED, sourceIds: ['H05'],
    measurementDatum: '—', note: '模型按 柱头 > 补间、转角最大，保留同层位置差异。'
  }),

  // ── 椽瓦与脊 ───────────────────────────────────────────
  M31: d('椽间距 / 椽径 / 瓦长宽', {
    estimateM: 0.26, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '—', note: 'E：椽间距 0.22–0.30 m、椽径 0.13 m、瓦长 0.32 m、宽 0.24 m。'
  }),
  M32: d('攒尖屋面脊 / 坡度 / 起翘', {
    estimateM: null, certainty: CERTAINTY.UNVERIFIED, sourceIds: [],
    measurementDatum: '—',
    note: '八角攒尖无单条水平正脊，八条垂脊汇顶；「正脊长度」标「不适用」。'
  }),
  M33: d('塔刹总高与分段', {
    estimateM: 10.0, certainty: CERTAINTY.ESTIMATE, sourceIds: ['H14', 'L06'],
    measurementDatum: '五层屋面顶点至刹顶',
    note: '本机补强：省文物局记仰莲刹座 2.17 m + 铁刹身 9.95 m；陈明达 A 模数 1⅛A = 9.934 m 与铁刹身吻合，说明砖仰莲含在 6A 塔身段内而非叠加。分段 E = [1.0,1.0,3.8,1.0,0.7,1.0,1.5]，共 10.0。'
  }),

  // ── 匾额与造像 ─────────────────────────────────────────
  M34: d('匾额尺寸与位置标高', {
    estimateM: 2.1, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '匾额宽（高 0.65）', note: '标高为二次文献参考；字形用原创文字，不称「原字扫描」。'
  }),
  M35: d('各层造像身高与坛座', {
    estimateM: 0.9, certainty: CERTAINTY.ESTIMATE, sourceIds: ['H07'],
    measurementDatum: '—',
    note: '首层像高约 11 m、座约 2.13 m（口径需核实，勿相加造虚高）；分布 1/5/4/7/9；其余层体块 0.9–4.2 m 仅示意。'
  }),
  M36: d('首层六壁佛画高度', {
    estimateM: 8.0, certainty: CERTAINTY.ESTIMATE, sourceIds: ['H07'],
    measurementDatum: '壁面', note: '不得复制壁画图片，用文字图例或抽象占位面。'
  }),

  // ── 栏杆与附属 ─────────────────────────────────────────
  M37: d('望柱高 / 截面 / 栏板厚 / 望柱间距', {
    estimateM: 1.15, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '—', note: 'E：望柱高 1.15、截面 0.15；栏板高 0.72、厚 0.07；每面 4–6 跨。'
  }),
  M38: d('台阶踏高 / 踏面 / 步数', {
    estimateM: 0.16, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '—', note: 'E：踏高 0.16、踏面 0.30；步数由 4 m 台基与月台布局整数求得，标示「示意踏步」。'
  }),
  M39: d('瓦兽 / 滴水 / 风铎尺寸', {
    estimateM: 0.18, certainty: CERTAINTY.ESTIMATE, sourceIds: [],
    measurementDatum: '—', note: 'E：瓦兽长 0.45、风铎高 0.18；装饰示意。'
  }),

  // ── 存疑项（不编造）────────────────────────────────────
  M40: d('二层「铁柱」', {
    estimateM: null, certainty: CERTAINTY.UNVERIFIED, sourceIds: [],
    measurementDatum: '—', note: '数量、截面、位置均未核实；本期不加入铁柱，列为证据缺口。'
  }),
  M41: d('「蚂蚱做法」/ 唐代叉手遗存', {
    estimateM: null, certainty: CERTAINTY.UNVERIFIED, sourceIds: [],
    measurementDatum: '—', note: '术语与具体构件位置未核实；暗层斜撑/叉手仅作功能示意。'
  }),
  M42: d('各构件现状偏移 / 歪闪 / 病害', {
    estimateM: null, certainty: CERTAINTY.UNVERIFIED, sourceIds: ['H09', 'H12'],
    measurementDatum: '—',
    note: '塔顶现状水平位移约北偏东 10.8°（二次来源）；模型呈现原始设计规整状态，不复制倾斜与病害，标「示意未还原具体病害」。'
  }),

  // ── 本机补强：总高分配的交叉校验 ───────────────────────
  M43: d('陈明达 A 模数总高分配', {
    valueM: 8.83, certainty: CERTAINTY.ACADEMIC, sourceIds: ['L07'],
    measurementDatum: 'A = 三层塔身面阔',
    note: 'A/2 (台基 4.415) + 6A (塔身及两层砖仰莲 52.98) + 1⅛A (铁刹 9.934) = 67.33 ≈ M01。作为总高分配的独立交叉校验。'
  })
});

/** 逐层外槽柱线数据（由 M11/M12 展开） */
export const LEVELS = Object.freeze([
  Object.freeze({
    index: 1, name: '一层',
    outerFaceWidthM: 9.5472, outerDiagonalM: 24.95,
    measuredFaceWidthM: 9.553, puzuoJump: 7,
    columnHeadPuzuo: '七铺作双杪双下昂',
    intermediatePuzuo: '七铺作双杪双下昂',
    outerColumnCount: 24, innerColumnCount: 8,
    outerBaysPerFace: 3, innerBaysPerFace: 1,
    hasBalustrade: false, hasSecondaryEave: true
  }),
  Object.freeze({
    index: 2, name: '二层',
    outerFaceWidthM: 9.18, outerDiagonalM: 23.99,
    measuredFaceWidthM: 9.148, puzuoJump: 7,
    columnHeadPuzuo: '七铺作双杪双下昂',
    intermediatePuzuo: '五铺作双杪偷心',
    outerColumnCount: 24, innerColumnCount: 8,
    outerBaysPerFace: 3, innerBaysPerFace: 1,
    hasBalustrade: true, hasSecondaryEave: false
  }),
  Object.freeze({
    index: 3, name: '三层',
    outerFaceWidthM: 8.8128, outerDiagonalM: 23.03,
    measuredFaceWidthM: 8.8, puzuoJump: 6,
    columnHeadPuzuo: '六铺作三杪',
    intermediatePuzuo: '六铺作三杪',
    outerColumnCount: 24, innerColumnCount: 8,
    outerBaysPerFace: 3, innerBaysPerFace: 1,
    hasBalustrade: true, hasSecondaryEave: false
  }),
  Object.freeze({
    index: 4, name: '四层',
    outerFaceWidthM: 8.4456, outerDiagonalM: 22.07,
    measuredFaceWidthM: 8.439, puzuoJump: 5,
    columnHeadPuzuo: '五铺作双杪计心',
    intermediatePuzuo: '五铺作双杪计心',
    outerColumnCount: 24, innerColumnCount: 8,
    outerBaysPerFace: 3, innerBaysPerFace: 1,
    hasBalustrade: true, hasSecondaryEave: false
  }),
  Object.freeze({
    index: 5, name: '五层',
    outerFaceWidthM: 7.956, outerDiagonalM: 20.79,
    measuredFaceWidthM: 8.004, puzuoJump: 4,
    columnHeadPuzuo: '四铺作单杪',
    intermediatePuzuo: '五铺作双杪',
    outerColumnCount: 24, innerColumnCount: 8,
    outerBaysPerFace: 3, innerBaysPerFace: 1,
    hasBalustrade: true, hasSecondaryEave: false
  })
]);

/** A 模数派生（总高分配的交叉校验，见 M43） */
export const MODULE_A = Object.freeze({
  A: 8.83,
  baseM: 4.415,        // A/2
  bodyAndLotusM: 52.98, // 6A —— 含两层砖仰莲
  ironFinialM: 9.934,   // 1⅛A
  totalM: 67.329
});

/** 临时施工几何层位（全部 ESTIMATE，规划 §4.3） */
export const LEVEL_LAYOUT = Object.freeze({
  groundY: 0,
  squareBase: Object.freeze({ y0: 0, y1: 1.6 }),
  octagonalBase: Object.freeze({ y0: 1.6, y1: 4.0 }),
  eaveY: Object.freeze([10.5, 16.0, 25.0, 34.5, 44.0, 54.1]),
  apexY: 57.31,
  finialTopY: 67.31,
  /** 五个明层的展示带 y 区间 */
  brightBands: Object.freeze([
    Object.freeze({ y0: 4.0, y1: 12.5 }),
    Object.freeze({ y0: 17.0, y1: 23.4 }),
    Object.freeze({ y0: 26.2, y1: 32.8 }),
    Object.freeze({ y0: 35.8, y1: 42.3 }),
    Object.freeze({ y0: 45.2, y1: 52.0 })
  ]),
  /** 四个暗层的 y 区间 */
  hiddenBands: Object.freeze([
    Object.freeze({ y0: 14.8, y1: 17.0 }),
    Object.freeze({ y0: 23.4, y1: 26.2 }),
    Object.freeze({ y0: 32.8, y1: 35.8 }),
    Object.freeze({ y0: 42.3, y1: 45.2 })
  ])
});

/** 八角几何常数 */
export const OCTAGON = Object.freeze({
  /** 正八边形：内切圆半径 R = s / (2 sin(π/8)) */
  circumradiusFromSide: (s) => s / (2 * Math.sin(Math.PI / 8)),
  /** 正八边形：半对边距 A = s / (2 tan(π/8)) */
  apothemFromSide: (s) => s / (2 * Math.tan(Math.PI / 8)),
  /** 对角径 → 边长 */
  sideFromDiagonal: (d) => d * Math.sin(Math.PI / 8),
  /** 对角径 → 对边距 */
  acrossFlatsFromDiagonal: (d) => d * Math.cos(Math.PI / 8),
  /** 边长 → 对角径 */
  diagonalFromSide: (s) => s / Math.sin(Math.PI / 8),
  /** 边长 → 对边距（对边距 = s / tan(π/8) = s(1+√2)） */
  acrossFlatsFromSide: (s) => s / Math.tan(Math.PI / 8),
  rotation: Math.PI / 8
});

/** 取一条记录的有效数值（已核实优先，否则用估算） */
export function effectiveM(id) {
  const rec = dimensions[id];
  if (!rec) return null;
  return rec.valueM !== null && rec.valueM !== undefined ? rec.valueM : rec.estimateM;
}

/** 是否为「不得冒充实测」的条目 */
export function isEstimate(id) {
  const rec = dimensions[id];
  if (!rec) return false;
  return rec.certainty === CERTAINTY.ESTIMATE || rec.certainty === CERTAINTY.UNVERIFIED;
}
