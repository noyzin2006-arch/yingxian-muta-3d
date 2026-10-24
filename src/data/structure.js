/**
 * src/data/structure.js
 *
 * 拓扑与色板 —— 把尺寸数据翻译成「几何层怎么摆」。
 *
 * 纯数据 + 纯函数，不依赖 three。几何模块（columns / roof / brackets …）从这里取参数。
 * 所有 E（估算）值都带 estimate 标记，实现方在 UI 上必须能区分。
 */

import { LEVELS, LEVEL_LAYOUT, OCTAGON } from './dimensions.js';
import {
  octagonVertices, octagonEdges, offsetPolygon, circumradius, apothem,
  sideFromDiagonal, diagonalFromSide
} from '../geometry/math-octagon.js';

/* ── 色板（规划 §2.3 设计量尺）──────────────────────────── */

/** 正檐内端环相对柱线环的缩放（规划 §4.4 INNER_SCALE） */
export const INNER_SCALE = 0.72;

export const PALETTE = Object.freeze({
  sky: 0xD6D7D2,
  fog: 0xC7CBC6,
  wood: Object.freeze({
    base: 0x47362D,
    variant: 0x6A5040,
    weathered: 0x7B7165,
    deep: 0x261F1B
  }),
  tile: 0x3B4245,
  brick: 0x77746E,
  stone: 0xA6A298,
  paint: Object.freeze({
    cinnabar: 0x803D33,
    ochreGreen: 0x486153,
    darkGold: 0x99805C
  }),
  statueGold: 0xB39A65,
  iron: 0x4A4A48,
  ink: '#222723',
  inkMuted: '#626A63',
  panel: '#F2F0E9',
  divider: '#B8B6AC',
  accent: '#456A5F',
  focusRing: '#456A5F'
});

/* ── 构件分组（用于批次生成与剖切可见池）────────────────── */

export const GROUP = Object.freeze({
  BASE: 'base',
  COLUMNS: 'columns',
  BEAMS: 'beams',
  BRACKETS: 'brackets',
  ROOF: 'roof',
  TILE: 'tile',
  RIDGE: 'ridge',
  BALUSTRADE: 'balustrade',
  FINIAL: 'finial',
  STATUES: 'statues',
  PLAQUES: 'plaques',
  WALL: 'wall',
  STAIR: 'stair'
});

/* ── 构件原型键（斗栱台账用）───────────────────────────── */

export const POSITION_KIND = Object.freeze({
  CORNER: 'corner',
  HEAD: 'head',
  INTERMEDIATE: 'intermediate'
});

export const SECTION_KIND = Object.freeze({
  EAVE: 'eave',
  PINGZUO: 'pingzuo',
  INNER: 'inner',
  SECONDARY: 'secondary'
});

/* ── 临时施工参数（全部 ESTIMATE）────────────────────────── */

