/**
 * src/geometry/profiles.js
 *
 * 木构件零件库 —— 斗栱的每一件都有独立的形体与名称。
 *
 * 局部坐标约定（所有零件通用）：
 *   · 原点 = 该零件的「下端/内端」安装点
 *   · +X = 沿面方向（面 tangent）
 *   · +Z = 出檐方向（outward）
 *   · +Y = 向上
 *
 * 形制术语依据营造学社测绘：栌斗 / 散斗 / 华栱 / 泥道栱 / 令栱 / 横栱 /
 * 昂 / 耍头 / 驼峰 / 替木。
 */

import * as THREE from 'three';
import {
  extrudeProfile, extrudeProfileStations, chamferedRect, gongArmProfile, mergeGeometries
} from './mesh-profile.js';

/* ── 斗 ─────────────────────────────────────────────────── */

/** 栌斗：上小下大的四棱斗，底面位于 y = 0 */
export function makeDou({ top = 0.28, bottom = 0.34, height = 0.19 } = {}) {
  const geo = new THREE.CylinderGeometry(top / 2, bottom / 2, height, 4, 1, false);
  geo.rotateY(Math.PI / 4);
  geo.translate(0, height / 2, 0);
  return geo;
}

/** 散斗：小型斗，底面位于 y = 0 */
export function makeSanDou({ top = 0.20, bottom = 0.24, height = 0.12 } = {}) {
  const geo = new THREE.CylinderGeometry(top / 2, bottom / 2, height, 4, 1, false);
  geo.rotateY(Math.PI / 4);
  geo.translate(0, height / 2, 0);
  return geo;
}

/* ── 栱 ─────────────────────────────────────────────────── */

/**
 * 华栱：出檐方向的水平栱臂，从原点沿 +Z 伸出。
 * 端部做卷杀（曲线收分）。
 */
export function makeHuaGong({
  length = 0.7, width = 0.257, height = 0.153,
  tipScale = 0.66, tipDrop = 0.22, tipLength = 0.16
} = {}) {
  const profile = gongArmProfile({ thickness: width, height, tipScale, tipDrop });
  const body = Math.max(0.05, length - tipLength);
  return extrudeProfileStations(profile, [
    { x: 0, sy: 1, sz: 1 },
    { x: body * 0.55, sy: 1, sz: 1 },
    { x: body, sy: 1, sz: 1 },
    { x: length, sy: 1, sz: tipScale, oy: -height * tipDrop * 0.5 }
  ], { axis: 'z' });
}

/** 泥道栱：沿面方向（X）贯通，位于栌斗之上 */
export function makeNiDaoGong({ length = 1.1, width = 0.257, height = 0.153 } = {}) {
  const profile = chamferedRect(width, height, 0.012);
  const geo = extrudeProfile(profile, { length, axis: 'x' });
  geo.translate(-length / 2, 0, 0);
  return geo;
}

/**
 * 令栱 / 横栱：沿面方向，翼形（两端外扩）。
 */
export function makeLingGong({ length = 1.0, width = 0.257, height = 0.153, wing = 0.2 } = {}) {
  const w = width / 2;
  const profile = [
    [-w, 0],
    [w, 0],
    [w, height * (1 - wing * 0.5)],
    [w * 1.55, height * 0.72],
    [w * 1.75, height * 0.5],
    [w * 1.75, 0.02],
    [-w * 1.75, 0.02],
    [-w * 1.75, height * 0.5],
    [-w * 1.55, height * 0.72],
    [-w, height * (1 - wing * 0.5)]
  ];
  // 翼形栱：截面在 (宽=Z, 高=Y) 平面，沿 X 拉伸。
  // 用 extrudeProfile 而非 ExtrudeGeometry，是为了保持**索引几何**——
  // 合并时不会触发全体转非索引（顶点数 ×3、内存与耗时暴涨）。
  const geo = extrudeProfile(profile, { length, axis: 'x' });
  geo.translate(-length / 2, 0, 0);
  return geo;
}

/** 横栱：纯水平联系构件，沿面方向 */
export function makeHengGong({ length = 0.9, width = 0.22, height = 0.14 } = {}) {
  const profile = chamferedRect(width, height, 0.01);
  const geo = extrudeProfile(profile, { length, axis: 'x' });
  geo.translate(-length / 2, 0, 0);
  return geo;
}

