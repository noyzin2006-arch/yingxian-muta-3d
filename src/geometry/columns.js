/**
 * src/geometry/columns.js
 *
 * 柱网、梁枋与暗层构架。
 *
 * 结构要点（据省文物局 L06 与澎湃学术 L02/L04）：
 *   · 每层内外两圈柱：外槽每面三间共 24 根，内槽每面一间共 8 根。
 *   · 首层另加一圈副阶柱 24 根，共 56 根。
 *   · 逐层檐柱向内收「半柱径」，形成向上折收的轮廓；内槽柱一至四层不动，第五层才内收。
 *   · 暗层的内外槽之间以草栿、地栿、梁枋与斜撑联结，成八角筒式框架。
 *   · 柱头有柱头斗栱；柱身有阑额、普拍枋；柱脚有地栿。
 */

import * as THREE from 'three';
import { makeColumnGeometry, makeFangGeometry } from './profiles.js';
import { mergeGeometries } from './mesh-profile.js';
import { octagonColumnPositions, octagonEdges, offsetPolygon } from './math-octagon.js';
import { EST } from '../data/structure.js';

/** 明层侧脚：自一至五层柱脚相对柱头的水平内收量（m）。1 寸 ≈ 0.0306 m。 */
export const SIDE_JIN = Object.freeze({
  bright: Object.freeze([0.1836, 0.0612, 0.0612, 0.0612, 0.0612]),
  pingzuo: Object.freeze([null, 0.0612, 0.0612, 0.0612, 0.0306])
});

/**
 * 造一根带侧脚的柱。
 * 柱脚在 (x, z) 的柱位上，柱顶向塔心内收 `lean` 米。
 */
function makeLeaningColumn({ x, z, y0, height, radius, lean }) {
  const geo = makeColumnGeometry({
    radius, height, segments: EST.columnSegments, taper: 0.018, entasis: 0.012
  });
  if (lean > 0) {
    const r = Math.hypot(x, z) || 1;
    const angle = Math.atan2(lean, height);
    // 绕「垂直于径向」的水平轴倾斜，使柱顶朝塔心
    const axis = new THREE.Vector3(-z / r, 0, x / r);
    geo.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, -angle));
    geo.translate(x, y0, z);
  } else {
    geo.translate(x, y0, z);
  }
  return geo;
}

/** 沿一条边的枋（阑额 / 普拍枋 / 地栿） */
function makeEdgeBeam({ edge, y, width, height, inset = 0 }) {
  const ax = edge.a.x, az = edge.a.z;
  const bx = edge.b.x, bz = edge.b.z;
  const len = Math.hypot(bx - ax, bz - az);
  const geo = makeFangGeometry({ width, height, length: len, axis: 'x' });
  const angle = Math.atan2(bz - az, bx - ax);
  geo.rotateY(-angle);
  geo.translate((ax + bx) / 2, y, (az + bz) / 2);
  return geo;
}

/** 内外槽之间的径向联系梁 */
function makeRadialBeam({ inner, outer, y, width, height }) {
  const dx = outer.x - inner.x;
  const dz = outer.z - inner.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) return null;
  const geo = makeFangGeometry({ width, height, length: len, axis: 'x' });
  geo.rotateY(-Math.atan2(dz, dx));
  geo.translate((inner.x + outer.x) / 2, y, (inner.z + outer.z) / 2);
  return geo;
}

/** 斜撑（暗层内的 V 形 / 交叉支撑） */
function makeBrace({ from, to, width = 0.14, height = 0.12 }) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dz, dy);
  if (len < 1e-4) return null;
  const geo = makeFangGeometry({ width, height, length: len, axis: 'x' });
  // 先沿 +X 建，再对齐到 (dx,dy,dz)
  const dir = new THREE.Vector3(dx, dy, dz).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  geo.applyQuaternion(quat);
  geo.translate(from.x, from.y, from.z);
  return geo;
}

