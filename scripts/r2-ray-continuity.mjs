/**
 * scripts/r2-ray-continuity.mjs —— 层间连续度的独立射线级校验（验收用）
 *
 * 与 `src/validation/continuity-metrics.js`（按新增件 AABB 粗筛）**互相独立**：
 * 本脚本按规划 §5.4「检测 A」的要求，对**真实几何**做真正的射线—三角求交：
 *
 *   · 几何来源 = 本项目**真实**的几何构建函数（与浏览器渲染同一条构建路径）：
 *     buildLevelFrame / buildLevelWalls / buildLevelBrackets / buildAllRoofs /
 *     buildAllBalustrades / buildInterlevelContinuity
 *     —— 全部是纯几何函数，不依赖 DOM，可在 Node 里跑出与浏览器一致的世界坐标几何。
 *   · 参与判定的构件类别（规划 §5.4）：columns / beams / braces / brackets / roof
 *     （不含台基、地面、匾额、装饰文字、塔刹、造像）。
 *   · 每个方位 φ = π/8 + kπ/4，取该八角面边线上 32 个等距抽样点；
 *     沿面法向向内发射射线，覆盖径向深度 [-0.20 m, +1.20 m] 的带。
 *   · 判定：该高度上 32 个抽样点**至少 1 个**命中真实三角面 → 该高度非「完全无构件」。
 *   · 硬阈值：连续零命中段 > 0.8 m → V1 FAIL；中段 70% 高度的样本占有率 < 0.28 → V2 FAIL。
 *
 * 实现：按高度分桶预筛候选构件（AABB 粗筛）→ Möller–Trumbore 精确求交。
 *
 * 用法: node scripts/r2-ray-continuity.mjs [outJson]
 */
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';

import { buildStructure } from '../src/data/structure.js';
import { buildLevelFrame, buildAllWalls } from '../src/geometry/columns.js';
import { buildLevelBrackets } from '../src/geometry/brackets.js';
import { buildAllRoofs } from '../src/geometry/roof.js';
import { buildInterlevelContinuity } from '../src/geometry/interlevel-continuity.js';
import { CONTINUITY_ESTIMATES, CONTINUITY_BANDS } from '../src/data/continuity-estimates.js';

const OUT = process.argv[2] ?? 'reports/MUTA-R2-001/coverage-ray.json';
/**
 * 深度基准：规划 §5.2 的 facadeDepthLimitM 原文是「**自外墙面向内退**的最大深度」，
 * 故默认以**外墙面**（外槽柱线内收 0.30 m）为基准；
 * COLUMN 基准则以柱线本身为基准（另一读法）。两种都测，结论才对基准不敏感。
 */
const DATUM = process.env.DATUM ?? 'wall';
const WALL_INSET = 0.30;   // 外檐墙自外槽柱线内收的距离（columns.js: 外檐墙内收 0.30 m）

const STEP_M = 0.1;
const SAMPLES = 32;
const MAX_BLANK_M = 0.8;
const MIN_OCCUPANCY = 0.28;
const DEPTH_INNER = -0.20;   // 面线外侧 0.20 m
const DEPTH_OUTER = 1.20;   // 面线内侧 1.20 m
const EPS = 1e-9;

const structure = buildStructure();

// ─────────────────────────────────────────────────────────────
// 1. 收集真实结构几何（世界坐标），保持**逐件**粒度
// ─────────────────────────────────────────────────────────────
const pieces = [];
const columnRecords = [];

function addPieces(geos, category) {
  for (const g of geos) {
    if (!g || !g.attributes?.position?.count) continue;
    g.computeBoundingBox();
    const b = g.boundingBox;
    pieces.push({
      category,
      pos: g.attributes.position.array,
      idx: g.index ? g.index.array : null,
      vcount: g.attributes.position.count,
      min: [b.min.x, b.min.y, b.min.z],
      max: [b.max.x, b.max.y, b.max.z]
    });
  }
}

for (let i = 1; i <= 5; i++) {
  const frame = buildLevelFrame(structure, i, { includeSecondary: i === 1 });
  addPieces(frame.columns, 'columns');
  addPieces(frame.beams, 'beams');
  addPieces(frame.braces, 'braces');
  columnRecords.push(...frame.columnRecords);
}

for (let i = 1; i <= 5; i++) {
  const res = buildLevelBrackets(structure, i);
  for (const p of res.placements) {
    for (const piece of p.pieces) {
      const g = piece.geometry.clone();
      g.rotateY(p.rotationY);
      g.translate(p.position.x, p.position.y, p.position.z);
      addPieces([g], 'brackets');
      piece.geometry.dispose();
    }
  }
}

const roofSet = buildAllRoofs(structure, { segmentsPerFace: 10, ringSegments: 6, perFace: 7, density: 1 });
addPieces(roofSet.roof, 'roof');

const wallSet = buildAllWalls(structure);
const wallTops = wallSet.wallTops;
// R2_NO_CONTINUITY=1 → 跳过本轮新增的过渡构架，用于「变更前」对照测量
const continuity = process.env.R2_NO_CONTINUITY === '1'
  ? { pieces: [], records: [], byOwner: {}, diagnostics: { added: 0 } }
  : buildInterlevelContinuity(structure, {
      estimates: CONTINUITY_ESTIMATES,
      existingColumnRecords: columnRecords,
      wallTops: wallSet.wallTops
    });
