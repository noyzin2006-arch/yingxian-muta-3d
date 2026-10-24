/**
 * src/render/section.js
 *
 * 剖切与分解。
 *
 * 规划 §4.6：
 *   · 剖切：从西南看，沿一条过塔心的轴向竖直剖面移去朝镜头半侧的
 *     外墙 / 屋面 / 柱 / 斗栱 / 栏杆，保留另半结构与九层层序说明。
 *     **不能只剖墙面却把斗栱留在空中** —— 因此对**全部**构件材质统一施加
 *     裁剪平面，构件随之一起被切掉。
 *   · 分解：五个明层 + 四个暗层的屋面构件纵向移开 1.5–2.0 m；
 *     **临时缩小模型以适配视场，但不得改变状态里的原始米制尺寸**；
 *     动画回归精确原坐标，避免累计漂移。
 */

import * as THREE from 'three';

export function createSectionManager({ root, floors, materials, camera, controls }) {
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const targets = [];
  const originals = new Map();

  // 记录每个楼层组的原始 Y
  Object.entries(floors).forEach(([key, group]) => {
    originals.set(key, group.position.y);
  });

  let mode = 'whole';
  let explodeAmount = 0;

  /** 分解位移：按楼层顺序阶梯式拉开 */
  function doExplode(t) {
    const keys = Object.keys(floors);
    keys.forEach((key, i) => {
      const group = floors[key];
      const base = originals.get(key) ?? 0;
      const step = Math.max(0, i - 1) * 1.75;
      group.position.y = base + step * t;
    });
    // 分解时整体略微缩小以适配视场（不改变米制数据）
    root.scale.setScalar(1 - 0.16 * t);
  }

  function collectMaterials() {
    targets.length = 0;
    Object.values(materials).forEach((m) => {
      if (m && Array.isArray(m.clippingPlanes)) targets.push(m);
    });
  }

  function setClipping(enabled) {
    collectMaterials();
    targets.forEach((m) => {
      m.clippingPlanes = enabled ? [plane] : null;
      m.clipShadows = true;
      m.needsUpdate = true;
    });
  }

  /** 剖切面始终垂直于「相机 → 塔心」方向，保证切掉的是朝向观众的一半 */
  function updatePlane() {
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) return;
    dir.normalize();
    plane.normal.copy(dir);
    plane.constant = 0;
  }

  return {
    get mode() { return mode; },

    /**
     * @param {'whole'|'section'|'exploded'} next
     */
    setMode(next) {
      if (next === mode) return;
      const wasSection = mode === 'section';
      mode = next;

      if (next === 'section') {
        updatePlane();
        setClipping(true);
      } else if (wasSection) {
        setClipping(false);
      }

      if (next === 'exploded') {
        explodeAmount = 1;
        doExplode(1);
      } else {
        explodeAmount = 0;
        doExplode(0);
      }
    },

    /** 每帧更新剖切面 */
    update() {
      if (mode !== 'section') return;
      updatePlane();
    },

    /** 分解动画：0 = 复位，1 = 完全分开 */
    applyExplode(t) { doExplode(t); },

    /** 精确复位（误差 < 1e-4） */
    reset() {
      doExplode(0);
    },

    dispose() {
      setClipping(false);
    }
  };
}

/**
 * 单层聚焦：把指定明层之外的楼层隐藏或半透明。
 */
export function createFloorFocus(floors) {
  const hidden = new Set();
  return {
    focus(levelIndex) {
      hidden.clear();
      Object.entries(floors).forEach(([key, group]) => {
        const isTarget = key === `bright-${levelIndex}`;
        group.visible = isTarget;
      });
    },
    clear() {
      Object.values(floors).forEach((g) => { g.visible = true; });
    },
    get focused() { return hidden.size > 0; }
  };
}
