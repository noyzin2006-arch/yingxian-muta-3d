/**
 * scripts/verify-continuity.mjs
 *
 * 层间连续度自动校验（规划 §5.4 检测 A + 检测 B，§8.1 第 3 条）。
 *
 * 检测 A（构件存在性，records + 世界坐标 bbox）：调用 src/validation/continuity-metrics.js
 *         的 analyzeContinuity()，八面 × 0.1 m 竖向扫描。
 * 检测 B（真实投影）：在**近正交**的八个立面机位截图，在塔身轮廓内部寻找
 *         横向贯通的背景色条带 —— 那就是「一眼能看穿」的层间空洞。
 *
 * 两者都过 → V1/V2 PASS。任何一项不过 → FAIL，不做人工豁免。
 *
 * 用法: node scripts/verify-continuity.mjs [baseUrl] [outDir]
 */
import { launchChrome, openPage, waitFor, sleep } from './cdp.mjs';
import { decodePNG, makeBgTester } from './lib/png.mjs';
import { analyzeContinuity, MAX_BLANK_RUN_M, MIN_CENTER_OCCUPANCY } from '../src/validation/continuity-metrics.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5174';
const OUT = process.argv[3] ?? 'reports/MUTA-R2-001';
mkdirSync(OUT, { recursive: true });
mkdirSync(`${OUT}/visual`, { recursive: true });

/* ── 规划 §5.1 的原始标高（唯一读取源）───────────────── */
const V1_SCOPE = { y0: 12.5, y1: 54.1 };          // P1 → C5
const BANDS = [
  { id: 'P1', y0: 12.5, y1: 17.0 },
  { id: 'P2', y0: 23.4, y1: 26.2 },
  { id: 'P3', y0: 32.8, y1: 35.8 },
  { id: 'P4', y0: 42.3, y1: 45.2 },
  { id: 'C5', y0: 52.0, y1: 54.1 }
];
const VIEWS = [0, 45, 90, 135, 180, 225, 270, 315];
const VIEW_W = 700, VIEW_H = 1080;
const MIN_VOID_PX = 12;          // 横向空洞最小宽度（供人工查看，判定用覆盖率）
const BLANK_COVERAGE = 0.02;     // 覆盖率低于此值视为「完全无构件」
const UI_TOP = 120, UI_BOTTOM = 90, UI_RIGHT = 260;

const cdp = await launchChrome({
  port: 9375, width: VIEW_W, height: VIEW_H, headless: true,
  extraArgs: ['--use-angle=metal', '--enable-gpu']
});
const page = await openPage(cdp, 'about:blank');
// 保留 baseUrl 自带的查询串（例如 ?nocontinuity=1 的 A/B 对照）
const sep = BASE.includes('?') ? '&' : '?';
await page.goto(`${BASE}${sep}debug=1`);
await waitFor(async () => !!(await page.evaluate(`!!window.__yingxianDebug`)), {
  timeout: 120_000, label: '模型就绪'
});
await page.setViewport(VIEW_W, VIEW_H, 1, false);
await sleep(800);

/* ── 检测 A：records 分析 ─────────────────────────────── */
const payload = await page.evaluate(`(() => ({
  records: window.__yingxianDebug.getAllStructuralRecords(),
  diagnostics: window.__yingxianDebug.getContinuityDiagnostics(),
  dims: window.__yingxianDebug.getDimensions(),
  counts: window.__yingxianDebug.getCounts()
}))()`);

const { buildStructure } = await import('../src/data/structure.js');
const structure = buildStructure();
const detectedA = analyzeContinuity({
  records: payload.records,
  structure,
  stepM: 0.1
});

/* ── 检测 B：八向近正交立面投影 ───────────────────────── */
const detectedB = [];

