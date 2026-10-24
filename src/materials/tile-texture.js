/**
 * src/materials/tile-texture.js
 *
 * 黛色筒瓦 / 板瓦的程序化贴图。
 *
 * 一个 UV 单位 = 两件瓦的宽度（1 筒瓦 + 1 板瓦）。
 * 屋面 UV：u = 沿面累计长度 / (2 × 瓦宽)，v = 坡向累计长度 / 瓦长。
 */

import * as THREE from 'three';

const TILE_CANVAS = 512;

/** 确定性伪随机（与 wood 模块一致的思路，但独立种子） */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 生成瓦面贴图（同时给出粗糙度贴图）。
 * @returns {{map: THREE.Texture, roughnessMap: THREE.Texture, normalMap: THREE.Texture}}
 */
export function makeTileTexture({ seed = 4091, size = TILE_CANVAS } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = rng(seed);

  // 底：深黛色
  ctx.fillStyle = '#3B4245';
  ctx.fillRect(0, 0, size, size);

  // 横向：左半为板瓦（平），右半为筒瓦（半圆凸起）
  const half = size / 2;

  // 板瓦区：微微下凹的平面 + 横向瓦垄（沿 v 方向即坡向）
  const panGrad = ctx.createLinearGradient(0, 0, half, 0);
  panGrad.addColorStop(0, '#2F3639');
  panGrad.addColorStop(0.5, '#3D4548');
  panGrad.addColorStop(1, '#2F3639');
  ctx.fillStyle = panGrad;
  ctx.fillRect(0, 0, half, size);

  // 筒瓦区：半圆柱高光
  const cylGrad = ctx.createLinearGradient(half, 0, size, 0);
  cylGrad.addColorStop(0, '#2B3235');
  cylGrad.addColorStop(0.22, '#394145');
  cylGrad.addColorStop(0.5, '#4A545A');
  cylGrad.addColorStop(0.78, '#394145');
  cylGrad.addColorStop(1, '#2B3235');
  ctx.fillStyle = cylGrad;
  ctx.fillRect(half, 0, half, size);

  // 沿坡向（v）的瓦缝：每隔一段横向压暗
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    const y = (r + 0.94) * (size / rows);
    ctx.fillStyle = 'rgba(12,16,18,0.5)';
    ctx.fillRect(0, y, size, size / rows * 0.06);
    ctx.fillStyle = 'rgba(120,132,138,0.10)';
    ctx.fillRect(0, y + size / rows * 0.06, size, size / rows * 0.02);
  }

  // 随机旧化斑
  for (let i = 0; i < 900; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 5;
    const a = rand() * 0.05;
    ctx.fillStyle = rand() > 0.5 ? `rgba(150,158,158,${a})` : `rgba(18,22,24,${a * 1.6})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  map.needsUpdate = true;

  // 粗糙度：筒瓦略亮（釉面反光有限）
  const rc = document.createElement('canvas');
  rc.width = size;
  rc.height = size;
  const rctx = rc.getContext('2d');
  rctx.fillStyle = '#D6D6D6';
  rctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#B4B4B4';
  rctx.fillRect(half, 0, half, size);
  for (let r = 0; r < rows; r++) {
    rctx.fillStyle = 'rgba(255,255,255,0.35)';
    rctx.fillRect(0, (r + 0.94) * (size / rows), size, size / rows * 0.06);
  }
  const roughnessMap = new THREE.CanvasTexture(rc);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = 4;
  roughnessMap.needsUpdate = true;

  return { map, roughnessMap };
}

/** 由瓦贴图生成瓦材质 */
export function makeRoofTileMaterial({ color = 0xffffff, roughness = 0.83, metalness = 0 } = {}) {
  const { map, roughnessMap } = makeTileTexture();
  return new THREE.MeshStandardMaterial({
    map,
    roughnessMap,
    color,
    roughness,
    metalness,
    side: THREE.DoubleSide
  });
}

/** 释放瓦贴图 */
export function disposeTileMaterial(material) {
  if (!material) return;
  material.map?.dispose();
  material.roughnessMap?.dispose();
  material.dispose();
}
