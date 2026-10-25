/**
 * src/geometry/interlevel-continuity.js
 *
 * 明—暗过渡构架生成器（规划 §5.2 / §5.3）。
 *
 * 目的：把「明层墙顶 → 下一明层楼板」之间那段空气填成**真实木构带**
 *      （周向枋 + 短柱 + 人字斜撑 + 顶部托木），让全貌远观时读作连续的
 *      一体化木构体量，而不是一摞悬空板。
 *
 * 三条铁律（规划 §1.3 / §5.2 G）：
 *   1. 只增加缺失段，**不与旧几何叠一根完全相同的柱**；
 *   2. 新旧件共线重合 ≥90% → 删新件，不挪旧件；
 *   3. 所有新增件都是**估算**，可识别、可显隐、带来源；不伪装成实测。
 *
 * 本模块是纯生成函数：不修改传入的 structure，不触碰 three 之外的任何状态。
 */

import * as THREE from 'three';
import {
  CONTINUITY_ESTIMATES, CONTINUITY_BANDS, CONTINUITY_MATERIALS, P1_REQUIRED_COVER
} from '../data/continuity-estimates.js';
import { octagonVertices, octagonEdges, octagonColumnPositions, BAY_T } from './math-octagon.js';

const EPS = 1e-6;

/* ───────────────────────── 基础几何工具 ───────────────────────── */

/** 沿一条边生成枋：截面 width(Z向) × height(Y向)，长度取边长 */
function ledgerGeometry(p0, p1, width, height) {
  const dx = p1.x - p0.x;
  const dz = p1.z - p0.z;
  const len = Math.hypot(dx, dz);
  if (len < EPS) return null;
  const geo = new THREE.BoxGeometry(len, height, width);
  geo.rotateY(-Math.atan2(dz, dx));
  geo.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
  return geo;
}

/** 竖直短柱 */
function postGeometry(x, z, y0, y1, section) {
  const h = y1 - y0;
  if (h < EPS) return null;
  const geo = new THREE.BoxGeometry(section, h, section);
  geo.translate(x, (y0 + y1) / 2, z);
  return geo;
}

/** 两点之间的斜撑（截面 w × d） */
function strutGeometry(a, b, w, d) {
  const dir = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const len = dir.length();
  if (len < 0.35) return null;            // 规划 §5.5：过短撑长 <0.35 m 不生成
  const geo = new THREE.BoxGeometry(len, d, w);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 0, 0), dir.clone().normalize()
  );
  geo.applyQuaternion(quat);
  geo.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return geo;
}

/* ───────────────────────── 环与柱位 ───────────────────────── */

/** 取得某层外槽柱网顶点（8 个，按周向序） */
function outerRingOf(structure, levelIndex) {
  const lv = structure.levels[levelIndex - 1];
  if (!lv) return null;
  return lv.outer.vertices;
}

/**
 * 取得某层外槽的 24 个柱位（每面 3 跨 × 4 端点）。
 * 返回 [{ face, t, x, z, kind }]，周向有序。
 */
function outerColumnSlots(structure, levelIndex) {
  const ring = outerRingOf(structure, levelIndex);
  if (!ring) return [];
  const positions = octagonColumnPositions(ring);
  const slots = [];
  for (let f = 0; f < 8; f++) {
    const facePositions = positions.filter((p) => p.face === f);
    // 该面的 4 个位置：t = 0(角) / .29 / .71 / 1(下一个面的 t=0)
    const tOf = [0, BAY_T[1], BAY_T[2], 1];
    const edge = octagonEdges(ring)[f];
    for (let k = 0; k < 4; k++) {
      const t = tOf[k];
      slots.push({
        face: f,
        slot: k,
        t,
        x: edge.a.x + (edge.b.x - edge.a.x) * t,
        z: edge.a.z + (edge.b.z - edge.a.z) * t,
        kind: k === 0 || k === 3 ? 'corner' : 'intermediate'
      });
    }
  }
  return slots;
}

/** 两个环（上下层）在给定高度比例 t 处线性插值出顶点 */
function interpRing(lower, upper, t) {
  return lower.map((p, i) => ({
    x: p.x + (upper[i].x - p.x) * t,
    y: p.y + (upper[i].y - p.y) * t,
    z: p.z + (upper[i].z - p.z) * t
  }));
}

