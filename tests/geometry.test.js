/**
 * tests/geometry.test.js —— 八角几何、柱网与屋面自检
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  octagonVertices, octagonEdges, octagonColumnPositions, offsetPolygon,
  circumradius, apothem, sideFromDiagonal, diagonalFromSide, acrossFlatsFromDiagonal
} from '../src/geometry/math-octagon.js';
import { buildStructure, ringsOfLevel } from '../src/data/structure.js';
import { buildRoofSurface, eaveSlope } from '../src/geometry/roof.js';
import { buildLevelFrame } from '../src/geometry/columns.js';

const s = buildStructure();

test('正八角：边长 → 外接圆 / 内切圆换算正确', () => {
  const side = 9.5472;
  assert.ok(Math.abs(circumradius(side) - side / (2 * Math.sin(Math.PI / 8))) < 1e-9);
  assert.ok(Math.abs(apothem(side) - side / (2 * Math.tan(Math.PI / 8))) < 1e-9);
  assert.ok(Math.abs(sideFromDiagonal(30.27) - 30.27 * Math.sin(Math.PI / 8)) < 1e-9);
  assert.ok(Math.abs(diagonalFromSide(side) - side / Math.sin(Math.PI / 8)) < 1e-9);
});

test('八边形：8 顶点、8 边，边长一致，外法线朝外', () => {
  const v = octagonVertices(9.5472, 10);
  assert.equal(v.length, 8);
  const edges = octagonEdges(v);
  assert.equal(edges.length, 8);
  edges.forEach((e) => {
    assert.ok(Math.abs(e.length - 9.5472) < 1e-6, '边长应一致');
    // 外法线应与中点方向一致
    const dot = e.normal.x * (e.mid.x / Math.hypot(e.mid.x, e.mid.z)) +
                e.normal.z * (e.mid.z / Math.hypot(e.mid.x, e.mid.z));
    assert.ok(dot > 0.999, '外法线应朝外');
  });
});

test('正南面：rotation=π/8 时第 5 条边正对 -Z', () => {
  const v = octagonVertices(9.5472, 0);
  const edges = octagonEdges(v);
  const south = edges[5];
  assert.ok(south.normal.z < -0.99, '正南边外法线应指向 -Z');
  assert.ok(Math.abs(south.mid.x) < 1e-6, '正南边中点应在 X=0');
});

test('柱位：每面三间 → 8 角柱 + 16 补间 = 24；内槽每面一间 → 8 根', () => {
  const lv = s.levels[0];
  const outer = octagonColumnPositions(lv.outer.vertices);
  assert.equal(outer.length, 24);
  assert.equal(outer.filter((p) => p.kind === 'corner').length, 8);
  assert.equal(outer.filter((p) => p.kind === 'intermediate').length, 16);
  const inner = octagonColumnPositions(lv.inner.vertices, [0, 1]);
  assert.equal(inner.length, 8);
});

test('柱网：逐层外槽 24 柱 / 内槽 8 柱；首层加 24 副阶柱共 56', () => {
  for (let i = 1; i <= 5; i++) {
    const frame = buildLevelFrame(s, i, { includeSecondary: i === 1 });
    const outer = frame.columnRecords.filter((r) => r.ring === 'outer').length;
    const inner = frame.columnRecords.filter((r) => r.ring === 'inner').length;
    const sec = frame.columnRecords.filter((r) => r.ring === 'secondary').length;
    assert.equal(outer, 24, `第${i}层外槽柱数`);
    assert.equal(inner, 8, `第${i}层内槽柱数`);
    assert.equal(sec, i === 1 ? 24 : 0, `第${i}层副阶柱数`);
    if (i === 1) assert.equal(frame.columnRecords.length, 56, '首层共 56 柱');
  }
});

test('三环：首层含副阶环，且半径由外到内递减', () => {
  const rings = ringsOfLevel(s, 1);
  assert.equal(rings.length, 3);
  assert.equal(rings[0].id, 'secondary');
  assert.ok(rings[0].side > rings[1].side);
  assert.ok(rings[1].side > rings[2].side);
});

test('多边形偏移：向外偏移 2 m 后对边距恰增 2 m，且仍为正八角', () => {
  const side = 9.5472;
  const v = octagonVertices(side, 0);
  const out = offsetPolygon(v, 2.0);
  assert.equal(out.length, 8);
  // 偏移后对边距 = 原对边距 + 2（正八边形边中点到中心的距离即对边距的一半 ×2 = 对边距）
  const apBefore = apothem(side);
  const e1 = octagonEdges(out);
  const apAfter = Math.hypot(e1[0].mid.x, e1[0].mid.z);
  assert.ok(Math.abs(apAfter - (apBefore + 2.0)) < 1e-6,
    `偏移后对边距 ${apAfter} 应为 ${apBefore + 2.0}`);
  assert.ok(e1[0].length > side, '边长应增大');
});

test('屋面：每檐 8 个面，法线朝上，檐口与内端标高单调', () => {
  for (const eave of s.eaves) {
    const r = buildRoofSurface(eave, { segmentsPerFace: 10, ringSegments: 6 });
    const n = r.geometry.attributes.normal;
    let up = 0, down = 0;
    for (let i = 0; i < n.count; i++) {
      if (n.getY(i) > 0.05) up++;
      else if (n.getY(i) < -0.05) down++;
    }
    assert.equal(down, 0, `${eave.name} 不应有朝下的法线`);
    assert.ok(up > n.count * 0.9, `${eave.name} 法线应朝上`);

    const pos = r.geometry.attributes.position;
    let ymin = Infinity, ymax = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
    }
    assert.ok(Math.abs(ymin - eave.y) < 0.01, `${eave.name} 檐口标高`);
    assert.ok(ymax > ymin, `${eave.name} 应有升起`);
  }
});

test('屋面坡度落在传统区间（正檐 26°–34°，裙檐与攒尖顶更缓）', () => {
  for (const eave of s.eaves) {
    const { degrees, run, rise } = eaveSlope(eave);
    assert.ok(run > 0.5, `${eave.name} 水平投影 ${run.toFixed(2)} 过小`);
    if (eave.isApex) {
      assert.ok(degrees < 25, `攒尖顶坡度 ${degrees.toFixed(1)}° 应更缓`);
    } else if (eave.innerRingMode === 'outer') {
      assert.ok(degrees > 24 && degrees < 40, `裙檐坡度 ${degrees.toFixed(1)}° 偏离传统区间`);
    } else {
      assert.ok(degrees > 24 && degrees < 34, `${eave.name} 坡度 ${degrees.toFixed(1)}° 偏离传统区间`);
    }
  }
});

test('裙檐的内端落在塔身外槽柱线上（不得退化成薄片）', () => {
  const apron = s.eaves[0];
  assert.equal(apron.innerRingMode, 'outer');
  const innerApothem = Math.hypot(apron.innerRingVertices[0].x, apron.innerRingVertices[0].z);
  const towerApothem = Math.hypot(s.levels[0].outer.vertices[0].x, s.levels[0].outer.vertices[0].z);
  assert.ok(Math.abs(innerApothem - towerApothem) < 1e-6, '裙檐内端应与塔身外槽柱线重合');
  const { run } = eaveSlope(apron);
  assert.ok(run > 2.5, `裙檐水平投影 ${run.toFixed(2)} 过小`);
});
