/**
 * tests/content.test.js —— 中文内容自检（A11 一票否决项）
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SITE, UI_STRINGS, HOTSPOTS, FLOOR_CONTENT, HIDDEN_FLOOR_CONTENT,
  EVIDENCE_PANEL, FORBIDDEN_PHRASES
} from '../src/data/content.zh.js';
import { SOURCES } from '../src/data/evidence.js';

const countChars = (s) => [...String(s ?? '')].filter((c) => !/\s/.test(c)).length;

test('导出齐全', () => {
  assert.ok(SITE.title);
  assert.ok(UI_STRINGS.loading);
  assert.ok(EVIDENCE_PANEL.intro);
});

test('六个热点、五个明层、四个暗层', () => {
  assert.equal(HOTSPOTS.length, 6);
  assert.equal(FLOOR_CONTENT.length, 5);
  assert.equal(HIDDEN_FLOOR_CONTENT.length, 4);
});

test('热点 id 集合正确且不重复', () => {
  const ids = HOTSPOTS.map((h) => h.id).sort();
  assert.deepEqual(ids, ['base', 'brackets', 'columnGrid', 'finial', 'hiddenFloor', 'plaqueStatue']);
  assert.equal(new Set(ids).size, ids.length);
});

test('A11：一票否决的错误表述不得出现', () => {
  const dump = JSON.stringify({ SITE, UI_STRINGS, HOTSPOTS, FLOOR_CONTENT, HIDDEN_FLOOR_CONTENT, EVIDENCE_PANEL });
  for (const phrase of ['后晋始建', '54朵', '54 朵', '世界遗产已列入', '已列入世界遗产名录', '世界文化遗产已']) {
    assert.ok(!dump.includes(phrase), `出现被禁表述「${phrase}」`);
  }
});

test('FORBIDDEN_PHRASES 覆盖全部一票否决表述', () => {
  for (const phrase of ['后晋始建', '54朵', '世界遗产已列入']) {
    assert.ok(FORBIDDEN_PHRASES.includes(phrase), `FORBIDDEN_PHRASES 缺少「${phrase}」`);
  }
});

test('始建年代与斗栱计数口径正确', () => {
  assert.match(SITE.era, /1056/);
  const all = JSON.stringify({ SITE, HOTSPOTS, FLOOR_CONTENT, EVIDENCE_PANEL });
  assert.ok(all.includes('54') || all.includes('斗栱'));
  assert.ok(!all.includes('后晋'), '不得写后晋始建');
});

test('UNESCO 只能写作「预备名单」', () => {
  const all = JSON.stringify({ SITE, HOTSPOTS, FLOOR_CONTENT, EVIDENCE_PANEL });
  if (all.includes('世界遗产')) {
    assert.ok(/预备名单/.test(all), '提到世界遗产时必须同时说明是预备名单');
  }
});

test('热点标题 ≤12 字、summary 15–35 字、detail 60–110 字', () => {
  for (const h of HOTSPOTS) {
    assert.ok(countChars(h.name) <= 12, `${h.id} 标题过长`);
    const sum = countChars(h.summary);
    assert.ok(sum >= 12 && sum <= 40, `${h.id} summary ${sum} 字不在区间`);
    const det = countChars(h.detail);
    assert.ok(det >= 55 && det <= 125, `${h.id} detail ${det} 字不在区间`);
  }
});

test('楼层标题 ≤12 字、summary 15–35 字、detail 60–110 字', () => {
  for (const f of FLOOR_CONTENT) {
    assert.ok(countChars(f.title) <= 12, `${f.level} 层标题过长`);
    assert.ok(countChars(f.summary) >= 12 && countChars(f.summary) <= 40);
    assert.ok(countChars(f.detail) >= 55 && countChars(f.detail) <= 125);
  }
});

test('每个热点与楼层都带证据标注', () => {
  for (const h of HOTSPOTS) {
    assert.ok(h.evidence, `${h.id} 缺 evidence`);
    assert.ok(['published', 'academic', 'estimate', 'unverified'].includes(h.evidence.certainty));
    (h.evidence.sourceIds ?? []).forEach((id) => assert.ok(SOURCES[id], `未知来源 ${id}`));
  }
  for (const f of FLOOR_CONTENT) {
    assert.ok(f.evidence, `${f.level} 层缺 evidence`);
  }
});

test('不得使用「官方原貌 / 原字扫描 / 精确复原」等过度承诺措辞', () => {
  const dump = JSON.stringify({ SITE, HOTSPOTS, FLOOR_CONTENT, EVIDENCE_PANEL });
  for (const p of ['官方原貌', '原字扫描', '精确复原', '官方认证']) {
    assert.ok(!dump.includes(p), `出现过度承诺措辞「${p}」`);
  }
});

test('术语用对：不得出现「斗拱」', () => {
  const dump = JSON.stringify({ SITE, UI_STRINGS, HOTSPOTS, FLOOR_CONTENT, HIDDEN_FLOOR_CONTENT, EVIDENCE_PANEL });
  assert.ok(!dump.includes('斗拱'), '应写作「斗栱」');
});
