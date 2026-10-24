/**
 * src/geometry/brackets.js
 *
 * 斗栱铺作生成器 —— 本项目最核心也最容易出错的部分。
 *
 * 两条铁律（规划 §4.4）：
 *   1. 绝不用「一个方块」代表斗栱。每套铺作由栌斗 / 华栱 / 泥道栱 / 令栱 /
 *      昂 / 耍头 / 驼峰 / 散斗 等分件叠垒而成。
 *   2. 先建**审计台账 ledger**，再生成实例。不得先宣称「480 朵」再往里乱塞。
 *
 * 局部坐标（与 profiles.js 一致）：
 *   原点 = 柱头中心（栌斗底面）；+Z = 出檐方向；+X = 沿面方向；+Y = 向上。
 */

import * as THREE from 'three';
import {
  makeDou, makeSanDou, makeHuaGong, makeNiDaoGong, makeLingGong, makeHengGong,
  makeAng, makeShuatou, makeTuofeng, makeTiMu
} from './profiles.js';
import { octagonColumnPositions, octagonEdges } from './math-octagon.js';
import { EST, POSITION_KIND, SECTION_KIND } from '../data/structure.js';

/** 竖向层高：每层铺作上升约一个「材高 + 斗高」 */
export const LAYER_H = 0.34;   // 每层铺作升起高度：加深檐下斗栱带的厚度

/**
 * 一套铺作的参数 → 一个原型标识。
 * 只有参数完全相同的铺作才共用几何实例。
 */
export function bracketTypeId(p) {
  return [
    `t${p.nTiao}`,
    p.hasAng ? `ang${p.angCount}` : 'noang',
    p.hasShuatou ? 'shuatou' : 'noshuatou',
    p.hasTuofeng ? 'tuofeng' : 'notuofeng',
    `j${p.jumpLen.toFixed(3)}`,
    `c${p.caiWidth.toFixed(3)}`,
    `v${p.variant}`
  ].join('_');
}

/**
 * 生成一套铺作的所有分件（局部坐标，原点在柱头）。
 *
 * @param {object} p
 * @param {number} p.nTiao      铺作跳数（华栱层数）
 * @param {number} p.angCount   下昂数量（0 = 无昂）
 * @param {boolean} p.hasShuatou 是否出耍头
 * @param {boolean} p.hasTuofeng 顶部是否设驼峰承檩
 * @param {number} p.jumpLen    每跳的水平出挑
 * @param {number} p.caiWidth   材宽
 * @param {number} p.caiHeight  材高（厚）
 * @param {number} p.douWidth   栌斗宽
 * @param {number} p.douHeight  栌斗高
 * @param {number} p.douBottom  栌斗底宽
 * @param {number} p.transverseLen 泥道/令栱长度
 * @param {number} [p.variant]  形态变体（用于同层位置差异）
 * @param {number} [p.angLength]
 * @param {number} [p.angRiseDeg]
 * @param {number} [p.shuatouLength]
 * @returns {{pieces: Array, height: number, outward: number}}
 */
