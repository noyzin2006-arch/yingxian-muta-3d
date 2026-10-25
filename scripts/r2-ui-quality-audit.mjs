/**
 * scripts/r2-ui-quality-audit.mjs —— 规划 §8.3「UI 质量线 A–E」逐条自动审计
 *
 * 全部结论由脚本在真实 Chrome 里实测计算得出，输出
 *   reports/MUTA-R2-001/ui-quality-lines.json
 * 不做主观描述，每条都带计算值或命令输出。
 *
 * 用法: node scripts/r2-ui-quality-audit.mjs [baseUrl]
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
const OUT = 'reports/MUTA-R2-001';
mkdirSync(OUT, { recursive: true });

const cdp = await launchChrome({
  port: 9395, width: 1920, height: 1080, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu'],
});
const page = await openPage(cdp, 'about:blank');
await page.send('Runtime.enable');
await page.send('Page.enable');
await page.setViewport(1920, 1080, 1, false);
await page.goto(`${BASE}/?debug=1`, { waitMs: 2000 });
await waitFor(async () => !!(await page.evaluate('!!window.__yingxianDebug')), {
  timeout: 240_000, interval: 100,
});
await sleep(1500);

/* ── 1. 令牌与计算样式 ───────────────────────────────────── */
const tokens = await page.evaluate(`(() => {
  const cs = getComputedStyle(document.documentElement);
  const names = ['--bg-0','--bg-1','--bg-2','--bg-3','--fg-main','--fg-secondary','--fg-weak',
    '--fg-disabled','--accent-bright','--ok','--warn','--danger','--info',
    '--stroke-strong','--stroke-soft','--text-xs','--text-sm','--text-md','--text-lg','--text-xl','--text-2xl',
    '--lh-xs','--lh-sm','--lh-md','--lg','--lh-xl','--lh-2xl',
    '--s1','--s2','--s3','--s4','--s5','--s6','--s7','--s8','--s9',
    '--r-xs','--r-sm','--r-md','--r-lg','--r-pill',
    '--shadow-0','--shadow-1','--shadow-2','--shadow-3','--shadow-4',
    '--z-scene','--z-hud','--z-menu','--z-dialog','--z-toast',
    '--t-micro','--t-state','--t-enter','--ease-standard','--ease-out',
    '--mat-frame','--mat-beam','--mat-brace','--mat-shadow','--mat-roof',
    '--panel','--ink','--ink-muted','--accent','--divider','--radius','--ease','--title-size'];
  const out = {};
  for (const n of names) out[n] = cs.getPropertyValue(n).trim();
  const all = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; }
    for (const r of rules) {
      if (r.style) for (const n of r.style) if (n.startsWith('--')) all.push(n);
    }
  }
  return { values: out, definedCount: all.length, definedNames: Array.from(new Set(all)) };
})()`);

/* ── 2. 页面内计算样式 ───────────────────────────────────── */
const styles = await page.evaluate(`(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const c = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      sel,
      fontSize: c.fontSize, lineHeight: c.lineHeight, fontWeight: c.fontWeight,
      letterSpacing: c.letterSpacing, color: c.color, background: c.backgroundColor,
      borderRadius: c.borderRadius, boxShadow: c.boxShadow, zIndex: c.zIndex,
      maxWidth: c.maxWidth, padding: c.padding, margin: c.margin,
      width: Math.round(r.width), height: Math.round(r.height)
    };
  };
  return {
    title: pick('#yx-title .yx-title-main') ?? pick('#yx-title h1') ?? pick('#yx-title'),
    body: pick('#yx-note') ?? pick('body'),
    card: pick('#yx-card'),
    btn: pick('.yx-btn'),
    canvas: pick('#stage canvas') ?? pick('canvas'),
    panelWidths: Array.from(document.querySelectorAll('.yx-panel, .yx-card, .yx-drawer'))
      .map((e) => Math.round(e.getBoundingClientRect().width))
  };
})()`);

