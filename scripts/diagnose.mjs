/**
 * scripts/diagnose.mjs —— 一次性诊断脚本（不入 CI，不属交付物）
 * 用 CDP 打开页面，收集 console / 异常 / 上下文丢失事件，定位问题。
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';

const URL = process.argv[2] ?? 'http://127.0.0.1:5174/?debug=1';

const cdp = await launchChrome({ port: 9341, width: 1280, height: 800, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu'] });
const page = await openPage(cdp, 'about:blank');

const logs = [];
await page.send('Runtime.enable');
await page.send('Log.enable');
await page.send('Page.enable');
page.on('Runtime.consoleAPICalled', (p) => {
  logs.push(`[${p.type}] ` + p.args.map((a) => a.value ?? a.description ?? JSON.stringify(a.preview ?? '')).join(' '));
});
page.on('Runtime.exceptionThrown', (p) => {
  logs.push('[EXCEPTION] ' + (p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
});
page.on('Log.entryAdded', (p) => {
  logs.push(`[log:${p.entry.level}] ${p.entry.text}`);
});

await page.goto(URL);

try {
  await waitFor(async () => {
    const r = await page.evaluate(`(() => {
      const b = document.getElementById('yx-ctx');
      const boot = document.getElementById('boot');
      return { ctxHidden: b ? b.hidden : null, bootHidden: boot ? boot.hidden : null,
               hasDebug: !!window.__yingxianDebug,
               stage: document.getElementById('boot-stage')?.textContent };
    })()`);
    console.log('state:', JSON.stringify(r));
    return r.hasDebug;
  }, { timeout: 60_000, label: 'debug 接口就绪' });
} catch (e) {
  console.log('等待 debug 接口失败:', e.message);
}

await sleep(3000);

const info = await page.evaluate(`(() => {
  const out = {};
  try {
    out.ready = window.__yingxianDebug?.getReadyState?.();
    out.dims = window.__yingxianDebug?.getDimensions?.();
    out.counts = window.__yingxianDebug?.getCounts?.();
    out.stats = window.__yingxianDebug?.getStats?.();
  } catch (e) { out.evalError = String(e); }
  const ctx = document.getElementById('yx-ctx');
  out.ctxOverlayVisible = ctx ? !ctx.hidden : null;
  const canvas = document.querySelector('canvas');
  out.canvas = canvas ? { w: canvas.width, h: canvas.height } : null;
  return out;
})()`);

console.log('\n=== page state ===');
console.log(JSON.stringify(info, null, 2));
console.log('\n=== console log ===');
logs.slice(-60).forEach((l) => console.log(l));

await page.screenshot('/tmp/yxshots/diag.png');
console.log('\nscreenshot -> /tmp/yxshots/diag.png');

page.close();
cdp.close();
process.exit(0);
