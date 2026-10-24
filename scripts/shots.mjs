/**
 * scripts/shots.mjs —— 验收截图工具
 *
 * 通过 CDP 驱动本机 Google Chrome（headless），按预设视口与状态出图。
 * 不依赖任何新 npm 包：Node 22+ 自带全局 WebSocket。
 *
 * 用法: node scripts/shots.mjs [outDir] [baseUrl]
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? 'reports/screenshots';
const BASE = process.argv[3] ?? 'http://127.0.0.1:5174';
mkdirSync(OUT, { recursive: true });

const cdp = await launchChrome({
  port: 9347, width: 1920, height: 1080, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu']
});
const page = await openPage(cdp, 'about:blank');
await page.send('Runtime.enable');
await page.send('Log.enable');
await page.send('Page.enable');

const consoleErrors = [];
page.on('Runtime.exceptionThrown', (p) => {
  consoleErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text);
});
page.on('Log.entryAdded', (p) => {
  if (p.entry.level === 'error') consoleErrors.push(p.entry.text);
});

await page.goto(`${BASE}/?debug=1`);
await waitFor(async () => !!(await page.evaluate(`!!window.__yingxianDebug`)), {
  timeout: 120_000, label: 'debug 接口就绪'
});
await sleep(1200);

async function shot(name, { width = 1600, height = 1000, dpr = 1, mobile = false, setup } = {}) {
  await page.setViewport(width, height, dpr, mobile);
  await sleep(500);
  if (setup) { await page.evaluate(setup); await sleep(1400); }
  await page.screenshot(`${OUT}/${name}.png`);
  console.log(`  ✓ ${name}.png  ${width}×${height}@${dpr}`);
}

console.log('出图中…');

await shot('01-first-frame', { width: 1920, height: 1080, dpr: 1 });
await shot('02-south', { width: 1920, height: 1080, dpr: 1, setup: `window.__yingxianDebug.goTo('south')` });
await shot('03-top', { width: 1920, height: 1080, dpr: 1, setup: `window.__yingxianDebug.goTo('topNE')` });
await shot('04-section', { width: 1920, height: 1080, dpr: 1, setup: `window.__yingxianDebug.setView('section')` });
await shot('05-proportions', { width: 1600, height: 1000, dpr: 1, setup: `window.__yingxianDebug.goTo('whole')` });
await shot('06-brackets', { width: 1600, height: 1000, dpr: 1, setup: `window.__yingxianDebug.goTo('bracket')` });
await shot('07-base', { width: 1600, height: 1000, dpr: 1, setup: `window.__yingxianDebug.goTo('entrance')` });
await shot('08-finial', { width: 1600, height: 1000, dpr: 1, setup: `window.__yingxianDebug.goTo('finial')` });
await shot('09-desktop', { width: 1440, height: 900, dpr: 2, setup: `window.__yingxianDebug.goTo('whole')` });
await shot('10-mobile', { width: 390, height: 844, dpr: 3, mobile: true, setup: `window.__yingxianDebug.goTo('whole')` });
await shot('11-detail', { width: 1600, height: 1000, dpr: 1, setup: `window.__yingxianDebug.goTo('eave')` });
await shot('12-ui', { width: 1600, height: 1000, dpr: 1, setup: `window.__yingxianDebug.setView('exploded')` });
await shot('13-exploded', { width: 1600, height: 1000, dpr: 1, setup: `window.__yingxianDebug.goTo('topNE')` });
await shot('14-failure', { width: 390, height: 844, dpr: 3, mobile: true, setup: `window.__yingxianDebug.setQuality('safe')` });
await shot('16-evidence', { width: 1600, height: 1000, dpr: 1, setup: `document.getElementById('btn-evidence').click()` });

// 昼夜三态
for (const [key, name] of [['day', '15-light-day'], ['sunset', '15-light-sunset'], ['night', '15-light-night']]) {
  await shot(name, { width: 1600, height: 1000, dpr: 1, setup: `window.__yingxianDebug.setLight('${key}')` });
}

console.log('\n=== console errors ===');
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(无)');

page.close();
cdp.close();
process.exit(0);
