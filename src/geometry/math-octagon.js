/**
 * src/geometry/math-octagon.js
 *
 * 正八角塔平面几何的纯函数层。
 *
 * 约定（贯穿全项目）：
 *   · 世界坐标：地面 Y = 0，塔心 X = Z = 0，向南为 -Z，向北为 +Z。
 *   · 八角柱网用「边长 s」定义（s = 一个面的面阔 = 相邻角柱轴线间距）。
 *   · 顶点角度 = rotation + k·π/4，rotation 默认 π/8。
 *     此时 8 条边的中点分别落在 45°+k·45°，其中 k=5 的边中点恰在 270°（正南）。
 *     ⇒ SOUTH_FACE = 5。
 *   · 外法线：边 (a→b) 的外法线 = normalize(dz, -dx)（XZ 平面，右手系 Y 向上）。
 *
 * 全部为纯函数，不依赖 three，可直接在 node --test 下测试。
 */

export const TAU = Math.PI * 2;
export const OCT = Math.PI / 4;
export const DEFAULT_ROTATION = Math.PI / 8;
/** rotation = π/8 时，正南朝向的那条边的索引 */
export const SOUTH_FACE = 5;

/** 正八边形：外接圆半径 R = s / (2 sin(π/8)) */
export function circumradius(side) {
  return side / (2 * Math.sin(Math.PI / 8));
}

/** 正八边形：内切圆半径（半对边距）A = s / (2 tan(π/8)) */
export function apothem(side) {
  return side / (2 * Math.tan(Math.PI / 8));
}

/** 对角径 → 边长 */
export function sideFromDiagonal(diagonal) {
  return diagonal * Math.sin(Math.PI / 8);
}

/** 对角径 → 对边距 */
export function acrossFlatsFromDiagonal(diagonal) {
  return diagonal * Math.cos(Math.PI / 8);
}

/** 边长 → 对角径 */
export function diagonalFromSide(side) {
  return side / Math.sin(Math.PI / 8);
}

/** 边长 → 对边距 */
export function acrossFlatsFromSide(side) {
  return side / Math.tan(Math.PI / 8);
}

/**
 * 八边形的 8 个顶点。
 * @param {number} side 边长（= 面阔）
 * @param {number} [y] 标高
 * @param {number} [rotation]
 * @returns {{x:number,y:number,z:number,index:number,angle:number}[]}
 */
export function octagonVertices(side, y = 0, rotation = DEFAULT_ROTATION) {
  const R = circumradius(side);
  const out = [];
  for (let k = 0; k < 8; k++) {
    const a = rotation + k * OCT;
    out.push({ x: R * Math.cos(a), y, z: R * Math.sin(a), index: k, angle: a });
  }
  return out;
}

/**
 * 八边形的 8 条边（顶点 k → k+1）。
 * @returns {{index:number,a:object,b:object,mid:{x:number,y:number,z:number},
 *            normal:{x:number,z:number},azimuth:number,length:number}[]}
 */
export function octagonEdges(vertices) {
  const n = vertices.length;
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = vertices[k];
    const b = vertices[(k + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    // 外法线 (dz, -dx)
    const nx = dz / len;
    const nz = -dx / len;
    out.push({
      index: k,
      a,
      b,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 },
      normal: { x: nx, z: nz },
      azimuth: Math.atan2(nz, nx),
      length: len
    });
  }
  return out;
}

/**
 * 沿外法向偏移凸多边形。逐边平移后求相邻直线交点，得到新的闭合多边形。
 * 这不是简单的 R + d ——角部与边中点的外移量并不相同。
 * @param {{x:number,z:number}[]} poly
 * @param {number} distance 正值向外
 */
