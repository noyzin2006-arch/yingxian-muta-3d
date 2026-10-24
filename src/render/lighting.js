/**
 * src/render/lighting.js
 *
 * 昼夜三态。
 *
 * 依据规划 §4.5 的具体参数：
 *   白昼  天空 #D6D7D2，雾 #C7CBC6，半球光 (0xE4E7E2 / 0x50463B, 2.1)，
 *         太阳 (0xF8EAD2, 3.2) 位于 (-40, 90, 30)，曝光 0.90，雾 120→250
 *   夕照  天空 #DBC6B1，远雾 #C7B3A0，太阳 (0xFFBA75, 2.4) 位于 (-70, 33, 12)，
 *         环境 1.15，曝光 0.94 —— 太阳低角，投影方向须与之一致
 *   夜景  天空 #171F29，环境 (0x5D7083, 0.45)，月光 (0xB8C7DD, 1.1)，曝光 1.02；
 *         只放 2–3 盏可投影的弱暖灯，其余用 emissive 表达，绝不刺眼
 */

import * as THREE from 'three';

export const LIGHT_STATES = Object.freeze({
  day: Object.freeze({
    key: 'day',
    label: '白昼',
    description: '北方冬日的平光，木色最接近原物。',
    sky: 0xD6D7D2,
    fog: 0xC7CBC6,
    fogNear: 120,
    fogFar: 250,
    hemiSky: 0xE4E7E2,
    hemiGround: 0x50463B,
    hemiIntensity: 2.7,
    sunColor: 0xF8EAD2,
    sunIntensity: 3.6,
    sunPosition: Object.freeze([-40, 90, 30]),
    exposure: 1.02,
    lanterns: 0
  }),
  sunset: Object.freeze({
    key: 'sunset',
    label: '夕照',
    description: '低角度暖光，屋面阴影拉长，木纹的深浅变化最明显。',
    sky: 0xDBC6B1,
    fog: 0xC7B3A0,
    fogNear: 90,
    fogFar: 220,
    hemiSky: 0xE8CFB4,
    hemiGround: 0x4A3A2E,
    hemiIntensity: 1.4,
    sunColor: 0xFFBA75,
    sunIntensity: 2.7,
    sunPosition: Object.freeze([-70, 33, 12]),
    exposure: 1.04,
    lanterns: 0
  }),
  night: Object.freeze({
    key: 'night',
    label: '夜景',
    description: '月光为主、灯火极弱；亮部不过曝，暗部仍能看清斗栱。',
    sky: 0x171F29,
    fog: 0x1C2530,
    fogNear: 70,
    fogFar: 190,
    hemiSky: 0x5D7083,
    hemiGround: 0x1A1D22,
    hemiIntensity: 0.58,
    sunColor: 0xB8C7DD,
    sunIntensity: 1.1,
    sunPosition: Object.freeze([-46, 62, -38]),
    exposure: 1.12,
    lanterns: 3
  })
});

const LANTERN_COLOR = 0xE8B97A;

/**
 * 创建灯光系统。
 * @param {THREE.Scene} scene
 * @param {object} opts { shadowSize }
 */
export function createLighting(scene, opts = {}) {
  const shadowSize = opts.shadowSize ?? 2048;

  const hemi = new THREE.HemisphereLight(0xE4E7E2, 0x50463B, 2.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xF8EAD2, 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -38;
  sun.shadow.camera.right = 38;
  sun.shadow.camera.top = 38;
  sun.shadow.camera.bottom = -38;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 260;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(0, 26, 0);

  // 夜景暖灯：只有 3 盏可投影，且强度远弱于塔身轮廓
  const lanterns = [];
  for (let i = 0; i < 3; i++) {
    const l = new THREE.PointLight(LANTERN_COLOR, 0, 9, 2);
    l.position.set(0, 6 + i * 0.0, 0);
    l.visible = false;
    scene.add(l);
    lanterns.push(l);
  }

  let current = LIGHT_STATES.day;
  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();

  function apply(state) {
    scene.background = new THREE.Color(state.sky);
    if (scene.fog) {
      scene.fog.color = new THREE.Color(state.fog);
      scene.fog.near = state.fogNear;
      scene.fog.far = state.fogFar;
    }
    hemi.color.set(state.hemiSky);
    hemi.groundColor.set(state.hemiGround);
    hemi.intensity = state.hemiIntensity;
    sun.color.set(state.sunColor);
    sun.intensity = state.sunIntensity;
    sun.position.set(...state.sunPosition);
    lanterns.forEach((l, i) => {
      l.visible = i < state.lanterns;
      l.intensity = l.visible ? 0.6 : 0;
    });
  }

  apply(current);

  return {
    hemi,
    sun,
    lanterns,
    get current() { return current; },
    /** 立即切换 */
    set(key) {
      current = LIGHT_STATES[key] ?? LIGHT_STATES.day;
      apply(current);
      return current;
    },
    /**
     * 平滑插值到目标光照态。
     * @returns {boolean} 是否仍在过渡中
     */
    lerpTo(key, t) {
      const target = LIGHT_STATES[key] ?? LIGHT_STATES.day;
      const from = current;
      const k = THREE.MathUtils.clamp(t, 0, 1);
      const mix = (a, b) => {
        tmpA.set(a); tmpB.set(b);
        return tmpA.lerp(tmpB, k).getHex();
      };
      const state = {
        ...target,
        sky: mix(from.sky, target.sky),
        fog: mix(from.fog, target.fog),
        fogNear: THREE.MathUtils.lerp(from.fogNear, target.fogNear, k),
        fogFar: THREE.MathUtils.lerp(from.fogFar, target.fogFar, k),
        hemiSky: mix(from.hemiSky, target.hemiSky),
        hemiGround: mix(from.hemiGround, target.hemiGround),
        hemiIntensity: THREE.MathUtils.lerp(from.hemiIntensity, target.hemiIntensity, k),
        sunColor: mix(from.sunColor, target.sunColor),
        sunIntensity: THREE.MathUtils.lerp(from.sunIntensity, target.sunIntensity, k),
        exposure: THREE.MathUtils.lerp(from.exposure, target.exposure, k),
        sunPosition: [
          THREE.MathUtils.lerp(from.sunPosition[0], target.sunPosition[0], k),
          THREE.MathUtils.lerp(from.sunPosition[1], target.sunPosition[1], k),
          THREE.MathUtils.lerp(from.sunPosition[2], target.sunPosition[2], k)
        ],
        lanterns: target.lanterns
      };
      apply(state);
      if (k >= 1) current = target;
      return k < 1;
    },
    setExposure(renderer, value) {
      renderer.toneMappingExposure = value;
    },
    dispose() {
      scene.remove(hemi);
      scene.remove(sun);
      scene.remove(sun.target);
      lanterns.forEach((l) => scene.remove(l));
      hemi.dispose();
      sun.dispose();
      lanterns.forEach((l) => l.dispose());
    }
  };
}
