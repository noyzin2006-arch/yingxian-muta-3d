/**
 * src/materials/wood.js
 *
 * 程序化木材材质 —— 应县木塔（佛宫寺释迦塔）实时 3D 复原。
 *
 * 依据 handoff/sflipcloop/plan.md §4.5：
 *   · MeshStandardMaterial，roughness 0.78–0.93、metalness 0、base #47362D；
 *   · 程序 CanvasTexture(256×1024)，连续纵向木纹，粒度 ≤ 0.045 色差幅，
 *     fbm/分形噪声 + 沿纹理方向低频条纹 + 节点附近微扰，4 种可复现变体；
 *   · 手写 normal / roughness 贴图；
 *   · mipmap + anisotropy ≤ 8，色域贴图 SRGB、法线/粗糙度保持 Linear；
 *   · 木纹朝构件长方向投影，避免横向「斑马纹」。
 *
 * 纹理方向约定（plan §4.5「木纹朝梁/柱长方向投影」）：
 *   贴图的 **U 轴即纹理方向**，也就是构件长度方向。
 *   贴图尺寸 256(U) × 1024(V)，因此：
 *     · U = 顺纹方向（构件长度），一个贴图周期 = WOOD_GRAIN.tileLengthM 米木料；
 *     · V = 垂直纹方向（构件截面），一个贴图周期 = WOOD_GRAIN.tileWidthM 米木料。
 *   orientGrain() 负责把构件 UV 重投影到这套约定上。
 *
 * 全部随机来自固定 seed 的 mulberry32，**禁止 Math.random()**；
 * 数值噪声为纯函数、不依赖 DOM，node --test 可直接验证。
 */

import * as THREE from 'three';

/** 木色板（plan §2.3 设计量尺） */
export const WOOD_PALETTE = Object.freeze({
  base: 0x47362D,      // 主色 旧木深棕偏灰
  variant: 0x6A5040,   // 次色
  weathered: 0x7B7165,  // 风化面
  deepEave: 0x261F1B    // 深檐内
});

/** 木纹贴图的物理约定与生成参数 */
export const WOOD_GRAIN = Object.freeze({
  /** U（顺纹 / 构件长度）方向一个贴图周期对应的木料长度（m） */
  tileLengthM: 3.0,
  /** V（垂直纹 / 构件截面）方向一个贴图周期对应的木料宽度（m） */
  tileWidthM: 0.5,
  /** 贴图中心值（sRGB 归一化）：接近白，只做明暗调制，色调交给 material.color */
  baseValue: 0.95,
  /** 色差幅上限（sRGB 归一化），plan §4.5 要求 ≤ 0.045 */
  colorAmplitude: 0.045,
  /** 节疤沿顺纹方向的拉伸倍率（年轮绕疤弯折） */
  knotElongation: 3.0
});

const TAU = Math.PI * 2;

// ── 确定性随机与噪声（纯函数，无 DOM 依赖） ──────────────────────────────

