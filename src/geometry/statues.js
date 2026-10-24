/**
 * src/geometry/statues.js
 *
 * 塔内造像 —— **抽象雕塑占位**，不是佛像扫描或复原。
 *
 * 依据 H07：各层造像组数为 1 / 5 / 4 / 7 / 9；首层释迦像高约 11 m、像座约 2.13 m
 * （「11 m 是否含座」口径待核）。本模型一律标注「形制示意」。
 *
 * 建模原则（规划 §4.4）：
 *   · 至少有莲座、身形、发髻、垂衣、手势方向等层次。
 *   · 脸部省略写实五官，避免假装复原文物。
 *   · 首层不把 11 m 与 2.13 m 相加到超出室内净高。
 */

import * as THREE from 'three';
import { mergeGeometries } from './mesh-profile.js';
import { STATUE_GROUPS } from '../data/structure.js';

/** 各层造像的示意高度（ESTIMATE；首层按「像 + 座」合计约 9.8 m 反推） */
const STATUE_SCALE = {
  1: { total: 9.8, seat: 2.13, spread: 0 },
  2: { total: 2.6, seat: 0.9, spread: 2.1 },
  3: { total: 2.4, seat: 0.85, spread: 2.0 },
  4: { total: 2.2, seat: 0.8, spread: 2.2 },
  5: { total: 1.8, seat: 0.7, spread: 2.0 }
};

/** 莲座 */
function makeLotusSeat(radius, height) {
  const geos = [];
  const base = new THREE.CylinderGeometry(radius * 0.86, radius, height * 0.55, 14, 1, false);
  base.translate(0, height * 0.275, 0);
  geos.push(base);
  const petals = 12;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const petal = new THREE.SphereGeometry(radius * 0.2, 7, 5);
    petal.scale(1, 0.55, 1.5);
    petal.rotateY(-a);
    petal.translate(Math.cos(a) * radius * 0.74, height * 0.72, Math.sin(a) * radius * 0.74);
    geos.push(petal);
  }
  const cap = new THREE.CylinderGeometry(radius * 0.9, radius * 0.78, height * 0.4, 14);
  cap.translate(0, height * 0.72, 0);
  geos.push(cap);
  return geos;
}

/**
 * 抽象造像：莲座 + 身形 + 发髻 + 垂衣 + 手臂方向。
 */
function makeAbstractFigure({ height, seated, seed = 0 }) {
  const geos = [];
  const bodyH = height * (seated ? 0.58 : 0.78);
  const r = height * 0.17;

  // 盘腿（坐姿）
  if (seated) {
    const lap = new THREE.SphereGeometry(bodyH * 0.46, 14, 10);
    lap.scale(1.25, 0.5, 1.05);
    lap.translate(0, bodyH * 0.3, 0);
    geos.push(lap);
  }

  // 躯干
  const torso = new THREE.CylinderGeometry(r * 0.78, r, bodyH * 0.62, 12, 1, false);
  torso.translate(0, bodyH * (seated ? 0.58 : 0.52), 0);
  geos.push(torso);

  // 肩
  const shoulders = new THREE.SphereGeometry(r * 1.05, 12, 8);
  shoulders.scale(1.25, 0.6, 0.85);
  shoulders.translate(0, bodyH * (seated ? 0.86 : 0.84), 0);
  geos.push(shoulders);

  // 头（略椭球，不刻画五官）
  const head = new THREE.SphereGeometry(r * 0.62, 12, 10);
  head.scale(0.92, 1.1, 0.95);
  head.translate(0, bodyH * (seated ? 1.02 : 0.98) + r * 0.5, 0);
  geos.push(head);

  // 发髻
  const bun = new THREE.SphereGeometry(r * 0.38, 10, 8);
  bun.scale(1, 0.85, 1);
  bun.translate(0, bodyH * (seated ? 1.02 : 0.98) + r * 1.2, 0);
  geos.push(bun);

  // 垂衣：斜披的布帛
  const robe = new THREE.SphereGeometry(r * 1.18, 12, 10, 0, Math.PI * 1.1, 0.6, 1.5);
  robe.scale(1, 1.25, 1);
  robe.rotateY(0.4 + seed * 0.2);
  robe.translate(0, bodyH * 0.6, 0);
  geos.push(robe);

  // 手臂（方向示意，不刻画手指）
  const armGeo = new THREE.CylinderGeometry(r * 0.24, r * 0.2, bodyH * 0.5, 8);
  const armL = armGeo.clone();
  armL.rotateZ(0.85);
  armL.translate(-r * 0.9, bodyH * 0.72, 0);
  geos.push(armL);
  const armR = armGeo.clone();
  armR.rotateZ(-0.85);
  armR.translate(r * 0.9, bodyH * 0.72, 0);
  geos.push(armR);
  armGeo.dispose();

  return geos;
}

/**
 * 生成全塔造像。
 * @returns {{statue: THREE.BufferGeometry[], seat: THREE.BufferGeometry[], records: Array}}
 */
export function buildStatues(structure) {
  const statue = [];
  const seat = [];
  const records = [];

  STATUE_GROUPS.forEach((grp) => {
    const lv = structure.levels[grp.level - 1];
    if (!lv) return;
    const scale = STATUE_SCALE[grp.level] || { total: 2, seat: 0.7, spread: 1.6 };
    const floorY = lv.band.y0;

    // 坛座
    const altarR = Math.min(lv.inner.apothem * 0.62, 2.6);
    const altar = new THREE.CylinderGeometry(
      altarR, altarR * 1.06, scale.seat, 8, 1, false
    );
    altar.rotateY(Math.PI / 8);
    altar.translate(0, floorY + scale.seat / 2, 0);
    seat.push(altar);

    // 造像布置
    const count = grp.count;
    for (let i = 0; i < count; i++) {
      const isMain = i === 0;
      const h = isMain ? scale.total - scale.seat : scale.total * (0.55 + 0.1 * (i % 3));
      const r = Math.min(scale.spread, isMain ? 0 : scale.spread * 0.72);
      let x = 0, z = 0;
      if (!isMain && count > 1) {
        const a = ((i - 1) / (count - 1)) * Math.PI * 2;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
      }
      const seated = isMain || grp.level === 1;
      const geos = makeAbstractFigure({ height: h, seated, seed: i });

      // 莲座 / 蒲团
      const seatR = h * 0.42;
      const seatGeos = makeLotusSeat(seatR, Math.max(0.28, h * 0.14));
      seatGeos.forEach((g) => {
        g.translate(x, floorY + scale.seat, z);
        seat.push(g);
      });

      const merged = mergeGeometries(geos);
      geos.forEach((g) => g.dispose());
      merged.translate(x, floorY + scale.seat, z);
      statue.push(merged);

      records.push({
        id: `L${grp.level}-statue-${i}`,
        floor: grp.level,
        group: grp.label,
        x, z, y: floorY + scale.seat,
        height: h,
        schematic: true
      });
    }
  });

  return { statue, seat, records };
}

/** 造像总数（自检用；H07 口径 1+5+4+7+9 = 26） */
export function statueCount() {
  return STATUE_GROUPS.reduce((s, g) => s + g.count, 0);
}
