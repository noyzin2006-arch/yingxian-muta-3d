/**
 * tests/dimensions.test.js —— 尺寸登记表自检
 *
 * 验证：
 *   · M01 通高、M02 底径与实测锚点一致
 *   · M43 陈明达 A 模数的总高分配自洽（这是本机独立补强的交叉校验）
 *   · 逐层外槽面阔与「北测」实测均值的偏差 ≤ 1%（规划 M11 ↔ 实测交叉验证）
 *   · 不允许把「估算」条目当成已核实（valueM 非空但 certainty=estimate 即为违规）
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dimensions, LEVELS, MODULE_A, LEVEL_LAYOUT, CERTAINTY, effectiveM, isEstimate
} from '../src/data/dimensions.js';

test('M01 通高 = 67.31 m', () => {
  assert.equal(dimensions.M01.valueM, 67.31);
  assert.equal(dimensions.M01.certainty, CERTAINTY.PUBLISHED);
});

test('M02 底层直径 = 30.27 m 且口径已声明', () => {
  assert.equal(dimensions.M02.valueM, 30.27);
  assert.match(dimensions.M02.measurementDatum, /最远顶点距|对角径/);
});

test('M43 A 模数：总高分配自洽，且与 M01 相符', () => {
  const total = MODULE_A.baseM + MODULE_A.bodyAndLotusM + MODULE_A.ironFinialM;
  assert.ok(Math.abs(total - 67.31) < 0.05, `A 模数合计 ${total} 应≈67.31`);
  // A/2 + 6A + 1⅛A = 7⅝A
  // A/2、6A、1⅛A（派生值有四舍五入，按米制容差 1 cm 判定）
  assert.ok(Math.abs(MODULE_A.baseM - MODULE_A.A * 0.5) < 0.01, '台基应为 A/2');
  assert.ok(Math.abs(MODULE_A.bodyAndLotusM - MODULE_A.A * 6) < 0.01, '塔身应为 6A');
  assert.ok(Math.abs(MODULE_A.ironFinialM - MODULE_A.A * 1.125) < 0.01, '铁刹应为 1⅛A');
});

test('M33 塔刹：铁刹与 A 模数 1⅛A 吻合（仰莲含在 6A 段内，不叠加）', () => {
  const iron = effectiveM('M33');
  assert.ok(iron > 9.5 && iron < 10.5, `铁刹高度 ${iron}`);
  // 官方口径「2.17 + 9.95 = 11.67」自相矛盾，本模型不得把两者叠加
  assert.notEqual(dimensions.M33.valueM, 11.67);
  assert.match(dimensions.M33.note, /含在 6A|含在/);
});

test('逐层外槽面阔与北测实测均值偏差 ≤ 1%', () => {
  for (const lv of LEVELS) {
    const dev = Math.abs(lv.outerFaceWidthM - lv.measuredFaceWidthM) / lv.measuredFaceWidthM;
    assert.ok(dev <= 0.01, `${lv.name} 面阔 ${lv.outerFaceWidthM} 与实测 ${lv.measuredFaceWidthM} 偏差 ${(dev * 100).toFixed(2)}%`);
  }
});

test('逐层对角径与边长自洽（d = s / sin(π/8)）', () => {
  for (const lv of LEVELS) {
    const expect = lv.outerFaceWidthM / Math.sin(Math.PI / 8);
    assert.ok(Math.abs(lv.outerDiagonalM - expect) < 0.02, `${lv.name} 对角径不自洽`);
  }
});

test('层位：六重檐、四个暗层、五个明层，标高单调', () => {
  const e = LEVEL_LAYOUT.eaveY;
  assert.equal(e.length, 6);
  for (let i = 1; i < e.length; i++) assert.ok(e[i] > e[i - 1], '檐口标高应递增');
  assert.equal(LEVEL_LAYOUT.hiddenBands.length, 4);
  assert.equal(LEVEL_LAYOUT.brightBands.length, 5);
  assert.ok(LEVEL_LAYOUT.apexY < LEVEL_LAYOUT.finialTopY);
});

test('估算条目不得带已核实的 valueM', () => {
  for (const [id, rec] of Object.entries(dimensions)) {
    if (rec.certainty === CERTAINTY.ESTIMATE) {
      assert.equal(rec.valueM, null, `${id} 标为 estimate 就不应再有 valueM`);
    }
    if (rec.certainty === CERTAINTY.UNVERIFIED) {
      assert.equal(rec.valueM, null, `${id} 标为 unverified 就不应再有 valueM`);
    }
  }
});

test('M40 二层铁柱不得被当作事实', () => {
  assert.equal(dimensions.M40.certainty, CERTAINTY.UNVERIFIED);
  assert.equal(dimensions.M40.valueM, null);
  assert.equal(effectiveM('M40'), null);
});

test('isEstimate 判定正确', () => {
  assert.equal(isEstimate('M01'), false);
  assert.equal(isEstimate('M22'), true);
});
