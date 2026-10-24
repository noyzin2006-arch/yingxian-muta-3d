/**
 * src/materials/glaze.js
 *
 * 琉璃 / 瓦 / 铁 / 金 / 彩画材质 —— 应县木塔（佛宫寺释迦塔）实时 3D 复原。
 *
 * 依据 handoff/sflipcloop/plan.md §4.5：
 *   · 黛色筒瓦 roughness .83 metalness 0，细微蓝黑渐变；
 *   · 琉璃脊饰（局部）metalness .06 roughness .38，釉质反光有限；
 *   · 佛像 matte golden earthy，roughness .57、metalness .1，谨慎局部贴金亮面；
 *   · 彩画只在枋心/斗栱点缀赭红 + 黛绿 + 暗金，不把整塔变成宫廷朱红。
 *
 * 这些材质都不需要强反射：metalness 全部 ≤ 0.55，roughness 全部 ≥ 0.38，
 * 并靠程序化的微起伏法线与近白色调制贴图消除「塑料感」。
 *
 * 贴图约定：色图接近白（中心 0.955），只做明暗/色差调制，色调交给 material.color。
 * 全部随机来自固定 seed 的 mulberry32，禁止 Math.random()。
 */

import * as THREE from 'three';

/** plan §2.3 设计量尺中的相关色值，便于几何层取用 */
export const GLAZE_PALETTE = Object.freeze({
  tile: 0x3B4245,        // 黛瓦
  glaze: 0x6E7F74,       // 琉璃（赭绿偏灰）
  glazeDark: 0x486153,   // 彩画黛绿
  iron: 0x4A4A48,        // 铁件
  gold: 0xB39A65,        // 佛像金
  goldDark: 0x99805C,    // 暗金
  painted: 0x803D33      // 彩画朱红
});

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// ── 确定性随机与噪声（纯函数） ────────────────────────────────────────

function hash2(ix, iy, seed) {
  let h = (seed ^ Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 周期值噪声（period 为整数时无缝） */
function valueNoise2D(x, y, seed, periodX, periodY) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const wrap = (v, p) => (p > 0 ? ((v % p) + p) % p : v);
  const xa = wrap(x0, periodX);
  const xb = wrap(x0 + 1, periodX);
  const ya = wrap(y0, periodY);
  const yb = wrap(y0 + 1, periodY);
  return lerp(
    lerp(hash2(xa, ya, seed), hash2(xb, ya, seed), ux),
    lerp(hash2(xa, yb, seed), hash2(xb, yb, seed), ux),
    uy
  );
}

/** 分形噪声（周期版） */
function fbm2D(x, y, octaves, seed, periodX, periodY) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(x * freq, y * freq, seed + i * 1013, periodX * freq, periodY * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// ── 表面贴图生成 ──────────────────────────────────────────────────────

const TEX_SIZE = 256;
const BASE_VALUE = 0.955;

/**
 * 通用表面贴图生成器。
 * @param {(u:number, v:number) => {h:number, dev:number, rough:number}} sample
 *        h = 高度（米，正值凸起）；dev = 明暗调制；rough = 粗糙度因子（乘到材质 roughness 上）
 * @returns {{map: THREE.Texture, normalMap: THREE.Texture, roughnessMap: THREE.Texture}}
 */
function buildSurfaceMaps(sample, { size = TEX_SIZE, anisotropy = 8 } = {}) {
  const colorData = new Uint8ClampedArray(size * size * 4);
  const normalData = new Uint8ClampedArray(size * size * 4);
  const roughData = new Uint8ClampedArray(size * size * 4);
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const s = sample(u, v);
      const i = y * size + x;
      const o = i * 4;
      height[i] = s.h;
      const value = clamp01(BASE_VALUE + s.dev);
      colorData[o] = Math.round(clamp01(value + 0.003) * 255);
      colorData[o + 1] = Math.round(value * 255);
      colorData[o + 2] = Math.round(clamp01(value - 0.004) * 255);
      colorData[o + 3] = 255;
      const rb = Math.round(clamp01(s.rough) * 255);
      roughData[o] = rb;
      roughData[o + 1] = rb;
      roughData[o + 2] = rb;
      roughData[o + 3] = 255;
    }
  }

  // 法线：高度单位为米，按贴图边长折算坡度
  const texelM = 1 / size;
  const at = (x, y) => height[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) / (2 * texelM);
      const dy = (at(x, y + 1) - at(x, y - 1)) / (2 * texelM);
      let nx = -dx;
      let ny = -dy;        // flipY：正切空间绿通道 = +∂h/∂v
      const nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv;
      ny *= inv;
      const o = (y * size + x) * 4;
      normalData[o] = Math.round((nx * 0.5 + 0.5) * 255);
      normalData[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normalData[o + 2] = Math.round((nz * inv * 0.5 + 0.5) * 255);
      normalData[o + 3] = 255;
    }
  }

  return {
    map: makeTexture(paintCanvas(size, size, colorData), { srgb: true, anisotropy }),
    normalMap: makeTexture(paintCanvas(size, size, normalData), { srgb: false, anisotropy }),
    roughnessMap: makeTexture(paintCanvas(size, size, roughData), { srgb: false, anisotropy })
  };
}

