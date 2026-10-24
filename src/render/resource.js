/**
 * src/render/resource.js
 *
 * 资源释放与 WebGL 上下文丢失恢复。
 *
 * 规划 §3.2 / A09：
 *   · contextlost → 显示遮罩并暂停输入；
 *   · contextrestored → 重建资源与 state、重置渲染器，必要时提示刷新；
 *     不得继续引用失效的 WebGL buffer。
 */

export function createResourceGuard({ renderer, container, onLost, onRestored, onError }) {
  const canvas = renderer.domElement;
  let lost = false;

  function handleLost(event) {
    console.info('[YX] webglcontextlost', {
      t: Math.round(performance.now()),
      statusMessage: event.statusMessage ?? null
    });
    // 阻止浏览器默认的「不再恢复」行为
    event.preventDefault();
    lost = true;
    onLost?.();
  }

  function handleRestored() {
    console.info('[YX] webglcontextrestored', { t: Math.round(performance.now()) });
    lost = false;
    try {
      renderer.resetState();
    } catch (e) {
      onError?.(e);
    }
    onRestored?.();
  }

  canvas.addEventListener('webglcontextlost', handleLost, false);
  canvas.addEventListener('webglcontextrestored', handleRestored, false);

  return {
    get lost() { return lost; },
    dispose() {
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
    }
  };
}

/** 递归释放一组对象的几何与材质 */
export function disposeObject(root) {
  const seenGeo = new Set();
  const seenMat = new Set();
  root.traverse((o) => {
    if (o.geometry && !seenGeo.has(o.geometry)) {
      seenGeo.add(o.geometry);
      o.geometry.dispose();
    }
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    mats.forEach((m) => {
      if (!m || seenMat.has(m)) return;
      seenMat.add(m);
      for (const key of Object.keys(m)) {
        const v = m[key];
        if (v && v.isTexture) v.dispose();
      }
      m.dispose();
    });
  });
}

/**
 * 页面失焦 / 隐藏时暂停重计算。
 * @returns {{ setPaused(fn:boolean):void, dispose():void }}
 */
export function createVisibilityGuard(onPauseChange) {
  const handle = (visible) => onPauseChange?.(visible);
  document.addEventListener('visibilitychange', () => handle(!document.hidden));
  window.addEventListener('blur', () => handle(false));
  window.addEventListener('focus', () => handle(true));
  return {
    dispose() {
      // 事件在页面生命周期内复用，不单独移除
    }
  };
}
