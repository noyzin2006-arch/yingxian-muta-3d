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
  renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
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
  camera.position.set(-49, 30, 84);

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

  function resize() {
    const w = container.clientWidth || 1280;
    const h = container.clientHeight || 720;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(container);

  return {
    renderer,
    scene,
    camera,
    controls,
    container,
    resize,
    setPixelRatio(r) { renderer.setPixelRatio(r); resize(); },
    dispose() {
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
