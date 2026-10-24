/**
 * src/render/scene.js
 *
 * 舞台：renderer / scene / camera / controls / resize / 渲染循环。
 *
 * 依据规划 §4.1：WebGLRenderer 优先（WebGL2）、alpha false、
 * outputColorSpace = SRGBColorSpace、toneMapping = ACESFilmicToneMapping；
 * PerspectiveCamera(45°, near = 0.15 m, far = 350 m)；
 * OrbitControls enableDamping = true、dampingFactor = 0.075，
 * 极角限制在 [0.20, 1.51] rad 以免钻地，距离 [12, 185] m。
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const CAMERA_LIMITS = Object.freeze({
  fov: 45,
  near: 0.15,
  far: 350,
  minPolarAngle: 0.20,
  maxPolarAngle: 1.51,
  minDistance: 12,
  maxDistance: 185,
  dampingFactor: 0.075,
  target: Object.freeze({ x: 0, y: 29, z: 0 })
});

/** 判断本机是否支持 WebGL2 */
export function supportsWebGL2() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch (e) {
    return false;
  }
}

/**
 * 创建舞台。
 * @param {HTMLElement} container
 * @param {object} opts { quality, antialias }
 */
export function createStage(container, opts = {}) {
  const quality = opts.quality ?? 'high';

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false
  });
  // 注意：必须传 updateStyle = false。
  // 否则 three.js 会把 canvas 的 inline style 写成固定 px，
  // 从而压过样式表里的 width/height:100%，画布尺寸就此冻结在首次布局值上。
  renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;   // r186 已移除 PCFSoftShadowMap
  renderer.localClippingEnabled = true;
  renderer.info.autoReset = false;
  container.appendChild(renderer.domElement);
  renderer.domElement.classList.add('yx-canvas');
  renderer.domElement.setAttribute('aria-label', '应县木塔三维模型');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xD6D7D2);
  scene.fog = new THREE.Fog(0xC7CBC6, 120, 250);

  const camera = new THREE.PerspectiveCamera(
    CAMERA_LIMITS.fov,
    (container.clientWidth || 1280) / (container.clientHeight || 720),
    CAMERA_LIMITS.near,
    CAMERA_LIMITS.far
  );
  camera.position.set(-53, 31, 91);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = CAMERA_LIMITS.dampingFactor;
  controls.minPolarAngle = CAMERA_LIMITS.minPolarAngle;
  controls.maxPolarAngle = CAMERA_LIMITS.maxPolarAngle;
  controls.minDistance = CAMERA_LIMITS.minDistance;
  controls.maxDistance = CAMERA_LIMITS.maxDistance;
  controls.target.set(CAMERA_LIMITS.target.x, CAMERA_LIMITS.target.y, CAMERA_LIMITS.target.z);
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.update();

  // 目标点限位，防止平移到塔外
  const PAN_LIMIT = { x: 14, yMin: 4, yMax: 60, z: 14 };
  controls.addEventListener('change', () => {
    const t = controls.target;
    t.x = THREE.MathUtils.clamp(t.x, -PAN_LIMIT.x, PAN_LIMIT.x);
    t.z = THREE.MathUtils.clamp(t.z, -PAN_LIMIT.z, PAN_LIMIT.z);
    t.y = THREE.MathUtils.clamp(t.y, PAN_LIMIT.yMin, PAN_LIMIT.yMax);
    // 相机不得钻到地面以下
    if (camera.position.y < 1.2) camera.position.y = 1.2;
  });

  // 取景盒：只框「塔身 + 塔刹」，不把宽大的台基算进去，
  // 否则竖屏时塔会被压得很小。台基允许在极窄屏上轻微出血。
  let fitWidth = 30.6;
  let fitHeight = 67.31;
  let fitCenterY = 31;           // 取景中心（塔身中段）
  let userAdjusted = false;      // 用户手动缩放后不再自动后拉

  function resize() {
    const w = container.clientWidth || 1280;
    const h = container.clientHeight || 720;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    ensureFits();
  }

  /**
   * 窄屏（竖屏）时水平视场很窄，固定机位会把塔挤出画面。
   * 这里在**不改变朝向**的前提下把相机后拉到刚好容下塔体。
   */
  function ensureFits() {
    if (userAdjusted) return;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    // 竖屏时底部被操作条占据，给塔基留出余量，并把取景中心下移，使塔体在画面中上移
    const portrait = camera.aspect < 0.85;
    const bottomClear = portrait ? fitHeight * 0.20 : 0;
    const dV = ((fitHeight + bottomClear) / 2) / Math.tan(vFov / 2);
    const dH = (fitWidth / 2) / Math.tan(hFov / 2);
    const need = Math.max(dV, dH) * 1.06;
    if (portrait) controls.target.y = fitCenterY - bottomClear * 0.5;
    const offset = camera.position.clone().sub(controls.target);
    const dist = offset.length();
    if (dist < need && dist > 0.01) {
      camera.position.copy(controls.target).addScaledVector(offset.normalize(), need);
    }
  }

  const onWindowResize = () => resize();
  window.addEventListener('resize', onWindowResize);
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(container);
  controls.addEventListener('start', () => { userAdjusted = true; });

  return {
    renderer,
    scene,
    camera,
    controls,
    container,
    resize,
    setPixelRatio(r) { renderer.setPixelRatio(r); resize(); },
    /** 设定取景盒（宽 × 高，单位米），供窄屏自适应取景使用 */
    setSceneBounds({ width, height, centerY }) {
      if (width) fitWidth = width;
      if (height) fitHeight = height;
      if (centerY) fitCenterY = centerY;
      ensureFits();
    },
    /** 强制重新适配（切机位或换档后调用） */
    refit() { userAdjusted = false; ensureFits(); },
    resize,
    dispose() {
      window.removeEventListener('resize', onWindowResize);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
  };
}

/**
 * 包围盒自适应的「装进画面」距离。
 * 规划 §4.6：fitDistance = (radius / sin(fov/2)) × 1.18；
 * 窄屏时按水平 FOV 再求一次。
 */
export function fitDistance(radius, camera, margin = 1.18) {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const dV = (radius / Math.sin(vFov / 2)) * margin;
  const dH = (radius / Math.sin(hFov / 2)) * margin;
  return Math.max(dV, dH);
}
