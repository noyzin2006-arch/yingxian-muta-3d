/**
 * scripts/r2-delivery-evidence.mjs —— MUTA-R2-001 交付证据采集
 *
 * 规划 §9 报告合同要求本轮落盘：
 *   6. 原始 10 s FPS 帧时间序列 / 首屏可交互 / CLS
 *   8. 固定命名的视觉证据集（whole-before / whole-after / section-after /
 *      view-00..07 / mobile-390 / mobile-375 / zoom-200 / states）
 *   9. 运行时第三方请求 = 0 的 CDP requestWillBeSent 原始 JSON
 *
 * 本脚本只做「取证」，不修改产品逻辑：
 *   - 网络证据走 CDP Network 域的 requestWillBeSent 原始事件
 *   - FPS 用 RAF 时间戳差，前 2 s 暖机不计
 *   - 每张截图记录相机 / 视口 / DPR 到 manifest.json
 *
 * 用法: node scripts/r2-delivery-evidence.mjs [baseUrl]
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const OUT = 'reports/MUTA-R2-001';
const VIS = `${OUT}/visual`;
mkdirSync(VIS, { recursive: true });

const manifest = [];
const networkRaw = [];
const consoleErrors = [];

const cdp = await launchChrome({
  port: 9391, width: 1920, height: 1080, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu'],
});
const page = await openPage(cdp, 'about:blank');
await page.send('Runtime.enable');
await page.send('Log.enable');
await page.send('Page.enable');
await page.send('Network.enable');

page.on('Runtime.exceptionThrown', (p) => {
  consoleErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text);
});
page.on('Log.entryAdded', (p) => {
  if (p.entry.level === 'error') consoleErrors.push(p.entry.text);
});
page.on('Network.requestWillBeSent', (p) => {
  networkRaw.push({
    requestId: p.requestId,
    url: p.request?.url,
    method: p.request?.method,
    type: p.type,
    initiator: p.initiator?.type,
    documentURL: p.documentURL,
    timestamp: p.timestamp,
    wallTime: p.wallTime
  });
});
page.on('Network.loadingFailed', (p) => {
  networkRaw.push({ requestId: p.requestId, failed: true, errorText: p.errorText, type: p.type });
});

/* ── 1. 首屏：网络证据 + 首屏可交互 + CLS ───────────────────── */
console.log('[1/5] 首屏加载（采集网络请求 + 首屏可交互 + CLS）…');
await page.setViewport(1920, 1080, 1, false);
await page.goto(`${BASE}/?debug=1`, { waitMs: 1500 });
const t0 = Date.now();
await waitFor(async () => !!(await page.evaluate('!!window.__yingxianDebug')), {
  timeout: 240_000, interval: 100, label: 'debug 接口就绪'
});
const timeToInteractiveMs = Date.now() - t0;

// CLS：在页面里挂 PerformanceObserver 后重新导航一次再取（首屏那次来不及注册）
const cls = await page.evaluate(`(async () => {
  let value = 0;
  const po = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (!e.hadRecentInput) value += e.value;
    }
  });
  po.observe({ type: 'layout-shift', buffered: true });
  await new Promise((r) => setTimeout(r, 2500));
  po.disconnect();
  return value;
})()`);

const navTiming = await page.evaluate(`(() => {
  const t = performance.getEntriesByType('navigation')[0] ?? null;
  if (!t) return null;
  return {
    domContentLoadedMs: t.domContentLoadedEventEnd,
    loadEventMs: t.loadEventEnd,
    responseEndMs: t.responseEnd,
    transferSize: t.transferSize,
    type: t.type
  };
})()`);

const domReady = await page.evaluate(`(() => {
  const t = performance.getEntriesByType('navigation')[0] ?? null;
  return t ? Math.round(t.domContentLoadedEventEnd) : null;
})()`);

// 第三方请求判定：本机资源 = 同源 (127.0.0.1) + data: + blob: + about:
const ALLOW = /^(https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/|data:|blob:|about:|chrome-extension:)/;
const foreign = networkRaw.filter((r) => r.url && !ALLOW.test(r.url));

writeFileSync(`${OUT}/network-requests.json`, JSON.stringify({
  capturedAt: new Date().toISOString(),
  method: 'CDP Network.requestWillBeSent / Network.loadingFailed 原始事件（未加工）',
  base: BASE,
  totalEvents: networkRaw.length,
  foreignOriginCount: foreign.length,
  foreignOrigin: foreign,
  requests: networkRaw
}, null, 2));