// ── DOM 装配 ──────────────────────────────────────────────────────────

function paintCanvas(width, height, rgba) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    throw new Error('材质贴图需要浏览器环境（document.createElement("canvas")）');
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

function makeTexture(canvas, { srgb = false, anisotropy = 8 } = {}) {
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

/** 贴图缓存：同一类材质只生成一次 */
const cache = new Map();

function getSurfaceMaps(kind, sample) {
  if (cache.has(kind)) return cache.get(kind);
  const maps = buildSurfaceMaps(sample);
  cache.set(kind, maps);
  return maps;
}

function buildMaterial(maps, { color, roughness, metalness, normalScale, envMapIntensity }) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    map: maps.map,
    normalMap: maps.normalMap,
    roughnessMap: maps.roughnessMap
  });
  material.normalScale = new THREE.Vector2(normalScale, normalScale);
  if (typeof envMapIntensity === 'number') material.envMapIntensity = envMapIntensity;
  return material;
}

// ── 对外接口 ──────────────────────────────────────────────────────────

/**
 * 琉璃（脊饰局部用）。釉质反光有限：metalness 0.06 近绝缘体，roughness 0.38。
 * @param {object} [opts]
 * @param {number} [opts.color=0x6E7F74]
 * @param {number} [opts.roughness=0.38]
 * @param {number} [opts.metalness=0.06]
 */
export function makeGlazeMaterial({ color = 0x6E7F74, roughness = 0.38, metalness = 0.06 } = {}) {
  const maps = getSurfaceMaps('glaze', (u, v) => {
    const mottle = fbm2D(u * 4, v * 4, 3, 20261025 + 5, 4, 4);
    const crazeField = fbm2D(u * 9, v * 9, 3, 20261025 + 9, 9, 9);
    const craze = Math.exp(-((crazeField - 0.5) * (crazeField - 0.5)) / (2 * 0.018 * 0.018));
    const h = (mottle - 0.5) * 0.0008 - craze * 0.0004;
    const dev = (mottle - 0.5) * 0.04 - craze * 0.028;
    const rough = 0.94 + 0.06 * mottle;
    return { h, dev, rough };
  });
  return buildMaterial(maps, { color, roughness, metalness, normalScale: 0.45 });
}

/**
 * 黛色筒瓦。细微蓝黑渐变（沿 V；屋面 UV 顺坡向下时由浅到深）。
 * @param {object} [opts]
 * @param {number} [opts.color=0x3B4245]
 * @param {number} [opts.roughness=0.83]
 * @param {number} [opts.metalness=0]
 */
export function makeTileMaterial({ color = 0x3B4245, roughness = 0.83, metalness = 0 } = {}) {
  const maps = getSurfaceMaps('tile', (u, v) => {
    const grain = fbm2D(u * 24, v * 24, 3, 20261025 + 13, 24, 24);
    const mottle = fbm2D(u * 6, v * 6, 2, 20261025 + 17, 6, 6);
    const h = (grain - 0.5) * 0.0006 + (mottle - 0.5) * 0.0004;
    const dev = (v - 0.5) * 0.05 + (grain - 0.5) * 0.024 + (mottle - 0.5) * 0.016;
    const rough = 0.95 + 0.05 * grain;
    return { h, dev, rough };
  });
  return buildMaterial(maps, { color, roughness, metalness, normalScale: 0.5 });
}

