/**
 * src/app/ui.js
 *
 * 中文界面控制层。规划 §3.1 的信息架构：
 *   左上标题区 / 右侧构件注释卡 / 下方模式与光照 / 右下控制 / 左下口径说明。
 */

import { SITE, UI_STRINGS, HOTSPOTS, FLOOR_CONTENT, HIDDEN_FLOOR_CONTENT, EVIDENCE_PANEL } from '../data/content.zh.js';
import { getSource } from '../data/evidence.js';
import { VIEW_LABELS, LIGHT_LABELS, QUALITY_LABELS } from './state.js';
import { CAMERA_PRESETS } from '../render/camera.js';

const CERTAINTY_TEXT = {
  published: '已核实（公开口径）',
  academic: '学术实测 / 推算',
  estimate: '本项目估算',
  unverified: '待核实'
};

const $ = (id) => document.getElementById(id);

export function createUI(handlers = {}) {
  const el = {
    stage: $('stage'),
    boot: $('boot'),
    bootBar: $('boot-bar-fill'),
    bootStage: $('boot-stage'),
    card: $('yx-card'),
    cardEmpty: $('card-empty'),
    cardBody: $('card-body'),
    cardTitle: $('card-title'),
    cardSummary: $('card-summary'),
    cardDetail: $('card-detail'),
    cardTerms: $('card-terms'),
    cardEstimate: $('card-estimate'),
    cardEvidence: $('card-evidence'),
    modes: $('yx-modes'),
    controls: $('yx-controls'),
    btnWhole: $('btn-whole'),
    selView: $('sel-view'),
    selQuality: $('sel-quality'),
    btnEvidence: $('btn-evidence'),
    btnHelp: $('btn-help'),
    note: $('yx-note'),
    floors: $('yx-floors'),
    hotspots: $('yx-hotspots'),
    drawer: $('yx-drawer'),
    drawerBody: $('drawer-body'),
    drawerClose: $('drawer-close'),
    evidence: $('yx-evidence'),
    evidenceBody: $('evidence-body'),
    help: $('yx-help'),
    helpBody: $('help-body'),
    overlay: $('yx-overlay'),
    overlayTitle: $('overlay-title'),
    overlayMsg: $('overlay-msg'),
    overlayText: $('overlay-text'),
    btnRetryLight: $('btn-retry-light'),
    btnReadText: $('btn-read-text'),
    ctx: $('yx-ctx'),
    hud: $('yx-hud'),
    live: $('yx-live')
  };

  // ── 机位下拉
  CAMERA_PRESETS.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.key;
    opt.textContent = p.label;
    opt.title = p.hint ?? '';
    el.selView.appendChild(opt);
  });

  // ── 热点列表
  HOTSPOTS.forEach((h) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = h.name;
    b.dataset.hotspot = h.id;
    b.setAttribute('aria-label', `${h.name}：${h.summary}`);
    li.appendChild(b);
    el.hotspots.appendChild(li);
  });

  // ── 楼层列表
  FLOOR_CONTENT.forEach((f) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${f.level}层`;
    b.dataset.floor = String(f.level);
    b.setAttribute('aria-label', `查看${f.level}层：${f.title}`);
    li.appendChild(b);
    el.floors.appendChild(li);
  });

  // ── 事件绑定
  el.modes.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.view) handlers.onView?.(btn.dataset.view);
    if (btn.dataset.light) handlers.onLight?.(btn.dataset.light);
  });

  el.hotspots.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    handlers.onHotspot?.(btn.dataset.hotspot);
  });

  el.floors.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    handlers.onFloor?.(Number(btn.dataset.floor));
  });

  el.btnWhole.addEventListener('click', () => handlers.onWhole?.());
  el.selView.addEventListener('change', () => handlers.onPreset?.(el.selView.value));
  el.selQuality.addEventListener('change', () => handlers.onQuality?.(el.selQuality.value));
  el.btnEvidence.addEventListener('click', () => handlers.onEvidence?.());
  el.btnHelp.addEventListener('click', () => handlers.onHelp?.());

  document.querySelectorAll('[data-close-modal]').forEach((b) => {
    b.addEventListener('click', () => handlers.onCloseModal?.());
  });

  el.drawerClose.addEventListener('click', () => handlers.onCloseDrawer?.());
  el.btnRetryLight.addEventListener('click', () => handlers.onRetryLight?.());
  el.btnReadText.addEventListener('click', () => handlers.onReadText?.());

  // ── 证据面板内容
  function evidenceHtml() {
    const p = EVIDENCE_PANEL;
    const sources = (p.sources ?? []).map((s) => {
      const meta = getSource(s.id);
      const url = s.url || meta?.url;
      return `<li><b>${s.label ?? meta?.title ?? s.id}</b>
        <span>${meta?.publisher ?? ''}${meta?.date ? ' · ' + meta.date : ''}</span>
        ${url ? `<br><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>` : ''}</li>`;
    }).join('');
    return `
      <p>${p.intro ?? ''}</p>
      ${p.scaleNote ? `<h3>尺度口径</h3><p>${p.scaleNote}</p>` : ''}
      ${p.dougongNote ? `<h3>斗栱计数</h3><p>${p.dougongNote}</p>` : ''}
      ${p.protectionNote ? `<h3>保护现状</h3><p>${p.protectionNote}</p>` : ''}
      ${(p.unknowns ?? []).length ? `<h3>尚未核实的项目</h3><ul>${p.unknowns.map((u) => `<li>${u}</li>`).join('')}</ul>` : ''}
      <h3>来源</h3>
      <ul class="yx-src-list">${sources}</ul>
    `;
  }

  function helpHtml() {
    const floors = FLOOR_CONTENT.map((f) => `
      <h3>${f.level} 层 · ${f.title}</h3>
      <p>${f.summary}</p><p>${f.detail}</p>`).join('');
    const hidden = HIDDEN_FLOOR_CONTENT.map((h) => `
      <h3>第 ${h.level} 暗层 · ${h.title}</h3>
      <p>${h.summary}</p>`).join('');
    return `
      <p>${SITE.title}（${SITE.subtitle}），${SITE.era}。${SITE.disclaimer}</p>
      <h3>操作</h3>
      <ul>
        <li>拖动：绕塔旋转；滚轮：缩放；右键：平移。</li>
        <li>键盘：<b>R</b> 返回全塔，<b>1–5</b> 选择明层，<b>Esc</b> 关闭说明或退出剖视。</li>
        <li>触屏：单指转、双指缩放与平移。</li>
      </ul>
      ${floors}
      ${hidden}
    `;
  }

  // 规划 C04：哪些构件说明里含有本轮新增的**估算**构件（暗层过渡构架 / 檐下承托）
  const ESTIMATED_HOTSPOTS = {
    hiddenFloor: '暗层构架：估算示意，非原样实测',
    brackets: '檐下承托与过渡枋：估算示意，非原样实测'
  };

  function renderCard(hotspotId) {
    const h = HOTSPOTS.find((x) => x.id === hotspotId);
    if (!h) {
      el.cardEmpty.hidden = false;
      el.cardBody.hidden = true;
      return;
    }
    el.cardEmpty.hidden = true;
    el.cardBody.hidden = false;
    const estNote = ESTIMATED_HOTSPOTS[h.id];
    el.cardTitle.innerHTML = estNote
      ? `${h.name} <span class="yx-badge" title="本轮新增的构件为程序化估算，非实测数据">估算构件·待核实</span>`
      : h.name;
    el.cardSummary.textContent = h.summary;
    el.cardDetail.textContent = h.detail;
    el.cardTerms.innerHTML = (h.terms ?? []).map((t) => `<li>${t}</li>`).join('');
    el.cardEstimate.innerHTML = estNote
      ? `<p class="yx-note-est">${estNote}。塔高 67.31 m、底径 30.27 m、逐层面宽与铺作跳数仍为已核实值，未作改动。</p>`
      : '';
    const ev = h.evidence ?? {};
    const srcText = (ev.sourceIds ?? []).map((id) => getSource(id)?.title ?? id).join('；');
    el.cardEvidence.innerHTML =
      `<span class="badge badge--${ev.certainty ?? 'unverified'}">${CERTAINTY_TEXT[ev.certainty] ?? '待核实'}</span>` +
      (srcText ? `来源：${srcText}` : '来源：待核实');
  }

  function renderDrawer(hotspotId) {
    const h = HOTSPOTS.find((x) => x.id === hotspotId);
    if (!h) { el.drawer.hidden = true; return; }
    const estNote = ESTIMATED_HOTSPOTS[h.id];
    el.drawerBody.innerHTML = `
      <h2>${h.name}${estNote ? ' <span class="yx-badge">估算构件·待核实</span>' : ''}</h2>
      <p>${h.summary}</p>
      <p>${h.detail}</p>
      ${estNote ? `<p class="yx-note-est">${estNote}。</p>` : ''}
      <p class="yx-evi"><span class="badge badge--${h.evidence?.certainty ?? 'unverified'}">${CERTAINTY_TEXT[h.evidence?.certainty] ?? '待核实'}</span>来源：${(h.evidence?.sourceIds ?? []).map((id) => getSource(id)?.title ?? id).join('；') || '待核实'}</p>
    `;
    el.drawer.hidden = false;
  }

  return {
    el,

    setBootProgress(stage, done, total) {
      el.bootStage.textContent = stage;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      el.bootBar.style.width = `${pct}%`;
    },

    hideBoot() {
      el.boot.classList.add('is-hidden');
      window.setTimeout(() => { el.boot.hidden = true; }, 600);
    },

    showBoot() {
      el.boot.hidden = false;
      el.boot.classList.remove('is-hidden');
    },

    /** 按状态刷新所有控件的可见反馈 */
    render(state) {
      el.modes.querySelectorAll('button[data-view]').forEach((b) => {
        const on = b.dataset.view === state.view;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      el.modes.querySelectorAll('button[data-light]').forEach((b) => {
        const on = b.dataset.light === state.light;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      el.selQuality.value = state.quality;
      el.hotspots.querySelectorAll('button').forEach((b) => {
        const on = b.dataset.hotspot === state.selectedHotspot;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      el.floors.hidden = !(state.view === 'section' || state.view === 'exploded' || state.view === 'floor');
      el.floors.querySelectorAll('button').forEach((b) => {
        const on = Number(b.dataset.floor) === state.floor && state.view === 'floor';
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });

      renderCard(state.selectedHotspot);
      renderDrawer(state.selectedHotspot);

      el.evidence.hidden = state.modal !== 'evidence';
      el.help.hidden = state.modal !== 'help';
    },

    setEvidenceContent() { el.evidenceBody.innerHTML = evidenceHtml(); },
    setHelpContent() { el.helpBody.innerHTML = helpHtml(); },

    showOverlay(title, message, { withText = true } = {}) {
      el.overlayTitle.textContent = title;
      el.overlayMsg.textContent = message;
      el.overlayText.innerHTML = withText ? textFallbackHtml() : '';
      el.overlay.hidden = false;
    },
    hideOverlay() { el.overlay.hidden = true; },
    showContextLost() { el.ctx.hidden = false; },
    hideContextLost() { el.ctx.hidden = true; },

    setHud(text) {
      if (!text) { el.hud.hidden = true; return; }
      el.hud.hidden = false;
      el.hud.textContent = text;
    },

    closeDrawer() { el.drawer.hidden = true; },
    get drawerOpen() { return !el.drawer.hidden; },
    get modalOpen() { return !el.evidence.hidden || !el.help.hidden; },
    setViewSelect(key) { el.selView.value = key; }
  };
}

/** WebGL2 不可用时的纯文字分层简介 */
export function textFallbackHtml() {
  const floors = FLOOR_CONTENT.map((f) => `<h3>${f.level} 层 · ${f.title}</h3><p>${f.summary}</p>`).join('');
  const hidden = HIDDEN_FLOOR_CONTENT.map((h) => `<h3>第 ${h.level} 暗层 · ${h.title}</h3><p>${h.summary}</p>`).join('');
  return `
    <h3>文字分层简介</h3>
    <p>${SITE.title}（${SITE.subtitle}），${SITE.era}。外观五层六檐，明五暗四共九层，平面八角，
       通高约 67.31 米，底层直径约 30.27 米。${SITE.disclaimer}</p>
    ${floors}${hidden}
  `;
}

export { VIEW_LABELS, LIGHT_LABELS, QUALITY_LABELS };