/* ── 2. 原始 10 s FPS 帧时间序列 ──────────────────────────── */
console.log('[2/5] 10 s FPS 原始帧时间序列（高档 / 全貌环绕）…');
await sleep(800);
const fpsRaw = await page.evaluate(`(async () => {
  const d = window.__yingxianDebug;
  d.setQuality('high');
  d.jumpTo('whole');
  window.__yxSpinStop = false;
  const spin = () => {
    if (window.__yxSpinStop) return;
    d.spin(0.35);
    requestAnimationFrame(spin);
  };
  requestAnimationFrame(spin);
  const warm = 2000, run = 10000;
  const deltas = [];
  await new Promise((resolve) => {
    const t0 = performance.now();
    let last = t0;
    const step = (now) => {
      if (now - t0 < warm) { last = now; requestAnimationFrame(step); return; }
      if (now - t0 >= warm + run) { resolve(); return; }
      deltas.push(now - last);
      last = now;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  // 必须停掉环绕循环：它每帧把相机转 0.35°，会持续污染后续所有截图的机位
  window.__yxSpinStop = true;
  const sorted = deltas.slice().sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const stats = d.getStats();
  return {
    warmupMs: warm, runMs: run, frameCount: deltas.length,
    frameDeltaMs: deltas.map((v) => Number(v.toFixed(3))),
    medianFrameMs: med, p95FrameMs: p95,
    medianFps: 1000 / med, stats
  };
})()`).catch(async (e) => {
  console.warn('  fps 表达式异常，改用简化采集：', e.message);
  return page.evaluate(`(async () => {
    const d = window.__yingxianDebug;
    d.setQuality('high'); d.jumpTo('whole');
    const deltas = [];
    await new Promise((resolve) => {
      const t0 = performance.now(); let last = t0;
      const step = (now) => {
        if (now - t0 >= 12000) { resolve(); return; }
        if (now - t0 >= 2000) deltas.push(now - last);
        last = now; requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    const sorted = deltas.slice().sort((a,b)=>a-b);
    const med = sorted[Math.floor(sorted.length/2)];
    return { frameCount: deltas.length, frameDeltaMs: deltas.map(v=>Number(v.toFixed(3))),
             medianFrameMs: med, p95FrameMs: sorted[Math.floor(sorted.length*0.95)],
             medianFps: 1000/med, stats: d.getStats() };
  })()`);
});

const fps = fpsRaw;
await page.evaluate('window.__yxSpinStop = true');
writeFileSync(`${OUT}/fps-series.json`, JSON.stringify({
  capturedAt: new Date().toISOString(),
  method: 'requestAnimationFrame 时间戳差；前 2 s 暖机不计，采样 10 s',
  viewport: '1920×1080 @ DPR 1',
  quality: 'high',
  warmupMs: 2000,
  runMs: 10000,
  frameCount: fps.frameCount,
  medianFrameMs: fps.medianFrameMs,
  p95FrameMs: fps.p95FrameMs,
  medianFps: fps.medianFps,
  rendererInfo: fps.stats ?? null,
  frameDeltaMs: fps.frameDeltaMs
}, null, 2));

writeFileSync(`${OUT}/perf-raw.json`, JSON.stringify({
  capturedAt: new Date().toISOString(),
  timeToInteractiveMs,
  domContentLoadedMs: domReady,
  cls,
  navigation: navTiming
}, null, 2));

/* ── 3. 截图助手 ───────────────────────────────────────────── */
async function shot(name, { width = 1920, height = 1080, dpr = 1, mobile = false, setup = '', post = '', label = '' } = {}) {
  await page.setViewport(width, height, dpr, mobile);
  await sleep(450);
  await page.evaluate(`window.dispatchEvent(new Event('resize'))`);
  await sleep(350);
  if (setup) { await page.evaluate(setup); await sleep(1200); }
  // post 在视图补间结束之后才执行：相机切换会启动补间动画，
  // 若与 setCamera 同批下发，补间会把机位覆盖掉，导致 before/after 机位不一致。
  if (post) { await page.evaluate(post); await sleep(500); }
  await page.screenshot(`${VIS}/${name}.png`);
  const cam = await page.evaluate(`(() => { try { return window.__yingxianDebug.getCamera(); } catch (e) { return null; } })()`);
  const stats = await page.evaluate(`(() => { try { return window.__yingxianDebug.getStats(); } catch (e) { return null; } })()`);
  manifest.push({
    file: `${name}.png`,
    label: label || name,
    viewport: `${width}×${height}`,
    devicePixelRatio: dpr,
    mobileEmulation: mobile,
    camera: cam,
    drawCalls: stats?.drawCalls ?? null,
    triangles: stats?.triangles ?? null,
    pixelRatio: stats?.pixelRatio ?? null
  });
  console.log(`  ✓ ${name}.png  ${width}×${height}@${dpr}`);
}