/**
 * 铁件（刹杆、链条、角铁）。看得出是金属但不是镜面。
 * @param {object} [opts]
 * @param {number} [opts.color=0x4A4A48]
 * @param {number} [opts.roughness=0.55]
 * @param {number} [opts.metalness=0.55]
 */
export function makeIronMaterial({ color = 0x4A4A48, roughness = 0.55, metalness = 0.55 } = {}) {
  const maps = getSurfaceMaps('iron', (u, v) => {
    const cast = fbm2D(u * 20, v * 20, 3, 20261025 + 23, 20, 20);
    const pit = smoothstep(0.72, 0.88, cast);
    const hammer = fbm2D(u * 12, v * 12, 2, 20261025 + 29, 12, 12);
    const h = -pit * 0.0011 + (hammer - 0.5) * 0.0006;
    const dev = -pit * 0.05 + (hammer - 0.5) * 0.03;
    const rough = 0.9 + 0.1 * cast;
    return { h, dev, rough };
  });
  return buildMaterial(maps, { color, roughness, metalness, normalScale: 0.65 });
}

/**
 * 暗金 / 佛像金。earthy matte golden：metalness 仅 0.1，靠微斑与暗金化表现陈旧。
 * @param {object} [opts]
 * @param {number} [opts.color=0xB39A65]
 * @param {number} [opts.roughness=0.57]
 * @param {number} [opts.metalness=0.1]
 */
export function makeGoldMaterial({ color = 0xB39A65, roughness = 0.57, metalness = 0.1 } = {}) {
  const maps = getSurfaceMaps('gold', (u, v) => {
    const tarnish = fbm2D(u * 6, v * 6, 3, 20261025 + 31, 6, 6);
    const fine = fbm2D(u * 28, v * 28, 2, 20261025 + 37, 28, 28);
    const h = (fine - 0.5) * 0.0004 + (tarnish - 0.5) * 0.0005;
    const dev = (tarnish - 0.5) * 0.055 + (fine - 0.5) * 0.018;
    const rough = 0.92 + 0.08 * tarnish;
    return { h, dev, rough };
  });
  return buildMaterial(maps, { color, roughness, metalness, normalScale: 0.4 });
}

/**
 * 彩画（枋心 / 斗栱点饰）。陈旧颜料：笔触条痕 + 不匀，不是塑料。
 * @param {object} [opts]
 * @param {number} [opts.color=0x803D33]
 * @param {number} [opts.roughness=0.7]
 * @param {number} [opts.metalness=0]
 */
export function makePaintedWoodMaterial({ color = 0x803D33, roughness = 0.7, metalness = 0 } = {}) {
  const maps = getSurfaceMaps('painted', (u, v) => {
    const stroke = fbm2D(u * 4, v * 56, 2, 20261025 + 41, 4, 56);
    const wear = fbm2D(u * 8, v * 8, 3, 20261025 + 43, 8, 8);
    const h = (stroke - 0.5) * 0.0005 + (wear - 0.5) * 0.0003;
    const dev = (stroke - 0.5) * 0.045 + (wear - 0.5) * 0.03;
    const rough = 0.92 + 0.08 * wear;
    return { h, dev, rough };
  });
  return buildMaterial(maps, { color, roughness, metalness, normalScale: 0.45 });
}

// ── 释放 ──────────────────────────────────────────────────────────────

const TEXTURE_SLOTS = ['map', 'normalMap', 'roughnessMap', 'aoMap', 'bumpMap', 'alphaMap', 'emissiveMap', 'metalnessMap', 'envMap'];

/**
 * 释放材质与贴图，并清空模块内缓存。
 * 可传入：材质、材质数组、{ map, normalMap, roughnessMap } 贴图组、贴图本身。
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
    } else {
      disposeTexture(target.map);
      disposeTexture(target.normalMap);
      disposeTexture(target.roughnessMap);
    }
  }

  for (const maps of cache.values()) {
    disposeTexture(maps.map);
    disposeTexture(maps.normalMap);
    disposeTexture(maps.roughnessMap);
  }
  cache.clear();
}
