/**
 * src/render/quality.js
 *
 * 画质档位与自动降级。
 *
 * 规划 §3.3：
 *   高档   DPR ≤ 1.75、shadow 2048、SSAO 半分辨率 + SMAA、draw calls < 450
 *   主流   DPR ≤ 1.35、shadow 1024、关 SSAO、draw calls < 300
 *   低端   DPR ≤ 1.0（可 0.7）、关阴影与后期、斗栱 LOD2、draw calls < 130
 *   自动降级：交互中持续 10 s 的 P95 > 30 ms 降一档，> 50 ms 直接到低端；
 *             回升需连续 20 s P95 < 阈值 × 0.75，且避免频繁切换。
 *   **预算是工程目标，不是已实测保证。**
 */

export const QUALITY_PROFILES = Object.freeze({
  high: Object.freeze({
    key: 'high', label: '高',
    dpr: 1.75, shadowMap: 2048, shadows: true, ssao: true, smaa: true,
    rafterDensity: 1, tileDensity: 1, targetDrawCalls: 450, targetTriangles: 1_200_000
  }),
  standard: Object.freeze({
    key: 'standard', label: '中',
    dpr: 1.35, shadowMap: 1024, shadows: true, ssao: false, smaa: false,
    rafterDensity: 0.6, tileDensity: 0.7, targetDrawCalls: 300, targetTriangles: 450_000
  }),
  low: Object.freeze({
    key: 'low', label: '低',
    dpr: 1.0, shadowMap: 0, shadows: false, ssao: false, smaa: false,
    rafterDensity: 0.3, tileDensity: 0.4, targetDrawCalls: 130, targetTriangles: 120_000
  }),
  safe: Object.freeze({
    key: 'safe', label: '极简',
    dpr: 0.7, shadowMap: 0, shadows: false, ssao: false, smaa: false,
    rafterDensity: 0, tileDensity: 0.2, targetDrawCalls: 60, targetTriangles: 60_000
  })
});

export const QUALITY_ORDER = Object.freeze(['high', 'standard', 'low', 'safe']);

/**
 * 创建画质管理器。
 * @param {object} deps { renderer, lighting, composer, onChange }
 */
export function createQualityManager(deps) {
  const { renderer, lighting, composer, onChange } = deps;
  let current = 'auto';
  let resolved = 'high';
  let autoEnabled = true;

  // 自动降级状态机
  let badSince = 0;
  let goodSince = 0;
  let lastSwitch = 0;

  const THRESHOLD_DOWN = 30;   // ms
  const THRESHOLD_LOW = 50;    // ms
  const THRESHOLD_UP = 0.75;   // 回升系数
  const WINDOW_MS = 10_000;
  const RECOVER_MS = 20_000;

  function applyProfile(key) {
    const p = QUALITY_PROFILES[key] ?? QUALITY_PROFILES.high;
    resolved = key;

    const dpr = Math.min(window.devicePixelRatio || 1, p.dpr);
    renderer.setPixelRatio(dpr);

    renderer.shadowMap.enabled = p.shadows;
    if (lighting?.sun) {
      lighting.sun.castShadow = p.shadows;
      if (p.shadows && p.shadowMap > 0) {
        if (lighting.sun.shadow.mapSize.x !== p.shadowMap) {
          lighting.sun.shadow.mapSize.set(p.shadowMap, p.shadowMap);
          lighting.sun.shadow.map?.dispose();
          lighting.sun.shadow.map = null;
        }
      }
    }
    if (composer?.setEnabled) composer.setEnabled(p.ssao || p.smaa);

    onChange?.(key, p);
    return p;
  }

  return {
    get current() { return current; },
    get resolved() { return resolved; },
    get profile() { return QUALITY_PROFILES[resolved]; },
    profiles: QUALITY_PROFILES,

    /** 手动设置；'auto' 交给自动策略 */
    set(key) {
      current = key;
      if (key === 'auto') {
        autoEnabled = true;
        badSince = 0; goodSince = 0;
        return applyProfile(resolved);
      }
      autoEnabled = false;
      badSince = 0; goodSince = 0;
      return applyProfile(key);
    },

    /**
     * 每帧喂入帧时间样本。
     * @param {number} p95 帧时间 P95（毫秒）
     * @param {number} now  当前时间戳（ms）
     * @param {boolean} interacting 是否处于交互状态
     */
    update(p95, now, interacting) {
      if (!autoEnabled || !interacting || p95 <= 0) return;
      if (now - lastSwitch < 3000) return;      // 避免频繁切换

      if (p95 > THRESHOLD_LOW) {
        badSince = badSince || now;
        goodSince = 0;
        if (now - badSince > WINDOW_MS && resolved !== 'safe') {
          const idx = QUALITY_ORDER.indexOf(resolved);
          const next = QUALITY_ORDER[Math.min(QUALITY_ORDER.length - 1, idx + 1)];
          if (next !== resolved) {
            applyProfile(next);
            lastSwitch = now;
            badSince = 0;
          }
        }
      } else if (p95 > THRESHOLD_DOWN) {
        badSince = badSince || now;
        goodSince = 0;
        if (now - badSince > WINDOW_MS) {
          const idx = QUALITY_ORDER.indexOf(resolved);
          const next = QUALITY_ORDER[Math.min(QUALITY_ORDER.length - 1, idx + 1)];
          if (next !== resolved) {
            applyProfile(next);
            lastSwitch = now;
            badSince = 0;
          }
        }
      } else {
        badSince = 0;
        goodSince = goodSince || now;
        if (now - goodSince > RECOVER_MS) {
          const idx = QUALITY_ORDER.indexOf(resolved);
          const prev = QUALITY_ORDER[Math.max(0, idx - 1)];
          if (prev !== resolved) {
            applyProfile(prev);
            lastSwitch = now;
            goodSince = 0;
          }
        }
      }
    },

    applyProfile
  };
}