/* ── 昂 / 耍头 / 驼峰 ──────────────────────────────────── */

/**
 * 下昂：斜向下伸出的构件。自原点沿 +Z 伸出并按 riseDeg 下倾，
 * 末端做昂嘴（bat's-beak）三角收削。
 */
export function makeAng({
  length = 1.2, width = 0.257, height = 0.153, riseDeg = 16, beak = 0.22
} = {}) {
  const profile = chamferedRect(width, height, 0.01);
  const geo = extrudeProfile(profile, { length, axis: 'z' });
  // 末端做昂嘴：切一刀
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = Math.max(0, (v.z - (length - beak * length)) / (beak * length));
    if (t > 0) {
      const k = 1 - t * 0.62;
      v.y *= k;
      pos.setY(i, v.y);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  // 绕 X 轴下倾：z 增大 → y 减小
  geo.rotateX(-THREE.MathUtils.degToRad(riseDeg));
  return geo;
}

/** 耍头：顶部水平外伸构件，批竹式平截端 */
export function makeShuatou({ length = 0.72, width = 0.257, height = 0.153 } = {}) {
  const profile = chamferedRect(width, height, 0.01);
  const geo = extrudeProfile(profile, { length, axis: 'z' });
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (v.z > length - 0.1) {
      const k = (length - v.z) / 0.1;
      pos.setY(i, v.y * (0.55 + 0.45 * k));
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** 驼峰：承托横栱的曲面垫块 */
export function makeTuofeng({ width = 0.5, depth = 0.34, height = 0.2 } = {}) {
  const profile = [
    [-width / 2, 0],
    [width / 2, 0],
    [width / 2, height * 0.42],
    [width * 0.3, height],
    [-width * 0.3, height],
    [-width / 2, height * 0.42]
  ];
  const geo = extrudeProfile(profile, { length: depth, axis: 'z' });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/** 替木：纵向连系的小枋 */
export function makeTiMu({ length = 0.7, width = 0.14, height = 0.11 } = {}) {
  const profile = chamferedRect(width, height, 0.008);
  const geo = extrudeProfile(profile, { length, axis: 'x' });
  geo.translate(-length / 2, 0, 0);
  return geo;
}

/* ── 常用木作小件 ───────────────────────────────────────── */

/** 圆形柱段（带轻微收分与卷杀柱头），底面位于 y = 0 */
export function makeColumnGeometry({
  radius = 0.32, height = 5.0, segments = 10, taper = 0.02, entasis = 0.012
} = {}) {
  const geo = new THREE.CylinderGeometry(radius * (1 - taper), radius, height, segments, 1, false);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.y + height / 2) / height;      // 0 = 底, 1 = 顶
    const belly = 1 + entasis * Math.sin(Math.PI * t);
    pos.setX(i, v.x * belly);
    pos.setZ(i, v.z * belly);
  }
  pos.needsUpdate = true;
  geo.translate(0, height / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

/** 方枋 / 梁：沿 axis 拉伸的矩形截面 */
export function makeFangGeometry({ width = 0.24, height = 0.3, length = 1.0, axis = 'x', chamfer = 0.012 } = {}) {
  const profile = chamferedRect(width, height, chamfer);
  return extrudeProfile(profile, { length, axis });
}

/** 望柱（栏杆柱）：底面位于 y = 0，带素头 */
export function makeBalusterPostGeometry({ section = 0.15, height = 1.15 } = {}) {
  const shaft = new THREE.BoxGeometry(section, height - 0.08, section);
  shaft.translate(0, (height - 0.08) / 2, 0);
  const head = new THREE.BoxGeometry(section * 1.25, 0.08, section * 1.25);
  head.translate(0, height - 0.04, 0);
  return mergeTwo(shaft, head);
}

/** 栏板（钩栏横枋之间的板） */
export function makeBalusterPanelGeometry({ height = 0.72, thickness = 0.07, length = 0.3 } = {}) {
  const geo = new THREE.BoxGeometry(length, height, thickness);
  geo.translate(length / 2, height / 2, 0);
  return geo;
}

/** 合并两个几何（同属性） */
export function mergeTwo(a, b) {
  const merged = mergeGeometries([a, b]);
  a.dispose();
  b.dispose();
  return merged;
}