/**
 * mulberry32 —— 32 位确定性 PRNG。
 * @param {number} seed
 * @returns {() => number} 返回 [0,1) 的伪随机数
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 整数格点哈希 → [0,1) */
function hash2(ix, iy, seed) {
  let h = (seed ^ Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * 二维值噪声。
 * @param {number} x
 * @param {number} y
 * @param {number} [seed]
 * @param {number} [periodX] 格点周期（>0 时噪声在该周期上无缝，可用于 RepeatWrapping）
 * @param {number} [periodY]
 * @returns {number} [0,1)
 */
export function valueNoise2D(x, y, seed = 1, periodX = 0, periodY = 0) {
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

/**
 * 分形噪声（fbm）。传入整数 periodX/periodY 时结果在该周期上无缝。
 * @returns {number} 归一化到 [0,1]
 */
export function fbm2D(x, y, { octaves = 3, lacunarity = 2, gain = 0.5, seed = 1, periodX = 0, periodY = 0 } = {}) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(
      x * freq, y * freq,
      seed + i * 1013,
      periodX > 0 ? periodX * freq : 0,
      periodY > 0 ? periodY * freq : 0
    );
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

// ── 木纹图案生成（纯函数，返回像素缓冲） ────────────────────────────────

/**
 * 生成一个变体的木纹像素场（无 DOM，可在 node 下直接测试）。
 *
 * 算法：
 *   1. 年轮带：跨纹方向（V）上的周期带，phase = sv·ringCount；
 *   2. 低频条纹：沿纹方向（U）缓慢变化的 fbm 扭曲年轮相位 → 纹理不呆板；
 *   3. 节点微扰：节疤附近年轮绕心弯折（极坐标 cos 偏置）+ 芯部压暗；
 *   4. 顺纹细纤维：高频跨纹、低频顺纹的 fbm → 纤维顺着构件长度走；
 *   5. 中等纹条 + 大尺度旧化斑（patina），后者同时驱动粗糙度贴图。
 *
 * @returns {{ colorData: Uint8ClampedArray, heightData: Float32Array, roughData: Float32Array }}
 */
export function buildWoodVariantPixels({ seed = 20261025, variant = 0, width = 256, height = 1024 } = {}) {
  const vs = (seed + variant * 7919 + 1013) >>> 0;
  const rnd = mulberry32(vs);

  const ringCount = 15 + Math.floor(rnd() * 4);      // 15–18 道年轮带（整数 → V 方向无缝）
  const knotCount = 1 + Math.floor(rnd() * 2);       // 1–2 个节疤
  const knots = [];
  for (let k = 0; k < knotCount; k++) {
    knots.push({
      u: rnd(),
      v: 0.12 + rnd() * 0.76,
      r: 0.05 + rnd() * 0.07,                        // 半径（贴图宽度为单位 → 约 25–60 mm）
      s: 0.7 + rnd() * 0.5                           // 影响强度
    });
  }
  // 每个变体一点极轻的色偏，既能互相区分，又不破坏「旧木」的低饱和
  const tint = [(rnd() - 0.5) * 0.012, (rnd() - 0.5) * 0.010, (rnd() - 0.5) * 0.012];

  const colorData = new Uint8ClampedArray(width * height * 4);
  const heightData = new Float32Array(width * height);
  const roughData = new Float32Array(width * height);

  const amp = WOOD_GRAIN.colorAmplitude;
  // 变体色偏与 8bit 量化误差也计入色差幅预算，故主调制留出余量
  const tintAbs = Math.max(Math.abs(tint[0]), Math.abs(tint[1]), Math.abs(tint[2]));
  const devLimit = Math.max(0, amp - tintAbs - 0.002);

  for (let y = 0; y < height; y++) {
    const sv = (y + 0.5) / height;
    for (let x = 0; x < width; x++) {
      const su = (x + 0.5) / width;

      // 年轮相位 + 低频扭曲（沿纹方向缓慢变化）
      let phase = sv * ringCount
        + (fbm2D(su * 3, sv * 2, { octaves: 3, seed: vs + 11, periodX: 3, periodY: 2 }) - 0.5) * 1.15;

      // 节疤：年轮绕疤弯折 + 芯部压暗（环面距离，保证贴图可无缝平铺）
      let core = 0;
      for (let k = 0; k < knots.length; k++) {
        const kn = knots[k];
        let du = su - kn.u;
        du -= Math.round(du);
        let dv = sv - kn.v;
        dv -= Math.round(dv);
        const dx = du * WOOD_GRAIN.knotElongation;
        const dy = dv;
        const d2 = dx * dx + dy * dy;
        const sigma2 = 2 * kn.r * kn.r * 2.4;
        const infl = Math.exp(-d2 / sigma2);
        if (infl > 0.003) {
          phase += infl * kn.s * 0.85 * Math.cos(Math.atan2(dy, dx));
          core += infl * infl * kn.s;
        }
      }
      if (core > 1) core = 1;

      const bands = 0.5 + 0.5 * Math.sin(phase * TAU);
      const late = bands * bands * bands * bands;                     // 晚材窄暗带
      const fiber = fbm2D(su * 4, sv * 128, { octaves: 2, seed: vs + 29, periodX: 4, periodY: 128 });
      const streak = fbm2D(su * 6, sv * 32, { octaves: 2, seed: vs + 47, periodX: 6, periodY: 32 });
      const patina = fbm2D(su * 2, sv * 3, { octaves: 2, seed: vs + 61, periodX: 2, periodY: 3 });

      // 高度场（供法线贴图）
      const h = clamp01(
        0.5
        + 0.38 * (late - 0.25)
        + 0.22 * (fiber - 0.5)
        + 0.14 * (streak - 0.5)
        - 0.18 * core
      );

      // 色差幅严格控制在 plan 要求的 ±0.045 内（含变体色偏与 8bit 量化误差）；
      // 正负两侧对称，让早晚材都可见（bands 对称，late 为窄暗带补充）
      let dev = (0.40 * (bands - 0.5) + 0.24 * (fiber - 0.5) + 0.16 * (streak - 0.5)) * 0.115
        + (late - 0.27) * 0.028
        + (patina - 0.5) * 0.012
        - core * 0.016;
      if (dev > devLimit) dev = devLimit;
      else if (dev < -devLimit) dev = -devLimit;

      const i = y * width + x;
      const o = i * 4;
      colorData[o] = Math.round(clamp01(WOOD_GRAIN.baseValue + dev + tint[0]) * 255);
      colorData[o + 1] = Math.round(clamp01(WOOD_GRAIN.baseValue + dev + tint[1]) * 255);
      colorData[o + 2] = Math.round(clamp01(WOOD_GRAIN.baseValue + dev + tint[2]) * 255);
      colorData[o + 3] = 255;

      heightData[i] = h;
      // 粗糙度只做低频起伏（plan 风险表：低频波动 + roughness），避免「条形塑料」
      roughData[i] = 0.92 + 0.08 * patina;
    }
  }

  return { colorData, heightData, roughData };
}

/**
 * 由高度场生成法线贴图像素（线性空间，不做 sRGB 编码）。
 * 注意约定：贴图 flipY = true，故 v 增大 = canvas 行号减小，
 * 法线绿通道取 +∂h/∂v = −∂h/行（OpenGL 切线空间约定）。
 */
export function buildWoodNormalPixels(heightData, width, height, strength = 2.0) {
  const data = new Uint8ClampedArray(width * height * 4);
  const at = (x, y) => heightData[(((y % height) + height) % height) * width + (((x % width) + width) % width)];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5;
      let nx = -dx * strength;
      let ny = -dy * strength;      // = +∂h/∂v
      const nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv;
      ny *= inv;
      const o = (y * width + x) * 4;
      data[o] = Math.round((nx * 0.5 + 0.5) * 255);
      data[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[o + 2] = Math.round((nz * inv * 0.5 + 0.5) * 255);
      data[o + 3] = 255;
    }
  }
  return data;
}

// ── DOM 贴图装配 ────────────────────────────────────────────────────────

function createCanvas(width, height) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    throw new Error('木纹贴图需要浏览器环境（document.createElement("canvas")）');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function paintCanvas(width, height, rgba) {
  const canvas = createCanvas(width, height);
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

/**
 * 生成 4 种可复现（固定 seed）的程序木纹贴图。
 * 纵向连续木纹：fbm/分形噪声 + 沿纹理方向的低频条纹 + 节点附近微扰。
 * 纹理方向 = U 轴；构件长度方向应与 U 对应（见 plan §4.5）。
 *
 * @param {object} [options]
 * @param {number} [options.seed=20261025] 固定种子；同种子必然产出同一批贴图
 * @param {number} [options.width=256] U（顺纹 / 长度）方向像素数
 * @param {number} [options.height=1024] V（垂直纹 / 截面）方向像素数
 * @param {number} [options.anisotropy=8] 各向异性过滤上限
 * @returns {{ colorMaps: THREE.Texture[], normalMap: THREE.Texture, roughnessMap: THREE.Texture }}
 */
export function makeWoodTextureSet({ seed = 20261025, width = 256, height = 1024, anisotropy = 8 } = {}) {
  const colorMaps = [];
  let baseHeight = null;
  let baseRough = null;

  for (let variant = 0; variant < 4; variant++) {
    const { colorData, heightData, roughData } = buildWoodVariantPixels({ seed, variant, width, height });
    if (variant === 0) {
      baseHeight = heightData;
      baseRough = roughData;
    }
    colorMaps.push(makeTexture(paintCanvas(width, height, colorData), { srgb: true, anisotropy }));
  }

  const normalMap = makeTexture(
    paintCanvas(width, height, buildWoodNormalPixels(baseHeight, width, height)),
    { srgb: false, anisotropy }
  );

  // 粗糙度贴图只需灰度，三个通道同值（three.js 取绿通道）
  const roughBytes = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = Math.round(baseRough[i] * 255);
    roughBytes[i * 4] = v;
    roughBytes[i * 4 + 1] = v;
    roughBytes[i * 4 + 2] = v;
    roughBytes[i * 4 + 3] = 255;
  }
  const roughnessMap = makeTexture(paintCanvas(width, height, roughBytes), { srgb: false, anisotropy });

  const set = {
    colorMaps,
    normalMap,
    roughnessMap,
    seed,
    width,
    height,
    dispose() {
      colorMaps.forEach((t) => t.dispose());
      normalMap.dispose();
      roughnessMap.dispose();
    }
  };
  return set;
}

/**
 * 木材质。colorMaps[variant] 提供纹理；color 做整体色调。
 * 计划要求 roughness 0.78–0.93、metalness 0。
 *
 * @param {{ colorMaps: THREE.Texture[], normalMap: THREE.Texture, roughnessMap: THREE.Texture }} textureSet
 * @param {object} [options]
 * @param {number} [options.color=WOOD_PALETTE.base]
 * @param {number} [options.roughness=0.86]
 * @param {number} [options.metalness=0]
 * @param {number} [options.variant=0] 使用第几种木纹变体
 * @param {[number, number]} [options.repeat=[1,1]] 贴图重复；非 [1,1] 时会克隆贴图以免互相影响
 */
export function makeWoodMaterial(textureSet, {
  color = WOOD_PALETTE.base,
  roughness = 0.86,
  metalness = 0,
  variant = 0,
  repeat = [1, 1]
} = {}) {
  const maps = textureSet && Array.isArray(textureSet.colorMaps) ? textureSet.colorMaps : [];
  const src = maps.length ? maps[((variant % maps.length) + maps.length) % maps.length] : null;

  const repeatU = Array.isArray(repeat) ? repeat[0] : 1;
  const repeatV = Array.isArray(repeat) ? repeat[1] : 1;
  const needsOwnRepeat = repeatU !== 1 || repeatV !== 1;

  // 克隆共享 Source —— GPU 上仍是同一张贴图，只有 uv 变换（repeat）不同
  const map = src ? (needsOwnRepeat ? src.clone() : src) : null;
  const normalMap = textureSet && textureSet.normalMap
    ? (needsOwnRepeat ? textureSet.normalMap.clone() : textureSet.normalMap)
    : null;
  const roughnessMap = textureSet && textureSet.roughnessMap
    ? (needsOwnRepeat ? textureSet.roughnessMap.clone() : textureSet.roughnessMap)
    : null;

  for (const t of [map, normalMap, roughnessMap]) {
    if (!t) continue;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatU, repeatV);
    t.needsUpdate = true;
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    map,
    normalMap,
    roughnessMap
  });
  if (normalMap) material.normalScale = new THREE.Vector2(0.7, 0.7);
  material.userData.variant = variant;
  return material;
}

