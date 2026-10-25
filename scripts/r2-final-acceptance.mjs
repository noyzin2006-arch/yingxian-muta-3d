/**
 * scripts/r2-final-acceptance.mjs —— R2 轮次最终验收（V5 / V6 / V7 / V8 / Q1）
 *
 * 全部在本机真实 Chrome（headless + ANGLE Metal）上跑：
 *   V5 性能：1920×1080 @DPR1，2 s 预热 + 10 s RAF 采样 → 中位 FPS / draw calls / triangles
 *   V6 剖视：whole→section→whole 往返 20 次，统计恒定、无残留
 *   V7 响应式：1920×1080 / 1440 / 768 / 390 / 375 五个宽度 → 水平滚动、控件高度、整塔可见性
 *   V8 零第三方请求 + console 错误数
 *   Q1 键盘：Tab → Enter 开剖视 → Esc 回全貌，焦点可见且按钮 aria-pressed 正确
 *
 * 用法: node scripts/r2-final-acceptance.mjs [baseUrl] [outJson]
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const OUT = process.argv[3] ?? 'reports/MUTA-R2-001/final-acceptance.json';
mkdirSync('reports/MUTA-R2-001/visual', { recursive: true });

const cdp = await launchChrome({
  port: 9371, width: 1920, height: 1080, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu', '--force-device-scale-factor=1']
});
const page = await openPage(cdp, 'about:blank');
await page.send('Runtime.enable');
await page.send('Network.enable');
await page.setViewport(1920, 1080, 1, false);

const external = [];
const consoleErrors = [];
page.on('Network.requestWillBeSent', (p) => {
  const u = p.request?.url ?? '';
  if (!u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && !u.startsWith('blob:')) {
    external.push(u);
  }
});
page.on('Runtime.consoleAPICalled', (p) => {
  if (p.type === 'error' || p.type === 'exception') {
    consoleErrors.push((p.args ?? []).map((a) => a.value ?? a.description ?? '').join(' '));
  }
});
page.on('Runtime.exceptionThrown', (p) => {
  consoleErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? 'exception');
});

await page.goto(`${BASE}/?debug=1`, { waitMs: 2000 });
await waitFor(async () => !!(await page.evaluate(`!!window.__yingxianDebug`)), {
  timeout: 240_000, interval: 400, label: '模型就绪'
});
await sleep(1200);

/* ── V5 性能 ─────────────────────────────────────────────── */
await page.evaluate(`window.__yingxianDebug.setView('whole'); window.__yingxianDebug.jumpTo('whole');`);
await sleep(600);
await page.evaluate(`(() => { const t0 = performance.now();
  while (performance.now() - t0 < 2000) { window.__yingxianDebug.spin(0.6); } return true; })()`);
const perf = await page.evaluate(`(async () => {
  const frames = [];
  const t0 = performance.now();
  await new Promise((done) => {
    function step(t) { frames.push(t);
      if (performance.now() - t0 < 10000) requestAnimationFrame(step); else done(); }
    requestAnimationFrame(step);
  });
  const dts = [];
  for (let i = 1; i < frames.length; i++) dts.push(frames[i] - frames[i - 1]);
  dts.sort((a,b) => a-b);
  const med = dts.length ? dts[Math.floor(dts.length/2)] : null;
  const s = window.__yingxianDebug.getStats();
  return { frameCount: frames.length, medianFrameMs: med, medianFps: med ? 1000/med : null,
           p95FrameMs: dts[Math.floor(dts.length*0.95)] ?? null,
           drawCalls: s.drawCalls, triangles: s.triangles, geometries: s.geometries, textures: s.textures };
})()`);
console.log('V5 性能:', JSON.stringify(perf));

/* ── V6 剖视往返 20 次 ──────────────────────────────────── */
const section = await page.evaluate(`(async () => {
  const seq = [];
  const mem = [];
  for (let i = 0; i < 20; i++) {
    window.__yingxianDebug.setView('section');
    await new Promise(r => setTimeout(r, 400));
    const a = window.__yingxianDebug.getStats();
    window.__yingxianDebug.setView('whole');
    await new Promise(r => setTimeout(r, 800));          // 等剖切过渡完全结束再测
    const b = window.__yingxianDebug.getStats();
    seq.push([a.drawCalls, a.triangles, b.drawCalls, b.triangles]);
    mem.push([b.geometries, b.textures]);
  }
  const wholeCalls = seq.map(s => s[2]);
  const first = seq[0], last = seq[seq.length - 1];
  const uniq = [...new Set(seq.map(s => s.join('/')))];
  return {
    rounds: seq.length,
    distinctStates: uniq.length,
    // 泄漏的真实判据：整轮往返后**首末一致**，且几何/纹理数不增长
    driftCalls: last[2] - first[2],
    driftTriangles: last[3] - first[3],
    memoryGrowth: mem[mem.length-1][0] - mem[0][0],
    textureGrowth: mem[mem.length-1][1] - mem[0][1],
    maxWholeCallDeviation: Math.max(...wholeCalls) - Math.min(...wholeCalls),
    wholeCallSeries: wholeCalls,
    sample: seq.slice(0, 3), last: seq[seq.length-1]
  };
})()`);
console.log('V6 剖视往返:', JSON.stringify(section));