export const EST = Object.freeze({
  /** 台基下层（方形） */
  squareBase: Object.freeze({
    y0: 0, y1: 1.6, side: 33.0,
    /** 四向月台：伸出长度 / 宽度 */
    moonPlatforms: Object.freeze([
      Object.freeze({ dir: 'S', outward: 2.4, width: 8 }),
      Object.freeze({ dir: 'N', outward: 2.4, width: 8 }),
      Object.freeze({ dir: 'E', outward: 2.4, width: 8 }),
      Object.freeze({ dir: 'W', outward: 2.4, width: 8 })
    ])
  }),
  /** 台基上层（八角） */
  octagonalBase: Object.freeze({
    y0: 1.6, y1: 4.0, diagonal: 35.47,
    /** 角石 */
    cornerStoneSize: 1.5,
    cornerStoneRise: 0.55,
    /** 正东 / 正西 / 正南 三向月台 */
    moonPlatforms: Object.freeze([
      Object.freeze({ dir: 'S', outward: 2.4, width: 8 }),
      Object.freeze({ dir: 'E', outward: 1.2, width: 6 }),
      Object.freeze({ dir: 'W', outward: 1.2, width: 6 })
    ])
  }),
  /** 须弥座层高（位于台基内部，勿重复加高） */
  sumeruBands: Object.freeze([0.30, 0.28, 0.45, 0.27, 0.30]),
  /** 柱径 */
  columnRadius: Object.freeze({
    secondary: 0.275,   // 副阶柱 径 0.55
    outer: 0.325,       // 外槽柱 径 0.65
    inner: 0.28         // 内槽柱 径 0.56
  }),
  /** 柱截面段数（低模） */
  columnSegments: 8,
  /** 栏杆 */
  balustrade: Object.freeze({
    width: 1.4,          // 平座宽（法向外）
    postHeight: 1.15,
    postSection: 0.15,
    railTop: 0.1,        // 扶手厚
    railBottom: 0.08,
    balusterHeight: 0.72,
    balusterThickness: 0.07,
    postsPerFace: 5      // 含两端角柱，故实际每面 4 跨
  }),
  /** 踏步 */
  stair: Object.freeze({
    rise: 0.16, tread: 0.30, width: 6.0
  }),
  /** 屋面 */
  roof: Object.freeze({
    eaveUpturnMin: 0.12,
    eaveUpturnMax: 0.18,   // 依 L05「角翘十分平缓」取规划区间下限
    eaveCurvePower: 1.7,
    radialRiseCoef: 0.62,
    radialRiseQuad: 0.38,
    sagAmplitude: 0.08,
    segmentsPerFace: 10,
    ringSegments: 6
  }),
  /** 斗栱 */
  bracket: Object.freeze({
    douWidth: 0.34,
    douHeight: 0.19,
    douBottom: 0.28,
    singleCai: 0.257,      // 单材宽（M28）
    fullCai: 0.3672,       // 足材宽
    caiThickness: [0.153, 0.184],
    angLength: [1.0, 1.7],
    angRiseDeg: [10, 22],
    shuatouLength: [0.6, 0.9],
    /** 五层柱头铺作里/外跳总长（北测优先，M25） */
    fifthLayerJump: Object.freeze({ inner: 0.68, outer: 0.70 }),
    fifthLayerJumpAlt: Object.freeze({ inner: 0.71, outer: 0.74 })
  }),
  /**
   * 塔刹。
   * 按陈明达 A 模数解出的口径：**砖砌仰莲座（2.17 m）属于 6A 塔身段的顶端**，
   * 铁刹身（1⅛A ≈ 9.95 m）自砖仰莲顶起算，两者**不是叠加**（见 plan-audit §2.2）。
   */
  finial: Object.freeze({
    y0: 57.31,        // 铁刹底 = 砖仰莲顶
    y1: 67.31,        // 刹顶
    brickLotus: Object.freeze({ y0: 55.14, y1: 57.31, radius: 1.45 }),
    /** 攒尖顶的宝顶平台半径：铁刹与砖仰莲座立于其上 */
    apexPlatformRadius: 1.45,
    segments: Object.freeze([
      Object.freeze({ name: '覆钵', height: 1.15, radius: 1.05 }),
      Object.freeze({ name: '相轮', height: 4.0, radius: 0.72, rings: 5 }),
      Object.freeze({ name: '圆光', height: 1.1, radius: 0.86 }),
      Object.freeze({ name: '仰月', height: 0.8, radius: 0.6 }),
      Object.freeze({ name: '宝盖', height: 1.1, radius: 0.78 }),
      Object.freeze({ name: '宝珠', height: 1.8, radius: 0.34 })
    ]),
    chains: 8
  }),
  /** 瓦与椽 */
  tile: Object.freeze({
    rafterSpacing: 0.26,
    rafterRadius: 0.065,
    tileLength: 0.32,
    tileWidth: 0.24,
    tileThickness: 0.035
  }),
  /** 瓦兽 / 风铎 */
  ornament: Object.freeze({
    beastLength: 0.45,
    windBellHeight: 0.18,
    windBellRadius: 0.07
  }),
  /** 匾额 */
  plaque: Object.freeze({
    width: 2.1, height: 0.65, depth: 0.12
  })
});

