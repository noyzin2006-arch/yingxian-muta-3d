/**
 * scripts/r2-cls-probe.mjs —— 定位首屏布局偏移（CLS）的来源节点
 *
 * 记录每个 layout-shift 条目的 value / startTime / 受影响节点，
 * 用于判断 CLS 是由画布尺寸、遮罩显隐还是面板布局引起。
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';

const cdp = await launchChrome({
  port: 9394, width: 1920, height: 1080, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu'],
});
const page = await openPage(cdp, 'about:blank');
await page.send('Runtime.enable');
await page.send('Page.enable');

// 在任何脚本之前注入观测器，捕获首屏全部布局偏移
await page.send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__cls = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        const sources = [];
        for (const s of (e.sources ?? [])) {
          const n = s.node;
          sources.push({
            tag: n ? n.tagName : null,
            id: n ? (n.id || null) : null,
            cls: n ? (typeof n.className === 'string' ? n.className : null) : null,
            prev: s.previousRect ? { x: s.previousRect.x, y: s.previousRect.y, w: s.previousRect.width, h: s.previousRect.height } : null,
            cur: s.currentRect ? { x: s.currentRect.x, y: s.currentRect.y, w: s.currentRect.width, h: s.currentRect.height } : null
          });
        }
        window.__cls.push({ value: e.value, startTime: e.startTime, sources });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  `
});

await page.setViewport(1920, 1080, 1, false);
await page.goto(`${BASE}/?debug=1`, { waitMs: 2000 });
await waitFor(async () => !!(await page.evaluate('!!window.__yingxianDebug')), {
  timeout: 240_000, interval: 100,
});
await sleep(2500);

const out = await page.evaluate(`(() => {
  const total = (window.__cls ?? []).reduce((s, e) => s + e.value, 0);
  return { total, count: (window.__cls ?? []).length, entries: window.__cls ?? [] };
})()`);

console.log(`CLS 合计 = ${out.total}  （${out.count} 条）\n`);
for (const [i, e] of out.entries.entries()) {
  console.log(`#${i + 1}  value=${e.value.toFixed(4)}  t=${Math.round(e.startTime)}ms`);
  for (const s of e.sources ?? []) {
    console.log(`     ${s.tag}${s.id ? '#' + s.id : ''}${s.cls ? '.' + String(s.cls).split(' ').join('.') : ''}`);
    console.log(`        prev=${JSON.stringify(s.prev)}`);
    console.log(`        cur =${JSON.stringify(s.cur)}`);
  }
}

page.close();
cdp.close();
process.exit(0);
