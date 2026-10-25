/**
 * A02 判据实测探针：直接读页面里的 metadata.counts，验证
 * brightFloors / hiddenFloors / eaves / groundColumns 四个字段的真实取值。
 * 与 acceptance.mjs 的 A02 判据同源，避免「判据写了但字段没落地」。
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';

const cdp = await launchChrome({
  port: 9388, width: 1920, height: 1080, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu'],
});
const page = await openPage(cdp, 'about:blank');
await page.send('Runtime.enable');
await page.goto('http://127.0.0.1:5174/?debug=1', { waitMs: 2500 });
await waitFor(async () => !!(await page.evaluate('!!window.__yingxianDebug')), {
  timeout: 240000, interval: 400,
});
await sleep(1200);

const counts = await page.evaluate('window.__yingxianDebug.getCounts()');
const dims = await page.evaluate('window.__yingxianDebug.getDimensions()');

const checks = {
  brightFloors: { got: counts.brightFloors, want: 5, ok: counts.brightFloors === 5 },
  hiddenFloors: { got: counts.hiddenFloors, want: 4, ok: counts.hiddenFloors === 4 },
  eaves: { got: counts.eaves, want: 6, ok: counts.eaves === 6 },
  groundColumns: { got: counts.groundColumns, want: 56, ok: counts.groundColumns === 56 },
  dimsLevels: { got: dims.levels.length, want: 5, ok: dims.levels.length === 5 },
};

console.log('=== metadata.counts ===');
console.log(JSON.stringify(counts, null, 2));
console.log('\n=== A02 逐项 ===');
for (const [k, v] of Object.entries(checks)) {
  console.log(`  ${k.padEnd(14)} got=${v.got}  want=${v.want}  ${v.ok ? 'OK' : 'MISMATCH'}`);
}
const pass = Object.values(checks).every((v) => v.ok);
console.log(`\nA02 = ${pass ? 'PASS' : 'FAIL'}`);

page.close();
cdp.close();
process.exit(pass ? 0 : 1);