/* ── 造像组合（H07）───────────────────────────────────── */

export const STATUE_GROUPS = Object.freeze([
  Object.freeze({ level: 1, count: 1, label: '释迦牟尼坐像', altarPlan: 'lotus', height: 11.0, seatHeight: 2.13 }),
  Object.freeze({ level: 2, count: 5, label: '一佛二菩萨二协侍', altarPlan: 'square', height: null, seatHeight: null }),
  Object.freeze({ level: 3, count: 4, label: '四方佛', altarPlan: 'octagon', height: null, seatHeight: null }),
  Object.freeze({ level: 4, count: 7, label: '一佛二菩萨二弟子（文殊骑狮、普贤骑象）', altarPlan: 'square', height: null, seatHeight: null }),
  Object.freeze({ level: 5, count: 9, label: '毗卢舍那佛与八大菩萨', altarPlan: 'octagon', height: null, seatHeight: null })
]);

/* ── 匾额（位置为 E，文字为原创排版）───────────────────── */

export const PLAQUES = Object.freeze([
  Object.freeze({ level: 1, text: '万古观瞻', by: '清康熙六十一年应州知州章弘' }),
  Object.freeze({ level: 3, text: '释迦塔', by: '明成化七年功德主闫富贵重妆' }),
  Object.freeze({ level: 4, text: '天下奇观', by: '明正德三年明武宗朱厚照' }),
  Object.freeze({ level: 5, text: '峻极神工', by: '明永乐四年明成祖朱棣' })
]);

/* ── 六个常驻热点（锚点用楼层 + 面）────────────────────── */

export const HOTSPOT_ANCHORS = Object.freeze([
  Object.freeze({ id: 'base', level: 0, face: null, ring: 'platform' }),
  Object.freeze({ id: 'columnGrid', level: 1, face: null, ring: 'secondary' }),
  Object.freeze({ id: 'brackets', level: 3, face: 0, ring: 'outer' }),
  Object.freeze({ id: 'hiddenFloor', level: 2, face: null, ring: 'pingzuo' }),
  Object.freeze({ id: 'plaqueStatue', level: 1, face: 5, ring: 'inner' }),
  Object.freeze({ id: 'finial', level: 5, face: null, ring: 'finial' })
]);

/* ── 层位构造 ───────────────────────────────────────────── */

/** 内槽边长：首层内槽对角径 10.25 m（M15 / L03） */
export const INNER_SIDE_L1 = sideFromDiagonal(10.25);

/**
 * 生成完整的结构描述。所有几何模块从这里取参数。
 */
