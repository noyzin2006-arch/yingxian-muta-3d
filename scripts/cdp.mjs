/**
 * scripts/cdp.mjs
 *
 * 极简 Chrome DevTools Protocol 客户端。
 *
 * 为什么不用 Playwright：规划要求「浏览器自动化可用 Chromium 的话用
 * Playwright/CDP 控制（无需依赖新 CI）」。Node 22+ 自带全局 WebSocket，
 * 因此无需新增任何 npm 依赖即可直接驱动本机 Google Chrome。
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
];

export function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    try {
      // 存在即可用（不执行）
      if (process.platform === 'darwin') {
        // eslint-disable-next-line no-undef
        const fs = require('node:fs');
        if (fs.existsSync(p)) return p;
      }
    } catch (e) { /* ignore */ }
  }
  return CHROME_CANDIDATES[0];
}

/** 启动 Chrome 并返回 CDP 端点 */
export async function launchChrome({
  port = 9333,
  width = 1600,
  height = 1000,
  headless = true,
  extraArgs = []
} = {}) {
  const bin = findChrome();
  const profile = mkdtempSync(join(tmpdir(), 'yx-cdp-'));
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--mute-audio',
    ...(headless ? ['--headless=new'] : []),
    ...extraArgs,
    'about:blank'
  ];
  const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let stderr = '';
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  // 等待 CDP 端点就绪
  const base = `http://127.0.0.1:${port}`;
  let version = null;
  for (let i = 0; i < 100; i++) {
    await sleep(150);
    try {
      const res = await fetch(`${base}/json/version`);
      if (res.ok) { version = await res.json(); break; }
    } catch (e) { /* not ready */ }
  }
  if (!version) {
    proc.kill('SIGKILL');
    throw new Error(`Chrome CDP 端点未就绪。stderr:\n${stderr.slice(-2000)}`);
  }

  return {
    bin,
    port,
    base,
    version,
    profile,
    proc,
    get stderr() { return stderr; },
    close() {
      // 杀掉整个进程组，否则 Chrome 残留会继续占用 GPU / WebGL 上下文
      try { process.kill(-proc.pid, 'SIGTERM'); } catch (e) { /* ignore */ }
      try { proc.kill('SIGKILL'); } catch (e) { /* ignore */ }
      try { rmSync(profile, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    }
  };
}

/** 打开一个新标签页并连接 */
export async function openPage(cdp, url = 'about:blank') {
  const res = await fetch(`${cdp.base}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  const target = await res.json();
  const client = await connect(target.webSocketDebuggerUrl);
  client.targetId = target.id;
  client._on('Target.detachedFromTarget', () => {});
  return client;
}

/** 连接一个 WebSocket 端点 */
export async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', (e) => reject(new Error(`WebSocket 连接失败: ${e.message ?? e}`)), { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
      else resolve(msg.result);
      return;
    }
    const handlers = listeners.get(msg.method);
    if (handlers) handlers.forEach((fn) => fn(msg.params));
  });

  function send(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`CDP 超时: ${method}`));
        }
      }, 120_000);
    });
  }

  function on(method, fn) {
    if (!listeners.has(method)) listeners.set(method, new Set());
    listeners.get(method).add(fn);
    return () => listeners.get(method)?.delete(fn);
  }

  return {
    ws,
    send,
    on,
    _on: on,
    close() { try { ws.close(); } catch (e) { /* ignore */ } },

    /** 在页面里求值（可 await） */
    async evaluate(expression, { awaitPromise = true } = {}) {
      const r = await send('Runtime.evaluate', {
        expression,
        awaitPromise,
        returnByValue: true,
        userGesture: true
      });
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        throw new Error(`页面求值异常: ${d.exception?.description ?? d.text}`);
      }
      return r.result?.value;
    },

    /** 导航并等待 load */
    async goto(url, { timeout = 60_000 } = {}) {
      const loaded = new Promise((resolve) => {
        const off = on('Page.loadEventFired', () => { off(); resolve(); });
        setTimeout(() => { off(); resolve(); }, timeout);
      });
      await send('Page.navigate', { url });
      await loaded;
    },

    /** 截图 */
    async screenshot(path) {
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const { writeFileSync } = await import('node:fs');
      writeFileSync(path, Buffer.from(r.data, 'base64'));
      return path;
    },

    /** 设置视口 */
    async setViewport(width, height, deviceScaleFactor = 1, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor, mobile
      });
    }
  };
}

/** 等待条件成立 */
export async function waitFor(fn, { timeout = 30_000, interval = 200, label = '条件' } = {}) {
  const t0 = Date.now();
  for (;;) {
    let ok = false;
    try { ok = await fn(); } catch (e) { ok = false; }
    if (ok) return true;
    if (Date.now() - t0 > timeout) throw new Error(`等待超时: ${label}`);
    await sleep(interval);
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
