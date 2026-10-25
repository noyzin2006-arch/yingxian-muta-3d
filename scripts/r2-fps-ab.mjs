/**
 * scripts/r2-fps-ab.mjs —— 帧时间长尾的 A/B 定位
 *
 * 对比同一构建产物在三种页面状态下 10 s RAF 帧时间分布：
 *   A) ?debug=1            调试接口 + 屏幕性能仪表（每帧写 DOM）
 *   B) ?debug=1&nohud=1    调试接口，无仪表
 *   C) ?debug=1&nohud=1 且不环绕（静止机位）
 * 用来说明帧时间长尾到底来自渲染、还是来自调试仪表的每帧 DOM 写入。
 *
 * 用法: node scripts/r2-fps-ab.mjs [baseUrl]
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';

const cdp = await launchChrome({
  port: 9396, width: 1920, height: 1080, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu'],
});
const page = await openPage(cdp, 'about:blank');
await page.send('Runtime.enable');
await page.send('Page.enable');
await page.setViewport(1920, 1080, 1, false);

const MEASURE = `(async () => {
  const d = window.__yingxianDebug;
  const warm = 2000, run = 10000;
  const deltas = [];
  await new Promise((resolve) => {
    const t0 = performance.now(); let last = t0;
    const step = (now) => {
      if (now - t0 >= warm + run) { resolve(); return; }
      if (now - t0 >= warm) deltas.push(now - last);
      last = now; requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const s = deltas.slice().sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
  return {
    frames: deltas.length,
    median: +q(0.5).toFixed(2), p90: +q(0.9).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2),
    max: +s[s.length - 1].toFixed(2),
    over33: deltas.filter((x) => x > 33).length,
    over50: deltas.filter((x) => x > 50).length,
    mean: +(deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(2),
    medianFps: +(1000 / q(0.5)).toFixed(2)
  };
})()`;

async function run(label, url, setup) {
  await page.goto(url, { waitMs: 2000 });
  await waitFor(async () => !!(await page.evaluate('!!window.__yingxianDebug')), {
    timeout: 240_000, interval: 150,
  });
  await sleep(1500);
  if (setup) { await page.evaluate(setup); await sleep(800); }
  const r = await page.evaluate(MEASURE);
  console.log(`${label.padEnd(28)} median=${String(r.median).padStart(6)}ms (${r.medianFps} FPS)  mean=${String(r.mean).padStart(6)}ms  frames=${String(r.frames).padStart(4)}  p90=${r.p90} p95=${r.p95} p99=${r.p99} max=${r.max}  >33ms=${r.over33}  >50ms=${r.over50}`);
  return r;
}

const SPIN = `(async () => {
  const d = window.__yingxianDebug;
  d.setQuality('high'); d.jumpTo('whole');
  const spin = () => { d.spin(0.35); requestAnimationFrame(spin); };
  requestAnimationFrame(spin);
})()`;

console.log('=== 帧时间分布 A/B（构建产物 1920×1080 @DPR1）===');
await run('A 调试接口+仪表+环绕', `${BASE}/?debug=1`, SPIN);
await run('B 调试接口（无仪表）+环绕', `${BASE}/?debug=1&nohud=1`, SPIN);
await run('C 调试接口（无仪表）静止', `${BASE}/?debug=1&nohud=1`,
  `window.__yingxianDebug.setQuality('high'); window.__yingxianDebug.jumpTo('whole')`);

page.close();
cdp.close();
process.exit(0);