// 负向用例开关：NEGATIVE=drop-P1 / drop-all —— 移除对应带的估算件，
// 用于证明本检测在「没修」时**确实会 FAIL**（规划 §6 T08 的负向用例要求）
const NEGATIVE = process.env.NEGATIVE ?? '';
const contGeos = continuity.pieces
  .filter((p) => (NEGATIVE === 'drop-all' ? false
    : NEGATIVE === 'drop-P1' ? p.bandId !== 'P1'
      : true))
  .map((p) => p.geometry);
addPieces(contGeos, 'continuity');
if (NEGATIVE) console.log(`\n⚠ 负向用例模式：${NEGATIVE}（已移除相应估算件，期望结果 FAIL）`);

const triTotal = pieces.reduce((s, p) => s + (p.idx ? p.idx.length / 3 : p.vcount / 3), 0);
console.log('构件数：', pieces.length, ' 三角数：', triTotal);

// ─────────────────────────────────────────────────────────────
// 2. 射线—三角求交（Möller–Trumbore，双面）
// ─────────────────────────────────────────────────────────────
function pieceHitRay(p, ox, oy, oz, dx, dy, dz, tMin, tMax) {
  const { pos, idx, vcount } = p;
  const triCount = idx ? idx.length / 3 : vcount / 3;
  for (let t = 0; t < triCount; t++) {
    let i0, i1, i2;
    if (idx) { i0 = idx[t * 3] * 3; i1 = idx[t * 3 + 1] * 3; i2 = idx[t * 3 + 2] * 3; }
    else { i0 = t * 9; i1 = t * 9 + 3; i2 = t * 9 + 6; }
    const ax = pos[i0], ay = pos[i0 + 1], az = pos[i0 + 2];
    const e1x = pos[i1] - ax, e1y = pos[i1 + 1] - ay, e1z = pos[i1 + 2] - az;
    const e2x = pos[i2] - ax, e2y = pos[i2 + 1] - ay, e2z = pos[i2 + 2] - az;
    const pvx = dy * e2z - dz * e2y;
    const pvy = dz * e2x - dx * e2z;
    const pvz = dx * e2y - dy * e2x;
    const det = e1x * pvx + e1y * pvy + e1z * pvz;
    if (det > -1e-12 && det < 1e-12) continue;
    const inv = 1 / det;
    const tvx = ox - ax, tvy = oy - ay, tvz = oz - az;
    const u = (tvx * pvx + tvy * pvy + tvz * pvz) * inv;
    if (u < 0 || u > 1) continue;
    const qvx = tvy * e1z - tvz * e1y;
    const qvy = tvz * e1x - tvx * e1z;
    const qvz = tvx * e1y - tvy * e1x;
    const v = (dx * qvx + dy * qvy + dz * qvz) * inv;
    if (v < 0 || u + v > 1) continue;
    const hitT = (e2x * qvx + e2y * qvy + e2z * qvz) * inv;
    if (hitT >= tMin && hitT <= tMax) return true;
  }
  return false;
}

/** 射线与构件 AABB 是否可能相交（粗筛） */
function bboxHitRay(p, ox, oy, oz, dx, dy, dz, tMin, tMax) {
  let t0 = tMin, t1 = tMax;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-12) {
      if (o[a] < p.min[a] || o[a] > p.max[a]) return false;
    } else {
      const inv = 1 / d[a];
      let ta = (p.min[a] - o[a]) * inv;
      let tb = (p.max[a] - o[a]) * inv;
      if (ta > tb) { const s = ta; ta = tb; tb = s; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 > t1) return false;
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// 3. 逐面 / 逐高度射线检测
// ─────────────────────────────────────────────────────────────
function ringAt(lowerIdx, upperIdx, t) {
  const lower = structure.levels[lowerIdx - 1];
  const upper = structure.levels[upperIdx - 1] ?? lower;
  return lower.outer.vertices.map((p, i) => {
    const q = upper.outer.vertices[i] ?? p;
    return { x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t };
  });
}

function faceNormal(ring, fi) {
  const a = ring[fi], b = ring[(fi + 1) % 8];
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: dz / len, z: -dx / len };   // 外法线（与 math-octagon.js 一致）
}

const perBand = [];
const perView = [];
const failRanges = [];

