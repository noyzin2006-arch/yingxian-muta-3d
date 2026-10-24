/**
 * src/render/camera.js
 *
 * 机位预设与相机动画。
 *
 * 规划 §4.6：至少 7 个机位；每个保存 position / target / fov；
 * 用 Vector3.lerp 插值，动画 1.15 s，缓动 cubic-bezier(0.22, 1, 0.36, 1)；
 * 新操作必须中断旧动画，并从**当前**相机位置开始插值。
 */

import * as THREE from 'three';

/** cubic-bezier(0.22, 1, 0.36, 1) 的近似解析解 */
export function easeOutExpo(t) {
  const p = 0.22;
  // 数值逼近：采样贝塞尔曲线并做线性插值
  const N = 24;
  let prevX = 0, prevY = 0;
  for (let i = 1; i <= N; i++) {
    const x = i / N;
    // 求解 s 使 x(s) = x（x(s) = 1-(1-s)^3 (1 + p3*s) 近似）
    const s = solveBezierX(x);
    const y = cubicBezierY(s);
    if (y >= t) {
      const span = y - prevY;
      const local = span > 1e-6 ? (t - prevY) / span : 0;
      return prevX + (x - prevX) * local;
    }
    prevX = x; prevY = y;
  }
  return 1;
}

function solveBezierX(x) {
  // 二分求解 x(s)
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const s = (lo + hi) / 2;
    if (cubicBezierX(s) < x) lo = s; else hi = s;
  }
  return (lo + hi) / 2;
}
function cubicBezierX(s) {
  const p0 = 0, p1 = 0.22, p2 = 0.36, p3 = 1;
  const mt = 1 - s;
  return 3 * mt * mt * s * p1 + 3 * mt * s * s * p2 + s * s * s * p3;
}
function cubicBezierY(s) {
  const p0 = 0, p1 = 1, p2 = 1, p3 = 1;
  const mt = 1 - s;
  return 3 * mt * mt * s * p1 + 3 * mt * s * s * p2 + s * s * s * p3;
}

export const CAMERA_PRESETS = Object.freeze([
  Object.freeze({
    key: 'whole', label: '全貌', hint: '正南偏西的地面仰视，全塔与石基尽收',
    position: Object.freeze([-53, 31, 91]), target: Object.freeze([0, 30, 0]), fov: 45
  }),
  Object.freeze({
    key: 'south', label: '正南立面', hint: '正对南面明间，看层层收分与六重檐',
    position: Object.freeze([0, 20, 110]), target: Object.freeze([0, 32, 0]), fov: 40
  }),
  Object.freeze({
    key: 'topNE', label: '东北俯看', hint: '高处俯视，八角平面与副阶周匝一目了然',
    position: Object.freeze([56, 76, 54]), target: Object.freeze([0, 26, 0]), fov: 45
  }),
  Object.freeze({
    key: 'eave', label: '檐下', hint: '贴近一层裙檐，看斗栱叠垒与柱网',
    position: Object.freeze([-9, 12.5, 24]), target: Object.freeze([0, 11.5, 6]), fov: 48
  }),
  Object.freeze({
    key: 'bracket', label: '斗栱近景', hint: '五层柱头铺作里外跳，栱、昂、耍头分件可辨',
    position: Object.freeze([4.2, 54.4, -16.5]), target: Object.freeze([0, 53.2, -9.6]), fov: 42
  }),
  Object.freeze({
    key: 'finial', label: '塔刹', hint: '仰莲、覆钵、五重相轮、仰月、宝盖、宝珠',
    position: Object.freeze([11, 62, 15]), target: Object.freeze([0, 60.5, 0]), fov: 44
  }),
  Object.freeze({
    key: 'section', label: '剖面', hint: '沿过塔心的竖直面剖开，明五暗四与双圈柱网可见',
    position: Object.freeze([-60, 36, 60]), target: Object.freeze([0, 30, 0]), fov: 44
  }),
  Object.freeze({
    key: 'entrance', label: '入口台阶', hint: '自南面月台上阶，角石与月台一览',
    position: Object.freeze([0, 7, 36]), target: Object.freeze([0, 9, -8]), fov: 50
  })
]);

/**
 * 创建相机动画管理器。
 */
export function createCameraDirector(camera, controls, onComplete = null) {
  let tween = null;

  function startTween(to, duration = 1.15) {
    // 从**当前**状态出发，中断旧动画
    tween = {
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      fromFov: camera.fov,
      toPos: new THREE.Vector3(...to.position),
      toTarget: new THREE.Vector3(...to.target),
      toFov: to.fov ?? camera.fov,
      t: 0,
      duration
    };
  }

  function update(dt) {
    if (!tween) return false;
    tween.t = Math.min(1, tween.t + dt / tween.duration);
    const k = easeOutExpo(tween.t);
    camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
    const fov = THREE.MathUtils.lerp(tween.fromFov, tween.toFov, k);
    if (Math.abs(fov - camera.fov) > 1e-4) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    if (tween.t >= 1) { tween = null; onComplete?.(); }
    return true;
  }

  return {
    get animating() { return tween !== null; },
    goTo(keyOrPreset, duration = 1.15) {
      const preset = typeof keyOrPreset === 'string'
        ? CAMERA_PRESETS.find((p) => p.key === keyOrPreset)
        : keyOrPreset;
      if (!preset) return false;
      startTween(preset, duration);
      return true;
    },
    cancel() { tween = null; },
    update,
    presets: CAMERA_PRESETS
  };
}