/**
 * 生成一层的柱 + 梁枋构架。
 *
 * @param {object} structure
 * @param {number} levelIndex 1..5
 * @param {object} opts { lean, includeSecondary }
 * @returns {{ columns: BufferGeometry[], beams: BufferGeometry[], braces: BufferGeometry[], columnRecords: Array }}
 */
export function buildLevelFrame(structure, levelIndex, opts = {}) {
  const lv = structure.levels[levelIndex - 1];
  const lean = opts.lean ?? SIDE_JIN.bright[levelIndex - 1] ?? 0;
  const columns = [];
  const beams = [];
  const braces = [];
  const columnRecords = [];

  const topY = opts.topY ?? lv.columnTopY ?? lv.band.y1;
  const height = topY - lv.band.y0;

  // ── 外槽柱（24 根）
  const outerPos = octagonColumnPositions(lv.outer.vertices);
  outerPos.forEach((p, i) => {
    const g = makeLeaningColumn({
      x: p.x, z: p.z, y0: lv.band.y0, height,
      radius: lv.outer.radius, lean
    });
    columns.push(g);
    columnRecords.push({
      id: `L${levelIndex}-outer-${i}`, floor: levelIndex, ring: 'outer',
      kind: p.kind, face: p.face, x: p.x, z: p.z, radius: lv.outer.radius,
      y0: lv.band.y0, y1: topY
    });
  });

  // ── 内槽柱（8 根）
  const innerPos = octagonColumnPositions(lv.inner.vertices, [0, 1]);
  innerPos.forEach((p, i) => {
    const g = makeLeaningColumn({
      x: p.x, z: p.z, y0: lv.band.y0, height,
      radius: lv.inner.radius, lean: 0   // 内槽一至四层位置不动
    });
    columns.push(g);
    columnRecords.push({
      id: `L${levelIndex}-inner-${i}`, floor: levelIndex, ring: 'inner',
      kind: 'corner', face: p.face, x: p.x, z: p.z, radius: lv.inner.radius,
      y0: lv.band.y0, y1: topY
    });
  });

  // ── 首层副阶柱（24 根）
  if (opts.includeSecondary && lv.secondary) {
    const secVerts = lv.secondary.vertices;
    const secPos = octagonColumnPositions(secVerts);
    secPos.forEach((p, i) => {
      const g = makeLeaningColumn({
        x: p.x, z: p.z, y0: lv.band.y0, height: height * 0.95,
        radius: lv.secondary.radius, lean: lean * 0.5
      });
      columns.push(g);
      columnRecords.push({
        id: `L${levelIndex}-secondary-${i}`, floor: levelIndex, ring: 'secondary',
        kind: p.kind, face: p.face, x: p.x, z: p.z, radius: lv.secondary.radius,
        y0: lv.band.y0, y1: lv.band.y0 + height * 0.95
      });
    });
  }

  // ── 阑额 / 普拍枋（柱头联系）
  const outerEdges = octagonEdges(lv.outer.vertices);
  const innerEdges = octagonEdges(lv.inner.vertices);
  const lanY = topY - 0.62;
  const puY = topY - 0.44;
  outerEdges.forEach((e) => {
    beams.push(makeEdgeBeam({ edge: e, y: lanY, width: 0.2, height: 0.26 }));
    beams.push(makeEdgeBeam({ edge: e, y: puY, width: 0.26, height: 0.14 }));
  });
  innerEdges.forEach((e) => {
    beams.push(makeEdgeBeam({ edge: e, y: lanY, width: 0.18, height: 0.22 }));
  });

  // ── 地栿（柱脚联系）
  outerEdges.forEach((e) => {
    beams.push(makeEdgeBeam({ edge: e, y: lv.band.y0 + 0.16, width: 0.24, height: 0.2 }));
  });

  // ── 内外槽径向联系
  outerEdges.forEach((oe, i) => {
    const ie = innerEdges[i];
    const oMid = { x: oe.mid.x, z: oe.mid.z };
    const iMid = { x: ie.mid.x, z: ie.mid.z };
    const b = makeRadialBeam({
      inner: iMid, outer: oMid, y: topY - 0.44, width: 0.16, height: 0.12
    });
    if (b) beams.push(b);
  });

  // ── 暗层构架：草栿 + 斜撑（属于下一层的暗层带）
  const hidden = structure.hiddenFloors.find((h) => h.belowLevel === levelIndex);
  if (hidden) {
    const hy = hidden.band.y0;
    const top = hidden.band.y1;
    // 草栿（暗层顶部圈梁）
    outerEdges.forEach((e) => {
      beams.push(makeEdgeBeam({ edge: e, y: top - 0.2, width: 0.22, height: 0.26 }));
    });
    innerEdges.forEach((e) => {
      beams.push(makeEdgeBeam({ edge: e, y: top - 0.2, width: 0.2, height: 0.24 }));
    });
    // 内外槽斜撑：交叉 V 形
    outerEdges.forEach((oe, i) => {
      const ie = innerEdges[i];
      const oBase = { x: oe.mid.x, y: hy + 0.2, z: oe.mid.z };
      const iTop = { x: ie.mid.x, y: top - 0.34, z: ie.mid.z };
      const iBase = { x: ie.mid.x, y: hy + 0.2, z: ie.mid.z };
      const oTop = { x: oe.mid.x, y: top - 0.34, z: oe.mid.z };
      const b1 = makeBrace({ from: oBase, to: iTop, width: 0.15, height: 0.12 });
      const b2 = makeBrace({ from: iBase, to: oTop, width: 0.15, height: 0.12 });
      if (b1) braces.push(b1);
      if (b2) braces.push(b2);
    });
  }

  return { columns, beams, braces, columnRecords };
}