for (const band of CONTINUITY_BANDS) {
  // 与生成器完全一致：实际起算点取**实测墙顶**（wallTops），不足 band.y0 时用墙顶
  const realTop = wallTops[band.lowerLevel];
  const y0 = (typeof realTop === 'number' && realTop < band.y0) ? realTop : band.y0;
  const y1 = band.y1;
  const heights = [];
  for (let y = y0; y <= y1 + EPS; y += STEP_M) heights.push(Math.min(y, y1));
  // 记录扫描区间（真实起算点）

  const viewStats = [];
  for (let fi = 0; fi < 8; fi++) {
    const covered = [];
    for (const y of heights) {
      const t = (y - y0) / Math.max(1e-6, y1 - y0);
      const ring = ringAt(band.lowerLevel, band.upperLevel, Math.min(1, Math.max(0, t)));
      const a = ring[fi], b = ring[(fi + 1) % 8];
      const n = faceNormal(ring, fi);
      // 射线起点在面线内侧 1.30 m，沿外法线射出；命中深度 [DEPTH_INNER, DEPTH_OUTER]
      // 射线起点在基准面内侧（start），沿外法线射出
      const datumShift = DATUM === 'wall' ? WALL_INSET : 0;
      const start = DEPTH_OUTER + datumShift + 0.10;
      const tMin = start - DEPTH_OUTER;   // 命中带内端（内侧）
      const tMax = start - DEPTH_INNER;   // 命中带外端（外侧）
      let hits = 0;
      for (let s = 0; s < SAMPLES; s++) {
        const u = s / (SAMPLES - 1);
        const px = a.x + (b.x - a.x) * u;
        const pz = a.z + (b.z - a.z) * u;
        const ox = px - n.x * start;
        const oz = pz - n.z * start;
        const dx = n.x, dy = 0, dz = n.z;
        for (const p of pieces) {
          if (p.max[1] < y || p.min[1] > y) continue;              // 高度粗筛
          if (!bboxHitRay(p, ox, y, oz, dx, dy, dz, tMin, tMax)) continue;  // AABB 粗筛
          if (pieceHitRay(p, ox, y, oz, dx, dy, dz, tMin, tMax)) { hits++; break; }
        }
      }
      covered.push({ y, ratio: hits / SAMPLES });
    }

    let runStart = -1, maxBlank = 0;
    const blanks = [];
    const flush = (endIdx) => {
      if (runStart < 0) return;
      const yA = covered[runStart].y;
      const yB = covered[endIdx].y;
      const len = +(yB - yA + STEP_M).toFixed(3);
      if (len > maxBlank) maxBlank = len;
      if (len > MAX_BLANK_M) blanks.push({ y0: +yA.toFixed(2), y1: +yB.toFixed(2), lengthM: len });
      runStart = -1;
    };
    covered.forEach((c, i) => {
      if (c.ratio === 0) { if (runStart < 0) runStart = i; }
      else flush(i - 1);
    });
    if (runStart >= 0) flush(covered.length - 1);

    const span = y1 - y0;
    const mid = covered.filter((c) => c.y >= y0 + span * 0.15 && c.y <= y0 + span * 0.85);
    const occ = mid.length ? mid.reduce((s, c) => s + c.ratio, 0) / mid.length : 0;

    const stat = { faceIndex: fi, maxBlankRunM: maxBlank, centerOccupancy: +occ.toFixed(4), blankRanges: blanks };
    viewStats.push(stat);
    perView.push({ bandId: band.id, ...stat });
    blanks.forEach((b) => failRanges.push({ bandId: band.id, faceIndex: fi, ...b }));
  }

  const worstBlank = Math.max(...viewStats.map((v) => v.maxBlankRunM));
  const worstOcc = Math.min(...viewStats.map((v) => v.centerOccupancy));
  const pass = worstBlank <= MAX_BLANK_M && worstOcc >= MIN_OCCUPANCY;
  perBand.push({
    bandId: band.id, y0, y1, ownerGroup: band.ownerGroup,
    maxBlankRunM: +worstBlank.toFixed(3),
    minCenterOccupancy: +worstOcc.toFixed(4),
    pass
  });
  console.log(`  ${band.id} [${y0}–${y1}]  最大空带 ${worstBlank.toFixed(3)} m  最小中心占有率 ${worstOcc.toFixed(4)}  → ${pass ? 'PASS' : 'FAIL'}`);
}

const v1 = perBand.every((b) => b.maxBlankRunM <= MAX_BLANK_M);
const v2 = perBand.every((b) => b.minCenterOccupancy >= MIN_OCCUPANCY);
const result = {
  method: 'ray-triangle intersection against real structural geometry (Möller–Trumbore, two-stage AABB prefilter)',
  negativeMode: NEGATIVE || null,
  depthDatum: DATUM,
  generatedAt: new Date().toISOString(),
  pieceCount: pieces.length,
  triangleCount: triTotal,
  thresholds: { maxBlankRunM: MAX_BLANK_M, minCenterOccupancy: MIN_OCCUPANCY, stepM: STEP_M, samplesPerFace: SAMPLES },
  countedCategories: ['columns', 'beams', 'braces', 'brackets', 'roof', 'continuity-estimated'],
  excluded: ['base', 'ground', 'plaques', 'ornament', 'finial', 'statues', 'balustrade-deck'],
  V1: v1, V2: v2, pass: v1 && v2,
  perBand, perView, failRanges
};

writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`\nV1 ${v1 ? 'PASS' : 'FAIL'}; V2 ${v2 ? 'PASS' : 'FAIL'}  → ${result.pass ? 'PASS' : 'FAIL'}`);
console.log('写入', OUT);
process.exit(result.pass ? 0 : 1);
