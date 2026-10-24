/**
 * src/geometry/inscriptions.js
 *
 * 匾额。
 *
 * 文字用 CanvasTexture 原创排版，**不是原匾扫描件**。
 * 三块最重要的匾都在正南明间：五层「峻极神工」、四层「天下奇观」、三层「释迦塔」，
 * 一层南门上方「万古观瞻」。
 * 尺寸与标高为 ESTIMATE（M34）；字体走系统中文回退链。
 */

import * as THREE from 'three';
import { octagonEdges } from './math-octagon.js';
import { EST } from '../data/structure.js';

const FONT_STACK = '"PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", serif';

/** 匾额正面贴图：深木底 + 金色字 */
export function makePlaqueTexture(text, { width = 1024, height = 320 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 底：实照中的匾额为白底黑字（如「天下奇观」「峻极神工」）
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#EFE9DC');
  grad.addColorStop(0.5, '#E4DCCB');
  grad.addColorStop(1, '#D6CCB8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 边框
  ctx.strokeStyle = '#6B5B44';
  ctx.lineWidth = Math.max(3, height * 0.035);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, width - ctx.lineWidth * 2, height - ctx.lineWidth * 2);

  // 文字（自右向左，横排）
  const chars = [...text];
  const fs = Math.floor(height * 0.52);
  ctx.font = `600 ${fs}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#241F19';
  ctx.shadowColor = 'rgba(255,255,255,0.45)';
  ctx.shadowBlur = 6;
  const step = width * 0.78 / Math.max(1, chars.length - 1 || 1);
  const startX = width * 0.89;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, startX - i * step, height * 0.5);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** 匾额木牌底板（不带字） */
function makeBoardGeometry(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  return geo;
}

/**
 * 生成全部匾额。
 * @returns {{boards: THREE.BufferGeometry[], faces: Array<{geometry, texture, text, record}>}}
 */
export function buildPlaques(structure) {
  const boards = [];
  const faces = [];

  // 每层对应的檐口标高（匾悬于檐下）
  const EAVE_FOR_LEVEL = { 1: 10.5, 2: 25.0, 3: 34.5, 4: 44.0, 5: 54.1 };

  for (const plaque of structure.plaques) {
    const lv = structure.levels[plaque.level - 1];
    if (!lv) continue;
    const edges = octagonEdges(lv.outer.vertices);
    const south = edges[5];                     // 正南面
    const w = EST.plaque.width;
    const h = EST.plaque.height;
    const d = EST.plaque.depth;
    const y = (EAVE_FOR_LEVEL[plaque.level] ?? lv.band.y1) - 0.72;

    // 板身：贴在柱线外侧，面朝南（-Z）
    const px = south.mid.x + south.normal.x * 0.12;
    const pz = south.mid.z + south.normal.z * 0.12;
    const board = makeBoardGeometry(w, h, d);
    board.rotateY(-south.azimuth);
    board.translate(px, y, pz);
    boards.push(board);

    // 字面：略前于板面，法线朝外（南）
    const faceGeo = new THREE.PlaneGeometry(w * 0.93, h * 0.82);
    faceGeo.rotateY(-south.azimuth + Math.PI);
    faceGeo.translate(
      px + south.normal.x * (d / 2 + 0.012),
      y,
      pz + south.normal.z * (d / 2 + 0.012)
    );
    const texture = makePlaqueTexture(plaque.text);
    faces.push({
      geometry: faceGeo,
      texture,
      text: plaque.text,
      record: {
        id: `plaque-L${plaque.level}`,
        level: plaque.level,
        text: plaque.text,
        by: plaque.by,
        y,
        schematic: true,
        sourceId: 'L06'
      }
    });
  }

  return { boards, faces };
}
