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
import { offsetPolygon } from './math-octagon.js';

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
      // 注意：makeXianglun 生成的是从 y=0 起算的局部几何，必须平移到当前段标高，
      // 否则相轮会掉到地面（这会让塔刹看起来「飘在空中」）。
      const rings = makeXianglun(seg.radius, seg.height, seg.rings);
      rings.forEach((g) => g.translate(0, y, 0));
      iron.push(...rings);
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

  // ── 八条铁链：自宝顶平台的覆钵底，斜向八条垂脊下端
  //
  // 依据朔州地方志「刹下砖砌莲台式基座，8 条铁链系于戗脊下端」。
  //
  // 关键：链必须**沿垂脊的举折曲线**走，并在两端真正接住构件——
  //   下端 = 垂脊末端（攒尖顶的檐角），上端 = 宝顶平台上的覆钵底。
  // 若把下端悬在半空（早期实现取半径 10.2 m、y = 刹座下 1.55 m），
  // 链就成了掠过屋面的悬丝，远看像「塔冠飘在空中」。
  {
    const apexEave = structure.eaves.find((e) => e.isApex);
    if (apexEave) {
      const E = offsetPolygon(apexEave.ring, apexEave.offset);   // 檐口环（8 个角）
      const platformR = apexEave.apexPlatformRadius ?? 1.45;     // 宝顶平台半径
      const apexY = apexEave.apexY;
      const upturn = EST.roof.eaveUpturnMax;                     // 角部起翘
      const STEPS = 8;

      for (let k = 0; k < F.chains; k++) {
        const corner = E[k];                                     // 垂脊下端（檐角）
        const eaveCornerY = apexEave.y + upturn;
        const inner = new THREE.Vector3(corner.x, apexY, corner.z);
        const scale = platformR / (Math.hypot(corner.x, corner.z) || 1);
        const top = new THREE.Vector3(corner.x * scale, apexY, corner.z * scale);

        // 沿举折曲线（f01 = 0.62t + 0.38t²，与屋面同一条剖面）逐段生成细链
        let prev = null;
        for (let s = 0; s <= STEPS; s++) {
          const t = s / STEPS;
          const f01 = 0.62 * t + 0.38 * t * t;
          const x = corner.x + (top.x - corner.x) * t;
          const z = corner.z + (top.z - corner.z) * t;
          const ySurface = eaveCornerY + (apexY - eaveCornerY) * f01 + 0.03 * Math.sin(Math.PI * t);
          // 贴脊：下端坐在垂脊脊身上（脊身顶面 ≈ 曲面 +0.23），上端收到覆钵底
          const lift = 0.25 * (1 - t) + 0.02 * t;
          const p = new THREE.Vector3(x, ySurface + lift, z);
          if (prev) {
            const dir = new THREE.Vector3().subVectors(p, prev);
            const len = dir.length();
            if (len > 1e-4) {
              const g = new THREE.CylinderGeometry(0.014, 0.014, len, 5);
              const quat = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 1, 0), dir.clone().normalize()
              );
              g.applyQuaternion(quat);
              g.translate(
                (prev.x + p.x) / 2, (prev.y + p.y) / 2, (prev.z + p.z) / 2
              );
              iron.push(g);
            }
          }
          prev = p;
        }
        void inner;
      }
    }
  }

  return { iron, brick };
}

/** 塔刹顶标高（自检用） */
export function finialTop(structure) {
  return structure.finial.y0 + structure.finial.segments.reduce((s, g) => s + g.height, 0);
}
