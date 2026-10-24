/**
 * src/geometry/finial.js
 *
 * 塔刹：仰莲 → 覆钵 → 相轮（五重）→ 圆光 → 仰月 → 宝盖 → 宝珠。
 *
 * 依据：省文物局（L06）记砖砌仰莲刹座 2.17 m、铁质刹身 9.95 m；
 * 陈明达 A 模数（L07）的 1⅛A = 9.934 m 与铁刹身吻合，说明**砖仰莲含在
 * 6A 塔身段之内**而非叠加项。因此本模型把仰莲做进塔身段顶端的砖座，
 * 铁刹自 y = 57.31 起算，总高 10.0 m（ESTIMATE）。
 */

import * as THREE from 'three';
import { EST } from '../data/structure.js';

/** 相轮：若干圆盘叠置 */
function makeXianglun(radius, height, rings) {
  const geos = [];
  const rh = height / rings;
  for (let i = 0; i < rings; i++) {
    const r = radius * (1 - i * 0.085);
    // 相轮盘：上小下大的扁盘，边缘外张以便在剪影中数出环数
    const g = new THREE.CylinderGeometry(r * 0.82, r, rh * 0.40, 16, 1, false);
    g.translate(0, rh * (i + 0.30), 0);
    geos.push(g);
    // 束颈
    const neck = new THREE.CylinderGeometry(r * 0.46, r * 0.46, rh * 0.34, 12);
    neck.translate(0, rh * (i + 0.67), 0);
    geos.push(neck);
  }
  return geos;
}

/**
 * 造塔刹。
 * @returns {{iron: THREE.BufferGeometry[], brick: THREE.BufferGeometry[]}}
 */
export function buildFinial(structure) {
  const F = structure.finial;
  const iron = [];
  const brick = [];

  let y = F.y0;

  // ── 砖砌仰莲座（塔身段顶端，不属于铁刹）
  const bl = F.brickLotus;
  const lotusDrum = new THREE.CylinderGeometry(bl.radius * 0.92, bl.radius, bl.y1 - bl.y0, 8, 1, false);
  lotusDrum.rotateY(Math.PI / 8);
  lotusDrum.translate(0, (bl.y0 + bl.y1) / 2, 0);
  brick.push(lotusDrum);
  // 仰莲的莲瓣
  for (let ring = 0; ring < 2; ring++) {
    const r = bl.radius * (0.95 - ring * 0.16);
    const h = (bl.y1 - bl.y0) * 0.42;
    const y0 = bl.y0 + (bl.y1 - bl.y0) * (0.18 + ring * 0.36);
    const geos = makeXianglun(r, h, 2);
    geos.forEach((g) => { g.translate(0, y0, 0); });
    brick.push(...geos);
  }

  // ── 铁刹各段（合计 = 1⅛A ≈ 9.95 m）
  for (let i = 0; i < F.segments.length; i++) {
    const seg = F.segments[i];
    if (seg.name === '相轮') {
      iron.push(...makeXianglun(seg.radius, seg.height, seg.rings));
    } else if (seg.name === '宝珠') {
      const stalk = new THREE.CylinderGeometry(seg.radius * 0.16, seg.radius * 0.22, seg.height * 0.62, 10);
      stalk.translate(0, y + seg.height * 0.31, 0);
      iron.push(stalk);
      const g = new THREE.SphereGeometry(seg.radius, 16, 12);
      g.scale(1, 1.35, 1);
      g.translate(0, y + seg.height * 0.78, 0);
      iron.push(g);
    } else if (seg.name === '仰月') {
      // 仰月：中间鼓起的扁球
      const g = new THREE.SphereGeometry(seg.radius, 14, 10);
      g.scale(1, 0.55, 1);
      g.translate(0, y + seg.height / 2, 0);
      iron.push(g);
    } else if (seg.name === '宝盖') {
      // 宝盖：伞盖
      const g = new THREE.ConeGeometry(seg.radius, seg.height, 14, 1, false);
      g.translate(0, y + seg.height / 2, 0);
      iron.push(g);
      const brim = new THREE.CylinderGeometry(seg.radius, seg.radius * 0.94, 0.06, 14);
      brim.translate(0, y + 0.03, 0);
      iron.push(brim);
    } else if (seg.name === '覆钵') {
      // 覆钵：实照中为「葱头」式的圆腹，不是直筒
      const g = new THREE.SphereGeometry(seg.radius, 16, 12);
      g.scale(1, seg.height / (seg.radius * 1.55), 1);
      g.translate(0, y + seg.height * 0.42, 0);
      iron.push(g);
      const collar = new THREE.CylinderGeometry(seg.radius * 0.72, seg.radius * 0.95, seg.height * 0.3, 16);
      collar.translate(0, y + seg.height * 0.06, 0);
      iron.push(collar);
    } else {
      // 圆光：扁盘
      const g = new THREE.CylinderGeometry(seg.radius, seg.radius * 0.94, seg.height * 0.52, 18, 1, false);
      g.translate(0, y + seg.height * 0.3, 0);
      iron.push(g);
      const stem = new THREE.CylinderGeometry(seg.radius * 0.3, seg.radius * 0.3, seg.height * 0.7, 10);
      stem.translate(0, y + seg.height * 0.72, 0);
      iron.push(stem);
    }
    y += seg.height;
  }

  // ── 八条铁链：自刹杆斜向八条垂脊末端
  const chainLen = 9.5;
  for (let k = 0; k < F.chains; k++) {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    const top = new THREE.Vector3(0, F.y0 + 1.4, 0);
    const bottom = new THREE.Vector3(
      Math.cos(a) * 10.2,
      F.y0 - 1.55,
      Math.sin(a) * 10.2
    );
    const dir = new THREE.Vector3().subVectors(bottom, top);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(0.014, 0.014, len, 5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), dir.clone().normalize()
    );
    g.applyQuaternion(quat);
    g.translate((top.x + bottom.x) / 2, (top.y + bottom.y) / 2, (top.z + bottom.z) / 2);
    iron.push(g);
  }

  return { iron, brick };
}

/** 塔刹顶标高（自检用） */
export function finialTop(structure) {
  return structure.finial.y0 + structure.finial.segments.reduce((s, g) => s + g.height, 0);
}
