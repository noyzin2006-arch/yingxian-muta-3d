/**
 * src/geometry/balustrade.js
 *
 * 平座与勾栏。
 *
 * 二层以上每层都有平座栏杆，形成回廊（《营造法式》平座钩栏做法）。
 * 本项目按 L05 的「平座、塔身、塔檐三层水平线条重叠」来组织：
 * 平座面 → 望柱 → 扶手 → 栏板，形成一条清晰水平线。
 *
 * 尺寸全部为 ESTIMATE（M37）：望柱高 1.15 m、截面 0.15 m；
 * 栏板高 0.72 m、厚 0.07 m；每面 4–6 跨。
 */

import * as THREE from 'three';
import { octagonEdges, offsetPolygon } from './math-octagon.js';
import { EST } from '../data/structure.js';

/**
 * 造一层平座栏杆。
 *
 * @param {object} structure
 * @param {number} levelIndex 2..5
 * @returns {{rail: THREE.BufferGeometry[], post: THREE.BufferGeometry[], deck: THREE.BufferGeometry[]}}
 */
export function buildBalustrade(structure, levelIndex, opts = {}) {
  const rail = [];
  const post = [];
  const deck = [];
  const lv = structure.levels[levelIndex - 1];
  if (!lv || !lv.balustrade) return { rail, post, deck };
  const builtCorners = opts.builtCorners ?? new Set();

  const B = EST.balustrade;
  const width = lv.balustrade.width;
  const y = lv.band.y0;

  // 平座台面：柱线外扩 width 的八角环
  const outline = offsetPolygon(lv.outer.vertices, width);
  const edges = octagonEdges(outline.map((p) => ({ ...p, y })));

  // 台面（中间留出塔身空洞：用八角环做成 8 块梯形板）
  edges.forEach((e) => {
    const ax = e.a.x, az = e.a.z, bx = e.b.x, bz = e.b.z;
    const len = Math.hypot(bx - ax, bz - az);
    const geo = new THREE.BoxGeometry(len, 0.16, width);
    geo.rotateY(-Math.atan2(bz - az, bx - ax));
    geo.translate((ax + bx) / 2, y + 0.08, (az + bz) / 2);
    deck.push(geo);
  });

  edges.forEach((e) => {
    const ax = e.a.x, az = e.a.z, bx = e.b.x, bz = e.b.z;
    const len = Math.hypot(bx - ax, bz - az);
    const angle = -Math.atan2(bz - az, bx - ax);

    // 上下横枋
    [y + B.postHeight - 0.07, y + B.railBottom].forEach((ry) => {
      const geo = new THREE.BoxGeometry(len, B.railTop, 0.1);
      geo.rotateY(angle);
      geo.translate((ax + bx) / 2, ry, (az + bz) / 2);
      rail.push(geo);
    });

    // 望柱：每面两端各一根（角柱共享）
    const n = B.postsPerFace;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      // 角柱只造一次
      const isCorner = (i === 0 || i === n);
      if (isCorner) {
        const key = `${px.toFixed(3)}_${pz.toFixed(3)}`;
        if (builtCorners.has(key)) continue;
        builtCorners.add(key);
      }
      const p = new THREE.BoxGeometry(B.postSection, B.postHeight, B.postSection);
      p.translate(px, y + B.postHeight / 2, pz);
      post.push(p);
      // 素头
      const cap = new THREE.BoxGeometry(B.postSection * 1.25, 0.08, B.postSection * 1.25);
      cap.translate(px, y + B.postHeight + 0.04, pz);
      post.push(cap);
    }

    // 竖棂
    const balusters = Math.max(2, Math.round(n * 1.6));
    for (let i = 0; i < balusters; i++) {
      const t = (i + 0.5) / balusters;
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      const geo = new THREE.BoxGeometry(0.05, B.balusterHeight, 0.05);
      geo.rotateY(angle);
      geo.translate(px, y + B.balusterHeight / 2 + 0.06, pz);
      rail.push(geo);
    }
    // 中间栏板
    const panelLen = Math.max(0.1, len / balusters - 0.14);
    for (let i = 0; i < balusters; i++) {
      const t = (i + 0.5) / balusters;
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      const geo = new THREE.BoxGeometry(panelLen, B.balusterHeight * 0.55, B.balusterThickness);
      geo.rotateY(angle);
      geo.translate(px, y + B.balusterHeight * 0.42, pz);
      rail.push(geo);
    }
  });

  return { rail, post, deck };
}

/** 逐层生成全部栏杆 */
export function buildAllBalustrades(structure) {
  const rail = [];
  const post = [];
  const deck = [];
  const builtCorners = new Set();
  for (let i = 2; i <= 5; i++) {
    const r = buildBalustrade(structure, i, { builtCorners });
    rail.push(...r.rail);
    post.push(...r.post);
    deck.push(...r.deck);
  }
  return { rail, post, deck };
}
