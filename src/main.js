/**
 * src/main.js
 *
 * 启动与总装。
 *
 * 规划 §3.2 的状态机：
 *   boot → loading-outline → loading-details → ready
 *   ready 时的 view / light / quality 各自独立，切换不丢状态。
 *
 * 调试接口（?debug=1 或开发模式）：window.__yingxianDebug
 */

import './app/ui.css';
import * as THREE from 'three';

import { createStore } from './app/state.js';
import { createUI } from './app/ui.js';
import { createA11y } from './app/a11y.js';
import { buildPagoda } from './geometry/building.js';
import { createStage, supportsWebGL2, fitDistance } from './render/scene.js';
import { createLighting } from './render/lighting.js';
import { createComposer } from './render/composer.js';
import { createQualityManager } from './render/quality.js';
import { createCameraDirector, CAMERA_PRESETS } from './render/camera.js';
import { createHotspots, createPicker, floorAtHeight } from './render/picker.js';
import { createSectionManager } from './render/section.js';
import { createFrameStats } from './render/frame-stats.js';
import { createResourceGuard } from './render/resource.js';
import { SITE, UI_STRINGS, HOTSPOTS } from './data/content.zh.js';
import { LEVELS, MODULE_A } from './data/dimensions.js';

const params = new URLSearchParams(location.search);
// 调试接口：开发环境或 ?debug=1 都可用（规划 §S10）
const DEBUG = params.get('debug') === '1' || import.meta.env?.DEV;
// 屏幕上的性能仪表：只在显式 ?debug=1 时显示，避免污染正式观感
const SHOW_HUD = params.get('debug') === '1';

const store = createStore();
const a11y = createA11y(document.getElementById('yx-live'));

/* ── WebGL2 检查 ─────────────────────────────────────────── */
if (!supportsWebGL2()) {
  const ui0 = createUI({});
  ui0.setEvidenceContent();
  ui0.setHelpContent();
  ui0.showOverlay('无法启动三维视图', UI_STRINGS.webgl2Missing, { withText: true });
  document.getElementById('boot').hidden = true;
} else {
  boot();
}

