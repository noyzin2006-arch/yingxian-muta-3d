/**
 * src/validation/continuity-metrics.js
 *
 * 层间连续度分析（规划 §5.3 / §5.4 检测 A）。
 *
 * 纯计算模块：不依赖 DOM、不依赖 three，可直接在 node --test 下测。
 *
 * 判据（规划 §1.4 V1 / V2）：
 *   · V1：八个外立面方向，逐 0.1 m 竖向扫描，
 *         「连续 >0.8 m 的完全无构件纵向带」即 FAIL。
 *   · V2：每段暗层带中间 70% 高度的可见样本占有率 ≥0.28，
 *         单根角柱不得冒充密集带。
 *
 * 输入是**世界坐标**的构件记录（每个 record 带 world-space bbox）。
 * 缺失 records 不默认为 pass。
 */

/** 规划 §5.4：八个外立面面心方位 */
import { CONTINUITY_BANDS } from '../data/continuity-estimates.js';

export const VIEW_AZIMUTHS = Object.freeze([
  Math.PI / 8, (Math.PI * 3) / 8, (Math.PI * 5) / 8, (Math.PI * 7) / 8,
  (Math.PI * 9) / 8, (Math.PI * 11) / 8, (Math.PI * 13) / 8, (Math.PI * 15) / 8
]);

/** 每面沿边线取样的点数（规划 §5.4：32 个） */
export const SAMPLES_PER_FACE = 32;

/** 规划 §5.4：沿外墙径向深度范围（m） */
export const RADIAL_DEPTH = Object.freeze({ inner: -0.20, outer: 1.20 });

/** V1 阈值：超过即 FAIL（注意是 > 而非 ≥） */
export const MAX_BLANK_RUN_M = 0.8;
/** V2 阈值：暗层带中间 70% 高度的样本占有率下限 */
export const MIN_CENTER_OCCUPANCY = 0.28;

const EPS = 1e-9;

/**
 * 判断一个竖直区间 [y0,y1]、径向区间 [r0,r1] 是否与某构件的世界 bbox 相交。
 */
function bboxIntersectsRadialBand(bbox, y, r0, r1, facePoint) {
  const [minX, minY, minZ] = bbox.min;
  const [maxX, maxY, maxZ] = bbox.max;
  if (y < minY - 0.001 || y > maxY + 0.001) return false;
  // 径向投影：把 bbox 的 8 角投影到该面的法向轴上
  const corners = [];
  for (const x of [minX, maxX]) {
    for (const z of [minZ, maxZ]) corners.push({ x, z });
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of corners) {
    const d = (c.x - facePoint.x) * facePoint.nx + (c.z - facePoint.z) * facePoint.nz;
    if (d < lo) lo = d;
    if (d > hi) hi = d;
  }
  return hi >= r0 - 0.001 && lo <= r1 + 0.001;
}

/**
 * 把不同来源的记录统一成 {bbox:{min,max}, y0, y1} 形式。
 * 既有柱记录只有 x/z/radius/y0/y1，按轴对齐盒补出包围盒。
 */
function normalizeRecords(records) {
  const out = [];
  for (const r of records) {
    let bbox = r.bbox;
    if (!bbox && typeof r.x === 'number' && typeof r.z === 'number') {
      const rad = r.radius ?? 0.3;
      const y0 = r.y0 ?? -Infinity;
      const y1 = r.y1 ?? Infinity;
      bbox = {
        min: [r.x - rad, Number.isFinite(y0) ? y0 : -1e6, r.z - rad],
        max: [r.x + rad, Number.isFinite(y1) ? y1 : 1e6, r.z + rad]
      };
    }
    if (!bbox) continue;
    out.push({ ...r, bbox });
  }
  return out;
}

/**
 * 分析连续度。
 *
 * @param {object} opts
 * @param {Array} opts.records  世界坐标构件记录（每条含 bbox:[min,max]、bandId、ownerGroup）
 * @param {object} opts.structure buildStructure() 的结果
 * @param {Array} [opts.bands]  要扫描的带（默认取记录里出现过的 bandId）
 * @param {number} [opts.stepM]  竖向步长（默认 0.1）
 * @param {Array} [opts.views]   要检查的面（默认 8 面）
 * @returns {object}
 */
