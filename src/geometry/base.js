/**
 * src/geometry/base.js
 *
 * 台基：下层方形石基 + 上层八角石基 + 月台 + 角石 + 台阶。
 *
 * 形制（据 L01 / 省文物局 L06）：
 *   · 台基总高约 4 m，分上下两层：下层方形（约 40 m 边长，四向月台），
 *     上层八角形（对角径约 35.47 m，正东 / 正西 / 正南三向月台）。
 *   · 各角与月台角设突出的角石，角石上凸雕辽代狮头（此处为抽象体块示意）。
 *   · 须弥座分束腰 / 上下枭混 / 叠涩，各层高为 ESTIMATE。
 */

import * as THREE from 'three';
import { octagonVertices } from './math-octagon.js';
import { EST } from '../data/structure.js';

/** 叠涩台阶：把一个矩形基座做成逐层收分 */
function stackCourses(w, d, y0, y1, courses, inset) {
  const geos = [];
  const h = (y1 - y0) / courses;
  for (let i = 0; i < courses; i++) {
    const geo = new THREE.BoxGeometry(w - inset * i, h, d - inset * i);
    geo.translate(0, y0 + h * (i + 0.5), 0);
    geos.push(geo);
  }
  return geos;
}

/** 八角棱台 */
function octagonalPrism(side, y0, y1, bottomScale = 1) {
  const geo = new THREE.CylinderGeometry(side / (2 * Math.sin(Math.PI / 8)), side / (2 * Math.sin(Math.PI / 8)), y1 - y0, 8, 1, false);
  geo.rotateY(Math.PI / 8);
  geo.translate(0, (y0 + y1) / 2, 0);
  return geo;
}

/**
 * 造整座台基。
 * @returns {{stone: THREE.BufferGeometry[], cornerStone: THREE.BufferGeometry[], stair: THREE.BufferGeometry[]}}
 */
export function buildBase(structure) {
  const stone = [];
  const cornerStone = [];
  const stair = [];
  const B = structure.base;

  // ── 下层方形台基（0 → 1.6）
  const sq = B.square;
  stone.push(...stackCourses(sq.side, sq.side, sq.y0, sq.y1, 3, 0.35));

  // 下层四向月台
  sq.moonPlatforms.forEach((mp) => {
    const isNS = mp.dir === 'S' || mp.dir === 'N';
    const len = mp.outward;
    const wid = mp.width;
    const half = sq.side / 2;
    const geo = new THREE.BoxGeometry(isNS ? wid : len, 1.6, isNS ? len : wid);
    const off = half + len / 2 - 0.1;
    if (mp.dir === 'S') geo.translate(0, 0.8, -off);
    if (mp.dir === 'N') geo.translate(0, 0.8, off);
    if (mp.dir === 'E') geo.translate(off, 0.8, 0);
    if (mp.dir === 'W') geo.translate(-off, 0.8, 0);
    stone.push(geo);
    // 月台角石
    const cs = new THREE.BoxGeometry(1.1, 0.5, 1.1);
    cs.translate(
      mp.dir === 'E' ? off + wid / 2 - 0.5 : mp.dir === 'W' ? -off - wid / 2 + 0.5 : 0,
      1.85,
      mp.dir === 'S' ? -off - wid / 2 + 0.5 : mp.dir === 'N' ? off + wid / 2 - 0.5 : 0
    );
    cornerStone.push(cs);
  });

  // 下层角石（四角）
  const half = sq.side / 2;
  [[half, half], [half, -half], [-half, half], [-half, -half]].forEach(([x, z]) => {
    const cs = new THREE.BoxGeometry(1.5, 0.55, 1.5);
    cs.translate(x, 1.87, z);
    cornerStone.push(cs);
    // 狮头（抽象体块示意）
    const lion = new THREE.SphereGeometry(0.34, 8, 6);
    lion.scale(1, 1.15, 0.9);
    lion.translate(x, 2.32, z);
    cornerStone.push(lion);
  });

  // ── 上层八角台基（1.6 → 4.0）
  const oc = B.octagonal;
  const verts = octagonVertices(oc.side, oc.y1);
  stone.push(octagonalPrism(oc.side, oc.y0, oc.y1));

  // 上层须弥座层（束腰 / 枭混 / 叠涩）——以略小的八角环表现
  let yy = oc.y0;
  EST.sumeruBands.forEach((h, i) => {
    const s = oc.side * (1 - 0.012 * (i + 1));
    stone.push(octagonalPrism(s, yy, yy + h));
    yy += h;
  });

  // 上层角石 + 狮头
  verts.forEach((v) => {
    const cs = new THREE.BoxGeometry(oc.cornerStoneSize, oc.cornerStoneRise, oc.cornerStoneSize);
    cs.translate(v.x, oc.y1 + oc.cornerStoneRise / 2 - 0.1, v.z);
    cornerStone.push(cs);
    const lion = new THREE.SphereGeometry(0.32, 8, 6);
    lion.scale(1, 1.15, 0.9);
    lion.translate(v.x, oc.y1 + oc.cornerStoneRise + 0.16, v.z);
    cornerStone.push(lion);
  });

  // 上层三向月台
  oc.moonPlatforms.forEach((mp) => {
    const isNS = mp.dir === 'S';
    const len = mp.outward;
    const wid = mp.width;
    const r = oc.diagonal / 2;
    const geo = new THREE.BoxGeometry(isNS ? wid : len, oc.y1 - oc.y0, isNS ? len : wid);
    const off = r + len / 2 - 0.4;
    if (mp.dir === 'S') geo.translate(0, (oc.y0 + oc.y1) / 2, -off);
    if (mp.dir === 'E') geo.translate(off, (oc.y0 + oc.y1) / 2, 0);
    if (mp.dir === 'W') geo.translate(-off, (oc.y0 + oc.y1) / 2, 0);
    stone.push(geo);
  });

  // ── 南面台阶：由地面升至上层八角台基顶
  const S = EST.stair;
  const rise = S.rise;
  const totalRise = oc.y1;
  const steps = Math.max(1, Math.round(totalRise / rise));
  const zStart = -(oc.diagonal / 2) - 6.6;
  for (let i = 0; i < steps; i++) {
    const y = (i + 0.5) * rise;
    const z = zStart + i * S.tread;
    const geo = new THREE.BoxGeometry(S.width, rise, S.tread);
    geo.translate(0, y, z);
    stair.push(geo);
  }
  // 两侧垂带（阶条石）
  [-1, 1].forEach((s) => {
    const geo = new THREE.BoxGeometry(0.55, totalRise + 0.2, steps * S.tread);
    geo.translate(s * (S.width / 2 + 0.27), (totalRise + 0.2) / 2, zStart + (steps * S.tread) / 2);
    stair.push(geo);
  });

  return { stone, cornerStone, stair };
}