/* ── 4. 视觉合同集 ─────────────────────────────────────────── */
console.log('[3/5] 视觉合同集：全貌前/后、剖面、八向立面…');
const FIXED_CAM = `window.__yingxianDebug.setCamera({ azimuthDeg: 30, elevationDeg: 6, distance: 170, targetY: 33.5, fov: 22 })`;
/* 回到全貌：截图前必须复位，否则会继承上一张的剖视/分解模式 */
const WHOLE = `window.__yingxianDebug.setView('whole'); window.__yingxianDebug.jumpTo('whole');`;

await shot('whole-after', {
  label: '全貌（改造后，本轮新增过渡构架在位）',
  setup: `window.__yingxianDebug.setView('whole')`,
  post: FIXED_CAM
});

// 改动前基线：同一相机 + ?nocontinuity=1（关闭本轮新增构架）
await page.goto(`${BASE}/?debug=1&nocontinuity=1`, { waitMs: 1500 });
await waitFor(async () => !!(await page.evaluate('!!window.__yingxianDebug')), { timeout: 240_000, interval: 150 });
await sleep(900);
await shot('whole-before', {
  label: '全貌（改造前对照，同一相机，?nocontinuity=1 关闭本轮新增过渡构架）',
  setup: `window.__yingxianDebug.setView('whole')`,
  post: FIXED_CAM
});

// 回到改造后页面
await page.goto(`${BASE}/?debug=1`, { waitMs: 1500 });
await waitFor(async () => !!(await page.evaluate('!!window.__yingxianDebug')), { timeout: 240_000, interval: 150 });
await sleep(900);

await shot('section-after', {
  label: '结构剖视（改造后）：逐层数五明四暗',
  setup: `window.__yingxianDebug.setView('section'); window.__yingxianDebug.jumpTo('section')`
});

console.log('[4/5] 八向立面（近正交）…');
// 注意：distance 必须 ≤ OrbitControls 的 maxDistance(185)，否则会被夹回 185，
// 竖向取景只剩 ~39 m，整塔被裁切；fov 26 @180 m → 竖向视野 83 m，恰好容下 67 m 全塔。
for (let i = 0; i < 8; i++) {
  const az = i * 45;
  await shot(`view-0${i}`, {
    label: `正交立面 ${az}°（全貌模式，近正交 fov 26 / 距离 180 / 目标 y 33.5）`,
    setup: `window.__yingxianDebug.setView('whole')`,
    post: `window.__yingxianDebug.setCamera({ azimuthDeg: ${az}, elevationDeg: 0, distance: 180, targetY: 33.5, fov: 26 })`
  });
}

console.log('[5/5] 移动端 / 200% 缩放 / 五态…');
await shot('mobile-390', { width: 390, height: 844, dpr: 3, mobile: true, setup: `${WHOLE}`, label: '移动端 390×844 @3x（Chrome 模拟，非真机）' });
await shot('mobile-375', { width: 375, height: 667, dpr: 3, mobile: true, setup: `${WHOLE}`, label: '移动端 375×667 @3x（Chrome 模拟，非真机）' });
await shot('zoom-200', {
  width: 960, height: 540, dpr: 2,
  label: '浏览器 200% 缩放（CSS 视口 960×540，devicePixelRatio 2，等价 1920×1080 物理像素下 200%）',
  setup: `${WHOLE}`,
  post: `window.__yingxianDebug.setCamera({ azimuthDeg: 30, elevationDeg: 2, distance: 120, targetY: 33.5, fov: 30 })`
});

