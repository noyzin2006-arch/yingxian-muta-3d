/**
 * src/geometry/roof.js
 *
 * 六重屋面系统。
 *
 * 形制要点：
 *   · 八角攒尖：8 条垂脊汇于顶点，**没有**一条横贯东西的正脊（M32）。
 *   · 举折：檐口到内檩的曲面，下缓上陡（凹曲线），
 *     y(t) = y0 + (y1-y0)·(0.62t + 0.38t²)，比直线低，落在 26°–32°。
 *   · 角端起翘克制（0.12–0.18 m）：依 L05「各层塔檐基本平直，角翘十分平缓」。
 *   · 出檐按柱线多边形的**边法线偏移**求交点得到，不能简单用 R+d。
 */

import * as THREE from 'three';
import { octagonEdges, offsetPolygon } from './math-octagon.js';
import { EST, INNER_SCALE } from '../data/structure.js';

/** 每檐的屋面升起高度（檐口 → 内檩） */
export const EAVE_RISE = Object.freeze([3.2, 3.0, 2.8, 2.6, 2.4]);
/** 内檩环相对柱线环的缩放（定义在 data/structure.js，此处转出以便外部引用） */
export { INNER_SCALE };

/**
 * 生成一重屋面的曲面几何。
 *
 * @param {object} eave  structure.eaves 的一项
 * @param {object} opts
 * @param {number} [opts.segmentsPerFace]
 * @param {number} [opts.ringSegments]
 * @returns {{geometry: THREE.BufferGeometry, eaveRing: Array, innerRing: Array}}
 */
