/**
 * src/materials/stone.js
 *
 * 程序化石材 / 砖 / 灰泥材质 —— 应县木塔（佛宫寺释迦塔）实时 3D 复原。
 *
 * 依据 handoff/sflipcloop/plan.md §4.5：
 *   · 石基/砖 roughness 0.9–1.0，带 0.03–0.06 细微色差；
 *   · 砖缝深 0.015 m 的暗示（材质以法线贴图 + 缝内压暗表现）；
 *   · 禁止大片玻璃感 / 亮塑料感 → metalness 一律 0，roughness 贴近 1。
 *
 * 贴图约定：色图接近白，只做明暗与色差调制，色调交给 material.color。
 *   · 石材：整石（方整石材）砌缝，贴图周期 STONE_TILE_M = 2.4 m；
 *   · 砖  ：错缝顺砌，贴图周期 BRICK_TILE_M = 1.2 m；
 *   · 灰泥：抹面，无砌缝。
 * 调用方应按构件实际米数换算 repeat = 面宽米数 / 贴图周期米数。
 *
 * 全部随机来自固定 seed 的 mulberry32，禁止 Math.random()；
 * 噪声为纯函数、不依赖 DOM。
 */

import * as THREE from 'three';

/** 石材贴图周期（米）：一个贴图周期覆盖的墙面实际尺寸 */
export const STONE_TILE_M = 2.4;
/** 砖贴图周期（米） */
export const BRICK_TILE_M = 1.2;
/** 灰泥贴图周期（米） */
export const PLASTER_TILE_M = 1.0;
/** 砌缝深度（米）—— 与几何层约定的真实缝深，材质只做暗示 */
export const JOINT_DEPTH_M = 0.015;

/** 石材 / 砖的细微色差幅（sRGB 归一化），plan 要求 0.03–0.06 */
export const STONE_COLOR_AMPLITUDE = 0.05;

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

/** 周期值噪声：在 periodX/periodY 上无缝，可直接 RepeatWrapping */
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
  const n00 = hash2(xa, ya, seed);
  const n10 = hash2(xb, ya, seed);
  const n01 = hash2(xa, yb, seed);
  const n11 = hash2(xb, yb, seed);
  return lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uy);
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

// ── 砌体图案 ──────────────────────────────────────────────────────────

/**
 * 砖 / 石的错缝图案参数。
 * @param {number} u 横向 0..1
 * @param {number} v 纵向 0..1
 */
function masonryCell(u, v, cols, rows, alternateOffset) {
  const row = Math.floor(v * rows);
  const offset = alternateOffset ? (row % 2) * 0.5 : 0;
  const scaled = u * cols + offset;
  const col = Math.floor(scaled);
  const uLocal = scaled - col;
  const vLocal = v * rows - row;
  return { row, col, uLocal, vLocal };
}

/**
 * 砌缝距离场：返回到最近砌缝中心线的距离（米）与所属砌块序号。
 * 砌缝以「面宽方向的两道缝 + 一道横缝」求最小距离。
 * 缝底做成平底（内侧 35% 半宽内保持满深），既像真实灰缝，
 * 也保证贴图采样能取到 JOINT_DEPTH_M 的满深。
 */
function masonryJoints(cell, blockW, blockH, jointHalfWidth) {
  const du = Math.min(cell.uLocal, 1 - cell.uLocal) * blockW;
  const dv = Math.min(cell.vLocal, 1 - cell.vLocal) * blockH;
  const dist = Math.min(du, dv);
  return {
    dist,
    inJoint: dist < jointHalfWidth,
    recess: JOINT_DEPTH_M * (1 - smoothstep(jointHalfWidth * 0.35, jointHalfWidth, dist))
  };
}

// ── 贴图生成 ──────────────────────────────────────────────────────────

const TEX_SIZE = 512;

/**
 * 生成一套砌体贴图（色图 + 法线 + 粗糙度）。
 * @param {object} opts
 * @param {number} opts.tileM 贴图周期（米）
 * @param {number} opts.cols 横向砌块数
 * @param {number} opts.rows 纵向砌块数
 * @param {number} opts.jointHalfWidth 砌缝半宽（米）
 * @param {boolean} opts.alternateOffset 是否错缝
 * @param {number} opts.seed
 * @param {number} opts.size 贴图边长（像素）
 */
