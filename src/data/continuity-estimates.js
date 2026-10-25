/**
 * src/data/continuity-estimates.js
 *
 * 明暗过渡构架的**估算参数表**。
 *
 * ⚠ 本表所有数值都是**为「研究性复原」服务的估算初值**，不是历史测绘。
 *   provenance: 'visual-structure-estimate; not measured'
 *   它**只**驱动新增构件的尺寸，**不得**覆盖任何已核实值
 *   （总高 67.31 m、底层最远顶点距 30.27 m、逐层面宽、柱数 24+8、铺作跳数 7/7/6/5/4、斗栱 54 种 —— 全部不动）。
 *
 * 规划来源：handoff/plans/MUTA-R2-001.md §5.2
 */

export const CONTINUITY_ESTIMATES = Object.freeze({
  provenance: 'visual-structure-estimate; not measured',
  sources: Object.freeze([
    'references/photos/manifest.json',
    'https://whc.unesco.org/fr/listesindicatives/5803'
  ]),
  /** 周向连续枋的截面（宽 × 高，m） */
  perimeterLedgerBeamWidthM: 0.24,
  perimeterLedgerBeamHeightM: 0.30,
  /** 相邻两道枋的中心距上限（m） */
  intermediateLedgerMaxStepM: 0.74,
  /** 短柱截面（m） */
  postWidthM: 0.25,
  /** 斜撑截面（m） */
  braceWidthM: 0.18,
  braceDepthM: 0.16,
  /** 竖向搭接容许（m） */
  gapClosureOverlapM: 0.08,
  /** 自外墙面向内退的最大深度（m），超出即判定离框架外缘 */
  facadeDepthLimitM: 1.20,
  /** 第五层屋面下收边的出挑深度（m） */
  topEavePlinthDepthM: 0.20,
  certainty: 'estimate',
  measurementDatum: 'visual alignment only; no survey'
});

/**
 * 新增估算构件的材质键 → sRGB 颜色。
 * 仅用于**新增**结构；实际材质必须走现有 makeWoodMaterial 等出口，
 * 不得无依据重染旧实测/既有几何（规划 §3.1 --mat-*）。
 */
export const CONTINUITY_MATERIALS = Object.freeze({
  frame: 0x553A2B,
  beam: 0x624533,
  brace: 0x493224,
  shadow: 0x261D1B,
  roof: 0x434E49
});

/**
 * 过渡带的定义。
 *
 * P1–P4 是「明—暗交接与暗层可见构架」；C5 是第五层屋面下的承托，
 * **归 bright-5，绝不造第五个暗层**（规划 §5.2 F）。
 */
export const CONTINUITY_BANDS = Object.freeze([
  Object.freeze({ id: 'P1', y0: 12.5, y1: 17.0, ownerGroup: 'hidden-1', lowerLevel: 1, upperLevel: 2, kind: 'transition' }),
  Object.freeze({ id: 'P2', y0: 23.4, y1: 26.2, ownerGroup: 'hidden-2', lowerLevel: 2, upperLevel: 3, kind: 'transition' }),
  Object.freeze({ id: 'P3', y0: 32.8, y1: 35.8, ownerGroup: 'hidden-3', lowerLevel: 3, upperLevel: 4, kind: 'transition' }),
  Object.freeze({ id: 'P4', y0: 42.3, y1: 45.2, ownerGroup: 'hidden-4', lowerLevel: 4, upperLevel: 5, kind: 'transition' }),
  Object.freeze({ id: 'C5', y0: 52.0, y1: 54.1, ownerGroup: 'bright-5', lowerLevel: 5, upperLevel: 5, kind: 'eaveSupport' })
]);

/** 规划 §5.2 E：首层 P1 中「旧暗层起点」之前的一段必须独立补足 */
export const P1_REQUIRED_COVER = Object.freeze({ y0: 12.5, y1: 14.8 });