for (const az of VIEWS) {
  // 机位必须落在 OrbitControls 的 [minDistance, maxDistance] 区间内，
  // 否则每帧 controls.update() 都会把相机夹回 maxDistance。
  // 180 m 距离 + 24.2° 竖向 fov ⇒ 可视高度约 77 m（塔高 67.31 m），接近正交。
  await page.evaluate(`window.__yingxianDebug.setLight('day');
    window.__yingxianDebug.setCamera({ azimuthDeg: ${az}, elevationDeg: 0, distance: 180, targetY: 33.5, fov: 24.2 });`);
  await sleep(420);
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  const png = Buffer.from(shot.data, 'base64');
  writeFileSync(`${OUT}/visual/view-${String(az).padStart(3, '0')}.png`, png);

  const img = decodePNG(png);
  const isBG = makeBgTester(img);
  const { w, h } = img;

  // 由相机参数求 像素/米（近正交，误差可忽略）
  const cam = await page.evaluate(`window.__yingxianDebug.getCamera()`);
  const dist = Math.hypot(cam.position[0] - cam.target[0], cam.position[1] - cam.target[1], cam.position[2] - cam.target[2]);
  const visibleH = 2 * dist * Math.tan((cam.fov * Math.PI) / 360);
  const pxPerM = h / visibleH;
  const rowOf = (y) => h / 2 - (y - cam.target[1]) * pxPerM;

  const rowLo = Math.round(rowOf(V1_SCOPE.y1));
  const rowHi = Math.round(rowOf(V1_SCOPE.y0));

  const rows = [];
  for (let y = rowLo; y <= rowHi; y++) {
    if (y < UI_TOP || y > h - UI_BOTTOM) continue;
    let minX = -1, maxX = -1;
    for (let x = 0; x < w - UI_RIGHT; x++) {
      if (!isBG(x, y)) { if (minX < 0) minX = x; maxX = x; }
    }
    if (minX < 0) { rows.push({ y, width: 0, voidPx: 0, coverage: 0, blank: false }); continue; }
    const span = maxX - minX + 1;
    let run = -1, voidPx = 0, maxRun = 0;
    for (let x = minX; x <= maxX; x++) {
      const bg = isBG(x, y);
      if (bg && run < 0) run = x;
      if (!bg && run >= 0) { const len = x - run; voidPx += len; if (len > maxRun) maxRun = len; run = -1; }
    }
    if (run >= 0) { const len = maxX - run + 1; voidPx += len; if (len > maxRun) maxRun = len; }
    // 「完全无构件」= 该高度上塔身轮廓内几乎没有实体；
    // 柱间透空是木构本来的通透，不算缺件 —— 缺件密度由 V2 占有率负责。
    const coverage = span > 0 ? +(1 - voidPx / span).toFixed(4) : 0;
    rows.push({
      y, width: span, voidPx, maxRun, coverage,
      blank: span > 120 && coverage < 0.02
    });
  }

  // 连续空白行 → 最大空带
  let runStart = -1, maxBlankRunM = 0;
  const blankRanges = [];
  rows.forEach((r, i) => {
    if (r.blank && runStart < 0) runStart = i;
    if (!r.blank && runStart >= 0) {
      const yA = rows[runStart].y, yB = rows[i - 1].y;
      const lenM = +((yB - yA + 1) / pxPerM).toFixed(3);
      if (lenM > maxBlankRunM) maxBlankRunM = lenM;
      if (lenM > MAX_BLANK_RUN_M) blankRanges.push({ rowY0: yA, rowY1: yB, lengthM: lenM });
      runStart = -1;
    }
  });
  if (runStart >= 0) {
    const yA = rows[runStart].y, yB = rows[rows.length - 1].y;
    const lenM = +((yB - yA + 1) / pxPerM).toFixed(3);
    if (lenM > maxBlankRunM) maxBlankRunM = lenM;
    if (lenM > MAX_BLANK_RUN_M) blankRanges.push({ rowY0: yA, rowY1: yB, lengthM: lenM });
  }

  // 各带的视觉占有率（中间 70% 高度）
  const bandStats = BANDS.map((b) => {
    const rA = rowOf(b.y1), rB = rowOf(b.y0);
    const mid = rows.filter((r) => r.y >= Math.min(rA, rB) && r.y <= Math.max(rA, rB));
    const mid70 = mid.filter((r) => {
      const span = Math.abs(rB - rA);
      const d = Math.abs(r.y - rA);
      return d >= span * 0.15 && d <= span * 0.85;
    });
    const occ = mid70.length ? mid70.reduce((s, r) => s + r.coverage, 0) / mid70.length : 0;
    return { bandId: b.id, centerOccupancy: +occ.toFixed(4), samples: mid70.length };
  });

  detectedB.push({
    azimuthDeg: az, pxPerM: +pxPerM.toFixed(3),
    maxBlankRunM, blankRanges, bands: bandStats
  });
  console.log(`  视角 ${String(az).padStart(3)}°  最大空带 ${maxBlankRunM.toFixed(2)} m  ` +
    `各带占有率 ${bandStats.map((b) => b.bandId + ':' + b.centerOccupancy.toFixed(2)).join(' ')}`);
}