export function buildMasonryTextures({
  tileM = STONE_TILE_M,
  cols = 4,
  rows = 4,
  jointHalfWidth = 0.0175,
  alternateOffset = true,
  seed = 20261025,
  size = TEX_SIZE,
  blockOffsetAmp = 0.014,
  mottleAmp = 0.008,
  fineAmp = 0.003,
  surfaceAmp = 0.0005
} = {}) {
  const colorData = new Uint8ClampedArray(size * size * 4);
  const normalData = new Uint8ClampedArray(size * size * 4);
  const roughData = new Uint8ClampedArray(size * size * 4);
  const jointMask = new Uint8Array(size * size);
  const height = new Float32Array(size * size);

  const blockW = tileM / cols;
  const blockH = tileM / rows;
  const texelM = tileM / size;
  const base = 0.955;                       // 接近白，色调由 material.color 给
  const fineFreq = Math.max(8, Math.round(48 / (tileM / 1.2)));
  const mottleFreq = Math.max(2, Math.round(6 / (tileM / 1.2)));

  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;

      const cell = masonryCell(u, v, cols, rows, alternateOffset);
      const joint = masonryJoints(cell, blockW, blockH, jointHalfWidth);

      // 每块石头 / 每片砖各自的固定色偏（相邻块差异落在 0.03–0.06 区间）
      const blockKey = hash2(((cell.col % cols) + cols) % cols, cell.row, seed);
      const blockOffset = (blockKey - 0.5) * 2 * blockOffsetAmp;

      const mottle = (fbm2D(u * mottleFreq, v * mottleFreq, 3, seed + 31, mottleFreq, mottleFreq) - 0.5) * 2 * mottleAmp;
      const fine = (fbm2D(u * fineFreq, v * fineFreq, 2, seed + 57, fineFreq, fineFreq) - 0.5) * 2 * fineAmp;
      const surface = (fbm2D(u * fineFreq * 3, v * fineFreq * 3, 2, seed + 73, fineFreq * 3, fineFreq * 3) - 0.5) * 2 * surfaceAmp;

      // 缝内压暗（作为 0.015 m 缝深的视觉暗示；缝色另计，不计入表面色差幅）
      const jointShade = joint.inJoint ? -0.045 * (1 - joint.dist / jointHalfWidth) : 0;

      const dev = blockOffset + mottle + fine + jointShade;
      const value = clamp01(base + dev);

      const i = y * size + x;
      const o = i * 4;
      colorData[o] = Math.round(clamp01(value + 0.004) * 255);
      colorData[o + 1] = Math.round(value * 255);
      colorData[o + 2] = Math.round(clamp01(value - 0.006) * 255);
      colorData[o + 3] = 255;

      // 高度场（米）：砌缝下凹 JOINT_DEPTH_M，表面有极细颗粒
      height[i] = -joint.recess + surface;
      jointMask[i] = joint.inJoint ? 1 : 0;

      // 粗糙度：缝更粗糙（1.0），砌块面稍低 → 整体哑光，绝不玻璃感
      const r = joint.inJoint ? 1.0 : 0.94 + 0.06 * mottle;
      const rb = Math.round(clamp01(r) * 255);
      roughData[o] = rb;
      roughData[o + 1] = rb;
      roughData[o + 2] = rb;
      roughData[o + 3] = 255;
    }
  }

  // 法线：高度场单位是米，差分也按米 → 坡度无量纲
  const at = (x, y) => height[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) / (2 * texelM);
      const dy = (at(x, y + 1) - at(x, y - 1)) / (2 * texelM);
      let nx = -dx;
      let ny = -dy;         // flipY：v 增大 = canvas 行号减小 → 正切空间绿通道 = +∂h/∂v：v 增大 = canvas 行号减小 → +∂h/∂v = −∂h/行
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

  return { colorData, normalData, roughData, jointMask, height, size };
}

// ── DOM 装配 ──────────────────────────────────────────────────────────

function paintCanvas(width, height, rgba) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    throw new Error('砌体贴图需要浏览器环境（document.createElement("canvas")）');
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

function textureTriple(raw) {
  const { colorData, normalData, roughData, size } = raw;
  return {
    map: makeTexture(paintCanvas(size, size, colorData), { srgb: true }),
    normalMap: makeTexture(paintCanvas(size, size, normalData), { srgb: false }),
    roughnessMap: makeTexture(paintCanvas(size, size, roughData), { srgb: false })
  };
}

/** 贴图缓存：同一套砌体贴图只生成一次，多个材质共享 */
const cache = new Map();

