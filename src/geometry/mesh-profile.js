/**
 * src/geometry/mesh-profile.js
 *
 * 截面拉伸：把一条二维截面轮廓沿一根轴扫出实体。
 *
 * 中国木构的绝大多数构件（栱、昂、耍头、驼峰、枋、栏杆、望柱…）都是
 * 「一个截面沿长度方向重复/渐变」的结果，所以整个塔的构件库只需要这一条原语。
 *
 * 约定：
 *   · 截面点用 [u, v] 表示：u = 沿 Z（构件宽度方向），v = 沿 Y（高度方向）。
 *   · 构件长度沿 X（axis = 'x'）或 Z（axis = 'z'）。
 *   · 顶点顺序统一为逆时针（从 +Y 俯视截面），保证法线朝外。
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export { mergeGeometries };

/** 把 [u,v] 轮廓转成 Vector2 列表（用于三角化） */
function toVec2(profile) {
  return profile.map(([u, v]) => new THREE.Vector2(u, v));
}

/** 在两个站点之间连成一圈侧面四边形 */
function stitchSides(positions, indices, normals, uvs, ringA, ringB, n, uvU) {
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = ringA[i];
    const b = ringA[j];
    const c = ringB[j];
    const d = ringB[i];
    // 逆时针绕行 → 正面朝外
    indices.push(a, b, c);
    indices.push(a, c, d);
    const u0 = uvU[i];
    const u1 = uvU[i + 1] ?? uvU[0] + 1;
    // U = 沿构件长度方向（木纹顺纹方向），V = 沿截面周长
    uvs.push(0, u0, 0, u1, 1, u1, 1, u0);
  }
}

/**
 * 沿轴拉伸一个截面（等截面）。
 *
 * @param {Array<[number,number]>} profile 逆时针截面点 [u,v]
 * @param {object} opts
 * @param {number} opts.length 拉伸长度
 * @param {'x'|'z'} [opts.axis] 长度轴，默认 'x'
 * @param {boolean} [opts.caps] 是否封端
 * @param {number} [opts.uvScale]
 * @returns {THREE.BufferGeometry}
 */
