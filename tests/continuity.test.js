/**
 * tests/continuity.test.js —— 明暗过渡构架与连续度检测
 *
 * 覆盖规划 §5.4 / §8.1 的关键判据：
 *   · 五个带、八个面、构件 ID 唯一稳定
 *   · P1 必须覆盖 [12.5, 14.8]；C5 归 bright-5，绝不造第五暗层
 *   · 已核实尺寸零改动（V4）
 *   · 负向用例：抽掉 P1 的新件 → 检测必须 FAIL
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStructure } from '../src/data/structure.js';
import { buildLevelFrame, buildAllWalls } from '../src/geometry/columns.js';
import { buildInterlevelContinuity } from '../src/geometry/interlevel-continuity.js';
import {
  CONTINUITY_ESTIMATES, CONTINUITY_BANDS, P1_REQUIRED_COVER
} from '../src/data/continuity-estimates.js';
import { analyzeContinuity, MAX_BLANK_RUN_M } from '../src/validation/continuity-metrics.js';
import { dimensions, LEVELS, MODULE_A } from '../src/data/dimensions.js';

function setup() {
  const structure = buildStructure();
  const columnRecords = [];
  for (let i = 1; i <= 5; i++) {
    columnRecords.push(...buildLevelFrame(structure, i, { includeSecondary: i === 1 }).columnRecords);
  }
  const wallSet = buildAllWalls(structure);
  const continuity = buildInterlevelContinuity(structure, {
    existingColumnRecords: columnRecords,
    wallTops: wallSet.wallTops
  });
  return { structure, columnRecords, wallSet, continuity };
}

test('五个带、八个面，构件 ID 唯一', () => {
  const { continuity } = setup();
  const bands = new Set(continuity.records.map((r) => r.bandId));
  assert.equal(bands.size, 5);
  for (const b of CONTINUITY_BANDS) {
    const recs = continuity.records.filter((r) => r.bandId === b.id);
    assert.ok(recs.length > 0, `${b.id} 没有构件`);
    const faces = new Set(recs.map((r) => r.faceIndex));
    assert.equal(faces.size, 8, `${b.id} 应覆盖 8 个面`);
  }
  const ids = continuity.records.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, '构件 ID 必须唯一');
  assert.ok(ids.every((id) => /^cont:(P1|P2|P3|P4|C5):face\d{2}:/.test(id)), 'ID 格式须稳定可预测');
});

test('P1 必须覆盖 [12.5, 14.8]（首层 2.30 m 绝对缺项）', () => {
  const { continuity } = setup();
  assert.equal(continuity.diagnostics.p1CoversRequired, true);
  const p1 = continuity.records.filter((r) => r.bandId === 'P1');
  const y0 = Math.min(...p1.map((r) => r.y0));
  const y1 = Math.max(...p1.map((r) => r.y1));
  assert.ok(y0 <= P1_REQUIRED_COVER.y0 + 1e-6, `P1 下沿 ${y0}`);
  assert.ok(y1 >= P1_REQUIRED_COVER.y1 - 1e-6, `P1 上沿 ${y1}`);
});

test('C5 归 bright-5，绝不造第五个暗层', () => {
  const { continuity } = setup();
  const c5 = continuity.records.filter((r) => r.bandId === 'C5');
  assert.ok(c5.length > 0);
  assert.ok(c5.every((r) => r.ownerGroup === 'bright-5'));
  const groups = new Set(continuity.records.map((r) => r.ownerGroup));
  assert.ok(!groups.has('hidden-5'), '不得出现 hidden-5');
});

test('各带归属：P1→hidden-1 … P4→hidden-4', () => {
  const { continuity } = setup();
  const expect = { P1: 'hidden-1', P2: 'hidden-2', P3: 'hidden-3', P4: 'hidden-4', C5: 'bright-5' };
  for (const [band, group] of Object.entries(expect)) {
    const recs = continuity.records.filter((r) => r.bandId === band);
    assert.ok(recs.every((r) => r.ownerGroup === group), `${band} 归属错`);
  }
});

test('所有坐标有限数，不产生零长或 NaN 构件', () => {
  const { continuity } = setup();
  for (const r of continuity.records) {
    for (const v of [...r.bbox.min, ...r.bbox.max]) {
      assert.ok(Number.isFinite(v), `${r.id} 坐标非有限数`);
    }
    assert.ok(r.bbox.max[0] > r.bbox.min[0] || r.bbox.max[1] > r.bbox.min[1], `${r.id} 包围盒退化`);
  }
});

test('生成函数不修改传入的 structure（纯函数）', () => {
  const { structure } = setup();
  const before = JSON.stringify(structure);
  buildInterlevelContinuity(structure, { existingColumnRecords: [], wallTops: {} });
  assert.equal(JSON.stringify(structure), before, 'structure 被改动了');
});

test('新增件一律标 estimate 并带来源', () => {
  const { continuity } = setup();
  for (const r of continuity.records) {
    assert.equal(r.certainty, 'estimate');
    assert.ok(Array.isArray(r.sourceIds) && r.sourceIds.length > 0);
  }
  assert.equal(CONTINUITY_ESTIMATES.certainty, 'estimate');
  assert.match(CONTINUITY_ESTIMATES.provenance, /not measured/);
});

test('连续度检测：完整模型 PASS', () => {
  const { structure, columnRecords, wallSet, continuity } = setup();
  const all = [...columnRecords, ...continuity.records];
  const res = analyzeContinuity({ records: all, structure, stepM: 0.1 });
  assert.equal(res.pass, true, `检测未通过：${JSON.stringify(res.failRanges)}`);
  for (const b of res.perBand) {
    assert.ok(b.maxBlankRunM <= MAX_BLANK_RUN_M, `${b.bandId} 空带 ${b.maxBlankRunM}`);
  }
});

test('连续度检测：抽掉 P1 整带构件必须 FAIL（负向用例）', () => {
  const { structure, columnRecords, continuity } = setup();
  // 模拟「P1 没做」：移除所有落在 P1 竖向区间内的构件（新增件 + 既有柱梁撑）
  const P1 = { y0: 12.5, y1: 17.0 };
  const inP1 = (r) => r.y1 > P1.y0 && r.y0 < P1.y1;
  const pruned = [...columnRecords, ...continuity.records].filter((r) => !inP1(r));
  const res = analyzeContinuity({ records: pruned, structure, stepM: 0.1 });
  assert.equal(res.pass, false, '移除 P1 整带构件后检测仍通过 → 检测器无效');
  const p1 = res.perBand.find((b) => b.bandId === 'P1');
  assert.ok(p1.maxBlankRunM > MAX_BLANK_RUN_M, `P1 应出现超阈空带，实际 ${p1.maxBlankRunM} m`);
});

test('连续度检测：缺少记录不得默认为 pass', () => {
  const res = analyzeContinuity({ records: [], structure: buildStructure() });
  assert.equal(res.pass, false);
  assert.match(res.reason, /不得默认为 pass/);
});

test('V4：已核实尺寸零改动', () => {
  assert.equal(dimensions.M01.valueM, 67.31);
  assert.equal(dimensions.M02.valueM, 30.27);
  assert.deepEqual(LEVELS.map((l) => l.outerFaceWidthM), [9.5472, 9.18, 8.8128, 8.4456, 7.956]);
  assert.deepEqual(LEVELS.map((l) => l.puzuoJump), [7, 7, 6, 5, 4]);
  assert.deepEqual(LEVELS.map((l) => l.outerColumnCount), [24, 24, 24, 24, 24]);
  assert.deepEqual(LEVELS.map((l) => l.innerColumnCount), [8, 8, 8, 8, 8]);
  assert.equal(LEVELS[0].outerColumnCount + LEVELS[0].innerColumnCount + 24, 56, '首层共 56 柱');
  assert.ok(Math.abs(MODULE_A.baseM + MODULE_A.bodyAndLotusM + MODULE_A.ironFinialM - 67.31) < 0.05);
});

test('台基 33 m、裙檐锚外槽、椽低瓦 0.26 m 等既定约束未被改动', () => {
  const { structure } = setup();
  assert.equal(structure.base.square.side, 33);
  const apron = structure.eaves[0];
  assert.equal(apron.innerRingMode, 'outer', '裙檐内端必须落在塔身外槽柱线');
  assert.equal(apron.ring, structure.levels[0].secondary.vertices, '裙檐外沿锚在副阶环');
});