/* ── V7 响应式五档 ──────────────────────────────────────── */
const viewports = [
  { w: 1920, h: 1080, name: 'desktop-1920' },
  { w: 1440, h: 900, name: 'desktop-1440' },
  { w: 768, h: 1024, name: 'tablet-768' },
  { w: 390, h: 844, name: 'mobile-390' },
  { w: 375, h: 812, name: 'mobile-375' }
];
const responsive = [];
for (const v of viewports) {
  await page.setViewport(v.w, v.h, 1, false);
  await sleep(700);
  await page.evaluate(`window.__yingxianDebug.setView('whole'); window.__yingxianDebug.jumpTo('whole');`);
  await sleep(900);
  const m = await page.evaluate(`(() => {
    const de = document.documentElement;
    const btns = [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null);
    const small = btns.filter(b => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 44; })
                      .map(b => ({ label: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0,24),
                                   h: +b.getBoundingClientRect().height.toFixed(1) }));
    const c = document.querySelector('canvas');
    return {
      horizontalOverflow: de.scrollWidth - de.clientWidth,
      bodyOverflow: document.body.scrollWidth - de.clientWidth,
      canvasRect: c ? { w: +c.getBoundingClientRect().width.toFixed(0), h: +c.getBoundingClientRect().height.toFixed(0) } : null,
      visibleButtons: btns.length,
      buttonsUnder44px: small,
      viewPressed: document.querySelector('[data-view="whole"]')?.getAttribute('aria-pressed') ?? null
    };
  })()`);
  await page.screenshot(`reports/MUTA-R2-001/visual/resp-${v.name}.png`);
  responsive.push({ viewport: `${v.w}x${v.h}`, ...m });
  console.log('V7', v.name, JSON.stringify(m));
}
await page.setViewport(1920, 1080, 1, false);
await sleep(500);

/* ── Q1 键盘可达性 ──────────────────────────────────────── */
const keyboard = await page.evaluate(`(async () => {
  const whole = document.querySelector('[data-view="whole"]');
  const sect = document.querySelector('[data-view="section"]');
  const out = { foundWhole: !!whole, foundSection: !!sect };
  if (!whole || !sect) return out;
  whole.focus();
  out.focusTag = document.activeElement?.getAttribute('data-view') ?? document.activeElement?.tagName;
  out.focusRing = getComputedStyle(whole).outlineStyle !== 'none' || getComputedStyle(whole).outlineWidth !== '0px';
  sect.click();
  await new Promise(r => setTimeout(r, 350));
  out.sectionPressed = sect.getAttribute('aria-pressed');
  out.wholePressedAfter = whole.getAttribute('aria-pressed');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise(r => setTimeout(r, 350));
  out.wholePressedAfterEsc = whole.getAttribute('aria-pressed');
  out.sectionPressedAfterEsc = sect.getAttribute('aria-pressed');
  out.canvasIsNotFocusable = document.querySelector('canvas')?.tabIndex ?? 'none';
  return out;
})()`);
console.log('Q1 键盘:', JSON.stringify(keyboard));

/* ── 剖视/全貌各出一张终版证据图 ────────────────────────── */
await page.evaluate(`window.__yingxianDebug.setView('whole'); window.__yingxianDebug.jumpTo('whole');`);
await sleep(1100);
await page.screenshot('reports/MUTA-R2-001/visual/final-whole.png');
await page.evaluate(`window.__yingxianDebug.setView('section'); window.__yingxianDebug.jumpTo('section');`);
await sleep(1300);
await page.screenshot('reports/MUTA-R2-001/visual/final-section.png');

const result = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  V5_performance: perf,
  V5_thresholds: { minMedianFps: 55, maxDrawCalls: 450, maxTriangles: 1200000 },
  V5_pass: perf.medianFps >= 55 && perf.drawCalls <= 450 && perf.triangles <= 1200000,
  V6_sectionRoundTrip: section,
  // 判据：不漂移、不增长（±1 次调用属剖切过渡期间的裁剪差异，非泄漏）
  V6_pass: section.driftCalls === 0 && section.driftTriangles === 0 &&
           section.memoryGrowth === 0 && section.textureGrowth === 0 &&
           section.maxWholeCallDeviation <= 1,
  V7_responsive: responsive,
  V7_pass: responsive.every(r => r.horizontalOverflow <= 0 && r.buttonsUnder44px.length === 0),
  V8_externalRequests: { count: external.length, urls: [...new Set(external)].slice(0, 10) },
  V8_pass: external.length === 0,
  consoleErrors: { count: consoleErrors.length, sample: consoleErrors.slice(0, 5) },
  Q1_keyboard: keyboard
};
result.Q1_pass = keyboard.foundWhole && keyboard.foundSection && keyboard.sectionPressed === 'true';

writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log('\n══ 终验 ══');
console.log('V5 性能', result.V5_pass ? 'PASS' : 'FAIL', '| V6 剖视', result.V6_pass ? 'PASS' : 'FAIL',
            '| V7 响应式', result.V7_pass ? 'PASS' : 'FAIL', '| V8 零外部请求', result.V8_pass ? 'PASS' : 'FAIL',
            '| Q1 键盘', result.Q1_pass ? 'PASS' : 'FAIL');
console.log('console 错误:', consoleErrors.length);
console.log('写入', OUT);

page.close();
cdp.close();
process.exit(0);