/**
 * 造柱础（石础）：柱脚下的一个小石块。
 */
export function makeColumnBase({ x, z, y0, radius }) {
  const geo = new THREE.CylinderGeometry(radius * 1.45, radius * 1.6, 0.22, 10, 1, false);
  geo.translate(x, y0 + 0.11, z);
  return geo;
}

/**
 * 各明层的墙体与楼板。
 *
 * 应县木塔之所以「敦厚」，靠的是每层**实墙 + 直棂窗 / 格子门**围合出的体量，
 * 而不是一圈光柱。没有这层实体，塔身就读成脚手架。
 *
 * 做法（均为形制示意）：
 *   · 外檐墙：沿外槽柱线内收 0.30 m，厚 0.36 m，高约为该层柱高的 0.66；
 *   · 明间作格子门（双层格心），次间作直棂窗（竖棂）；
 *   · 内槽墙：沿内槽柱线，薄壁，剖视时可见内部造像；
 *   · 楼板：内槽与外槽之间的环形板（暗层顶即下一层的平座底）。
 */
export function buildLevelWalls(structure, levelIndex) {
  const walls = [];
  const lattice = [];
  const floors = [];
  const lv = structure.levels[levelIndex - 1];
  if (!lv) return { walls, lattice, floors };

  const topY = lv.columnTopY ?? lv.band.y1;
  const colH = topY - lv.band.y0;

  // ── 外檐墙（内收 0.30 m，让柱子露出）
  const outerRing = offsetPolygon(lv.outer.vertices, -0.30);
  const outerEdges = octagonEdges(outerRing);
  const wallH = colH * 0.66;
  const wallT = 0.36;

  outerEdges.forEach((e) => {
    const ax = e.a.x, az = e.a.z, bx = e.b.x, bz = e.b.z;
    const len = Math.hypot(bx - ax, bz - az);
    const angle = -Math.atan2(bz - az, bx - ax);

    // 实墙（略低于窗楣）
    const panel = new THREE.BoxGeometry(len, wallH, wallT);
    panel.rotateY(angle);
    panel.translate((ax + bx) / 2, lv.band.y0 + wallH / 2, (az + bz) / 2);
    walls.push(panel);

    // 格子门（明间，居中）与直棂窗（两次间）
    const bays = [
      { center: 0.5, width: 0.42, type: 'door' },
      { center: 0.18, width: 0.30, type: 'window' },
      { center: 0.82, width: 0.30, type: 'window' }
    ];
    bays.forEach((bay) => {
      const cx = ax + (bx - ax) * bay.center;
      const cz = az + (bz - az) * bay.center;
      const bw = len * bay.width;
      const bh = bay.type === 'door' ? wallH * 0.78 : wallH * 0.46;
      const by = lv.band.y0 + (bay.type === 'door' ? 0.02 : wallH * 0.36);
      const nx = e.normal.x;
      const nz = e.normal.z;

      // 窗框（洞框）
      const frameT = 0.09;
      const frameTop = new THREE.BoxGeometry(bw + frameT * 2, frameT, wallT * 0.9);
      frameTop.rotateY(angle);
      frameTop.translate(cx + nx * 0.02, by + bh, cz + nz * 0.02);
      lattice.push(frameTop);
      [-1, 1].forEach((s) => {
        const side = new THREE.BoxGeometry(frameT, bh, wallT * 0.9);
        side.rotateY(angle);
        side.translate(cx + (bx - ax) * (s * (bw / 2 + frameT / 2) / len) + nx * 0.02, by + bh / 2,
          cz + (bz - az) * (s * (bw / 2 + frameT / 2) / len) + nz * 0.02);
        lattice.push(side);
      });

      // 窗心：直棂（竖棂）或格心（横竖交织）
      const off = wallT * 0.52;
      const bars = bay.type === 'door' ? 7 : 5;
      for (let i = 1; i < bars; i++) {
        const t = i / bars;
        const bar = new THREE.BoxGeometry(0.045, bh * 0.94, 0.045);
        bar.rotateY(angle);
        bar.translate(
          cx + (bx - ax) * (t - 0.5) + nx * off,
          by + bh / 2,
          cz + (bz - az) * (t - 0.5) + nz * off
        );
        lattice.push(bar);
      }
      if (bay.type === 'door') {
        const rails = 3;
        for (let i = 1; i < rails; i++) {
          const t = i / rails;
          const rail = new THREE.BoxGeometry(bw * 0.94, 0.04, 0.05);
          rail.rotateY(angle);
          rail.translate(cx + nx * off, by + bh * t, cz + nz * off);
          lattice.push(rail);
        }
      }
    });
  });

  // ── 内槽墙（薄壁，剖视可见内部）
  const innerRing = offsetPolygon(lv.inner.vertices, -0.18);
  const innerEdges = octagonEdges(innerRing);
  const innerH = colH * 0.6;
  innerEdges.forEach((e) => {
    const ax = e.a.x, az = e.a.z, bx = e.b.x, bz = e.b.z;
    const len = Math.hypot(bx - ax, bz - az);
    const panel = new THREE.BoxGeometry(len, innerH, 0.22);
    panel.rotateY(-Math.atan2(bz - az, bx - ax));
    panel.translate((ax + bx) / 2, lv.band.y0 + innerH / 2, (az + bz) / 2);
    walls.push(panel);
  });

  // ── 楼板：内槽到外槽之间的环形板
  const deckInner = offsetPolygon(lv.inner.vertices, 0.1);
  const deckOuter = offsetPolygon(lv.outer.vertices, -0.34);
  octagonEdges(deckOuter).forEach((oe, i) => {
    const ie = octagonEdges(deckInner)[i];
    const p0 = oe.a, p1 = oe.b, p2 = ie.b, p3 = ie.a;
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      p0.x, 0, p0.z, p1.x, 0, p1.z, p2.x, 0, p2.z,
      p0.x, 0, p0.z, p2.x, 0, p2.z, p3.x, 0, p3.z
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(
      new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(12), 2));
    geo.setIndex([0, 1, 2, 3, 4, 5]);
    geo.translate(0, lv.band.y0 + 0.1, 0);
    floors.push(geo);
  });

  // 实测墙顶：外檐实墙的最高点（规划 §5.1 / U03：不能把 brightBands.y1 当作真实墙顶）
  const wallMaxY = lv.band.y0 + wallH;

  return { walls, lattice, floors, wallMaxY };
}

