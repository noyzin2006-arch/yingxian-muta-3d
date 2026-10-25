/**
 * scripts/check-vertical-continuity.mjs
 *
 * 「层间连续性」客观校验（只读输入、只输出结论；不改产品代码）。
 *
 * 用户抱怨：全貌时"层与层次之间不连接，有悬空感"。
 * 本脚本把这句话变成一个可复算的数字：
 *
 *   在正南立面渲染图上，沿塔身轮廓**内部**寻找横向贯通的背景色条带。
 *   每一道这样的条带 = 一处"能一眼看穿、读到背景"的层间空洞，也就是"悬空"的来源。
 *
 * 判据：
 *   · 只在塔身轮廓的水平范围内统计，轮廓外的天空不算；
 *   · 条带宽度 ≥ MIN_VOID_PX（本机取 12 px @1920 宽）才计为空洞；
 *   · 连续空洞行合并成"空档带"，高度 > 阈值即判为不连续。
 *
 * 用法: node scripts/check-vertical-continuity.mjs [baseUrl] [outPng]
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const OUT = process.argv[3] ?? 'reports/continuity-check.png';

const MIN_VOID_PX = 12;      // 横向空洞最小宽度（像素）
const MIN_BAND_M = 0.8;      // 空档带高度阈值（米）

/* ── 最小 PNG 解码（8bit RGB/RGBA，无隔行）────────────────── */
function decodePNG(buf) {
  let p = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
      if (bitDepth !== 8) throw new Error(`不支持的位深 ${bitDepth}`);
      if (data[12] !== 0) throw new Error('不支持隔行 PNG');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error(`不支持的颜色类型 ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[q++];
    const row = raw.subarray(q, q + stride); q += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 255;
    }
  }
  return { w, h, channels, data: out };
}

/* ── 主流程 ─────────────────────────────────────────────── */
const cdp = await launchChrome({
  port: 9373, width: 1920, height: 1080, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu']
});
const page = await openPage(cdp, 'about:blank');
await page.goto(`${BASE}/?debug=1`);
await waitFor(async () => !!(await page.evaluate(`!!window.__yingxianDebug`)), {
  timeout: 120_000, label: '模型就绪'
});
await page.setViewport(1920, 1080, 1, false);
await page.evaluate(`window.__yingxianDebug.setLight('day'); window.__yingxianDebug.jumpTo('south');`);
await sleep(1800);

const shot = await page.send('Page.captureScreenshot', { format: 'png' });
const png = Buffer.from(shot.data, 'base64');
writeFileSync(OUT, png);

const img = decodePNG(png);
const { w, h, channels, data } = img;

/* 背景色：白昼 flat sky #D6D7D2（scene.background），带抗锯齿边缘混合 */
const BG = [214, 215, 210];
const isBG = (i) => {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  return Math.abs(r - BG[0]) < 7 && Math.abs(g - BG[1]) < 7 && Math.abs(b - BG[2]) < 7;
};

/* UI 区域排除：顶部标题、右侧热点/注释卡、底部控制条 */
const UI_TOP = 150, UI_BOTTOM = 120, UI_RIGHT = 420;

const rows = [];
for (let y = UI_TOP; y < h - UI_BOTTOM; y++) {
  let minX = -1, maxX = -1;
  for (let x = 0; x < w - UI_RIGHT; x++) {
    if (!isBG((y * w + x) * channels)) {
      if (minX < 0) minX = x;
      maxX = x;
    }
  }
  if (minX < 0) { rows.push({ y, minX: -1, maxX: -1, voids: [] }); continue; }
  // 轮廓内部最宽的一段背景（"能看穿"的那道缝）
  let maxRun = 0, maxRunAt = 0;
  let run = -1;
  for (let x = minX; x <= maxX; x++) {
    const bg = isBG((y * w + x) * channels);
    if (bg && run < 0) run = x;
    if (!bg && run >= 0) { if (x - run > maxRun) { maxRun = x - run; maxRunAt = run; } run = -1; }
  }
  if (run >= 0 && maxX - run + 1 > maxRun) { maxRun = maxX - run + 1; maxRunAt = run; }
  rows.push({ y, minX, maxX, voidW: maxRun, voidAt: maxRunAt });
}

/* 塔身实际占用的像素高度 → 像素/米换算（不用整幅高度） */
const towerRows = rows.filter((r) => r.minX >= 0);
const towerTop = towerRows.length ? towerRows[0].y : 0;
const towerBottom = towerRows.length ? towerRows[towerRows.length - 1].y : h - 1;
const towerPx = Math.max(1, towerBottom - towerTop + 1);
const PX_PER_M = towerPx / 67.31;

/* 合并连续的空洞行 → 空档带 */
const bands = [];
let start = -1, bandMax = 0;
const closeBand = (endIdx) => {
  const y0 = rows[start].y, y1 = rows[endIdx].y;
  bands.push({
    y0, y1, pxHeight: y1 - y0 + 1,
    mHeight: +((y1 - y0 + 1) / PX_PER_M).toFixed(2),
    voidWidthPx: bandMax
  });
  start = -1; bandMax = 0;
};
rows.forEach((r, i) => {
  const hasVoid = r.voidW >= MIN_VOID_PX && (r.maxX - r.minX) > 120;   // 塔身足够宽才算体内空洞
  if (hasVoid && start < 0) { start = i; bandMax = r.voidW; }
  else if (hasVoid && start >= 0) { bandMax = Math.max(bandMax, r.voidW); }
  else if (!hasVoid && start >= 0) closeBand(i - 1);
});
if (start >= 0) closeBand(rows.length - 1);

console.log('════ 层间连续性客观校验（正南立面，1920×1080，白昼）════');
console.log(`渲染图 ${w}×${h}，背景色判定容差 ±7，横向空洞最小宽度 ${MIN_VOID_PX} px`);
console.log(`塔身占像素行 ${towerTop}–${towerBottom}（${towerPx} px）→ ${PX_PER_M.toFixed(2)} px/m`);
console.log(`输出图：${OUT}`);
console.log();
if (!bands.length) {
  console.log('✅ 未检出塔身内部的贯通空洞。');
} else {
  console.log(`检出 ${bands.length} 处「塔身内部可看穿背景」的空洞带：`);
  bands.forEach((b) => {
    const bad = b.mHeight > MIN_BAND_M;
    console.log(`  ${bad ? '❌' : '·'} 像素行 ${b.y0}–${b.y1}（高 ${b.pxHeight} px ≈ ${b.mHeight} m）平均宽 ${b.voidWidthPx} px${bad ? '  ← 超过 0.8 m' : ''}`);
  });
}
const worst = bands.reduce((m, b) => Math.max(m, b.mHeight), 0);
console.log();
console.log(`最大空洞带 ≈ ${worst.toFixed(2)} m（阈值 ${MIN_BAND_M} m）→ ${worst > MIN_BAND_M ? '❌ 存在悬空观感' : '✅ 无悬空观感'}`);
console.log(`（换算基准：塔身实际占 ${towerPx} px 对应 67.31 m）`);

page.close();
cdp.close();
process.exit(worst > MIN_BAND_M ? 1 : 0);