export function buildRoofSurface(eave, opts = {}) {
  const segs = opts.segmentsPerFace ?? EST.roof.segmentsPerFace;
  const rings = opts.ringSegments ?? EST.roof.ringSegments;

  const P = eave.ring;                                  // 柱线环
  const E = offsetPolygon(P, eave.offset);              // 檐口环（边法线偏移）
  const isApex = !!eave.isApex;

  const innerRing = isApex
    ? null
    : (eave.innerRingVertices
      ? eave.innerRingVertices.map((p) => ({ x: p.x, z: p.z }))
      : P.map((p) => ({ x: p.x * INNER_SCALE, z: p.z * INNER_SCALE })));

  const innerY = isApex ? eave.apexY : eave.y + (eave.rise ?? EAVE_RISE[eave.index] ?? 2.8);

  const positions = [];
  const uvs = [];
  const indices = [];

  // 每个面：沿面参数 u（0..1），坡向参数 t（0..1）
  const faceSamples = [];
  for (let f = 0; f < 8; f++) {
    const eA = E[f];
    const eB = E[(f + 1) % 8];
    const iA = isApex ? null : innerRing[f];
    const iB = isApex ? null : innerRing[(f + 1) % 8];

    const grid = [];
    for (let si = 0; si <= segs; si++) {
      const u = si / segs;
      // 檐口点（含角端起翘）
      const ex = eA.x + (eB.x - eA.x) * u;
      const ez = eA.z + (eB.z - eA.z) * u;
      const upturn = EST.roof.eaveUpturnMax * Math.pow(Math.abs(2 * u - 1), EST.roof.eaveCurvePower);
      const eaveY = eave.y + upturn;

      // 内端点
      let ix, iz, iy;
      if (isApex) {
        // 攒尖顶收于「宝顶平台」而非数学尖点，铁刹与砖仰莲座立于其上
        const k = (eave.apexPlatformRadius ?? 1.45) / circumradiusOf(P);
        ix = ex * k;
        iz = ez * k;
        iy = eave.apexY;
      } else {
        ix = iA.x + (iB.x - iA.x) * u;
        iz = iA.z + (iB.z - iA.z) * u;
        iy = innerY;
      }

      const row = [];
      for (let ti = 0; ti <= rings; ti++) {
        const t = ti / rings;
        const x = ex + (ix - ex) * t;
        const z = ez + (iz - ez) * t;
        // 举折
        const f01 = 0.62 * t + 0.38 * t * t;
        let y = eaveY + (iy - eaveY) * f01;
        y += 0.03 * Math.sin(Math.PI * t);   // 轻微破除数学曲率
        // 内端也随角部微抬，避免收口塌陷
        if (!isApex) y += upturn * 0.25 * t;
        row.push({ x, y, z, u, t });
      }
      grid.push(row);
    }
    faceSamples.push(grid);
  }

  // 拼面：共享角点（每个面的 u=0 与前一面的 u=1 相同位置）
  const ringIndex = [];
  for (let f = 0; f < 8; f++) {
    const grid = faceSamples[f];
    const idx = [];
    for (let si = 0; si <= segs; si++) {
      const row = [];
      for (let ti = 0; ti <= rings; ti++) {
        const p = grid[si][ti];
        // 角点复用：u=0 且 f>0 → 与上一面 u=1 同一顶点
        const isCornerStart = si === 0 && f > 0;
        if (isCornerStart) {
          row.push(ringIndex[f - 1][segs][ti]);
          continue;
        }
        positions.push(p.x, p.y, p.z);
        // UV 占位，稍后按瓦宽 / 瓦长统一重算
        uvs.push(0, 0);
        row.push(positions.length / 3 - 1);
      }
      idx.push(row);
    }
    ringIndex.push(idx);
  }

  // 重算 UV：u = 沿面累计长度 / 瓦宽，v = 坡向累计长度 / 瓦长
  {
    let faceOffset = 0;
    for (let f = 0; f < 8; f++) {
      const grid = faceSamples[f];
      for (let si = 0; si <= segs; si++) {
        for (let ti = 0; ti <= rings; ti++) {
          const p = grid[si][ti];
          // 沿面弧长（近似）
          const a = grid[si][0];
          const along = Math.hypot(p.x - a.x, p.z - a.z);
          // 坡向弧长
          const b = grid[0][ti];
          const up = Math.hypot(p.x - b.x, p.y - b.y, p.z - b.z);
          const vi = ringIndex[f][si][ti];
          uvs[vi * 2] = (faceOffset + along) / (EST.tile.tileWidth * 2);
          uvs[vi * 2 + 1] = up / EST.tile.tileLength;
        }
      }
      faceOffset += 0;
    }
  }

  // 建索引（绕序使法线朝上 —— 屋面是朝上的曲面，绕反会让整片屋顶失去受光）
  for (let f = 0; f < 8; f++) {
    const idx = ringIndex[f];
    for (let si = 0; si < segs; si++) {
      for (let ti = 0; ti < rings; ti++) {
        const a = idx[si][ti];
        const b = idx[si + 1][ti];
        const c = idx[si + 1][ti + 1];
        const d = idx[si][ti + 1];
        indices.push(a, c, b, a, d, c);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  return { geometry: geo, eaveRing: E, innerRing, innerY, faceSamples };
}

/**
 * 八条垂脊：从檐口角点沿屋面曲线的角线到内端（攒尖则到顶点）。
 */
export function buildRidges(eave, surface) {
  const geos = [];
  const { eaveRing: E, innerRing, faceSamples } = surface;

  for (let k = 0; k < 8; k++) {
    // 角线：面 k-1 的 u=1 与面 k 的 u=0 的平均
    const path = [];
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const pPrev = faceSamples[(k + 7) % 8][surface.segs][Math.round(t * surface.rings)];
      const pNext = faceSamples[k][0][Math.round(t * surface.rings)];
      const x = (pPrev.x + pNext.x) / 2;
      const y = (pPrev.y + pNext.y) / 2;
      const z = (pPrev.z + pNext.z) / 2;
      path.push(new THREE.Vector3(x, y, z));
    }
    // 沿路径生成脊身
    for (let s = 0; s < path.length - 1; s++) {
      const a = path[s];
      const b = path[s + 1];
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      if (len < 1e-4) continue;
      const geo = new THREE.BoxGeometry(len, 0.26, 0.34);
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(1, 0, 0), dir.clone().normalize()
      );
      geo.applyQuaternion(quat);
      geo.translate((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.1, (a.z + b.z) / 2);
      geos.push(geo);
    }
  }
  return geos;
}

/**
 * 椽与飞椽：沿坡向的径向构件，自檐口向内。
 */
export function buildRafters(eave, surface, opts = {}) {
  const geos = [];
  const { eaveRing: E, faceSamples } = surface;
  const perFace = opts.perFace ?? 7;
  // 屋面举折是凸曲线，弦线会浮在曲面上方；因此椽按自身采样点下压，
  // 保证始终贴在屋面**之下**（从檐下仰视才看得到，正视时不应穿出瓦面）。
  const DROP = 0.26;

  for (let f = 0; f < 8; f++) {
    const eA = E[f];
    const eB = E[(f + 1) % 8];
    const row = faceSamples[f];
    for (let i = 0; i < perFace; i++) {
      const u = (i + 0.5) / perFace;
      const col = Math.round(u * (row.length - 1));
      const tSteps = 4;
      for (let s = 0; s < tSteps; s++) {
        const i0 = Math.round((s / tSteps) * (row[0].length - 1));
        const i1 = Math.round(((s + 1) / tSteps) * (row[0].length - 1));
        const p0 = row[col][i0];
        const p1 = row[col][i1];
        const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z;
        const len = Math.hypot(dx, dy, dz);
        if (len < 1e-3) continue;
        const geo = new THREE.BoxGeometry(len * 1.02, 0.12, 0.13);
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(1, 0, 0), new THREE.Vector3(dx, dy, dz).normalize()
        );
        geo.applyQuaternion(quat);
        geo.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2 - DROP, (p0.z + p1.z) / 2);
        geos.push(geo);
      }
    }
  }
  return geos;
}