function getTextures(kind) {
  if (cache.has(kind)) return cache.get(kind);
  let raw;
  if (kind === 'stone') {
    raw = buildMasonryTextures({
      tileM: STONE_TILE_M,
      cols: 4,
      rows: 4,
      jointHalfWidth: 0.0175,     // 缝宽 35 mm，为容纳 15 mm 缝深
      alternateOffset: true,
      seed: 20261025,
      blockOffsetAmp: 0.014,
      mottleAmp: 0.008,
      fineAmp: 0.003,
      surfaceAmp: 0.0005
    });
  } else if (kind === 'brick') {
    raw = buildMasonryTextures({
      tileM: BRICK_TILE_M,
      cols: 4,
      rows: 8,
      jointHalfWidth: 0.015,      // 缝宽 30 mm，为容纳 15 mm 缝深
      alternateOffset: true,
      seed: 20261025,
      blockOffsetAmp: 0.014,
      mottleAmp: 0.007,
      fineAmp: 0.003,
      surfaceAmp: 0.00035
    });
  } else {
    raw = buildMasonryTextures({
      tileM: PLASTER_TILE_M,
      cols: 1,
      rows: 1,
      jointHalfWidth: 0.0001,     // 无砌缝
      alternateOffset: false,
      seed: 20261025,
      blockOffsetAmp: 0.0,
      mottleAmp: 0.012,
      fineAmp: 0.004,
      surfaceAmp: 0.00025,
      size: 256
    });
  }
  const triple = textureTriple(raw);
  cache.set(kind, triple);
  return triple;
}

function applyRepeat(texture, repeat) {
  if (!texture) return;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.needsUpdate = true;
}

function buildMaterial(textureSet, { color, roughness, metalness, repeat, normalScale }) {
  const needOwnRepeat = repeat[0] !== 1 || repeat[1] !== 1;
  // clone 共享 Source → GPU 上仍是同一张贴图，只有 uv 变换不同
  const map = needOwnRepeat ? textureSet.map.clone() : textureSet.map;
  const normalMap = needOwnRepeat ? textureSet.normalMap.clone() : textureSet.normalMap;
  const roughnessMap = needOwnRepeat ? textureSet.roughnessMap.clone() : textureSet.roughnessMap;
  applyRepeat(map, repeat);
  applyRepeat(normalMap, repeat);
  applyRepeat(roughnessMap, repeat);

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    map,
    normalMap,
    roughnessMap
  });
  material.normalScale = new THREE.Vector2(normalScale, normalScale);
  return material;
}

// ── 对外接口 ──────────────────────────────────────────────────────────

/**
 * 石材（台基、须弥座）材质。
 * @param {object} [opts]
 * @param {number} [opts.color=0xA6A298]
 * @param {number} [opts.roughness=0.95]
 * @param {number} [opts.metalness=0]
 * @param {[number, number]} [opts.repeat=[1,1]] 贴图重复；建议 = 面宽米数 / STONE_TILE_M
 */
export function makeStoneMaterial({ color = 0xA6A298, roughness = 0.95, metalness = 0, repeat = [1, 1] } = {}) {
  return buildMaterial(getTextures('stone'), { color, roughness, metalness, repeat, normalScale: 0.8 });
}

/**
 * 砖材质。砖缝以法线贴图暗示 0.015 m 深度（真实缝深由几何层负责）。
 * @param {object} [opts]
 * @param {number} [opts.color=0x77746E]
 * @param {number} [opts.roughness=0.92]
 * @param {number} [opts.metalness=0]
 * @param {[number, number]} [opts.repeat=[1,1]] 贴图重复；建议 = 面宽米数 / BRICK_TILE_M
 */
export function makeBrickMaterial({ color = 0x77746E, roughness = 0.92, metalness = 0, repeat = [1, 1] } = {}) {
  return buildMaterial(getTextures('brick'), { color, roughness, metalness, repeat, normalScale: 0.7 });
}

/**
 * 灰泥 / 白灰抹面材质（塔身墙面、院墙）。
 * @param {object} [opts]
 * @param {number} [opts.color=0xCFC9BC]
 * @param {number} [opts.roughness=0.96]
 * @param {number} [opts.metalness=0]
 */
export function makePlasterMaterial({ color = 0xCFC9BC, roughness = 0.96, metalness = 0 } = {}) {
  return buildMaterial(getTextures('plaster'), {
    color,
    roughness,
    metalness,
    repeat: [1, 1],
    normalScale: 0.45
  });
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

  for (const triple of cache.values()) {
    disposeTexture(triple.map);
    disposeTexture(triple.normalMap);
    disposeTexture(triple.roughnessMap);
  }
  cache.clear();
}
