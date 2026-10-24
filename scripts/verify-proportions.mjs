#!/usr/bin/env node
/**
 * scripts/verify-proportions.mjs
 *
 * 应县木塔 3D 模型 —— 比例校验器
 *
 * 用途：把「模型实际采用的米制参数」与「独立核实的实测锚点」逐项比对，
 *      在真实浏览器视觉验收之前先拦住比例错误（整体偏高/偏低、收分反了、
 *      铺作跳数不对、柱数不对、塔基与塔身对不上等）。
 *
 * 用法：
 *   node scripts/verify-proportions.mjs <model-params.json>
 *   node scripts/verify-proportions.mjs --selftest
 *
 * 退出码：0 = 全部通过；1 = 存在未通过项；2 = 用法/IO 错误。
 *
 * 纯函数，无第三方依赖。
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REF = resolve(HERE, '..', 'handoff', 'sflipcloop', 'reference-dimensions.json');

/* ------------------------------------------------------------------ *
 * 纯函数核心
 * ------------------------------------------------------------------ */

const pctDiff = (actual, expected) =>
  expected === 0 ? Math.abs(actual) : (Math.abs(actual - expected) / Math.abs(expected)) * 100;

const fmt = (n) => (typeof n === 'number' ? Number(n.toFixed(4)).toString() : String(n));

function makeCheck(id, title, pass, expected, actual, detail = '') {
  return { id, title, pass: Boolean(pass), expected: fmt(expected), actual: fmt(actual), detail };
}

/**
 * 校验模型参数与实测锚点的一致性。
 * @param {object} model 模型参数（见 scripts/export-model-parameters.mjs）
 * @param {object} ref   实测锚点（reference-dimensions.json）
 */
