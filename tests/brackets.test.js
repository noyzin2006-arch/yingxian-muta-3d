/**
 * tests/brackets.test.js —— 斗栱铺作自检
 *
 * 验证规划 §4.4 的硬性要求：
 *   · 一套铺作必须由多个分件组成，不是一个方块
 *   · 每个分件有正包围盒、连接处不悬空
 *   · 台账（ledger）与实际实例数一致
 *   · 「54 种 / 480 朵」是文献口径，模型台账必须与文献数字分开陈述
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStructure } from '../src/data/structure.js';
import {
  buildBracketSet, buildLevelBrackets, summarizeBrackets, bracketTypeId, LAYER_H
} from '../src/geometry/brackets.js';
import { EST } from '../src/data/structure.js';

const s = buildStructure();

const baseParams = {
  nTiao: 3, angCount: 2, hasShuatou: true, hasTuofeng: true,
  jumpLen: 0.62, caiWidth: 0.257, caiHeight: 0.153,
  douWidth: 0.34, douHeight: 0.19, douBottom: 0.28, transverseLen: 1.5
};

test('一套铺作由多个分件组成，不是单个方块', () => {
  const set = buildBracketSet(baseParams);
  assert.ok(set.pieces.length >= 10, `分件数 ${set.pieces.length} 太少`);
  const names = new Set(set.pieces.map((p) => p.name));
  for (const required of ['栌斗', '泥道栱', '华栱1', '散斗', '昂', '耍头']) {
    assert.ok(names.has(required), `缺少分件 ${required}`);
  }
});

test('每个分件都有正包围盒（非退化）', () => {
  const set = buildBracketSet(baseParams);
  for (const p of set.pieces) {
    p.geometry.computeBoundingBox();
    const bb = p.geometry.boundingBox;
    const size = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
    assert.ok(Math.max(...size) > 1e-4, `${p.name} 包围盒退化`);
  }
});

test('栌斗底面位于原点（安装点约定）', () => {
  const set = buildBracketSet(baseParams);
  const dou = set.pieces.find((p) => p.name === '栌斗');
  dou.geometry.computeBoundingBox();
  assert.ok(Math.abs(dou.geometry.boundingBox.min.y) < 1e-6, '栌斗底面应在 y=0');
});

test('跳数越多，铺作越高、总出挑越大', () => {
  const a = buildBracketSet({ ...baseParams, nTiao: 1 });
  const b = buildBracketSet({ ...baseParams, nTiao: 3 });
  assert.ok(b.height > a.height);
  assert.ok(b.outward > a.outward);
});

test('typeId 对参数敏感，对相同参数稳定', () => {
  const a = bracketTypeId(baseParams);
  const b = bracketTypeId({ ...baseParams });
  const c = bracketTypeId({ ...baseParams, nTiao: 2 });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('逐层铺作实例数与台账一致，且每套都有实例', () => {
  const all = [];
  for (let i = 1; i <= 5; i++) {
    const res = buildLevelBrackets(s, i);
    assert.ok(res.placements.length > 0, `第${i}层无铺作`);
    res.ledger.entries.forEach((e) => {
      const actual = res.placements.filter((p) => p.ring === e.ring).length;
      assert.equal(actual, e.count, `第${i}层 ${e.ring} 环台账与实例数不符`);
    });
    all.push(...res.placements);
  }
  const sum = summarizeBrackets(all);
  assert.equal(sum.totalSets, all.length);
  assert.ok(sum.distinctGeometryClasses > 5, '几何类别应有多样');
});

test('转角铺作按两面布置（8 个角柱 × 2 个朝向 = 16 套）', () => {
  const res = buildLevelBrackets(s, 1);
  const outer = res.placements.filter((p) => p.ring === 'outer');
  const corners = outer.filter((p) => p.kind === 'corner');
  const inter = outer.filter((p) => p.kind === 'intermediate');
  assert.equal(corners.length, 16, '外檐环角柱铺作应为 8 角 × 2 面');
  assert.equal(inter.length, 16, '外檐环补间铺作应为 16');
  // 同一个角柱位置的两个实例朝向不同（相邻两面）
  const byPos = new Map();
  corners.forEach((p) => {
    const key = `${p.position.x.toFixed(3)}_${p.position.z.toFixed(3)}`;
    byPos.set(key, (byPos.get(key) ?? 0) + 1);
  });
  assert.equal(byPos.size, 8, '应有 8 个角柱位置');
  [...byPos.values()].forEach((n) => assert.equal(n, 2, '每个角柱应有两个朝向'));
});

test('台账把文献口径与模型实算分开陈述', () => {
  const res = buildLevelBrackets(s, 1);
  const sum = summarizeBrackets(res.placements);
  assert.equal(sum.literature.types, 54);
  assert.equal(sum.literature.sets, 480);
  assert.match(sum.note, /54 种/);
  assert.match(sum.note, /不等同于文献数字|不等同/);
});

test('五层柱头铺作里/外跳取北测值（M25）', () => {
  assert.equal(EST.bracket.fifthLayerJump.inner, 0.68);
  assert.equal(EST.bracket.fifthLayerJump.outer, 0.70);
  const res = buildLevelBrackets(s, 5);
  const outer = res.placements.filter((p) => p.ring === 'outer');
  assert.ok(outer.length > 0);
});

test('铺作层高为正且合理', () => {
  assert.ok(LAYER_H > 0.2 && LAYER_H < 0.5);
});