export function buildBracketSet(p) {
  const pieces = [];
  const {
    nTiao, angCount, hasShuatou, hasTuofeng,
    jumpLen, caiWidth, caiHeight,
    douWidth, douHeight, douBottom, transverseLen,
    variant = 0
  } = p;

  const angLength = p.angLength ?? 1.2;
  const angRiseDeg = p.angRiseDeg ?? 16;
  const shuatouLength = p.shuatouLength ?? 0.72;
  const variantScale = 1 + (variant % 3) * 0.012;

  const push = (name, kind, geometry, x = 0, y = 0, z = 0, ry = 0) => {
    if (!geometry) return;
    if (ry) geometry.rotateY(ry);
    geometry.translate(x, y, z);
    pieces.push({ name, kind, geometry });
  };

  // ── 栌斗（柱头）
  push('栌斗', 'dou', makeDou({ top: douBottom, bottom: douWidth, height: douHeight }), 0, 0, 0);

  let y = douHeight;

  // ── 泥道栱（沿面方向，落在栌斗上）
  push('泥道栱', 'niDaoGong',
    makeNiDaoGong({ length: transverseLen, width: caiWidth, height: caiHeight }), 0, y, 0);

  // ── 逐跳叠垒
  for (let i = 0; i < nTiao; i++) {
    const z0 = i * jumpLen;
    const armLen = jumpLen * variantScale;
    // 华栱（本层出跳）
    push(`华栱${i + 1}`, 'huaGong',
      makeHuaGong({ length: armLen, width: caiWidth, height: caiHeight }), 0, y, z0);
    // 散斗（本跳末端）
    push('散斗', 'sanDou',
      makeSanDou({ top: 0.2, bottom: 0.24, height: 0.12 }), 0, y + caiHeight, z0 + armLen);
    // 令栱（横栱，跨于本跳之上）
    if (i > 0) {
      push('令栱', 'lingGong',
        makeLingGong({ length: transverseLen * 0.86, width: caiWidth, height: caiHeight }),
        0, y + LAYER_H - caiHeight * 0.2, z0 + armLen * 0.62);
    }
    y += LAYER_H;
  }

  const stackTopY = y;

  // ── 昂（自叠层中部斜向下伸出）
  for (let a = 0; a < angCount; a++) {
    const layer = Math.max(0, nTiao - 1 - a);
    const z0 = layer * jumpLen;
    const ang = makeAng({
      length: angLength, width: caiWidth, height: caiHeight,
      riseDeg: angRiseDeg + (a * 2), beak: 0.22
    });
    // 昂的根部坐在该层散斗位置
    push('昂', 'ang', ang, 0, douHeight + LAYER_H * layer + caiHeight * 0.4, z0);
  }

  // ── 耍头（顶部水平外伸）
  if (hasShuatou) {
    push('耍头', 'shuatou',
      makeShuatou({ length: shuatouLength, width: caiWidth, height: caiHeight }),
      0, stackTopY - 0.02, (nTiao - 1) * jumpLen + jumpLen * 0.25);
  }

  // ── 驼峰 + 横栱（承檩）
  let purlinY = stackTopY;
  if (hasTuofeng) {
    push('驼峰', 'tuofeng',
      makeTuofeng({ width: transverseLen * 0.55, depth: 0.34, height: 0.2 }),
      0, stackTopY, (nTiao - 1) * jumpLen * 0.9);
    purlinY = stackTopY + 0.2;
    push('横栱', 'hengGong',
      makeHengGong({ length: transverseLen * 0.72, width: caiWidth * 0.9, height: caiHeight * 0.9 }),
      0, purlinY - caiHeight * 0.9, (nTiao - 1) * jumpLen * 0.9);
  }

  // ── 替木（纵向联系）
  push('替木', 'tiMu',
    makeTiMu({ length: jumpLen * 0.9, width: 0.14, height: 0.11 }),
    0, stackTopY - 0.02, (nTiao - 1) * jumpLen * 0.35);

  return {
    pieces,
    height: purlinY + 0.08,
    outward: (nTiao - 1) * jumpLen + jumpLen + (angCount ? angLength * 0.55 : 0)
  };
}

/**
 * 各层的铺作配置（据 M26 / H05，逐层不同形制）。
 * 出挑总长为 ESTIMATE；五层柱头里/外跳取 M25 北测值 0.680 / 0.700。
 */
export function bracketProfileForLevel(levelIndex) {
  const B = EST.bracket;
  switch (levelIndex) {
    case 1:
      return { nTiao: 3, angCount: 2, hasShuatou: true, hasTuofeng: true, jumpLen: 0.62, outward: 2.0 };
    case 2:
      return { nTiao: 3, angCount: 2, hasShuatou: true, hasTuofeng: true, jumpLen: 0.58, outward: 1.85 };
    case 3:
      return { nTiao: 3, angCount: 0, hasShuatou: true, hasTuofeng: true, jumpLen: 0.52, outward: 1.6 };
    case 4:
      return { nTiao: 2, angCount: 0, hasShuatou: true, hasTuofeng: true, jumpLen: 0.55, outward: 1.25 };
    case 5:
      return {
        nTiao: 1, angCount: 0, hasShuatou: true, hasTuofeng: true, jumpLen: 0.34,
        outward: B.fifthLayerJump.outer
      };
    default:
      return { nTiao: 2, angCount: 0, hasShuatou: true, hasTuofeng: true, jumpLen: 0.4, outward: 1.0 };
  }
}

/**
 * 生成某一层全部铺作实例 + 审计台账。
 *
 * @param {object} structure buildStructure() 的结果
 * @param {number} levelIndex 1..5
 * @param {object} opts
 * @param {number} [opts.sectionKind] SECTION_KIND
 * @param {number} [opts.variantOffset]
 * @returns {{placements: Array, ledger: object, typeMap: Map}}
 */
