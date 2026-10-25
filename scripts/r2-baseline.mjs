/**
 * scripts/r2-baseline.mjs —— R2 轮次基线冻结（T01）
 *
 * 在**改动任何产品代码之前**，把现状固定成可复算的事实：
 *   · git SHA / 分支 / 环境（GPU、视口、DPR）
 *   · 模型实测量（counts / dimensions / bracket ledger）
 *   · 真实性能（2s 预热 + 10s 采样：FPS 中位、draw calls、triangles）
 *   · 全貌与剖视两张同机位基准截图
 *
 * 产物：reports/MUTA-R2-001/baseline.json
 *       reports/MUTA-R2-001/baseline-whole.png
 *       reports/MUTA-R2-001/baseline-section.png
 *
 * 用法: node scripts/r2-baseline.mjs [baseUrl]
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const OUT = 'reports/MUTA-R2-001';
const WARMUP = 2;
const MEASURE = 10;

mkdirSync(OUT, { recursive: true });

const git = (cmd) => {
  try { return execSync(cmd, { encoding: 'utf8' }).trim(); }
  catch { return null; }
};

const env = {
  gitSha: git('git rev-parse HEAD'),
  branch: git('git rev-parse --abbrev-ref HEAD'),
  gitStatus: git('git status --short'),
  node: process.version,
  three: git("node -e \"console.log(require('./node_modules/three/package.json').version)\"")
};

console.log('环境:', JSON.stringify(env));

const cdp = await launchChrome({
  port: 9351, width: 1920, height: 1080, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu', '--force-device-scale-factor=1']
});
const page = await openPage(cdp, 'about:blank');
await page.send('Runtime.enable');
await page.send('Log.enable');
await page.setViewport(1920, 1080, 1, false);

const consoleLog = [];
if (typeof cdp.on === 'function') {
  cdp.on('Runtime.consoleAPICalled', (p) => {
    consoleLog.push({
      type: p.type,
      text: (p.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ')
    });
  });
  cdp.on('Runtime.exceptionThrown', (p) => {
    consoleLog.push({
      type: 'exception',
      text: p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? ''
    });
  });
}

await page.goto(`${BASE}/?debug=1`, { waitMs: 2000 });

// ── 等模型就绪（程序化构建较慢，给足 240s）
const t0 = Date.now();
await waitFor(async () => !!(await page.evaluate(`!!window.__yingxianDebug`)), {
  timeout: 240_000, interval: 400, label: '模型就绪'
});
const buildMs = Date.now() - t0;

const gpu = await page.evaluate(`(() => {
  const c = document.querySelector('canvas');
  const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return {
    unmaskedRenderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
    unmaskedVendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null,
    version: gl ? gl.getParameter(gl.VERSION) : null,
    webgl2: !!(c && c.getContext('webgl2'))
  };
})()`);

const model = await page.evaluate(`({
  counts: window.__yingxianDebug.getCounts(),
  dims: window.__yingxianDebug.getDimensions(),
  ledger: window.__yingxianDebug.getBracketLedger(),
  ready: window.__yingxianDebug.getReadyState()
})`);

// ── 性能：2s 预热 + 10s 采样
async function measure(label) {
  await page.evaluate(`window.__yingxianDebug.setView('whole'); window.__yingxianDebug.jumpTo('whole');`);
  await sleep(600);
  await page.evaluate(`(() => { const t0 = performance.now();
    while (performance.now() - t0 < ${WARMUP * 1000}) { window.__yingxianDebug.spin(0.6); } return true; })()`);
  const res = await page.evaluate(`(async () => {
    const frames = [];
    const t0 = performance.now();
    await new Promise((done) => {
      function step(t) {
        frames.push(t);
        if (performance.now() - t0 < ${MEASURE * 1000}) requestAnimationFrame(step);
        else done();
      }
      requestAnimationFrame(step);
    });
    const dts = [];
    for (let i = 1; i < frames.length; i++) dts.push(frames[i] - frames[i - 1]);
    dts.sort((a, b) => a - b);
    const med = dts.length ? dts[Math.floor(dts.length / 2)] : null;
    const stats = window.__yingxianDebug.getStats();
    return {
      frameCount: frames.length,
      medianFrameMs: med,
      medianFps: med ? 1000 / med : null,
      p95FrameMs: dts.length ? dts[Math.floor(dts.length * 0.95)] : null,
      drawCalls: stats.drawCalls,
      triangles: stats.triangles,
      geometries: stats.geometries,
      textures: stats.textures
    };
  })()`);
  console.log(`${label} 性能:`, JSON.stringify(res));
  return res;
}

const perfWhole = await measure('全貌');

// ── 截图：全貌 / 剖视
await page.evaluate(`window.__yingxianDebug.setView('whole'); window.__yingxianDebug.jumpTo('whole');`);
await sleep(900);
await page.screenshot(`${OUT}/baseline-whole.png`);

await page.evaluate(`window.__yingxianDebug.setView('section'); window.__yingxianDebug.jumpTo('section');`);
await sleep(1200);
await page.screenshot(`${OUT}/baseline-section.png`);

const perfSection = await measure('剖视');

const baseline = {
  task: 'MUTA-R2-001',
  phase: 'T01-baseline',
  capturedAt: new Date().toISOString(),
  env: { ...env, gpu, viewport: { width: 1920, height: 1080, dpr: 1 } },
  buildMs,
  model,
  performance: { whole: perfWhole, section: perfSection },
  consoleEntries: consoleLog.filter((e) => e.type === 'error' || e.type === 'exception')
};

writeFileSync(`${OUT}/baseline.json`, JSON.stringify(baseline, null, 2));
console.log('\n基线已写入', `${OUT}/baseline.json`);
console.log('FPS(whole)=', perfWhole.medianFps, ' calls=', perfWhole.drawCalls, ' tris=', perfWhole.triangles);
console.log('errors=', baseline.consoleEntries.length);

page.close();
cdp.close();
process.exit(0);