/* ── 3. 对比度（WCAG 2.1）────────────────────────────────── */
const contrast = await page.evaluate(`(() => {
  const hex = (s) => {
    const m = s.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  };
  const rgb = (s) => {
    const m = s.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return hex(s);
    const p = m[1].split(',').map((v) => parseFloat(v));
    return [p[0], p[1], p[2]];
  };
  const lum = (c) => {
    const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const ratio = (a, b) => {
    if (!a || !b) return null;
    const l1 = lum(a), l2 = lum(b);
    const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
  };
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  const pairs = [
    ['--fg-main', '--bg-0', 4.5, '正文 / 面板底'],
    ['--fg-secondary', '--bg-0', 4.5, '辅助文字 / 面板底'],
    ['--fg-weak', '--bg-0', 4.5, '非禁用次级文字 / 面板底'],
    ['--fg-inverse', '--accent', 4.5, '反色文字 / 选中态深底（--accent）'],
    ['--accent-bright', '--bg-0', 3, '焦点环 / 面板底（WCAG 2.2 非文本 3:1）'],
    ['--stroke-strong', '--bg-0', 3, '可交互控件边界 / 面板底（3:1）'],
    ['--warn', '--bg-0', 4.5, '待核实标签 / 面板底'],
    ['--info', '--bg-0', 4.5, '信息标签 / 面板底'],
    ['--danger', '--bg-0', 4.5, '危险文案 / 面板底'],
    ['--ok', '--bg-0', 4.5, '成功文案 / 面板底'],
    ['--fg-disabled', '--bg-1', 2, '禁用文案 / 次级面（≥2:1）']
  ];
  const out = [];
  for (const [fg, bg, need, label] of pairs) {
    const r = ratio(rgb(v(fg)), rgb(v(bg)));
    out.push({ fg, bg, need, label, ratio: r, pass: r !== null ? r >= need : null });
  }
  return out;
})()`);

/* ── 4. 无障碍语义 / 可及名称 / 替代文本 ──────────────────── */
const a11y = await page.evaluate(`(() => {
  const imgs = Array.from(document.querySelectorAll('img'));
  const svgs = Array.from(document.querySelectorAll('svg'));
  const buttons = Array.from(document.querySelectorAll('button'));
  const nameless = buttons.filter((b) => {
    const t = (b.textContent || '').trim();
    return !t && !b.getAttribute('aria-label') && !b.getAttribute('title') && !b.querySelector('img[alt]:not([alt=""])');
  }).map((b) => b.id || b.className);
  const smallTargets = buttons
    .map((b) => { const r = b.getBoundingClientRect(); return { id: b.id || b.className, w: Math.round(r.width), h: Math.round(r.height) }; })
    .filter((b) => b.w > 0 && (b.h < 44 || b.w < 44));
  return {
    imgCount: imgs.length,
    imgMissingAlt: imgs.filter((i) => !i.getAttribute('alt')).map((i) => i.src),
    svgCount: svgs.length,
    svgWithoutLabel: svgs.filter((s) => !s.getAttribute('aria-hidden') && !s.getAttribute('role') && !s.querySelector('title')).length,
    buttonCount: buttons.length,
    namelessButtons: nameless,
    smallTargets,
    liveRegions: Array.from(document.querySelectorAll('[aria-live]')).map((e) => ({ id: e.id, live: e.getAttribute('aria-live') })),
    canvasTabIndex: document.querySelector('canvas')?.getAttribute('tabindex') ?? null,
    canvasAriaLabel: document.querySelector('canvas')?.getAttribute('aria-label') ?? null,
    roleImg: document.querySelectorAll('[role="img"]').length,
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).map((h) => h.tagName + ':' + (h.textContent||'').trim().slice(0, 18)),
    lang: document.documentElement.lang
  };
})()`);