export function buildLevelBrackets(structure, levelIndex, opts = {}) {
  const lv = structure.levels[levelIndex - 1];
  const sectionKind = opts.sectionKind ?? SECTION_KIND.EAVE;
  const placements = [];
  const ledger = { floor: levelIndex, ring: null, kind: null, sourceId: null, estimated: true, entries: [] };

  const profile = bracketProfileForLevel(levelIndex);
  const base = {
    nTiao: profile.nTiao,
    angCount: profile.angCount,
    hasShuatou: profile.hasShuatou,
    hasTuofeng: profile.hasTuofeng,
    jumpLen: profile.jumpLen,
    caiWidth: EST.bracket.singleCai,
    caiHeight: EST.bracket.caiThickness[0],
    douWidth: EST.bracket.douWidth,
    douHeight: EST.bracket.douHeight,
    douBottom: EST.bracket.douBottom,
    transverseLen: Math.max(0.9, profile.outward * 0.75),
    angLength: EST.bracket.angLength[1] * 0.9,
    angRiseDeg: EST.bracket.angRiseDeg[1],
    shuatouLength: EST.bracket.shuatouLength[1]
  };

  const rings = [];
  // 外檐铺作：装在每层外槽柱线上
  rings.push({ id: 'outer', vertices: lv.outer.vertices, y: lv.bracketBaseY ?? lv.band.y1, kind: 'eave' });
  // 内槽铺作：装在内槽柱线上（尺寸小一档）
  rings.push({
    id: 'inner', vertices: lv.inner.vertices, y: lv.bracketBaseY ?? lv.band.y1, kind: 'inner',
    scale: 0.62
  });
  // 首层副阶铺作：五铺作双杪偷心
  if (lv.secondary) {
    rings.push({
      id: 'secondary',
      vertices: lv.secondary.vertices ?? lv.outer.vertices,
      y: lv.band.y0 + 0.1,
      kind: 'secondary',
      secondary: true
    });
  }

  for (const ring of rings) {
    const positions = octagonColumnPositions(ring.vertices);
    const edges = octagonEdges(ring.vertices);
    const typeMap = new Map();

    positions.forEach((pos, idx) => {
      // 位置类别：角柱 / 柱头 / 补间
      const kind = pos.kind === 'corner' ? POSITION_KIND.CORNER : POSITION_KIND.INTERMEDIATE;
      // 出挑方向：角柱需要两个朝向（两相邻面），其余沿本面法向
      const faces = pos.kind === 'corner'
        ? [(pos.face + 7) % 8, pos.face]
        : [pos.face];

      faces.forEach((fi, fiIdx) => {
        const edge = edges[fi];
        const variant = (idx + fiIdx + levelIndex) % 3;
        const cfg = {
          ...base,
          variant,
          nTiao: ring.secondary ? 2 : base.nTiao,
          angCount: ring.secondary ? 0 : base.angCount,
          jumpLen: ring.secondary ? base.jumpLen * 0.8 : base.jumpLen,
          transverseLen: ring.secondary ? 0.85 : base.transverseLen,
          caiWidth: base.caiWidth * (ring.scale ?? 1),
          caiHeight: base.caiHeight * (ring.scale ?? 1),
          douWidth: base.douWidth * (ring.scale ?? 1),
          douHeight: base.douHeight * (ring.scale ?? 1),
          douBottom: base.douBottom * (ring.scale ?? 1)
        };
        const typeId = bracketTypeId(cfg);
        if (!typeMap.has(typeId)) {
          const built = buildBracketSet(cfg);
          typeMap.set(typeId, built);
        }
        const built = typeMap.get(typeId);

        // 角柱位置：局部原点落在角柱轴线上
        const px = pos.x;
        const pz = pos.z;
        // 出挑朝向：沿该面的外法向
        const azimuth = Math.atan2(edge.normal.x, edge.normal.z);
        placements.push({
          typeId,
          floor: levelIndex,
          ring: ring.id,
          kind,
          sectionKind,
          face: fi,
          position: new THREE.Vector3(px, ring.y, pz),
          rotationY: azimuth,
          /** 该套铺作相对柱线的出挑总长 */
          outward: built.outward,
          pieces: built.pieces,
          sourceIds: ['H03', 'H05'],
          estimated: true
        });
      });
    });

    ledger.ring = ring.id;
    ledger.kind = 'bracketSet';
    ledger.sourceId = 'H05';
    ledger.entries.push({
      ring: ring.id,
      count: placements.filter((p) => p.ring === ring.id).length,
      distinctTypes: typeMap.size,
      estimated: true
    });
  }

  return { placements, ledger, total: placements.length };
}

/**
 * 汇总整塔的斗栱台账：逐层 × 逐环 × 位置类别 的件数与几何类别数。
 * UI 用它显示「文献口径 54 种 / 480 朵」与「本模型实际生成 X 组、Y 类」的差异。
 */
export function summarizeBrackets(allPlacements) {
  const byFloor = {};
  const typeIds = new Set();
  for (const p of allPlacements) {
    typeIds.add(p.typeId);
    byFloor[p.floor] = byFloor[p.floor] || { total: 0, byRing: {}, byKind: {}, types: new Set() };
    const f = byFloor[p.floor];
    f.total += 1;
    f.types.add(p.typeId);
    f.byRing[p.ring] = (f.byRing[p.ring] || 0) + 1;
    f.byKind[p.kind] = (f.byKind[p.kind] || 0) + 1;
  }
  const floors = Object.entries(byFloor).map(([floor, f]) => ({
    floor: Number(floor),
    total: f.total,
    byRing: f.byRing,
    byKind: f.byKind,
    distinctTypes: f.types.size
  })).sort((a, b) => a.floor - b.floor);
  return {
    totalSets: allPlacements.length,
    distinctGeometryClasses: typeIds.size,
    floors,
    literature: { types: 54, sets: 480, sourceId: 'H03' },
    note: '「54 种」是斗栱形制种类数，「480 朵」是文献对朵数的统计口径；本模型的实例数与几何类别数由台账实算，不等同于文献数字。'
  };
}
