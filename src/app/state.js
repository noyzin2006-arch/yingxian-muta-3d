/**
 * src/app/state.js
 *
 * 纯状态机 + 订阅。规划 §3.2：
 *   view   = whole | section | exploded | floor(1..5)
 *   light  = day | sunset | night
 *   quality= auto | high | standard | low | safe
 *   modal  = null | help | evidence | error
 *   camera = idle | orbit | presetTween | focusTween
 *
 * 任何状态变化都必须有可见反馈（按钮 pressed / selected、标题变化、动作），
 * 不能只有状态码。
 */

export const VIEWS = Object.freeze(['whole', 'section', 'exploded']);
export const LIGHTS = Object.freeze(['day', 'sunset', 'night']);
export const QUALITIES = Object.freeze(['auto', 'high', 'standard', 'low', 'safe']);

const initial = {
  boot: 'boot',            // boot | loading-outline | loading-details | ready | failed
  view: 'whole',
  floor: 1,
  light: 'day',
  quality: 'auto',
  modal: null,
  selectedHotspot: null,
  cameraAction: 'idle',
  progress: { stage: '', done: 0, total: 8 },
  error: null,
  evidenceOpen: false
};

export function createStore() {
  let state = { ...initial };
  const listeners = new Set();

  function notify(reason) {
    listeners.forEach((fn) => fn(state, reason));
  }

  return {
    get() { return state; },
    subscribe(fn) {
      listeners.add(fn);
      fn(state, 'init');
      return () => listeners.delete(fn);
    },
    /** 通用设置 */
    set(patch, reason = 'set') {
      const next = { ...state, ...patch };
      if (JSON.stringify(next) === JSON.stringify(state)) return state;
      state = next;
      notify(reason);
      return state;
    },
    setBoot(boot, progress) {
      return this.set({
        boot,
        progress: progress ?? state.progress
      }, 'boot');
    },
    setProgress(stage, done, total) {
      return this.set({
        progress: { stage, done, total }
      }, 'progress');
    },
    setView(view) {
      if (view.startsWith('floor-')) {
        const level = Number(view.slice(6));
        return this.set({ view: 'floor', floor: level, selectedHotspot: null }, 'view');
      }
      return this.set({ view, selectedHotspot: null }, 'view');
    },
    setLight(light) {
      if (!LIGHTS.includes(light)) return state;
      return this.set({ light }, 'light');
    },
    setQuality(quality) {
      if (!QUALITIES.includes(quality)) return state;
      return this.set({ quality }, 'quality');
    },
    toggleModal(modal) {
      return this.set({ modal: state.modal === modal ? null : modal }, 'modal');
    },
    selectHotspot(id) {
      return this.set({ selectedHotspot: state.selectedHotspot === id ? null : id }, 'hotspot');
    },
    fail(message) {
      return this.set({ boot: 'failed', error: message }, 'error');
    }
  };
}

/** 中文标签映射（UI 用） */
export const VIEW_LABELS = Object.freeze({
  whole: '全貌',
  section: '结构剖视',
  exploded: '逐层'
});

export const LIGHT_LABELS = Object.freeze({
  day: '白昼',
  sunset: '夕照',
  night: '夜景'
});

export const QUALITY_LABELS = Object.freeze({
  auto: '自动',
  high: '高',
  standard: '中',
  low: '低',
  safe: '极简'
});
