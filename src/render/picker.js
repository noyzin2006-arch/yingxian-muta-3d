/**
 * src/render/picker.js
 *
 * 拾取：六个常驻构件热点 + 楼层面判定。
 *
 * 规划 §3.1：默认只保留 6 个常驻热点；§4.4：热点不超过 6 个，
 * 贴近建筑轮廓，不遮挡塔体。
 */

import * as THREE from 'three';
import { octagonEdges } from '../geometry/math-octagon.js';

/** 计算六个热点的世界坐标 */
export function computeHotspotPositions(structure) {
  const out = {};
  const southEdge = (lv) => octagonEdges(lv.outer.vertices)[5];

  const l1 = structure.levels[0];
  const l2 = structure.levels[1];
  const l3 = structure.levels[2];

  const e1 = southEdge(l1);
  const e2 = southEdge(l2);
  const e3 = southEdge(l3);

  out.base = new THREE.Vector3(0, 2.4, -18.5);
  out.columnGrid = new THREE.Vector3(e1.mid.x + e1.normal.x * 1.4, 7.2, e1.mid.z + e1.normal.z * 1.4);
  out.brackets = new THREE.Vector3(e3.mid.x + e3.normal.x * 1.1, (l3.bracketBaseY ?? l3.band.y1) + 0.6, e3.mid.z + e3.normal.z * 1.1);
  out.hiddenFloor = new THREE.Vector3(e2.mid.x + e2.normal.x * 1.0, (l2.band.y0 - 1.1), e2.mid.z + e2.normal.z * 1.0);
  out.plaqueStatue = new THREE.Vector3(0, 8.4, -6.5);
  out.finial = new THREE.Vector3(0, 60.2, 0);

  return out;
}

/**
 * 创建热点标记（不可见的拾取代理 + 可见的小圆点由 UI 叠加层负责）。
 */
export function createHotspots(structure, { radius = 0.55 } = {}) {
  const positions = computeHotspotPositions(structure);
  const group = new THREE.Group();
  group.name = 'hotspots';
  const items = [];

  Object.entries(positions).forEach(([id, pos]) => {
    const geo = new THREE.SphereGeometry(radius, 12, 10);
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.name = `hotspot-${id}`;
    mesh.userData = { hotspotId: id };
    group.add(mesh);
    items.push({ id, mesh, position: pos.clone() });
  });

  return {
    group,
    items,
    dispose() {
      items.forEach((i) => { i.mesh.geometry.dispose(); i.mesh.material.dispose(); });
    }
  };
}

/**
 * 创建拾取器。
 */
export function createPicker(camera, domElement) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  return {
    /**
     * @param {number} clientX
     * @param {number} clientY
     * @param {THREE.Object3D[]} targets
     * @returns {THREE.Intersection[]|null}
     */
    pick(clientX, clientY, targets) {
      const rect = domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(targets, true);
      return hits.length ? hits : null;
    }
  };
}

/**
 * 从命中点推断所在楼层（用于「点塔身看这一层」）。
 * @param {number} y 世界坐标高度
 * @param {object} structure
 */
export function floorAtHeight(y, structure) {
  const bright = structure.levels.find((lv) => y >= lv.band.y0 && y <= lv.band.y1);
  if (bright) return { kind: 'bright', level: bright.index, name: bright.name };
  const hidden = structure.hiddenFloors.find((h) => y >= h.band.y0 && y <= h.band.y1);
  if (hidden) return { kind: 'hidden', level: hidden.index, name: `第${hidden.index}暗层` };
  if (y < 4) return { kind: 'base', level: 0, name: '台基' };
  if (y > 57.31) return { kind: 'finial', level: 6, name: '塔刹' };
  return null;
}
