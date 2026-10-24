/**
 * scripts/export-model-parameters.mjs
 *
 * 从**实际使用的结构数据**导出模型参数，写入 reports/model-parameters.json，
 * 供 scripts/verify-proportions.mjs 与实测锚点逐项比对。
 *
 * 用法: node scripts/export-model-parameters.mjs [outFile]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { buildStructure, EST } from '../src/data/structure.js';
import { MODULE_A } from '../src/data/dimensions.js';

const out = process.argv[2] ?? 'reports/model-parameters.json';
const s = buildStructure();

const l1 = s.levels[0];
const secVerts = l1.secondary?.vertices ?? l1.outer.vertices;
// 底层最远顶点距（对角径）：与 M02 同口径
let base = 0;
secVerts.forEach((v) => { base = Math.max(base, Math.hypot(v.x, v.z)); });
base *= 2;

const model = {
  generatedAt: new Date().toISOString(),
  units: 'm',
  measurementDatum: 'totalHeight = 地面至刹顶；base = 底层塔身最远顶点距（对角径）',
  totalHeight: s.finial.y1,
  base: Number(base.toFixed(4)),
  ratio: Number((s.finial.y1 / base).toFixed(4)),
  eaves: s.eaves.length,
  hiddenFloors: s.hiddenFloors.length,
  platform: {
    height: s.base.octagonal.y1 - s.base.square.y0,
    lowerSquareSide: s.base.square.side,
    upperOctagonDiagonal: s.base.octagonal.diagonal
  },
  finial: {
    brickLotusBase: Number((EST.finial.brickLotus.y1 - EST.finial.brickLotus.y0).toFixed(3)),
    iron: Number(EST.finial.segments.reduce((sum, g) => sum + g.height, 0).toFixed(3))
  },
  moduleA: MODULE_A,
  levels: s.levels.map((lv) => ({
    index: lv.index,
    name: lv.name,
    outerFaceWidthM: lv.outer.side,
    outerDiagonalM: lv.outer.diagonal,
    outerColumnCount: lv.outer.columnCount,
    innerColumnCount: lv.inner.columnCount,
    puzuoJump: lv.puzuo.plane ?? lv.puzuo.jump,
    outerBaysPerFace: 3,
    innerBaysPerFace: 1,
    clearHeight: Number(((lv.columnTopY ?? lv.band.y1) - lv.band.y0).toFixed(3)),
    columnTopY: Number((lv.columnTopY ?? lv.band.y1).toFixed(3))
  })),
  eaveConfig: s.eaves.map((e) => ({
    name: e.name, y: e.y, offset: e.offset, rise: e.rise,
    ownerLevel: e.ownerLevel, isApex: e.isApex
  }))
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(model, null, 2));
console.log(`已导出 ${out}`);
console.log(`  通高 ${model.totalHeight} m　底层最远顶点距 ${model.base} m　高径比 ${model.ratio}`);
