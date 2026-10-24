/**
 * src/materials/sky.js
 *
 * 天空 / 地面 / 背景 —— 应县木塔（佛宫寺释迦塔）实时 3D 复原。
 *
 * 依据 handoff/sflipcloop/plan.md §2.3 与 §4.5：
 *   · 白昼背景 #D6D7D2、远雾 #C7CBC6；冷灰白天空 + 淡雾 + 极低彩度院墙轮廓；
 *   · 不下载任何 HDRI，全部贴图运行时由 canvas 生成。
 *
 * 贴图约定：
 *   · makeSkyTexture 产出的是「屏幕空间竖直渐变」，可直接赋给 scene.background；
 *   · makeBackdropMesh 产出的是「世界空间渐变球」（地平线落在 y = 0 的赤道），
 *     用于相机大幅俯仰时地平线仍贴地；
 *   · 两者都用 flipY = true 的 canvas，故画布第 0 行 = 贴图 v = 1 = 顶部。
 */

import * as THREE from 'three';

/** 白昼天空色（plan §2.3 设计量尺） */
export const SKY_PALETTE = Object.freeze({
  top: 0xD6D7D2,
  horizon: 0xC7CBC6,
  bottom: 0xB9BCB6,
  ground: 0x8A8A80
});

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

/** 确定性格点哈希 → [0,1)（与其它材质模块同一套确定性做法） */
function hash2(ix, iy, seed) {
  let h = (seed ^ Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 二维值噪声（周期 period 上无缝） */
function valueNoise2D(x, y, seed, period) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const wrap = (v) => ((v % period) + period) % period;
  const xa = wrap(x0);
  const xb = wrap(x0 + 1);
  const ya = wrap(y0);
  const yb = wrap(y0 + 1);
  return lerp(
    lerp(hash2(xa, ya, seed), hash2(xb, ya, seed), ux),
    lerp(hash2(xa, yb, seed), hash2(xb, yb, seed), ux),
    uy
  );
}

/** 线性插值两个 sRGB 十六进制色，返回 [r,g,b]（0..1，已做 sRGB 空间插值） */
function hexToRgb(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

function paintCanvas(width, height, rgba) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    throw new Error('天空贴图需要浏览器环境（document.createElement("canvas")）');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法取得 2D 绘图上下文');
  const image = ctx.createImageData(width, height);
  image.data.set(rgba);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function makeTexture(canvas, { srgb = true, anisotropy = 8 } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = anisotropy;
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 天空渐变贴图：竖直渐变 + 轻微地平雾带。
 *
 * @param {object} [opts]
 * @param {number} [opts.top=0xD6D7D2] 顶部（天顶）色
 * @param {number} [opts.horizon=0xC7CBC6] 地平（远雾）色
 * @param {number} [opts.bottom=0xB9BCB6] 底部（地面雾）色
 * @param {number} [opts.height=512] 贴图高度（像素），宽度固定为 8（纯竖直渐变）
 * @returns {THREE.CanvasTexture} colorSpace = THREE.SRGBColorSpace
 */
export function makeSkyTexture({
  top = 0xD6D7D2,
  horizon = 0xC7CBC6,
  bottom = 0xB9BCB6,
  height = 512
} = {}) {
  const width = 8;
  const rgbTop = hexToRgb(top);
  const rgbHorizon = hexToRgb(horizon);
  const rgbBottom = hexToRgb(bottom);

  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    // t: 0 = 贴图底部 (v=0)，1 = 贴图顶部 (v=1)
    const t = 1 - (y + 0.5) / height;
    let rgb;
    if (t >= 0.5) {
      // 地平线以上：horizon → top
      rgb = [
        lerp(rgbHorizon[0], rgbTop[0], (t - 0.5) * 2),
        lerp(rgbHorizon[1], rgbTop[1], (t - 0.5) * 2),
        lerp(rgbHorizon[2], rgbTop[2], (t - 0.5) * 2)
      ];
    } else {
      // 地平线以下：bottom → horizon
      rgb = [
        lerp(rgbBottom[0], rgbHorizon[0], t * 2),
        lerp(rgbBottom[1], rgbHorizon[1], t * 2),
        lerp(rgbBottom[2], rgbHorizon[2], t * 2)
      ];
    }
    // 轻微地平雾带：以地平线为中心的高斯亮带
    const band = Math.exp(-((t - 0.5) * (t - 0.5)) / (2 * 0.055 * 0.055));
    const o = y * width * 4;
    for (let x = 0; x < width; x++) {
      const p = o + x * 4;
      data[p] = Math.round(clamp01(rgb[0] + band * 0.012) * 255);
      data[p + 1] = Math.round(clamp01(rgb[1] + band * 0.012) * 255);
      data[p + 2] = Math.round(clamp01(rgb[2] + band * 0.012) * 255);
      data[p + 3] = 255;
    }
  }

  return makeTexture(paintCanvas(width, height, data), { srgb: true });
}

/**
 * 地面材质（院落地坪）。极低彩度、极粗糙；贴图只做大尺度斑驳，
 * 即使被拉伸到整个院子尺度也不会失真。
 *
 * @param {object} [opts]
 * @param {number} [opts.color=0x8A8A80]
 * @param {number} [opts.roughness=0.98]
 * @param {number} [opts.metalness=0]
 * @returns {THREE.MeshStandardMaterial}
 */
export function makeGroundMaterial({ color = 0x8A8A80, roughness = 0.98, metalness = 0 } = {}) {
  const size = 256;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      // 三个尺度的斑驳：地块色差 + 粗颗粒 + 细颗粒
      const broad = valueNoise2D(u * 6, v * 6, 20261025, 6);
      const mid = valueNoise2D(u * 18, v * 18, 20261025 + 7, 18);
      const fine = valueNoise2D(u * 64, v * 64, 20261025 + 13, 64);
      const dev = (broad - 0.5) * 0.045 + (mid - 0.5) * 0.018 + (fine - 0.5) * 0.008;
      const value = clamp01(0.955 + dev);
      const o = (y * size + x) * 4;
      data[o] = Math.round(clamp01(value + 0.004) * 255);
      data[o + 1] = Math.round(value * 255);
      data[o + 2] = Math.round(clamp01(value - 0.006) * 255);
      data[o + 3] = 255;
    }
  }

  const map = makeTexture(paintCanvas(size, size, data), { srgb: true });
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    map
  });
  // 供调用方按院子实际尺寸设置 material.map.repeat
  material.userData.textureRepeatHint = '按院子米数 / 4 设置 map.repeat（贴图周期约 4 m）';
  return material;
}