/**
 * 让木纹沿着构件长度方向走。构件用 BoxGeometry 时，UV 默认并非沿长轴。
 *
 * 做法：逐三角形把 UV 重投影到「U = 长度轴、V = 面内另一轴」的米制坐标系，
 * 再按 WOOD_GRAIN 的贴图周期归一。端面（法线与长度轴平行）无顺纹方向，
 * 退化为取面内跨度最大的世界轴作 U。
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {'x'|'y'|'z'} lengthAxis 构件长度轴
 * @param {number} [scale] 纹理重复倍率（按构件尺寸归一）
 * @returns {THREE.BufferGeometry} 原 geometry，便于链式调用
 */
export function orientGrain(geometry, lengthAxis = 'y', scale = 1) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) {
    throw new Error('orientGrain: 需要带 position 属性的 BufferGeometry');
  }
  const axis = String(lengthAxis).toLowerCase();
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : axis === 'z' ? 2 : -1;
  if (axisIndex < 0) throw new Error(`orientGrain: 未知长度轴 "${lengthAxis}"（应为 x / y / z）`);

  const pos = geometry.attributes.position;
  let uvAttr = geometry.attributes.uv;
  if (!uvAttr) {
    uvAttr = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    geometry.setAttribute('uv', uvAttr);
  }
  const uv = uvAttr.array;

  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const origin = new THREE.Vector3(
    (bb.min.x + bb.max.x) * 0.5,
    (bb.min.y + bb.max.y) * 0.5,
    (bb.min.z + bb.max.z) * 0.5
  );

  const lengthVec = new THREE.Vector3();
  lengthVec.setComponent(axisIndex, 1);

  const index = geometry.index;
  const triCount = index ? index.count / 3 : pos.count / 3;

  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const n = new THREE.Vector3();
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  for (let t = 0; t < triCount; t++) {
    const a = index ? index.getX(t * 3) : t * 3;
    const b = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const c = index ? index.getX(t * 3 + 2) : t * 3 + 2;

    p0.fromBufferAttribute(pos, a);
    p1.fromBufferAttribute(pos, b);
    p2.fromBufferAttribute(pos, c);
    e1.subVectors(p1, p0);
    e2.subVectors(p2, p0);
    n.crossVectors(e1, e2);
    if (n.lengthSq() < 1e-12) continue;      // 退化三角形跳过
    n.normalize();

    if (Math.abs(n.dot(lengthVec)) < 0.7) {
      u.copy(lengthVec);                      // 侧面：U 就是构件长度方向
    } else {
      u.set(0, 0, 0);
      const ex = Math.abs(e1.x) + Math.abs(e2.x);
      const ey = Math.abs(e1.y) + Math.abs(e2.y);
      const ez = Math.abs(e1.z) + Math.abs(e2.z);
      if (ex >= ey && ex >= ez) u.set(1, 0, 0);
      else if (ey >= ez) u.set(0, 1, 0);
      else u.set(0, 0, 1);
      u.addScaledVector(n, -u.dot(n));         // 正交化
      if (u.lengthSq() < 1e-9) {
        u.set(1, 0, 0).addScaledVector(n, -n.x);
        if (u.lengthSq() < 1e-9) u.set(0, 1, 0).addScaledVector(n, -n.y);
      }
      u.normalize();
    }
    v.crossVectors(n, u).normalize();

    const ids = [a, b, c];
    for (let k = 0; k < 3; k++) {
      const i = ids[k];
      tmp.fromBufferAttribute(pos, i).sub(origin);
      uv[i * 2] = (tmp.dot(u) / WOOD_GRAIN.tileLengthM) * scale;
      uv[i * 2 + 1] = (tmp.dot(v) / WOOD_GRAIN.tileWidthM) * scale;
    }
  }

  uvAttr.needsUpdate = true;
  geometry.userData.grainAxis = axis;
  geometry.userData.grainScale = scale;
  return geometry;
}

// ── 释放 ────────────────────────────────────────────────────────────────

const TEXTURE_SLOTS = ['map', 'normalMap', 'roughnessMap', 'aoMap', 'bumpMap', 'alphaMap', 'emissiveMap', 'metalnessMap', 'envMap'];

/**
 * 释放材质与贴图（plan §4.1 要求 dispose 释放贴图）。
 * 可传入：材质、材质数组、{ colorMaps, normalMap, roughnessMap } 贴图组、贴图本身，任意组合。
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
      if (Array.isArray(target.colorMaps)) target.colorMaps.forEach(disposeTexture);
      disposeTexture(target.normalMap);
      disposeTexture(target.roughnessMap);
      disposeTexture(target.map);
    }
  }
}