/* ── 5. 键盘可达性：Tab 序列 ─────────────────────────────── */
const tabOrder = await page.evaluate(`(() => {
  const focusables = Array.from(document.querySelectorAll(
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter((e) => e.getBoundingClientRect().width > 0);
  return focusables.map((e) => ({
    id: e.id || null,
    tag: e.tagName,
    label: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24),
    tabindex: e.getAttribute('tabindex')
  }));
})()`);

/* ── 6. 焦点可见性：用真实 Tab 键触发 :focus-visible ────────── */
await page.evaluate(`document.body.focus(); window.scrollTo(0,0);`);
const focusVisible = { steps: [] };
for (let i = 0; i < 6; i++) {
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await sleep(120);
  const step = await page.evaluate(`(() => {
    const a = document.activeElement;
    if (!a) return null;
    const c = getComputedStyle(a);
    return {
      tag: a.tagName, id: a.id || null,
      label: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 20),
      outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth,
      outlineColor: c.outlineColor, outlineOffset: c.outlineOffset,
      boxShadow: c.boxShadow
    };
  })()`);
  if (step) focusVisible.steps.push(step);
}
focusVisible.allHaveVisibleRing = focusVisible.steps.every(
  (s) => (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none')
);
focusVisible.sample = focusVisible.steps[0] ?? null;

/* ── 7. 反馈延迟（点击 → 可见状态变化）──────────────────── */
const feedbackMs = await page.evaluate(`(async () => {
  const results = [];
  const cases = [
    { name: '切结构剖视', run: () => document.querySelector('[data-view="section"]').click(),
      read: () => document.querySelector('[data-view="section"]').getAttribute('aria-pressed') === 'true' },
    { name: '切夜景', run: () => document.querySelector('[data-light="night"]').click(),
      read: () => document.querySelector('[data-light="night"]').getAttribute('aria-pressed') === 'true' },
    { name: '开证据面板', run: () => document.getElementById('btn-evidence').click(),
      read: () => !document.getElementById('yx-evidence').hidden }
  ];
  for (const c of cases) {
    const t0 = performance.now();
    c.run();
    // 轮询到状态可见变化
    let ok = false;
    while (performance.now() - t0 < 1000) {
      if (c.read()) { ok = true; break; }
      await new Promise((r) => requestAnimationFrame(r));
    }
    results.push({ name: c.name, ms: Number((performance.now() - t0).toFixed(2)), visibleChange: ok });
    await new Promise((r) => setTimeout(r, 350));
  }
  return results;
})()`);

/* ── 8. 五态实测 ─────────────────────────────────────────── */
const states = await page.evaluate(`(async () => {
  const d = window.__yingxianDebug;
  const out = [];
  const shown = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    if (el.hidden) return false;
    const st = getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden';
  };
  const probe = async (kind, label, sel, extra) => {
    d.demoState(kind);
    await new Promise((r) => setTimeout(r, 300));
    const el = document.querySelector(sel);
    const rec = {
      kind, label, visible: shown(sel),
      text: el ? (el.textContent || '').trim().slice(0, 46) : null
    };
    if (extra) Object.assign(rec, extra());
    out.push(rec);
  };
  await probe('normal', '常态（就绪，无弹层）', '#yx-card', () => ({
    overlayHidden: !shown('#yx-overlay'), bootHidden: !shown('#boot')
  }));
  await probe('empty', '空态（未选中构件）', '#card-empty', () => ({
    cardBodyHidden: !shown('#card-body')
  }));
  await probe('success', '成功态（选中暗层构件 + 估算徽标）', '#card-body', () => ({
    badge: document.querySelector('#card-title .yx-badge')?.textContent ?? null
  }));
  await probe('error', '错误态（失败遮罩 + 文字降级）', '#yx-overlay', () => ({
    hasRetry: !!document.getElementById('btn-retry-light'),
    hasTextFallback: (document.getElementById('overlay-text')?.textContent.length ?? 0) > 200
  }));
  await probe('loading', '加载态（进度遮罩）', '#boot', () => ({
    stageText: document.getElementById('boot-stage')?.textContent ?? null,
    barTransform: document.getElementById('boot-bar-fill')?.style.transform ?? null
  }));
  d.demoState('normal');
  return out;
})()`);

/* ── 9. CSS 静态审计：动画属性 / reduced-motion / 令牌唯一性 ─ */
const cssAudit = await page.evaluate(`(() => {
  const sheets = Array.from(document.styleSheets).map((s) => s.href || 'inline');
  let css = '';
  for (const s of document.styleSheets) {
    let rules; try { rules = s.cssRules; } catch (e) { continue; }
    for (const r of rules) css += r.cssText + '\\n';
  }
  // 抽取 transition / animation 属性
  const layoutProps = ['width','height','top','left','right','bottom','margin','padding','font-size','transform-origin'];
  const badTransitions = [];
  for (const m of css.matchAll(/transition-property\\s*:\\s*([^;}]+)/g)) {
    const props = m[1].split(',').map((s) => s.trim());
    for (const p of props) {
      if (p === 'none' || p === 'all') continue;
      if (layoutProps.includes(p)) badTransitions.push({ prop: p, rule: m[0].slice(0, 90) });
    }
  }
  const keyframes = Array.from(css.matchAll(/@keyframes\\s+([\\w-]+)/g)).map((m) => m[1]);
  const keyframeLayout = [];
  for (const m of css.matchAll(/@keyframes\\s+[\\w-]+\\s*\\{([\\s\\S]*?)\\n\\}/g)) {
    for (const p of layoutProps) {
      if (new RegExp('(^|;|\\\\s)' + p + '\\\\s*:', 'm').test(m[1])) keyframeLayout.push({ name: m[0].slice(0, 40), prop: p });
    }
  }
  // 令牌定义与使用
  const defined = new Set();
  const used = new Set();
  for (const m of css.matchAll(/(--[\\w-]+)\\s*:/g)) defined.add(m[1]);
  for (const m of css.matchAll(/var\\((--[\\w-]+)/g)) used.add(m[1]);
  // --mat-* 是新增估算构件的 3D 材质色，实际消费方是 src/data/continuity-estimates.js
  // （经 makeWoodMaterial 出口），不是 DOM；单独归类，不计入 DOM 死令牌。
  const matConsumed = Array.from(defined).filter((n) => n.startsWith('--mat-'));
  const dead = Array.from(defined).filter((n) => !used.has(n) && !n.startsWith('--mat-'));
  const undefinedUsed = Array.from(used).filter((n) => !defined.has(n));
  return {
    styleSheetHrefs: sheets,
    reducedMotionQuery: /@media[^}]*prefers-reduced-motion/.test(css),
    reducedMotionRule: (css.match(/@media[^}]*prefers-reduced-motion[\\s\\S]{0,400}?\\}\\s*\\}/) ?? [null])[0],
    focusVisibleRules: (css.match(/:focus-visible[^\\{]*\\{[^}]*\\}/g) ?? []).slice(0, 4),
    badTransitions,
    keyframes,
    keyframeLayout,
    tokensDefined: defined.size,
    tokensUsed: used.size,
    deadTokens: dead,
    matTokensConsumedBy3D: matConsumed,
    undefinedUsedTokens: undefinedUsed,
    rawVarFallbacks: (css.match(/var\\(--[\\w-]+,[^)]*\\)/g) ?? []).length
  };
})()`);

/* ── 10. 五档宽度响应式 ──────────────────────────────────── */
const responsive = [];
for (const [w, h] of [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [375, 667]]) {
  await page.setViewport(w, h, 1, w < 500);
  await page.evaluate(`window.dispatchEvent(new Event('resize'))`);
  await sleep(700);
  const r = await page.evaluate(`(() => {
    const de = document.documentElement;
    const btn = Array.from(document.querySelectorAll('button:not([hidden])'))
      .map((b) => { const rr = b.getBoundingClientRect(); return { id: b.id || b.className, w: Math.round(rr.width), h: Math.round(rr.height) }; })
      .filter((b) => b.w > 0);
    const small = btn.filter((b) => b.h < 44);
    const c = document.querySelector('canvas');
    const cr = c ? c.getBoundingClientRect() : null;
    return {
      horizontalScroll: Math.max(0, de.scrollWidth - de.clientWidth),
      buttons: btn.length,
      smallTargets: small.slice(0, 8),
      smallTargetCount: small.length,
      canvasW: cr ? Math.round(cr.width) : null,
      canvasH: cr ? Math.round(cr.height) : null,
      viewportH: de.clientHeight,
      canvasCoverRatio: cr ? Number((cr.height / de.clientHeight).toFixed(3)) : null
    };
  })()`);
  responsive.push({ width: w, height: h, ...r });
}

const audit = {
  capturedAt: new Date().toISOString(),
  base: BASE,
  tokens,
  styles,
  contrast,
  a11y,
  tabOrder,
  focusVisible,
  feedbackMs,
  states,
  cssAudit,
  responsive
};
writeFileSync(`${OUT}/ui-quality-lines.json`, JSON.stringify(audit, null, 2));

/* ── 汇总打印 ───────────────────────────────────────────── */
console.log('=== A2 对比度 ===');
for (const c of contrast) console.log(`  ${c.pass ? 'PASS' : 'FAIL'} ${c.label}: ${c.ratio} (需 ≥${c.need})`);
console.log('\n=== A4/A1 计算样式 ===');
for (const [k, v] of Object.entries(styles)) {
  if (v && typeof v === 'object' && 'fontSize' in v) console.log(`  ${k}: ${v.fontSize}/${v.lineHeight} w${v.fontWeight} radius=${v.borderRadius} z=${v.zIndex}`);
}
console.log('\n=== A5/B1 语义 ===');
console.log('  img:', a11y.imgCount, '缺 alt:', a11y.imgMissingAlt.length, '| svg:', a11y.svgCount, '| 无名按钮:', a11y.namelessButtons.length, '| live:', JSON.stringify(a11y.liveRegions), '| lang:', a11y.lang);
console.log('\n=== B2 反馈延迟 ===');
for (const f of feedbackMs) console.log(`  ${f.name}: ${f.ms} ms  可见变化=${f.visibleChange}`);
console.log('\n=== B1 五态 ===');
for (const s of states) console.log(`  ${s.kind}: visible=${s.visible}  ${s.text ?? ''}`);
console.log('\n=== C 焦点 ===');
console.log(' ', JSON.stringify(focusVisible));
console.log('\n=== D/E CSS 审计 ===');
console.log('  prefers-reduced-motion:', cssAudit.reducedMotionQuery);
console.log('  focus-visible 规则数:', cssAudit.focusVisibleRules.length);
console.log('  过渡了布局属性的规则:', cssAudit.badTransitions.length, JSON.stringify(cssAudit.badTransitions.slice(0, 3)));
console.log('  keyframes:', JSON.stringify(cssAudit.keyframes), '布局型关键帧:', JSON.stringify(cssAudit.keyframeLayout));
console.log('  令牌: 定义', cssAudit.tokensDefined, '使用', cssAudit.tokensUsed, '未使用', JSON.stringify(cssAudit.deadTokens), '未定义即使用', JSON.stringify(cssAudit.undefinedUsedTokens));
console.log('  样式表来源:', JSON.stringify(cssAudit.styleSheetHrefs));
console.log('\n=== B5 响应式 ===');
for (const r of responsive) console.log(`  ${r.width}×${r.height}: 横滚=${r.horizontalScroll} 小目标=${r.smallTargetCount} 画布占比=${r.canvasCoverRatio}`);
console.log(`\n→ ${OUT}/ui-quality-lines.json`);

page.close();
cdp.close();
process.exit(0);