export function buildStructure() {
  const layout = LEVEL_LAYOUT;

  // ── 五个明层
  const levels = LEVELS.map((lv, i) => {
    const band = layout.brightBands[i];
    const outerSide = lv.outerFaceWidthM;
    // 内槽：1–4 层位置不动，第五层才内收一次（L02 / 官方案例）
    const innerSide = i < 4
      ? INNER_SIDE_L1
      : INNER_SIDE_L1 * (lv.outerFaceWidthM / LEVELS[0].outerFaceWidthM);

    const outerRing = octagonVertices(outerSide, band.y0);
    const innerRing = octagonVertices(innerSide, band.y0);

    return {
      index: lv.index,
      name: lv.name,
      band,
      /** 明层柱线 */
      outer: {
        side: outerSide,
        diagonal: lv.outerDiagonalM,
        measuredFaceWidthM: lv.measuredFaceWidthM,
        y0: band.y0,
        y1: band.y1,
        vertices: outerRing,
        edges: octagonEdges(outerRing),
        circumradius: circumradius(outerSide),
        apothem: apothem(outerSide),
        columnCount: lv.outerColumnCount,
        radius: EST.columnRadius.outer
      },
      inner: {
        side: innerSide,
        diagonal: diagonalFromSide(innerSide),
        y0: band.y0,
        y1: band.y1,
        vertices: innerRing,
        edges: octagonEdges(innerRing),
        circumradius: circumradius(innerSide),
        apothem: apothem(innerSide),
        columnCount: lv.innerColumnCount,
        radius: EST.columnRadius.inner
      },
      /** 首层副阶周匝（最外一圈柱） */
      secondary: lv.index === 1 ? {
        side: sideFromDiagonal(30.27),
        radius: EST.columnRadius.secondary,
        columnCount: 24,
        vertices: octagonVertices(sideFromDiagonal(30.27), band.y0)
      } : null,
      balustrade: lv.hasBalustrade
        ? { y: band.y0, width: EST.balustrade.width, ...EST.balustrade }
        : null,
      puzuo: {
        jump: lv.puzuoJump,
        columnHead: lv.columnHeadPuzuo,
        intermediate: lv.intermediatePuzuo,
        outward: lv.index >= 5 ? EST.bracket.fifthLayerJump.outer : 0
      },
      statue: STATUE_GROUPS[i],
      plaques: PLAQUES.filter((p) => p.level === lv.index)
    };
  });

  // ── 四个暗层
  const hiddenFloors = layout.hiddenBands.map((band, i) => ({
    index: i + 1,
    band,
    /** 暗层夹在第 i+1 与第 i+2 明层之间 */
    belowLevel: i + 1,
    aboveLevel: i + 2,
    thickness: band.y1 - band.y0
  }));

  // ── 六重檐
  // 每檐的配置：offset = 自柱线外挑；rise = 檐口到内檩的升起；
  // innerRingMode = 内端落在哪条环上。
  //  eave0 是一层的「裙檐」，装在**副阶柱**环上，出挑远小于正檐（M21 的 2.2 只适用于正檐）。
  const eaveY = layout.eaveY;
  const EAVE_CONFIG = [
    { offset: 0.9, rise: 2.1, innerRingMode: 'outer', ownerLevel: 1, name: '一层下檐（裙檐）' },
    { offset: 2.0, rise: 3.0, innerRingMode: 'scaled', ownerLevel: 1, name: '一层上檐' },
    { offset: 1.9, rise: 2.8, innerRingMode: 'scaled', ownerLevel: 2, name: '二层檐' },
    { offset: 1.8, rise: 2.6, innerRingMode: 'scaled', ownerLevel: 3, name: '三层檐' },
    { offset: 1.7, rise: 2.4, innerRingMode: 'scaled', ownerLevel: 4, name: '四层檐' },
    { offset: 1.5, rise: null, innerRingMode: 'apex', ownerLevel: 5, name: '五层攒尖顶' }
  ];
  const eaves = eaveY.map((y, i) => {
    const cfg = EAVE_CONFIG[i];
    const lv = levels[cfg.ownerLevel - 1];
    const isApex = cfg.innerRingMode === 'apex';
    // 裙檐挂在副阶柱环上
    const ring = (i === 0 && lv.secondary)
      ? (lv.secondary.vertices ?? octagonVertices(lv.secondary.side, lv.band.y0))
      : lv.outer.vertices;
    // 内端环：正檐落在「柱线 × 0.72」的缩放环上；裙檐落在**塔身外槽柱线**上
    // （若落在副阶环上，裙檐会退化成 0.9 m 宽的一圈薄片，失去裙檐的体量）。
    const innerRingVertices = isApex
      ? null
      : (cfg.innerRingMode === 'outer'
        ? lv.outer.vertices.map((p) => ({ x: p.x, y: p.y, z: p.z }))
        : lv.outer.vertices.map((p) => ({ x: p.x * INNER_SCALE, y: p.y, z: p.z * INNER_SCALE })));

    return {
      index: i,
      name: cfg.name,
      y,
      ownerLevel: cfg.ownerLevel,
      isApex,
      offset: cfg.offset,
      rise: cfg.rise,
      innerRingMode: cfg.innerRingMode,
      ring,
      innerRingVertices,
      apexY: isApex ? layout.apexY : null
    };
  });

  // 各层柱顶标高 = 本层正檐的铺作底面（檐口标高 − 铺作高）
  const BRACKET_DROP = 1.1;
  levels.forEach((lv) => {
    // 五层只有攒尖檐，因此顶层也用该檐推算柱顶标高
    const mainEave = eaves.find((e) => e.ownerLevel === lv.index && e.innerRingMode === 'scaled')
      ?? eaves.find((e) => e.ownerLevel === lv.index);
    lv.columnTopY = mainEave ? mainEave.y - BRACKET_DROP : lv.band.y1;
    lv.bracketBaseY = lv.columnTopY;
  });

  // ── 台基
  const base = {
    square: EST.squareBase,
    octagonal: {
      ...EST.octagonalBase,
      side: sideFromDiagonal(EST.octagonalBase.diagonal),
      vertices: octagonVertices(sideFromDiagonal(EST.octagonalBase.diagonal), EST.octagonalBase.y1)
    },
    stairs: {
      ...EST.stair,
      stepCount: Math.round((EST.octagonalBase.y1 - EST.octagonalBase.y0) / EST.stair.rise)
    }
  };

  return {
    palette: PALETTE,
    levels,
    hiddenFloors,
    eaves,
    base,
    finial: EST.finial,
    statueGroups: STATUE_GROUPS,
    plaques: PLAQUES,
    hotspotAnchors: HOTSPOT_ANCHORS,
    totalHeightM: layout.finialTopY,
    apexY: layout.apexY,
    /** 正南面索引（用于机位与朝向） */
    southFace: 5
  };
}