export function extrudeProfile(profile, { length = 1, axis = 'x', caps = true, uvScale = 1 } = {}) {
  const n = profile.length;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // 截面周长参数（用于 U）
  const uvU = [0];
  for (let i = 1; i < n; i++) {
    const [u0, v0] = profile[i - 1];
    const [u1, v1] = profile[i];
    uvU.push(uvU[i - 1] + Math.hypot(u1 - u0, v1 - v0));
  }
  const perim = uvU[n - 1] + Math.hypot(profile[0][0] - profile[n - 1][0], profile[0][1] - profile[n - 1][1]);
  const uNorm = perim > 0 ? uvU.map((v) => v / perim) : uvU.map(() => 0);

  const ringA = [];
  const ringB = [];
  for (let i = 0; i < n; i++) {
    const [u, v] = profile[i];
    if (axis === 'x') {
      ringA.push(positions.length / 3); positions.push(0, v, u);
      ringB.push(positions.length / 3); positions.push(length, v, u);
    } else {
      ringA.push(positions.length / 3); positions.push(u, v, 0);
      ringB.push(positions.length / 3); positions.push(u, v, length);
    }
  }

  stitchSides(positions, indices, normals, uvs, ringA, ringB, n, uNorm);

  if (caps) {
    const contour = toVec2(profile);
    const faces = THREE.ShapeUtils.triangulateShape(contour, []);
    // 端 A（法线朝 -轴）
    for (const f of faces) {
      indices.push(ringA[f[0]], ringA[f[2]], ringA[f[1]]);
      uvs.push(profile[f[0]][0], profile[f[0]][1], profile[f[2]][0], profile[f[2]][1], profile[f[1]][0], profile[f[1]][1]);
    }
    // 端 B（法线朝 +轴）
    for (const f of faces) {
      indices.push(ringB[f[0]], ringB[f[1]], ringB[f[2]]);
      uvs.push(profile[f[0]][0], profile[f[0]][1], profile[f[1]][0], profile[f[1]][1], profile[f[2]][0], profile[f[2]][1]);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * 沿轴扫掠一个截面，允许沿长度渐变（收分 / 卷杀 / 昂嘴）。
 *
 * @param {Array<[number,number]>} profile
 * @param {Array<{x:number, sy?:number, sz?:number, oy?:number, ox?:number}>} stations
 *        x = 沿长度轴位置；sy/sz = 该站点的缩放；oy/ox = 截面偏移
 * @param {object} opts
 */
export function extrudeProfileStations(profile, stations, { axis = 'x', caps = true } = {}) {
  const n = profile.length;
  const positions = [];
  const uvs = [];
  const indices = [];

  const uvU = [0];
  for (let i = 1; i < n; i++) {
    const [u0, v0] = profile[i - 1];
    const [u1, v1] = profile[i];
    uvU.push(uvU[i - 1] + Math.hypot(u1 - u0, v1 - v0));
  }
  const perim = uvU[n - 1] + Math.hypot(profile[0][0] - profile[n - 1][0], profile[0][1] - profile[n - 1][1]);
  const uNorm = perim > 0 ? uvU.map((v) => v / perim) : uvU.map(() => 0);

  const rings = stations.map((st) => {
    const sy = st.sy ?? 1;
    const sz = st.sz ?? 1;
    const oy = st.oy ?? 0;
    const ox = st.ox ?? 0;
    const ring = [];
    for (let i = 0; i < n; i++) {
      const [u, v] = profile[i];
      const uu = u * sz + ox;
      const vv = v * sy + oy;
      if (axis === 'x') {
        ring.push(positions.length / 3); positions.push(st.x, vv, uu);
      } else {
        ring.push(positions.length / 3); positions.push(uu, vv, st.x);
      }
    }
    return ring;
  });

  for (let s = 0; s < rings.length - 1; s++) {
    stitchSides(positions, indices, null, uvs, rings[s], rings[s + 1], n, uNorm);
  }

  if (caps) {
    const contour = toVec2(profile);
    const faces = THREE.ShapeUtils.triangulateShape(contour, []);
    const first = rings[0];
    const last = rings[rings.length - 1];
    for (const f of faces) {
      indices.push(first[f[0]], first[f[2]], first[f[1]]);
      uvs.push(profile[f[0]][0], profile[f[0]][1], profile[f[2]][0], profile[f[2]][1], profile[f[1]][0], profile[f[1]][1]);
    }
    for (const f of faces) {
      indices.push(last[f[0]], last[f[1]], last[f[2]]);
      uvs.push(profile[f[0]][0], profile[f[0]][1], profile[f[1]][0], profile[f[1]][1], profile[f[2]][0], profile[f[2]][1]);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * 把一个矩形截面转成带倒角的轮廓（用于构件棱边的浅倒角 ≤2% 宽）。
 */
export function chamferedRect(width, height, chamfer = 0.01) {
  const w = width / 2;
  const h = height / 2;
  const c = Math.min(chamfer, w * 0.4, h * 0.4);
  if (c <= 0) {
    return [[-w, -h], [w, -h], [w, h], [-w, h]];
  }
  return [
    [-w + c, -h], [w - c, -h],
    [w, -h + c], [w, h - c],
    [w - c, h], [-w + c, h],
    [-w, h - c], [-w, -h + c]
  ];
}

/**
 * 由「方 + 两端卷杀」生成栱臂的截面轮廓（水平方向为 u，构件长度方向是 X）。
 * 卷杀端：端部截面按二次曲线收窄并下弯。
 */
export function gongArmProfile({ thickness, height, tipScale = 0.62, tipDrop = 0.18 }) {
  const w = thickness / 2;
  const h = height;
  return [
    [-w, 0],
    [w, 0],
    [w * tipScale, h * (1 - tipDrop)],
    [w * tipScale * 0.55, h * (1 - tipDrop * 0.45)],
    [-w * tipScale * 0.55, h * (1 - tipDrop * 0.45)],
    [-w * tipScale, h * (1 - tipDrop)]
  ];
}

/**
 * 栌斗 / 散斗：上小下大的斗（顶部有凹口用简单矩形近似）。
 * 截面在 (u,v)：u = 宽（Z），v = 高（Y）。返回沿 Y 方向的实体截面，
 * 实际使用时以 axis='y' 不支持，故改为直接生成盒体几何。
 */
export function douGeometry({ top, bottom, height }) {
  const geo = new THREE.CylinderGeometry(top / 2, bottom / 2, height, 4, 1, false);
  geo.rotateY(Math.PI / 4);
  geo.translate(0, height / 2, 0);
  return geo;
}

/** 简易长方体（带可选倒角占位），用于枋、梁、栏板等。 */
export function beamGeometry(width, height, length, axis = 'x') {
  const geo = new THREE.BoxGeometry(
    axis === 'x' ? length : width,
    height,
    axis === 'x' ? width : length
  );
  return geo;
}

/** 计算一组几何的合并包围盒 */
export function boundsOf(geometries) {
  const box = new THREE.Box3();
  for (const g of geometries) {
    if (!g) continue;
    g.computeBoundingBox();
    box.union(g.boundingBox);
  }
  return box;
}

/**
 * 统一索引状态后再合并。
 * ExtrudeGeometry 产出非索引几何，Box/Cylinder 产出索引几何，
 * BufferGeometryUtils.mergeGeometries 不允许两者混合 —— 这里统一转成非索引。
 */
export function prepareForMerge(geometries) {
  const list = geometries.filter(Boolean);
  if (!list.length) return [];
  const anyNonIndexed = list.some((g) => !g.index);
  if (!anyNonIndexed) return list;
  return list.map((g) => {
    if (!g.index) return g;
    const n = g.toNonIndexed();
    g.dispose();
    return n;
  });
}

/** 安全合并一组几何（自动处理索引状态） */
export function mergeSafe(geometries) {
  const list = prepareForMerge(geometries);
  if (!list.length) return null;
  const merged = mergeGeometries(list);
  list.forEach((g) => g.dispose());
  return merged;
}