async function boot() {
  const stageEl = document.getElementById('stage');
  const stage = createStage(stageEl, { quality: 'high' });
  const lighting = createLighting(stage.scene, { shadowSize: 2048 });
  const composer = createComposer(stage.renderer, stage.scene, stage.camera);
  const frameStats = createFrameStats();
  // 机位动画结束后按当前视口宽高比重新适配（竖屏尤其重要）
  const cameraDirector = createCameraDirector(stage.camera, stage.controls, () => stage.refit());

  const ui = createUI({
    onView: (v) => store.setView(v),
    onLight: (l) => store.setLight(l),
    onHotspot: (id) => {
      store.selectHotspot(id);
      const h = HOTSPOTS.find((x) => x.id === id);
      if (h) a11y.announce(`${h.name}：${h.summary}`);
    },
    onFloor: (n) => store.setView(`floor-${n}`),
    onWhole: () => {
      store.setView('whole');
      cameraDirector.goTo('whole');
      a11y.announce('已返回全塔视角');
    },
    onPreset: (key) => {
      cameraDirector.goTo(key);
      a11y.announce('已切换机位');
    },
    onQuality: (q) => store.setQuality(q),
    onEvidence: () => { store.toggleModal('evidence'); a11y.announce('已打开证据与不确定度'); },
    onHelp: () => { store.toggleModal('help'); a11y.announce('已打开说明'); },
    onCloseModal: () => store.set({ modal: null }, 'modal'),
    onCloseDrawer: () => { store.set({ selectedHotspot: null }, 'hotspot'); },
    onRetryLight: () => { store.setQuality('low'); location.reload(); },
    onReadText: () => {
      const body = document.getElementById('overlay-text');
      if (body) body.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  ui.setEvidenceContent();
  ui.setHelpContent();

  const quality = createQualityManager({
    renderer: stage.renderer,
    lighting,
    composer,
    onChange: (key, profile) => {
      composer.setEnabled(profile.ssao || profile.smaa, profile);
      ui.setHud(SHOW_HUD ? `画质档：${profile.label}（${key}）` : null);
    }
  });

  /* ── 状态 → 场景 ─────────────────────────────────────── */
  let lightTween = null;
  let explodeTween = null;
  let sectionManager = null;
  let pagoda = null;
  let hotspots = null;

  function applyState(state, prev) {
    // 光照
    if (state.light !== prev?.light) {
      lightTween = { from: lighting.current, to: state.light, t: 0, duration: 1.45 };
    }
    // 模式
    if (state.view !== prev?.view) {
      if (state.view === 'section') {
        cameraDirector.goTo('section');
        a11y.announce('已进入结构剖视');
      } else if (state.view === 'exploded') {
        cameraDirector.goTo('topNE');
        explodeTween = { t: 0, duration: 1.35, dir: 1 };
        a11y.announce('已进入逐层拆解');
      } else if (state.view === 'floor') {
        cameraDirector.goTo('whole');
        a11y.announce(`已聚焦第 ${state.floor} 层`);
      } else {
        explodeTween = { t: 1, duration: 1.0, dir: -1 };
        a11y.announce('已返回全貌');
      }
      sectionManager?.setMode(state.view === 'section' ? 'section' : state.view === 'exploded' ? 'exploded' : 'whole');
    }
    // 画质
    if (state.quality !== prev?.quality) {
      quality.set(state.quality);
    }
    // 弹窗焦点
    if (state.modal === 'evidence') a11y.trap(ui.el.evidence);
    else if (state.modal === 'help') a11y.trap(ui.el.help);
    else if (prev?.modal) a11y.release();

    ui.render(state);
  }

  let lastState = store.get();
  store.subscribe((state, reason) => {
    const prev = lastState;
    lastState = state;
    if (reason === 'init') return;
    applyState(state, prev);
  });

  /* ── 建造模型（分批，带进度）──────────────────────────── */
  store.setBoot('loading-outline');
  try {
    pagoda = await buildPagoda({
      quality: 'high',
      // ?nocontinuity=1：关闭本轮新增的过渡构架，用于可复现的前后对照
      continuity: params.get('nocontinuity') !== '1',
      onProgress: (stageName, done, total) => {
        ui.setBootProgress(stageName, done, total);
        store.setProgress(stageName, done, total);
      }
    });
  } catch (err) {
    console.error('[应县木塔] 模型生成失败', err);
    store.fail(String(err?.message ?? err));
    ui.showOverlay('模型生成失败', UI_STRINGS.loadingFailed, { withText: true });
    return;
  }

  stage.scene.add(pagoda.root);
  // 取景盒：塔身底径 30.27 m × 通高 67.31 m（台基不计入，否则竖屏时塔会被压得很小）
  stage.setSceneBounds({ width: 30.6, height: 67.31, centerY: 31 });

  hotspots = createHotspots(pagoda.structure);
  stage.scene.add(hotspots.group);

  sectionManager = createSectionManager({
    root: pagoda.root,
    floors: pagoda.floors,
    materials: pagoda.materials,
    camera: stage.camera,
    controls: stage.controls
  });

  const picker = createPicker(stage.camera, stage.renderer.domElement);

  /* ── 交互 ─────────────────────────────────────────────── */
  let downPos = null;
  stage.renderer.domElement.addEventListener('pointerdown', (e) => {
    downPos = { x: e.clientX, y: e.clientY };
  });
  stage.renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downPos) return;
    const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    downPos = null;
    if (moved > 6) return;               // 拖动不触发点击
    const hits = picker.pick(e.clientX, e.clientY, [hotspots.group, pagoda.root]);
    if (!hits) return;
    const hit = hits[0];
    const hs = hit.object.userData?.hotspotId;
    if (hs) {
      store.selectHotspot(hs);
      const h = HOTSPOTS.find((x) => x.id === hs);
      if (h) a11y.announce(`${h.name}：${h.summary}`);
      return;
    }
    // 点塔身 → 推断楼层
    const info = floorAtHeight(hit.point.y, pagoda.structure);
    if (info && info.kind === 'bright') {
      store.setView(`floor-${info.level}`);
      a11y.announce(`已选中${info.name}`);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === 'Escape') {
      if (store.get().modal) store.set({ modal: null }, 'modal');
      else if (store.get().view !== 'whole') { store.setView('whole'); cameraDirector.goTo('whole'); }
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      store.setView('whole');
      cameraDirector.goTo('whole');
      a11y.announce('已返回全塔');
      return;
    }
    if (/^[1-5]$/.test(e.key)) {
      const n = Number(e.key);
      store.setView(`floor-${n}`);
      a11y.announce(`已聚焦第 ${n} 层`);
    }
  });

  /* ── 资源保护 ─────────────────────────────────────────── */
  createResourceGuard({
    renderer: stage.renderer,
    container: stageEl,
    onLost: () => { ui.showContextLost(); },
    onRestored: () => { ui.hideContextLost(); },
    onError: (e) => console.warn('[应县木塔] 渲染器状态重置异常', e)
  });

  /* ── 渲染循环 ─────────────────────────────────────────── */
  let last = performance.now();
  let frameCount = 0;
  frameStats.start();
  let interacting = false;
  let lastInteract = 0;
  ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((ev) => {
    stage.renderer.domElement.addEventListener(ev, () => {
      interacting = true;
      lastInteract = performance.now();
    }, { passive: true });
  });

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    frameStats.tick(now);

    // 光照插值
    if (lightTween) {
      lightTween.t = Math.min(1, lightTween.t + dt / lightTween.duration);
      const k = lightTween.t;
      lighting.lerpTo(lightTween.to, k);
      stage.renderer.toneMappingExposure = lighting.current.exposure;
      if (lightTween.t >= 1) lightTween = null;
    }

    // 分解动画
    if (explodeTween && sectionManager) {
      explodeTween.t = Math.max(0, Math.min(1, explodeTween.t + (dt / explodeTween.duration) * explodeTween.dir));
      sectionManager.applyExplode(explodeTween.t);
      if ((explodeTween.dir < 0 && explodeTween.t <= 0) || (explodeTween.dir > 0 && explodeTween.t >= 1)) {
        explodeTween = null;
      }
    }

    // 楼层聚焦：仅高亮目标层
    if (pagoda && sectionManager) {
      const st = store.get();
      const focused = st.view === 'floor';
      Object.entries(pagoda.floors).forEach(([key, group]) => {
        const isTarget = !focused || key === `bright-${st.floor}`;
        group.visible = isTarget;
      });
    }

    sectionManager?.update();
    cameraDirector.update(dt);
    stage.controls.update();

    // 自动降级
    if (performance.now() - lastInteract < 1500) interacting = true;
    else interacting = false;
    quality.update(frameStats.p95, now, interacting);

    stage.renderer.info.reset();
    composer.render(dt);

    if (SHOW_HUD) updateHud();
    frameCount++;
    if (SHOW_HUD && frameCount % 300 === 0) {
      console.info('[YX] frame', frameCount, JSON.stringify(frameStats.snapshot()));
    }
  }

  function updateHud() {
    const info = stage.renderer.info;
    const s = frameStats.snapshot();
    ui.setHud([
      `FPS(中位) ${s.fpsMedian}  P95 ${s.frameTimeP95Ms}ms`,
      `draw calls ${info.render.calls}  triangles ${info.render.triangles}`,
      `画质 ${quality.resolved}  DPR ${stage.renderer.getPixelRatio().toFixed(2)}`,
      `坐标 ${stage.camera.position.toArray().map((v) => v.toFixed(1)).join(', ')}`
    ].join('\n'));
  }

  /* ── 就绪 ─────────────────────────────────────────────── */
  store.setBoot('ready');
  ui.hideBoot();
  ui.render(store.get());
  a11y.announce(UI_STRINGS.ready);
  requestAnimationFrame(loop);

  /* ── 调试接口 ─────────────────────────────────────────── */
  if (DEBUG) {
    window.__yingxianDebug = {
      getReadyState: () => store.get(),
      getStats: () => ({
        ...frameStats.snapshot(),
        drawCalls: stage.renderer.info.render.calls,
        triangles: stage.renderer.info.render.triangles,
        textures: stage.renderer.info.memory.textures,
        geometries: stage.renderer.info.memory.geometries,
        quality: quality.resolved,
        pixelRatio: stage.renderer.getPixelRatio(),
        renderer: stage.renderer.getContext().getParameter(
          stage.renderer.getContext().getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? 0x1F01
        )
      }),
      getDimensions: () => measure(pagoda.structure),
      getCounts: () => pagoda.metadata.counts,
      getBracketLedger: () => pagoda.metadata.bracketLedger,
      getSceneInfo: () => {
        const out = [];
        pagoda.root.traverse((o) => {
          if (!o.isMesh) return;
          const g = o.geometry;
          const count = g.index ? g.index.count : (g.attributes.position?.count ?? 0);
          g.computeBoundingBox?.();
          out.push({
            name: o.name,
            visible: o.visible,
            parentVisible: o.parent?.visible,
            tris: Math.floor(count / 3),
            mat: o.material?.type,
            side: o.material?.side,
            hasMap: !!o.material?.map,
            bbox: g.boundingBox ? {
              min: g.boundingBox.min.toArray().map((v) => Number(v.toFixed(1))),
              max: g.boundingBox.max.toArray().map((v) => Number(v.toFixed(1)))
            } : null
          });
        });
        return out;
      },
      setQuality: (q) => { store.setQuality(q); return quality.resolved; },
      setView: (v) => { store.setView(v); },
      setLight: (l) => { store.setLight(l); },
      goTo: (k) => { const r = cameraDirector.goTo(k); stage.refit(); return r; },
      /** 持续绕塔缓慢旋转（供帧率实测时保持画面变化，避免按需渲染导致的假低帧） */
      spin: (deg = 1.2) => {
        const t = stage.controls.target;
        const p = stage.camera.position;
        const a = (deg * Math.PI) / 180;
        const x = p.x - t.x;
        const z = p.z - t.z;
        p.x = t.x + x * Math.cos(a) - z * Math.sin(a);
        p.z = t.z + x * Math.sin(a) + z * Math.cos(a);
        stage.camera.lookAt(t);
      },
      /** 立即设置机位（不动画），用于帧率实测切场景 */
      jumpTo: (key) => {
        const preset = CAMERA_PRESETS.find((x) => x.key === key);
        if (!preset) return false;
        stage.camera.position.set(...preset.position);
        stage.controls.target.set(...preset.target);
        stage.camera.fov = preset.fov ?? 45;
        stage.camera.updateProjectionMatrix();
        stage.controls.update();
        return true;
      },
      /** 设置画布尺寸（帧率实测切换视口） */
      setSize: (w, h) => { stage.renderer.setSize(w, h, false); stage.camera.aspect = w / h; stage.camera.updateProjectionMatrix(); },
      getReady: () => store.get().boot === 'ready',
      /** 过渡构架的世界坐标记录（供连续度校验；records 带 world-space bbox） */
      getContinuityRecords: () => pagoda?.metadata?.continuityRecords ?? [],
      /** 既有结构 + 新增估算件的全部世界包围盒记录 */
      getAllStructuralRecords: () => [
        ...(pagoda?.metadata?.structureRecords ?? []),
        ...(pagoda?.metadata?.continuityRecords ?? [])
      ],
      getContinuityDiagnostics: () => pagoda?.metadata?.continuityDiagnostics ?? null,
      /** 供校验脚本设定近正交的固定机位 */
      setCamera: ({ azimuthDeg = 0, elevationDeg = 0, distance = 420, targetY = 33.5, fov = 12 } = {}) => {
        const az = (azimuthDeg * Math.PI) / 180;
        const el = (elevationDeg * Math.PI) / 180;
        const t = new THREE.Vector3(0, targetY, 0);
        const horiz = Math.cos(el) * distance;
        const pos = new THREE.Vector3(
          t.x + Math.sin(az) * horiz,
          t.y + Math.sin(el) * distance,
          t.z + Math.cos(az) * horiz
        );
        stage.camera.fov = fov;
        stage.camera.updateProjectionMatrix();
        stage.controls.target.copy(t);
        // OrbitControls 会把距离夹在 [minDistance, maxDistance] 内；
        // 正交立面需要更远的机位，临时放宽再恢复，并 controls.update() 之后重新落位。
        const prevMax = stage.controls.maxDistance;
        const prevMin = stage.controls.minDistance;
        stage.controls.maxDistance = Math.max(prevMax, distance);
        stage.controls.minDistance = Math.min(prevMin, distance);
        stage.controls.update();
        stage.controls.maxDistance = prevMax;
        stage.controls.minDistance = prevMin;
        stage.camera.position.copy(pos);
        stage.camera.lookAt(t);
        return { azimuthDeg, elevationDeg, distance, targetY, fov };
      },
      getCamera: () => ({
        position: stage.camera.position.toArray(),
        target: stage.controls.target.toArray(),
        fov: stage.camera.fov,
        aspect: stage.camera.aspect
      }),
      getScene: () => stage.scene,
      textFallbackLength: () => (document.getElementById('overlay-text')?.innerHTML.length) || 0,
      presets: CAMERA_PRESETS.map((p) => p.key),
      levels: LEVELS.map((l) => l.name),
      moduleA: MODULE_A
    };
  }
}

/**
 * 从模型量出的尺寸（与实测锚点同口径）。
 */
function measure(structure) {
  const l1 = structure.levels[0];
  // 底层最远顶点距（对角径）：用副阶柱环
  const sec = l1.secondary?.vertices ?? l1.outer.vertices;
  let base = 0;
  sec.forEach((v) => { base = Math.max(base, Math.hypot(v.x, v.z)); });
  base *= 2;
  // 总高：台基底面 0 → 刹顶
  const totalHeight = structure.finial.y1;
  return {
    totalHeight: Number(totalHeight.toFixed(3)),
    base: Number(base.toFixed(3)),
    ratio: Number((totalHeight / base).toFixed(4)),
    measurementDatum: 'totalHeight = 地面至刹顶；base = 底层塔身最远顶点距（对角径）',
    levels: structure.levels.map((lv) => ({
      index: lv.index,
      name: lv.name,
      outerFaceWidthM: lv.outer.side,
      outerDiagonalM: lv.outer.diagonal,
      columnTopY: Number(lv.columnTopY.toFixed(3))
    })),
    moduleA: MODULE_A
  };
}
