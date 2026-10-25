/**
 * scripts/r2-closeup.mjs —— 塔顶与层间特写取证（T10 视觉核对用）
 *
 * 用法: node scripts/r2-closeup.mjs [baseUrl] [outDir]
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const OUT = process.argv[3] ?? 'reports/MUTA-R2-001/visual';
mkdirSync(OUT, { recursive: true });

const cdp = await launchChrome({
  port: 9362, width: 1600, height: 1200, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu', '--force-device-scale-factor=1']
});
const page = await openPage(cdp, 'about:blank');
await page.send('Runtime.enable');
await page.setViewport(1600, 1200, 1, false);
await page.goto(`${BASE}/?debug=1`, { waitMs: 2000 });
await waitFor(async () => !!(await page.evaluate(`!!window.__yingxianDebug`)), {
  timeout: 240_000, interval: 400, label: '模型就绪'
});
await sleep(1200);

const presets = await page.evaluate(`window.__yingxianDebug.presets ?? []`);
console.log('可用预设：', JSON.stringify(presets));

for (const key of ['finial', 'eave', 'whole']) {
  const ok = await page.evaluate(`(() => {
    const p = window.__yingxianDebug.presets ?? [];
    if (!p.includes(${JSON.stringify(key)})) return false;
    window.__yingxianDebug.jumpTo(${JSON.stringify(key)});
    return true;
  })()`);
  if (!ok) { console.log('  跳过预设', key); continue; }
  await sleep(1400);
  await page.screenshot(`${OUT}/closeup-${key}.png`);
  console.log('  已保存 closeup-' + key + '.png');
}

page.close();
cdp.close();
process.exit(0);