export function checkModel(model, ref) {
  const t = ref.tolerances;
  const checks = [];
  const L = model.levels ?? [];

  // C01 通高
  const hErr = pctDiff(model.totalHeight, ref.overall.totalHeight);
  checks.push(
    makeCheck(
      'C01', '通高与实测 67.31 m 一致',
      hErr <= t.totalHeightPct,
      `${ref.overall.totalHeight} m ±${t.totalHeightPct}%`,
      `${model.totalHeight} m（偏差 ${hErr.toFixed(2)}%）`
    )
  );

  // C02 高径比
  const ratio = model.base ? model.totalHeight / model.base : NaN;
  checks.push(
    makeCheck(
      'C02', '高径比约 2.2（敦厚而不失高峻）',
      Number.isFinite(ratio) && ratio >= t.heightDiameterRatioMin && ratio <= t.heightDiameterRatioMax,
      `${t.heightDiameterRatioMin}–${t.heightDiameterRatioMax}`,
      Number.isFinite(ratio) ? ratio.toFixed(3) : 'N/A'
    )
  );

  // C03 逐层收分单调递减（外槽柱线边长 s）
  const sides = L.map((l) => l.outerFaceWidthM);
  const mono = sides.every((v, i) => i === 0 || v < sides[i - 1]);
  checks.push(
    makeCheck('C03', '逐层收分：上层柱线面宽严格小于下层', mono, '严格递减',
      sides.map((v) => v.toFixed(4)).join(' > '))
  );

  // C04 逐层面宽与北测实测均值的偏差
  const measured = ref.levels.map((r) => r.measuredFaceWidthM);
  const faceErrs = L.map((l, i) => (measured[i] ? pctDiff(l.outerFaceWidthM, measured[i]) : Infinity));
  const worstFace = faceErrs.indexOf(Math.max(...faceErrs));
  checks.push(
    makeCheck(
      'C04', '逐层外槽柱线面宽贴合北测实测均值',
      faceErrs.every((e) => e <= t.levelFaceWidthPct),
      `每层 ±${t.levelFaceWidthPct}%`,
      `最大偏差 ${Math.max(...faceErrs).toFixed(2)}% @${L[worstFace]?.name ?? '?'}`
    )
  );

  // C05 铺作跳数序列
  const seq = L.map((l) => l.puzuoJump);
  const wantSeq = ref.puzuoJumpSequence;
  checks.push(
    makeCheck(
      'C05', '各层外檐柱头铺作跳数 7/7/6/5/4',
      seq.length === wantSeq.length && seq.every((v, i) => v === wantSeq[i]),
      wantSeq.join('/'), seq.join('/')
    )
  );

  // C06 柱数
  const colOk = L.every(
    (l) => l.outerColumnCount === ref.columns.outerPerLevel && l.innerColumnCount === ref.columns.innerPerLevel
  );
  const colActual = L.length
    ? `外檐 ${[...new Set(L.map((l) => l.outerColumnCount))].join('/')} × 内槽 ${[...new Set(L.map((l) => l.innerColumnCount))].join('/')}`
    : 'N/A';
  checks.push(
    makeCheck(
      'C06', '每层外檐柱 24 根 / 内槽柱 8 根（8 面 × 3 间 / 每面 1 间）',
      colOk, `${ref.columns.outerPerLevel} / ${ref.columns.innerPerLevel}`, colActual
    )
  );

  // C07 开间划分
  const bayOk = L.every((l) => l.outerBaysPerFace === 3 && l.innerBaysPerFace === 1);
  checks.push(
    makeCheck(
      'C07', '外檐每面三间、内槽每面一间',
      bayOk, '外檐 3 / 内槽 1',
      `外檐 ${[...new Set(L.map((l) => l.outerBaysPerFace))].join('/')} / 内槽 ${[...new Set(L.map((l) => l.innerBaysPerFace))].join('/')}`
    )
  );

  // C08 A 模数：总高 − 台基 − 铁刹 ≈ 6A
  const body = model.totalHeight - (model.platform?.height ?? 0) - (model.finial?.iron ?? 0);
  const wantBody = ref.moduleA.derived.bodyToFinialBase;
  const bodyErr = pctDiff(body, wantBody);
  checks.push(
    makeCheck(
      'C08', '塔身高度分配符合 A 模数（总高−台基−铁刹 ≈ 6A = 52.98 m）',
      bodyErr <= t.bodyHeightPct,
      `${wantBody} m ±${t.bodyHeightPct}%`,
      `${body.toFixed(3)} m（偏差 ${bodyErr.toFixed(2)}%）`
    )
  );

  // C09 檐数 / 暗层 / 明层数
  checks.push(
    makeCheck(
      'C09', '五层六檐、四个暗层',
      model.eaves === ref.overall.eaves &&
        model.hiddenFloors === ref.overall.hiddenFloors &&
        L.length === ref.overall.levels,
      `${ref.overall.levels} 层 / ${ref.overall.eaves} 檐 / ${ref.overall.hiddenFloors} 暗层`,
      `${L.length} 层 / ${model.eaves} 檐 / ${model.hiddenFloors} 暗层`
    )
  );

  // C10 台基
  const p = model.platform ?? {};
  const pHeightErr = pctDiff(p.height ?? 0, ref.platform.height);
  const pUpperErr = pctDiff(p.upperOctagonDiagonal ?? 0, ref.platform.upperOctagonDiagonal);
  checks.push(
    makeCheck(
      'C10', '台基：约 4 m 高、上层八角基对角径 35.47 m',
      pHeightErr <= 2 && pUpperErr <= 3,
      `4.0 / 35.47`,
      `${fmt(p.height)} / ${fmt(p.upperOctagonDiagonal)}`
    )
  );

  // C11 塔刹分段
  const f = model.finial ?? {};
  const ironErr = pctDiff(f.iron ?? 0, ref.finial.ironFinial);
  const lotusErr = pctDiff(f.brickLotusBase ?? 0, ref.finial.brickLotusBase);
  const moduleErr = pctDiff(f.iron ?? 0, ref.finial.ironFinialModuleA);
  checks.push(
    makeCheck(
      'C11', '塔刹：铁刹 9.95 m（=1⅛A）、砖仰莲刹座 2.17 m',
      ironErr <= 3 && lotusErr <= 5 && moduleErr <= 3,
      '铁刹 9.95 ±3%，仰莲 2.17 ±5%',
      `铁刹 ${fmt(f.iron)} / 仰莲 ${fmt(f.brickLotusBase)}`
    )
  );

  // C12 八角几何自洽（若模型给出对边距）
  const withAF = L.filter((l) => typeof l.acrossFlats === 'number');
  const geoOk =
    withAF.length === 0 ||
    withAF.every((l) => pctDiff(l.acrossFlats, l.outerDiagonalM * ref.geometry.acrossFlatsFromDiagonal) <= 1);
  checks.push(
    makeCheck(
      'C12', '八角几何自洽：模型对边距 = 对角径 × cos22.5°',
      geoOk, '±1%',
      withAF.length ? `${withAF.length} 层已提供对边距并通过` : '模型未提供对边距（跳过）'
    )
  );

  // C13 外槽对角径 = s / sin(π/8)
  const diagErrs = L.map((l) => pctDiff(l.outerDiagonalM, l.outerFaceWidthM / Math.sin(Math.PI / 8)));
  checks.push(
    makeCheck(
      'C13', '八角几何自洽：外槽对角径 = 面宽 / sin(π/8)',
      diagErrs.every((e) => e <= t.diagonalSelfConsistencyPct),
      `±${t.diagonalSelfConsistencyPct}%`,
      `最大偏差 ${Math.max(...diagErrs).toFixed(3)}%`
    )
  );

  // C14 底层最远顶点距 = 公布底径 30.27 m
  const baseOk = typeof model.base === 'number' &&
    pctDiff(model.base, ref.overall.bodyOctagonDiagonal) <= t.baseDiagonalPct;
  checks.push(
    makeCheck(
      'C14', '底层最远顶点距（对角径）= 公布底径 30.27 m',
      baseOk,
      `${ref.overall.bodyOctagonDiagonal} m ±${t.baseDiagonalPct}%`,
      `${model.base} m（偏差 ${pctDiff(model.base ?? 0, ref.overall.bodyOctagonDiagonal).toFixed(3)}%）`
    )
  );

  const failed = checks.filter((c) => !c.pass).length;
  return { checks, failed, passed: checks.length - failed };
}