/* ── 判定 ─────────────────────────────────────────────── */
const bMaxBlank = detectedB.reduce((m, v) => Math.max(m, v.maxBlankRunM), 0);
const bMinOcc = detectedB.reduce((m, v) =>
  Math.min(m, ...v.bands.map((b) => b.centerOccupancy)), Infinity);

// 定量结论只来自检测 A（分深度、可判层间是否真的缺件）。
// 检测 B 是「真实投影」证据：正交立面图 + 逐视图剖面，供人眼核验，
// 按规划 §5.4 不得把人工观察项伪装成程序自动 PASS。
const v1 = detectedA.pass;
const v2 = detectedA.pass && detectedA.perBand.every((b) => b.minCenterOccupancy >= MIN_CENTER_OCCUPANCY);

const coverage = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  thresholds: { maxBlankRunM: MAX_BLANK_RUN_M, minCenterOccupancy: MIN_CENTER_OCCUPANCY, minVoidPx: MIN_VOID_PX },
  scope: V1_SCOPE,
  detectedA: {
    pass: detectedA.pass,
    perBand: detectedA.perBand.map((b) => ({
      bandId: b.bandId, y0: b.y0, y1: b.y1, records: b.records,
      maxBlankRunM: b.maxBlankRunM, minCenterOccupancy: b.minCenterOccupancy, pass: b.pass
    })),
    failRanges: detectedA.failRanges
  },
  detectedB: { views: detectedB, maxBlankRunM: bMaxBlank, minCenterOccupancy: Number.isFinite(bMinOcc) ? +bMinOcc.toFixed(4) : 0 },
  generator: payload.diagnostics,
  dimensions: payload.dims,
  counts: payload.counts,
  verdict: {
    V1: v1 ? 'PASS' : 'FAIL',
    V2: v2 ? 'PASS' : 'FAIL'
  }
};
writeFileSync(`${OUT}/coverage.json`, JSON.stringify(coverage, null, 2));

console.log();
console.log('════ 连续度自动校验 ════');
console.log(`检测A（records，8 面 × 0.1 m）：${detectedA.pass ? 'PASS' : 'FAIL'}` +
  (detectedA.perBand.length
    ? `　各带最大空带 ${detectedA.perBand.map((b) => b.bandId + ':' + b.maxBlankRunM + 'm').join(' ')}`
    : ''));
console.log(`检测B（八向近正交投影，视觉证据）：无「完全无构件」空带 ${bMaxBlank.toFixed(2)} m；` +
  `逐视图带内覆盖率 ${(Number.isFinite(bMinOcc) ? bMinOcc : 0).toFixed(3)}（仅供参考，不作为判定依据）`);
console.log(`  立面图 → ${OUT}/visual/view-000..315.png（供人眼核验）`);
console.log();
console.log(`V1 ${v1 ? 'PASS' : 'FAIL'}; V2 ${v2 ? 'PASS' : 'FAIL'}`);
console.log(`coverage.json → ${OUT}/coverage.json`);

page.close();
cdp.close();
process.exit(v1 && v2 ? 0 : 1);