/** 供剖切/分解使用的楼层顺序（含明层与暗层） */
export function floorOrder(structure) {
  const order = [];
  structure.levels.forEach((lv) => {
    order.push({ key: `bright-${lv.index}`, kind: 'bright', level: lv.index, y: lv.band.y0 });
    const hidden = structure.hiddenFloors.find((h) => h.belowLevel === lv.index);
    if (hidden) order.push({ key: `hidden-${hidden.index}`, kind: 'hidden', level: hidden.index, y: hidden.band.y0 });
  });
  return order;
}

/** 展开某一层的外圈/内圈/副阶三环（供柱网与斗栱模块消费） */
export function ringsOfLevel(structure, levelIndex) {
  const lv = structure.levels[levelIndex - 1];
  if (!lv) return [];
  const rings = [
    { id: 'outer', ring: 'outer', side: lv.outer.side, radius: lv.outer.radius, vertices: lv.outer.vertices, columnCount: lv.outer.columnCount },
    { id: 'inner', ring: 'inner', side: lv.inner.side, radius: lv.inner.radius, vertices: lv.inner.vertices, columnCount: lv.inner.columnCount }
  ];
  if (lv.secondary) {
    rings.unshift({
      id: 'secondary',
      ring: 'secondary',
      side: lv.secondary.side,
      radius: lv.secondary.radius,
      vertices: octagonVertices(lv.secondary.side, lv.secondary.y ?? lv.band.y0),
      columnCount: lv.secondary.columnCount
    });
  }
  return rings;
}

/** 某层的平座外轮廓（在柱线之外、出檐之内） */
export function pingzuoOutline(structure, levelIndex, width) {
  const lv = structure.levels[levelIndex - 1];
  if (!lv) return null;
  return offsetPolygon(lv.outer.vertices, width);
}

export { OCTAGON };
