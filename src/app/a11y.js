/**
 * src/app/a11y.js
 *
 * 无障碍辅助：焦点陷阱、播报、减弱动态效果检测。
 */

export function createA11y(liveEl) {
  let trapTarget = null;
  let restoreFocusTo = null;

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusables(root) {
    return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  }

  function onKeydown(e) {
    if (!trapTarget) return;
    if (e.key !== 'Tab') return;
    const list = focusables(trapTarget);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return {
    /** 打开弹窗时把焦点锁在容器内 */
    trap(container) {
      trapTarget = container;
      restoreFocusTo = document.activeElement;
      document.addEventListener('keydown', onKeydown, true);
      const list = focusables(container);
      (list[0] ?? container).focus?.();
    },
    release() {
      trapTarget = null;
      document.removeEventListener('keydown', onKeydown, true);
      if (restoreFocusTo && document.contains(restoreFocusTo)) restoreFocusTo.focus();
      restoreFocusTo = null;
    },
    /** 向 aria-live 区播报中文提示（不播报镜头逐帧变化） */
    announce(text) {
      if (!liveEl) return;
      liveEl.textContent = '';
      // 触发重新播报
      window.setTimeout(() => { liveEl.textContent = text; }, 30);
    },
    get reducedMotion() {
      return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    }
  };
}
