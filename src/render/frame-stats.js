/**
 * src/render/frame-stats.js
 *
 * 帧率与帧时间统计。
 *
 * 规划 §6.2：frameDelta = timestamp[i] − timestamp[i−1]；
 * 每段 10 s 样本算 fps = 1000 / median(deltaMs)，同时报 P95(deltaMs)；
 * 静止时按需渲染会降帧，因此测试必须持续旋转或做相机动画。
 */

export function createFrameStats({ windowSize = 240 } = {}) {
  const deltas = [];
  let last = 0;
  let running = false;

  function tick(timestamp) {
    if (!running) return;
    if (last > 0) {
      const dt = timestamp - last;
      // 忽略切后台 / 切标签页造成的超大间隔
      if (dt > 0 && dt < 1000) {
        deltas.push(dt);
        if (deltas.length > windowSize) deltas.shift();
      }
    }
    last = timestamp;
  }

  function percentile(values, p) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx];
  }

  return {
    start() { running = true; last = 0; },
    stop() { running = false; },
    tick,
    reset() { deltas.length = 0; last = 0; },
    get samples() { return deltas.length; },
    /** 中位帧率（按规划口径） */
    get fps() {
      if (deltas.length < 2) return 0;
      const median = percentile(deltas, 50);
      return median > 0 ? 1000 / median : 0;
    },
    /** 按总帧数 / 总时长计算的帧率 */
    get fpsByCount() {
      if (deltas.length < 2) return 0;
      const total = deltas.reduce((a, b) => a + b, 0);
      return total > 0 ? (deltas.length * 1000) / total : 0;
    },
    /** 帧时间 P95（毫秒） */
    get p95() { return percentile(deltas, 95); },
    get medianDelta() { return percentile(deltas, 50); },
    get maxDelta() { return deltas.length ? Math.max(...deltas) : 0; },
    /** 取一段采样做快照 */
    snapshot() {
      return {
        samples: deltas.length,
        fpsMedian: Number(this.fps.toFixed(2)),
        fpsByCount: Number(this.fpsByCount.toFixed(2)),
        frameTimeMedianMs: Number(this.medianDelta.toFixed(2)),
        frameTimeP95Ms: Number(this.p95.toFixed(2)),
        frameTimeMaxMs: Number(this.maxDelta.toFixed(2))
      };
    }
  };
}