export function analyzeContinuity(opts = {}) {
  const records = normalizeRecords(opts.records ?? []);
  const structure = opts.structure;
  const stepM = opts.stepM ?? 0.1;
  const views = opts.views ?? VIEW_AZIMUTHS;

  if (!records.length) {
    return {
      pass: false, reason: '没有构件记录，无法判定（不得默认为 pass）',
      perBand: [], perView: [], failRanges: [], estimatedOnly: true
    };
  }
  if (!structure) {
    return {
      pass: false, reason: '缺少 structure',
      perBand: [], perView: [], failRanges: [], estimatedOnly: true
    };
  }

  // 带定义（显式给出，不由记录反推）
  const bandDefs = opts.bands ?? CONTINUITY_BANDS;
  const perBand = [];
  const perView = [];
  const failRanges = [];

  for (const bandDef of bandDefs) {
    const bandId = bandDef.id;
    const bandRecords = records;
    if (!bandRecords.length) {
      failRanges.push({ bandId, reason: '没有构件记录' });
      continue;
    }
    const y0 = bandDef.y0;
    const y1 = bandDef.y1;

    const bandViewStats = [];
    for (let vi = 0; vi < views.length; vi++) {
      const az = views[vi];
      const nx = Math.cos(az);
      const nz = Math.sin(az);
      const faceIndex = vi % 8;

      // 取该带所属层的柱网，确定面上采样点
      const lower = structure.levels[(bandDef.lowerLevel ?? 1) - 1];
      const upper = structure.levels[(bandDef.upperLevel ?? bandDef.lowerLevel ?? 1) - 1];
      if (!lower) continue;
      const ringAt = (t) => lower.outer.vertices.map((p, i) => {
        const q = upper?.outer.vertices?.[i] ?? p;
        return { x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t };
      });

      const heights = [];
      for (let y = y0; y <= y1 + EPS; y += stepM) heights.push(Math.min(y, y1));

      const coveredAt = [];
      for (const y of heights) {
        const t = (y - y0) / Math.max(1e-6, (y1 - y0));
        const ring = ringAt(THREE_clamp(t, 0, 1));
        const e = ring[faceIndex];
        const ex = e.x + (ring[(faceIndex + 1) % 8].x - e.x) * 0;
        void ex;
        let hits = 0;
        for (let s = 0; s < SAMPLES_PER_FACE; s++) {
          const u = s / (SAMPLES_PER_FACE - 1);
          const px = e.x + (ring[(faceIndex + 1) % 8].x - e.x) * u;
          const pz = e.z + (ring[(faceIndex + 1) % 8].z - e.z) * u;
          const facePoint = { x: px, z: pz, nx, nz };
          let hit = false;
          for (const r of bandRecords) {
            if (bboxIntersectsRadialBand(r.bbox, y, RADIAL_DEPTH.inner, RADIAL_DEPTH.outer, facePoint)) {
              hit = true; break;
            }
          }
          if (hit) hits++;
        }
        coveredAt.push({ y, ratio: hits / SAMPLES_PER_FACE });
      }

      // 连续零命中段
      let runStart = -1;
      let maxBlankRunM = 0;
      const blankRanges = [];
      coveredAt.forEach((c, i) => {
        const empty = c.ratio === 0;
        if (empty && runStart < 0) runStart = i;
        if (!empty && runStart >= 0) {
          const yA = coveredAt[runStart].y;
          const yB = coveredAt[i - 1].y;
          const len = +(yB - yA + stepM).toFixed(3);
          if (len > maxBlankRunM) maxBlankRunM = len;
          if (len > MAX_BLANK_RUN_M) blankRanges.push({ y0: yA, y1: yB, lengthM: len });
          runStart = -1;
        }
      });
      if (runStart >= 0) {
        const yA = coveredAt[runStart].y;
        const yB = coveredAt[coveredAt.length - 1].y;
        const len = +(yB - yA + stepM).toFixed(3);
        if (len > maxBlankRunM) maxBlankRunM = len;
        if (len > MAX_BLANK_RUN_M) blankRanges.push({ y0: yA, y1: yB, lengthM: len });
      }

      // 中段 70% 高度的样本占有率（V2）
      const mid = coveredAt.filter((c) => {
        const span = y1 - y0;
        return c.y >= y0 + span * 0.15 && c.y <= y0 + span * 0.85;
      });
      const centerOccupancy = mid.length
        ? mid.reduce((s, c) => s + c.ratio, 0) / mid.length
        : 0;

      bandViewStats.push({
        view: vi, azimuth: +az.toFixed(4), faceIndex,
        maxBlankRunM, centerOccupancy: +centerOccupancy.toFixed(4),
        blankRanges
      });
      if (blankRanges.length) {
        failRanges.push({ bandId, view: vi, ...blankRanges[0] });
      }
    }

    const worstBlank = bandViewStats.reduce((m, v) => Math.max(m, v.maxBlankRunM), 0);
    const worstOcc = bandViewStats.reduce((m, v) => Math.min(m, v.centerOccupancy), Infinity);
    perBand.push({
      bandId, y0: +y0.toFixed(3), y1: +y1.toFixed(3),
      records: bandRecords.length,
      ownerGroup: bandDef.ownerGroup ?? null,
      maxBlankRunM: +worstBlank.toFixed(3),
      minCenterOccupancy: Number.isFinite(worstOcc) ? +worstOcc.toFixed(4) : 0,
      pass: worstBlank <= MAX_BLANK_RUN_M && worstOcc >= MIN_CENTER_OCCUPANCY,
      views: bandViewStats
    });
  }

  perView.push(...perBand.flatMap((b) => b.views.map((v) => ({ bandId: b.bandId, ...v }))));

  const pass = perBand.length > 0 && perBand.every((b) => b.pass);

  return {
    pass,
    stepM,
    thresholds: { maxBlankRunM: MAX_BLANK_RUN_M, minCenterOccupancy: MIN_CENTER_OCCUPANCY, samplesPerFace: SAMPLES_PER_FACE },
    perBand,
    perView,
    failRanges,
    estimatedOnly: records.every((r) => r.certainty === 'estimate' || r.certainty === undefined)
  };
}

/** 纯 JS 版 clamp（避免依赖 three） */
function THREE_clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