/**
 * 檐口附件：瓦当（圆瓦头）、滴水（垂下的三角）、风铎、角兽。
 */
export function buildEaveOrnaments(eave, surface, opts = {}) {
  const wadang = [];
  const drips = [];
  const bells = [];
  const beasts = [];
  const { eaveRing: E } = surface;
  const density = opts.density ?? 1;

  for (let f = 0; f < 8; f++) {
    const eA = E[f];
    const eB = E[(f + 1) % 8];
    const n = Math.max(6, Math.round(14 * density));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = eA.x + (eB.x - eA.x) * u;
      const z = eA.z + (eB.z - eA.z) * u;
      const upturn = EST.roof.eaveUpturnMax * Math.pow(Math.abs(2 * u - 1), EST.roof.eaveCurvePower);
      const y = eave.y + upturn;
      const disc = new THREE.CylinderGeometry(0.115, 0.115, 0.05, 8);
      disc.rotateX(Math.PI / 2);
      disc.rotateY(-Math.atan2(eB.z - eA.z, eB.x - eA.x));
      disc.translate(x, y - 0.06, z);
      wadang.push(disc);
    }
  }

  // 八角风铎（挂在檐角下方）
  for (let k = 0; k < 8; k++) {
    const p = E[k];
    const bell = new THREE.SphereGeometry(EST.ornament.windBellRadius, 8, 6);
    bell.scale(1, 1.35, 1);
    bell.translate(p.x, eave.y - 0.55, p.z);
    bells.push(bell);
    const stem = new THREE.CylinderGeometry(0.018, 0.018, 0.4, 5);
    stem.translate(p.x, eave.y - 0.28, p.z);
    bells.push(stem);

    // 角兽（抽象示意）
    const beast = new THREE.BoxGeometry(0.24, EST.ornament.beastLength, 0.2);
    beast.rotateX(-0.35);
    beast.translate(p.x, eave.y + 0.16, p.z);
    beasts.push(beast);
    const beastHead = new THREE.SphereGeometry(0.12, 7, 6);
    beastHead.translate(p.x, eave.y + 0.16 + EST.ornament.beastLength * 0.45, p.z);
    beasts.push(beastHead);
  }

  return { wadang, drips, bells, beasts };
}

/**
 * 生成全塔六重屋面。
 * @returns {{roof: THREE.BufferGeometry[], ridge: THREE.BufferGeometry[], rafter: THREE.BufferGeometry[], ornament: object}}
 */
export function buildAllRoofs(structure, opts = {}) {
  const roof = [];
  const ridge = [];
  const rafter = [];
  const ornament = { wadang: [], bells: [], beasts: [] };

  for (const eave of structure.eaves) {
    const surface = buildRoofSurface(eave, opts);
    surface.segs = opts.segmentsPerFace ?? EST.roof.segmentsPerFace;
    surface.rings = opts.ringSegments ?? EST.roof.ringSegments;
    roof.push(surface.geometry);
    ridge.push(...buildRidges(eave, surface));
    if (opts.rafters !== false) rafter.push(...buildRafters(eave, surface, opts));
    const orn = buildEaveOrnaments(eave, surface, opts);
    ornament.wadang.push(...orn.wadang);
    ornament.bells.push(...orn.bells);
    ornament.beasts.push(...orn.beasts);
  }

  return { roof, ridge, rafter, ornament };
}


/**
 * 某一檐的屋面坡度（度）。
 * 水平投影 = 檐口对边距 − 内端对边距；竖直投影 = 内端标高 − 檐口标高。
 * 供测试与调试使用；应用本身不依赖它。
 */
export function eaveSlope(eave) {
  const ringApothem = apothemOfRing(eave.ring);
  const eaveApothem = ringApothem + eave.offset;
  const innerApothem = eave.isApex
    ? 0
    : apothemOfRing(eave.innerRingVertices ?? eave.ring);
  const run = eaveApothem - innerApothem;
  const innerY = eave.isApex ? eave.apexY : eave.y + (eave.rise ?? EAVE_RISE[eave.index] ?? 2.8);
  const rise = innerY - eave.y;
  return {
    run,
    rise,
    degrees: (Math.atan2(rise, run) * 180) / Math.PI
  };
}

/** 环的外接圆半径 */
function circumradiusOf(ring) {
  const e = octagonEdges(ring);
  return Math.hypot(e[0].a.x, e[0].a.z);
}

/** 环的对边距（由边长反算） */
function apothemOfRing(ring) {
  const e = octagonEdges(ring);
  return Math.hypot(e[0].mid.x, e[0].mid.z);
}
