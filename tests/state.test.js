/**
 * tests/state.test.js —— 状态机自检
 *
 * 规划 §3.2：任何状态变化都必须有可见反馈；不能只有状态码。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore, VIEWS, LIGHTS, QUALITIES } from '../src/app/state.js';

test('初始状态', () => {
  const s = createStore();
  const st = s.get();
  assert.equal(st.boot, 'boot');
  assert.equal(st.view, 'whole');
  assert.equal(st.light, 'day');
  assert.equal(st.quality, 'auto');
  assert.equal(st.modal, null);
  assert.equal(st.selectedHotspot, null);
});

test('订阅会收到初始化与后续变更', () => {
  const s = createStore();
  const seen = [];
  s.subscribe((state, reason) => seen.push(reason));
  s.setLight('night');
  assert.ok(seen.includes('init'));
  assert.ok(seen.includes('light'));
});

test('取消订阅后不再收到通知', () => {
  const s = createStore();
  const seen = [];
  const off = s.subscribe((_s, reason) => seen.push(reason));
  off();
  s.setLight('sunset');
  assert.equal(seen.length, 1, '仅应保留 init');
});

test('setView 支持 floor-N 并解析出层号', () => {
  const s = createStore();
  s.setView('floor-3');
  assert.equal(s.get().view, 'floor');
  assert.equal(s.get().floor, 3);
});

test('切换模式会清空热点选择', () => {
  const s = createStore();
  s.selectHotspot('brackets');
  assert.equal(s.get().selectedHotspot, 'brackets');
  s.setView('section');
  assert.equal(s.get().selectedHotspot, null);
});

test('同一热点再次点击取消选择', () => {
  const s = createStore();
  s.selectHotspot('finial');
  s.selectHotspot('finial');
  assert.equal(s.get().selectedHotspot, null);
});

test('非法取值被拒绝', () => {
  const s = createStore();
  const before = JSON.stringify(s.get());
  s.setLight('rainbow');
  s.setQuality('ultra');
  assert.equal(JSON.stringify(s.get()), before);
});

test('toggleModal 可开可关', () => {
  const s = createStore();
  s.toggleModal('evidence');
  assert.equal(s.get().modal, 'evidence');
  s.toggleModal('evidence');
  assert.equal(s.get().modal, null);
});

test('进度可更新', () => {
  const s = createStore();
  s.setProgress('正在生成斗栱', 3, 8);
  assert.deepEqual(s.get().progress, { stage: '正在生成斗栱', done: 3, total: 8 });
});

test('失败态带错误信息', () => {
  const s = createStore();
  s.fail('boom');
  assert.equal(s.get().boot, 'failed');
  assert.equal(s.get().error, 'boom');
});

test('枚举值完整', () => {
  assert.deepEqual([...VIEWS], ['whole', 'section', 'exploded']);
  assert.deepEqual([...LIGHTS], ['day', 'sunset', 'night']);
  assert.ok(QUALITIES.includes('auto'));
});