export function offsetPolygon(poly, distance) {
  const n = poly.length;
  // 每条边的外法线
  const normals = [];
  for (let k = 0; k < n; k++) {
    const a = poly[k];
    const b = poly[(k + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    normals.push({ x: dz / len, z: -dx / len, ax: a.x, az: a.z });
  }
  const out = [];
  for (let k = 0; k < n; k++) {
    const prev = normals[(k - 1 + n) % n];
    const cur = normals[k];
    // 直线：p · n = c
    const c1 = prev.ax * prev.x + prev.az * prev.z + distance;
    const c2 = cur.ax * cur.x + cur.az * cur.z + distance;
    const det = prev.x * cur.z - prev.z * cur.x;
    if (Math.abs(det) < 1e-9) {
      // 平行：退化为沿边平移
      out.push({ x: cur.ax + cur.x * distance, z: cur.az + cur.z * distance });
      continue;
    }
    const x = (c1 * cur.z - c2 * prev.z) / det;
    const z = (prev.x * c2 - cur.x * c1) / det;
    out.push({ x, z });
  }
  return out;
}

/**
 * 生成某条边上按参数 t 分布的点（t ∈ [0,1]，0 = a 端，1 = b 端）。
 */
export function pointOnEdge(edge, t, y = null) {
  return {
    x: edge.a.x + (edge.b.x - edge.a.x) * t,
    y: y === null ? edge.a.y : y,
    z: edge.a.z + (edge.b.z - edge.a.z) * t
  };
}

/**
 * 一个面的柱位参数：每面三开间 → 4 个柱位（t = 0, .29, .71, 1）。
 * 端点柱与相邻面共享，故每面只贡献 2 根内部柱 + 2 根角柱。
 */
export const BAY_T = Object.freeze([0, 0.29, 0.71, 1]);

/**
 * 汇总八角柱网的全部柱位（去重后的角柱 + 每面 2 根补间柱）。
 * @returns {{x:number,z:number,kind:'corner'|'intermediate',face:number,slot:number}[]}
 */
export function octagonColumnPositions(vertices, bayT = BAY_T) {
  const edges = octagonEdges(vertices);
  const positions = [];
  const seen = new Set();
  edges.forEach((edge, fi) => {
    bayT.forEach((t, si) => {
      const p = pointOnEdge(edge, t);
      // 角柱（t = 0 或 1）按顶点索引去重
      if (t === 0) {
        if (seen.has(edge.a.index)) return;
        seen.add(edge.a.index);
        positions.push({ x: edge.a.x, z: edge.a.z, kind: 'corner', face: fi, slot: si, vertexIndex: edge.a.index });
        return;
      }
      if (t === 1) {
        // 该面的末端角柱由下一个面的 t=0 提供，这里不重复生成
        return;
      }
      positions.push({ x: p.x, z: p.z, kind: 'intermediate', face: fi, slot: si });
    });
  });
  return positions;
}

/**
 * 平滑多边形（按列柱位顺序生成的外轮廓）—— 供平座、栏杆使用。
 */
export function polygonFromPoints(points) {
  return points.map((p) => ({ x: p.x, z: p.z }));
}

/**
 * 多边形面积（带符号，XZ 平面）。
 */
export function polygonArea(poly) {
  let a = 0;
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k];
    const q = poly[(k + 1) % poly.length];
    a += p.x * q.z - q.x * p.z;
  }
  return a / 2;
}

/**
 * 把多边形按「从某点起、按方向」重排，使第 0 项为正南边中点。
 * 用于让 UI 上的「南」与模型方位一致。
 */
export function rotateToSouth(poly, southIndex = SOUTH_FACE) {
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    out.push(poly[(southIndex + k) % poly.length]);
  }
  return out;
}

/**
 * 多边形的轴对齐包围盒（XZ 平面）。
 */
export function polygonBounds(poly) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

/**
 * 均匀内收（用于侧脚 / 逐层收分）：等价于 offsetPolygon(poly, -d)。
 */
export function shrinkPolygon(poly, distance) {
  return offsetPolygon(poly, -distance);
}