/**
 * 逐层生成全部墙体。
 * 首层的墙体另由 buildGroundWalls 处理（内槽墙带南北门洞），此处只出楼板。
 */
export function buildAllWalls(structure) {
  const walls = [];
  const lattice = [];
  const floors = [];
  const wallTops = {};
  for (let i = 1; i <= 5; i++) {
    const r = buildLevelWalls(structure, i);
    floors.push(...r.floors);
    wallTops[i] = r.wallMaxY;
    if (i === 1) continue;      // 首层墙体用 buildGroundWalls
    walls.push(...r.walls);
    lattice.push(...r.lattice);
  }
  return { walls, lattice, floors, wallTops };
}

/**
 * 首层回廊的墙（两道厚墙：内槽墙 + 外檐柱墙），门洞开在南北。
 * 厚度与位置据 L03：内槽墙厚约 2.86 m，外檐柱墙距内槽 2.38 m、厚 2.6 m。
 */
export function buildGroundWalls(structure) {
  const lv = structure.levels[0];
  const geos = [];
  const y0 = lv.band.y0;
  const y1 = lv.band.y1 - 0.9;
  const h = y1 - y0;

  const innerEdges = octagonEdges(lv.inner.vertices);
  const outerEdges = octagonEdges(lv.outer.vertices);

  // 内槽墙（每面一道厚墙，南北两面留门）
  innerEdges.forEach((e, i) => {
    const isSouth = i === 5;
    const isNorth = i === 1;
    const door = isSouth || isNorth;
    const ax = e.a.x, az = e.a.z, bx = e.b.x, bz = e.b.z;
    const len = Math.hypot(bx - ax, bz - az);
    const segs = door ? [[0.0, 0.32], [0.68, 1.0]] : [[0.0, 1.0]];
    segs.forEach(([t0, t1]) => {
      const p0x = ax + (bx - ax) * t0, p0z = az + (bz - az) * t0;
      const p1x = ax + (bx - ax) * t1, p1z = az + (bz - az) * t1;
      const segLen = Math.hypot(p1x - p0x, p1z - p0z);
      const geo = new THREE.BoxGeometry(segLen, h, 0.42);
      geo.rotateY(-Math.atan2(p1z - p0z, p1x - p0x));
      geo.translate((p0x + p1x) / 2, y0 + h / 2, (p0z + p1z) / 2);
      geos.push(geo);
    });
  });

  // 外檐柱墙（只做一圈薄墙，不封回廊）
  outerEdges.forEach((e, i) => {
    if (i === 5 || i === 1) return;    // 南北开回廊门
    const ax = e.a.x, az = e.a.z, bx = e.b.x, bz = e.b.z;
    const len = Math.hypot(bx - ax, bz - az);
    const geo = new THREE.BoxGeometry(len * 0.82, h * 0.92, 0.2);
    geo.rotateY(-Math.atan2(bz - az, bx - ax));
    geo.translate((ax + bx) / 2, y0 + h * 0.46, (az + bz) / 2);
    geos.push(geo);
  });

  return geos;
}

/** 合并一组几何为一个（失败时返回 null） */
export function mergeAll(list) {
  const valid = list.filter(Boolean);
  if (!valid.length) return null;
  const merged = mergeGeometries(valid);
  valid.forEach((g) => g.dispose());
  return merged;
}