/**
 * 背景用的纯色 / 渐变场景背景（不依赖贴图时用）。
 *
 * 内表面朝外的渐变球，地平线落在 y = 0 的赤道；相机在球内，
 * 俯仰时地平线仍然贴地，适合大幅俯视 / 仰视。
 *
 * @param {object} [opts]
 * @param {number} [opts.radius=240] 球半径（米），应小于相机 far
 * @param {number} [opts.top=0xD6D7D2] 天顶色
 * @param {number} [opts.bottom=0xC7CBC6] 地平以下色
 * @returns {THREE.Mesh}
 */
export function makeBackdropMesh({ radius = 240, top = 0xD6D7D2, bottom = 0xC7CBC6 } = {}) {
  const height = 256;
  const width = 8;
  const rgbTop = hexToRgb(top);
  const rgbBottom = hexToRgb(bottom);

  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const t = 1 - (y + 0.5) / height;          // 0 = 底，1 = 顶
    const r = lerp(rgbBottom[0], rgbTop[0], t);
    const g = lerp(rgbBottom[1], rgbTop[1], t);
    const b = lerp(rgbBottom[2], rgbTop[2], t);
    const o = y * width * 4;
    for (let x = 0; x < width; x++) {
      const p = o + x * 4;
      data[p] = Math.round(r * 255);
      data[p + 1] = Math.round(g * 255);
      data[p + 2] = Math.round(b * 255);
      data[p + 3] = 255;
    }
  }

  const texture = makeTexture(paintCanvas(width, height, data), { srgb: true });
  const geometry = new THREE.SphereGeometry(radius, 32, 16);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'backdrop';
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.userData.dispose = () => {
    texture.dispose();
    geometry.dispose();
    material.dispose();
  };
  return mesh;
}

// ── 释放 ──────────────────────────────────────────────────────────────

const TEXTURE_SLOTS = ['map', 'normalMap', 'roughnessMap', 'aoMap', 'bumpMap', 'alphaMap', 'emissiveMap', 'metalnessMap', 'envMap'];

/**
 * 释放材质、几何与贴图。
 * 可传入：材质、Mesh、{ map, normalMap, roughnessMap } 贴图组、贴图本身。
 */
export function disposeMaterialSet(...targets) {
  const seen = new Set();
  const flat = [];
  const collect = (t) => {
    if (!t) return;
    if (Array.isArray(t)) t.forEach(collect);
    else flat.push(t);
  };
  targets.forEach(collect);

  const disposeTexture = (t) => {
    if (t && t.isTexture && !seen.has(t)) {
      seen.add(t);
      t.dispose();
    }
  };

  for (const target of flat) {
    if (!target || typeof target !== 'object') continue;
    if (target.isMaterial) {
      if (seen.has(target)) continue;
      seen.add(target);
      TEXTURE_SLOTS.forEach((slot) => disposeTexture(target[slot]));
      target.dispose();
    } else if (target.isTexture) {
      disposeTexture(target);
    } else if (target.isMesh) {
      if (typeof target.userData.dispose === 'function') target.userData.dispose();
      else {
        disposeTexture(target.material && target.material.map);
        if (target.material) target.material.dispose();
        if (target.geometry) target.geometry.dispose();
      }
    } else {
      disposeTexture(target.map);
      disposeTexture(target.normalMap);
      disposeTexture(target.roughnessMap);
    }
  }
}
