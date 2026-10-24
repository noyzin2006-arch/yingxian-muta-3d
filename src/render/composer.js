/**
 * src/render/composer.js
 *
 * 后期处理链：RenderPass →（可选 SSAO）→（可选 SMAA）→ OutputPass。
 *
 * 依据规划 §4.5 与 T06/T07：
 *   · OutputPass 通常在链尾统一执行色调映射与色域转换，**不要重复 tone map**。
 *   · SMAA 在 linear-sRGB 中进行，必须置于 OutputPass 之前。
 *   · SSAO 成本较高，仅高档开启且用半分辨率。
 *   · 低端档完全不用 composer，直接 renderer.render。
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

export function createComposer(renderer, scene, camera, opts = {}) {
  let enabled = false;
  let composer = null;
  let renderPass = null;
  let outputPass = null;
  let smaaPass = null;
  let ssaoPass = null;

  function build() {
    if (composer) return composer;
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(renderer.getPixelRatio());
    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    outputPass = new OutputPass();
    composer.addPass(outputPass);
    return composer;
  }

  return {
    get enabled() { return enabled; },
    get composer() { return composer; },

    /**
     * 开关后期。
     * @param {boolean} on
     * @param {object} profile 画质档
     */
    setEnabled(on, profile = {}) {
      enabled = Boolean(on);
      if (!enabled) return;
      build();
      const wantSMAA = profile.smaa !== false;
      if (wantSMAA && !smaaPass) {
        const size = renderer.getSize(new THREE.Vector2());
        smaaPass = new SMAAPass(size.x, size.y);
        composer.insertPass(outputPass, smaaPass);
      }
      if (smaaPass) smaaPass.enabled = wantSMAA;
      if (ssaoPass) ssaoPass.enabled = profile.ssao === true;
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight);
    },

    setSize(w, h) {
      if (composer) {
        composer.setSize(w, h);
        if (smaaPass) smaaPass.setSize(w, h);
      }
    },

    render(dt) {
      if (enabled && composer) composer.render(dt);
      else renderer.render(scene, camera);
    },

    dispose() {
      composer?.dispose?.();
      smaaPass?.dispose?.();
      ssaoPass?.dispose?.();
      composer = null;
    }
  };
}