/* ------------------------------------------------------------------ *
 * 报告
 * ------------------------------------------------------------------ */

export function formatReport(result) {
  const lines = [];
  lines.push('应县木塔 3D 模型 —— 比例校验报告');
  lines.push('='.repeat(64));
  for (const c of result.checks) {
    lines.push(`[${c.pass ? '✅ 通过' : '❌ 未通过'}] ${c.id} ${c.title}`);
    lines.push(`         期望: ${c.expected}`);
    lines.push(`         实际: ${c.actual}`);
  }
  lines.push('='.repeat(64));
  lines.push(`合计 ${result.passed}/${result.checks.length} 项通过，${result.failed} 项未通过。`);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * 自检（--selftest）
 * ------------------------------------------------------------------ */

function idealModel(ref) {
  return {
    units: 'm',
    totalHeight: ref.overall.totalHeight,
    base: ref.overall.bodyOctagonDiagonal,
    eaves: ref.overall.eaves,
    hiddenFloors: ref.overall.hiddenFloors,
    platform: {
      height: ref.platform.height,
      lowerSquareSide: ref.platform.lowerSquareSide,
      upperOctagonDiagonal: ref.platform.upperOctagonDiagonal
    },
    finial: {
      brickLotusBase: ref.finial.brickLotusBase,
      iron: ref.finial.ironFinial
    },
    levels: ref.levels.map((r) => ({
      index: r.index,
      name: r.name,
      outerFaceWidthM: r.outerFaceWidthM,
      outerDiagonalM: r.outerDiagonalM,
      acrossFlats: r.outerDiagonalM * ref.geometry.acrossFlatsFromDiagonal,
      outerColumnCount: ref.columns.outerPerLevel,
      innerColumnCount: ref.columns.innerPerLevel,
      puzuoJump: r.puzuoJump,
      outerBaysPerFace: r.outerBaysPerFace,
      innerBaysPerFace: r.innerBaysPerFace,
      clearHeight: null
    }))
  };
}

export function runSelfTest(ref) {
  const failures = [];
  const assert = (cond, msg) => { if (!cond) failures.push(msg); };

  const ideal = checkModel(idealModel(ref), ref);
  assert(ideal.failed === 0, `理想模型应全通过，实际 ${ideal.failed} 项未通过：` +
    ideal.checks.filter((c) => !c.pass).map((c) => c.id).join(','));

  const mutants = [
    {
      name: '通高偏矮 60 m',
      expectFail: ['C01', 'C02', 'C08'],
      mutate: (m) => { m.totalHeight = 60; }
    },
    {
      name: '底层对角径写成 26 m',
      expectFail: ['C02', 'C14'],
      mutate: (m) => { m.base = 26; }
    },
    {
      name: '铺作跳数一律 7 跳',
      expectFail: ['C05'],
      mutate: (m) => { m.levels.forEach((l) => { l.puzuoJump = 7; }); }
    },
    {
      name: '三层反而比二层宽（收分反了）',
      expectFail: ['C03', 'C04', 'C13'],
      mutate: (m) => { m.levels[2].outerFaceWidthM = 9.9; m.levels[2].outerDiagonalM = 24.0; }
    },
    {
      name: '外檐柱减到 16 根',
      expectFail: ['C06'],
      mutate: (m) => { m.levels[0].outerColumnCount = 16; }
    },
    {
      name: '铁刹写成 6 m（严重偏短）',
      expectFail: ['C08', 'C11'],
      mutate: (m) => { m.finial.iron = 6; }
    },
    {
      name: '外檐每面两间',
      expectFail: ['C07'],
      mutate: (m) => { m.levels[0].outerBaysPerFace = 2; }
    },
    {
      name: '对边距与对角径不自洽',
      expectFail: ['C12'],
      mutate: (m) => { m.levels[0].acrossFlats = 20; }
    },
    {
      name: '面宽与对角径不自洽',
      expectFail: ['C13'],
      mutate: (m) => { m.levels[0].outerDiagonalM = 30; }
    }
  ];

  for (const mu of mutants) {
    const m = idealModel(ref);
    mu.mutate(m);
    const res = checkModel(m, ref);
    const failedIds = res.checks.filter((c) => !c.pass).map((c) => c.id);
    for (const id of mu.expectFail) {
      assert(failedIds.includes(id), `变异体「${mu.name}」应使 ${id} 未通过，实际失败集合 [${failedIds.join(',')}]`);
    }
  }

  return failures;
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function main(argv) {
  const ref = JSON.parse(readFileSync(DEFAULT_REF, 'utf8'));

  if (argv.includes('--selftest')) {
    const failures = runSelfTest(ref);
    if (failures.length) {
      console.error('自检失败：');
      for (const f of failures) console.error('  - ' + f);
      process.exit(1);
    }
    console.log('自检通过：理想模型 14 项全部通过；9 个变异体均被正确拦截。');
    process.exit(0);
  }

  const target = argv.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('用法: node scripts/verify-proportions.mjs <model-params.json> | --selftest');
    process.exit(2);
  }

  let model;
  try {
    model = JSON.parse(readFileSync(resolve(process.cwd(), target), 'utf8'));
  } catch (e) {
    console.error(`无法读取模型参数文件: ${target} —— ${e.message}`);
    process.exit(2);
  }

  const result = checkModel(model, ref);
  console.log(formatReport(result));
  process.exit(result.failed === 0 ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2));
}