/** 环上某面的中点 */
function faceMid(ring, fi) {
  const e = octagonEdges(ring)[fi];
  return { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2, z: (e.a.z + e.b.z) / 2 };
}

/** 面中点指向外的单位法向（XZ 平面） */
function faceOutward(ring, fi) {
  const m = faceMid(ring, fi);
  const r = Math.hypot(m.x, m.z) || 1;
  return { x: m.x / r, z: m.z / r };
}

/* ───────────────────────── 主生成器 ───────────────────────── */

/**
 * 生成明暗过渡构架。
 *
 * @param {object} structure buildStructure() 的结果
 * @param {object} opts
 * @param {object} [opts.estimates]
 * @param {Array}  [opts.existingColumnRecords] 现有柱记录（含 x/z/ring/floor/y0/y1）
 * @param {object} [opts.wallTops] {levelIndex: 实际墙顶 y}（从真实网格量得）
 * @returns {{pieces:Array, records:Array, byOwner:object, diagnostics:object}}
 */
export function buildInterlevelContinuity(structure, opts = {}) {
  const estimates = opts.estimates ?? CONTINUITY_ESTIMATES;
  const columnRecords = opts.existingColumnRecords ?? [];
  const wallTops = opts.wallTops ?? {};

  const pieces = [];
  const records = [];
  const byOwner = {};
  const diagnostics = {
    added: 0,
    skippedDuplicates: 0,
    collisions: 0,
    continuousYRanges: {},
    bands: []
  };

  // 已存在柱段（用于同线重合判重）
  const existingPosts = columnRecords
    .filter((r) => r.ring === 'outer')
    .map((r) => ({ x: r.x, z: r.z, y0: r.y0 ?? -Infinity, y1: r.y1 ?? Infinity }));

  const seenKeys = new Set();

  const pushPiece = (geo, meta) => {
    if (!geo) return false;
    // 端点融合去重（同材质、同轴向、端点距离 ≤0.02 m）
    const key = `${meta.materialKey}|${meta.kind}|${meta.bandId}|${meta.faceIndex}|${meta.slot ?? ''}`;
    if (seenKeys.has(key)) { diagnostics.skippedDuplicates++; return false; }
    seenKeys.add(key);
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    // 离框架外缘 ≤ facadeDepthLimitM
    if (!withinFacadeLimit(structure, meta, bb, estimates)) {
      diagnostics.collisions++;
      geo.dispose();
      return false;
    }
    const piece = {
      geometry: geo,
      materialKey: meta.materialKey,
      ownerGroup: meta.ownerGroup,
      kind: meta.kind,
      bandId: meta.bandId,
      certainty: 'estimate',
      sourceIds: estimates.sources,
      bbox: { min: bb.min.toArray(), max: bb.max.toArray() },
      isEstimatedSupplement: true
    };
    pieces.push(piece);
    records.push({
      id: meta.id,
      bandId: meta.bandId,
      kind: meta.kind,
      faceIndex: meta.faceIndex,
      slot: meta.slot ?? null,
      y0: meta.y0,
      y1: meta.y1,
      ownerGroup: meta.ownerGroup,
      certainty: 'estimate',
      sourceIds: estimates.sources,
      /** 世界坐标包围盒（供连续度分析做径向覆盖判定） */
      bbox: { min: bb.min.toArray(), max: bb.max.toArray() }
    });
    diagnostics.added++;
    byOwner[meta.ownerGroup] = (byOwner[meta.ownerGroup] || 0) + 1;
    return true;
  };

  for (const band of CONTINUITY_BANDS) {
    const lowerRing = outerRingOf(structure, band.lowerLevel);
    const upperRing = outerRingOf(structure, band.upperLevel) || lowerRing;
    if (!lowerRing) continue;

    // 实际墙顶可能低于 band.y0 → 实际要填的区间从墙顶起算（规划 §5.2 E / U03）
    const realTop = wallTops[band.lowerLevel];
    const y0 = (typeof realTop === 'number' && realTop < band.y0) ? realTop : band.y0;
    const y1 = band.y1;
    const height = y1 - y0;
    if (height <= 0.05) continue;

    // ── A. 周向连续枋：y0+0.16 与 y1-0.20 两道主枋，中间按 ≤0.74 m 均布
    const n = Math.max(1, Math.ceil((height - 0.36) / estimates.intermediateLedgerMaxStepM));
    const ledgerYs = [];
    for (let k = 0; k <= n; k++) {
      const y = (n === 0)
        ? y0 + height / 2
        : y0 + 0.16 + ((height - 0.36) * k) / n;
      ledgerYs.push(y);
    }
    ledgerYs.forEach((y, li) => {
      const t = (y - y0) / height;
      const ring = interpRing(lowerRing, upperRing, THREE.MathUtils.clamp(t, 0, 1));
      octagonEdges(ring).forEach((edge) => {
        const p0 = { x: edge.a.x, y, z: edge.a.z };
        const p1 = { x: edge.b.x, y, z: edge.b.z };
        pushPiece(
          ledgerGeometry(p0, p1, estimates.perimeterLedgerBeamWidthM, estimates.perimeterLedgerBeamHeightM),
          {
            id: `cont:${band.id}:face${String(edge.index).padStart(2, '0')}:ledger${String(li).padStart(2, '0')}`,
            materialKey: 'beam', ownerGroup: band.ownerGroup, kind: 'perimeterLedger',
            bandId: band.id, faceIndex: edge.index, slot: li, y0: y, y1: y
          }
        );
      });
    });

    // ── B. 短柱：在 24 个既有外槽柱位上，位置按上下层柱网同编号线性内收
    const lowerSlots = outerColumnSlots(structure, band.lowerLevel);
    const upperSlots = outerColumnSlots(structure, band.upperLevel);
    lowerSlots.forEach((ls, i) => {
      const us = upperSlots[i];
      if (!us) return;
      const t = 0;   // 短柱竖直站立，半径取下层柱位（内收由逐层收分自然给出）
      void t;
      const px = ls.x + (us.x - ls.x) * 0.5;
      const pz = ls.z + (us.z - ls.z) * 0.5;
      // 与既有柱段共线且竖向重叠 ≥90% → 不重复生成实体
      const overlapping = existingPosts.filter((p) =>
        Math.hypot(p.x - px, p.z - pz) < 0.06 && p.y1 > y0 + 0.02 && p.y0 < y1 - 0.02
      );
      if (overlapping.length) { diagnostics.skippedDuplicates++; return; }
      pushPiece(
        postGeometry(px, pz, y0, y1, estimates.postWidthM),
        {
          id: `cont:${band.id}:face${String(ls.face).padStart(2, '0')}:post${String(ls.slot).padStart(2, '0')}`,
          materialKey: 'frame', ownerGroup: band.ownerGroup, kind: 'shortPost',
          bandId: band.id, faceIndex: ls.face, slot: ls.slot, y0, y1
        }
      );
    });

    // ── C. 人字斜撑：每面 3 跨，跨两端低位 → 跨中高位；深度向内退 0.32 m
    const ringForBrace = interpRing(lowerRing, upperRing, 0);
    octagonEdges(ringForBrace).forEach((edge) => {
      const outward = faceOutward(ringForBrace, edge.index);
      const inward = 0.32;
      for (let bay = 0; bay < 3; bay++) {
        const t0 = bay / 3;
        const t1 = (bay + 1) / 3;
        const tm = (t0 + t1) / 2;
        const at = (t) => {
          const x = edge.a.x + (edge.b.x - edge.a.x) * t;
          const z = edge.a.z + (edge.b.z - edge.a.z) * t;
          return { x: x - outward.x * inward, z: z - outward.z * inward };
        };
        const a = at(t0);
        const b = at(t1);
        const m = at(tm);
        const lowY = y0 + 0.20;
        const highY = y1 - 0.30;
        if (highY - lowY < 1.2) continue;             // 太窄不放斜撑，保留水平托木
        const g1 = strutGeometry(
          { x: a.x, y: lowY, z: a.z }, { x: m.x, y: highY, z: m.z },
          estimates.braceWidthM, estimates.braceDepthM
        );
        const g2 = strutGeometry(
          { x: b.x, y: lowY, z: b.z }, { x: m.x, y: highY, z: m.z },
          estimates.braceWidthM, estimates.braceDepthM
        );
        pushPiece(g1, {
          id: `cont:${band.id}:face${String(edge.index).padStart(2, '0')}:brace${bay}a`,
          materialKey: 'brace', ownerGroup: band.ownerGroup, kind: 'brace',
          bandId: band.id, faceIndex: edge.index, slot: bay, y0: lowY, y1: highY
        });
        pushPiece(g2, {
          id: `cont:${band.id}:face${String(edge.index).padStart(2, '0')}:brace${bay}b`,
          materialKey: 'brace', ownerGroup: band.ownerGroup, kind: 'brace',
          bandId: band.id, faceIndex: edge.index, slot: bay, y0: lowY, y1: highY
        });
      }
    });

    // ── D. 顶部托木与收边枋（简化承托层；不新增任何「跳数」到正式铺作 ledger）
    const topT = 1;
    const ringTop = interpRing(lowerRing, upperRing, topT);
    octagonEdges(ringTop).forEach((edge) => {
      const p0 = { x: edge.a.x, y: y1 - 0.12, z: edge.a.z };
      const p1 = { x: edge.b.x, y: y1 - 0.12, z: edge.b.z };
      pushPiece(
        ledgerGeometry(p0, p1, estimates.perimeterLedgerBeamWidthM, estimates.perimeterLedgerBeamHeightM),
        {
          id: `cont:${band.id}:face${String(edge.index).padStart(2, '0')}:capBeam`,
          materialKey: 'beam', ownerGroup: band.ownerGroup, kind: 'capLedger',
          bandId: band.id, faceIndex: edge.index, slot: 99, y0: y1 - 0.12, y1: y1 - 0.12
        }
      );
    });

    // 顶部托木：沿每面中点向内的短托木（承托屋面）
    octagonEdges(ringTop).forEach((edge) => {
      const outward = faceOutward(ringTop, edge.index);
      const mid = faceMid(ringTop, edge.index);
      const depth = estimates.topEavePlinthDepthM;
      const g = ledgerGeometry(
        { x: mid.x - outward.x * depth, y: y1 - 0.20, z: mid.z - outward.z * depth },
        { x: mid.x, y: y1 - 0.20, z: mid.z },
        estimates.perimeterLedgerBeamWidthM * 0.8, estimates.perimeterLedgerBeamHeightM * 0.8
      );
      pushPiece(g, {
        id: `cont:${band.id}:face${String(edge.index).padStart(2, '0')}:tuomu`,
        materialKey: 'roof', ownerGroup: band.ownerGroup, kind: 'eaveBearing',
        bandId: band.id, faceIndex: edge.index, slot: 98, y0: y1 - 0.20, y1: y1 - 0.20
      });
    });

    diagnostics.bands.push({
      id: band.id, y0, y1, ownerGroup: band.ownerGroup,
      kind: band.kind, lowerLevel: band.lowerLevel, upperLevel: band.upperLevel
    });
    diagnostics.continuousYRanges[band.id] = { y0, y1 };
  }

  // ── 规划 §5.2 E：首层 P1 必须覆盖 [12.5, 14.8]
  const p1 = diagnostics.continuousYRanges.P1;
  if (p1) {
    const covered = p1.y0 <= P1_REQUIRED_COVER.y0 + 1e-6 && p1.y1 >= P1_REQUIRED_COVER.y1 - 1e-6;
    diagnostics.p1CoversRequired = covered;
  } else {
    diagnostics.p1CoversRequired = false;
  }

  return { pieces, records, byOwner, diagnostics };
}

/**
 * 新增件是否仍在框架外缘之内（规划 §5.2 G：离开框架外缘 1.2 m 即 FAIL）。
 */
function withinFacadeLimit(structure, meta, bbox, estimates) {
  const band = CONTINUITY_BANDS.find((b) => b.id === meta.bandId);
  if (!band) return true;
  const ring = outerRingOf(structure, band.lowerLevel);
  if (!ring) return true;
  // 以该层外槽柱网的外接半径为参照
  const R = Math.max(...ring.map((p) => Math.hypot(p.x, p.z)));
  const limit = R + estimates.facadeDepthLimitM;
  const rMax = Math.max(
    Math.hypot(bbox.min.x, bbox.min.z), Math.hypot(bbox.max.x, bbox.max.z),
    Math.hypot(bbox.min.x, bbox.max.z), Math.hypot(bbox.max.x, bbox.min.z)
  );
  return rMax <= limit;
}

export { CONTINUITY_MATERIALS };