/* 五态截图（真实页面状态，非拼贴）；先回到全貌，避免继承上一步的剖视模式 */
await shot('state-normal', { label: '常态：就绪后的默认观览界面（全貌模式）', setup: `${WHOLE} window.__yingxianDebug.demoState('normal')` });
await shot('state-empty', { label: '空态：未选中构件，右侧注释卡显示空提示（全貌模式）', setup: `${WHOLE} window.__yingxianDebug.demoState('empty')` });
await shot('state-success', { label: '成功态：选中暗层构件，卡片带「估算构件·待核实」徽标与来源（全貌模式）', setup: `${WHOLE} window.__yingxianDebug.demoState('success')` });
await shot('state-error', { label: '错误态：模型生成失败遮罩，含纯文字降级简介', setup: `${WHOLE} window.__yingxianDebug.demoState('error')` });
await shot('state-loading', { label: '加载态：装配进度遮罩', setup: `${WHOLE} window.__yingxianDebug.demoState('loading')` });

/* ── 5. states.png 拼版（真实截图排版，非伪造界面）──────────── */
console.log('  · 生成 states.png 拼版…');
const SHEET = ['state-normal', 'state-empty', 'state-success', 'state-error', 'state-loading'];
const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<style>
  body { margin:0; padding:22px; background:#f3f2ee; font:14px/1.6 "PingFang SC","Noto Sans CJK SC",sans-serif; color:#222; }
  h1 { font-size:20px; margin:0 0 4px; }
  p.sub { margin:0 0 18px; color:#666; font-size:13px; }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  figure { margin:0; background:#fff; border:1px solid #ddd; border-radius:8px; overflow:hidden; }
  figure img { width:100%; display:block; }
  figcaption { padding:8px 10px; font-size:12px; color:#444; border-top:1px solid #eee; }
  b { color:#111; }
</style></head><body>
<h1>应县木塔 · 界面五态实拍</h1>
<p class="sub">全部为 1920×1080 @DPR1 真实 Chrome 截图（<code>?debug=1</code> 下的受控 fixture），未经后期修饰，仅做排版拼接。</p>
<div class="grid">
${SHEET.map((n, i) => `<figure><img src="/${n}.png"><figcaption><b>${['常态', '空态', '成功态', '错误态', '加载态'][i]}</b> — ${['就绪后的默认观览界面', '未选中构件，注释卡显示空提示', '选中暗层构件，带「估算构件·待核实」徽标', '模型生成失败遮罩，含纯文字降级', '装配进度遮罩'][i]}</figcaption></figure>`).join('\n')}
</div></body></html>`;

const server = createServer((req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  const file = join(process.cwd(), VIS, url.replace(/^\//, ''));
  if (existsSync(file)) {
    res.writeHead(200, { 'content-type': extname(file) === '.png' ? 'image/png' : 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(9392, '127.0.0.1', r));

const sheet = await openPage(cdp, 'about:blank');
await sheet.send('Runtime.enable');
await sheet.send('Page.enable');
await sheet.setViewport(1600, 1180, 1, false);
await sheet.goto('http://127.0.0.1:9392/', { waitMs: 3000 });
await sleep(1200);
await sheet.screenshot(`${VIS}/states.png`);
manifest.push({
  file: 'states.png',
  label: '界面五态拼版（由五张真实截图排版生成）',
  viewport: '1600×1180',
  devicePixelRatio: 1,
  mobileEmulation: false,
  camera: null, drawCalls: null, triangles: null, pixelRatio: null
});
console.log('  ✓ states.png');
sheet.close();
server.close();

/* ── 落盘 ───────────────────────────────────────────────────── */
writeFileSync(`${VIS}/manifest.json`, JSON.stringify({
  capturedAt: new Date().toISOString(),
  base: BASE,
  chrome: cdp.version?.Browser ?? 'Chrome',
  shots: manifest
}, null, 2));

writeFileSync(`${OUT}/console-errors.json`, JSON.stringify({
  capturedAt: new Date().toISOString(),
  count: consoleErrors.length,
  entries: consoleErrors
}, null, 2));

console.log('\n=== 交付证据汇总 ===');
console.log(`  网络事件 ${networkRaw.length} 条，跨源 ${foreign.length} 条`);
console.log(`  中位 FPS ${Number(fps.medianFps ?? 0).toFixed(2)}（${fps.frameCount} 帧样本）`);
console.log(`  首屏可交互 ${timeToInteractiveMs} ms，CLS ${cls}`);
console.log(`  Console 错误 ${consoleErrors.length} 条`);
console.log(`  截图 ${manifest.length} 张 → ${VIS}/`);

page.close();
cdp.close();
process.exit(0);
