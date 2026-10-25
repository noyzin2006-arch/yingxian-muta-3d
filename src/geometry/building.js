/**
 * src/geometry/building.js
 *
 * 总装：把台基、柱网、铺作、屋面、平座、塔刹、造像、匾额装配成场景。
 *
 * 组织原则（规划 §4.1 数据流）：
 *   数据 → 几何纯函数 → ComponentRecord → 场景注册 → renderer
 *
 * 楼层分组（供剖切与分解）：
 *   bright-1..5（明层）、hidden-1..4（暗层）、global（台基 / 塔刹 / 墙 / 台阶）
 */

import * as THREE from 'three';
import { buildStructure } from '../data/structure.js';
import { LEVEL_LAYOUT } from '../data/dimensions.js';
import { buildLevelFrame, buildGroundWalls, buildAllWalls, makeColumnBase } from './columns.js';
import { buildInterlevelContinuity } from './interlevel-continuity.js';
import { CONTINUITY_ESTIMATES, CONTINUITY_MATERIALS } from '../data/continuity-estimates.js';
import { buildLevelBrackets, summarizeBrackets } from './brackets.js';
import { buildAllRoofs } from './roof.js';
import { buildAllBalustrades } from './balustrade.js';
import { buildBase } from './base.js';
import { buildFinial } from './finial.js';
import { buildStatues } from './statues.js';
import { buildPlaques } from './inscriptions.js';
import { mergeSafe } from './mesh-profile.js';

import {
  makeWoodTextureSet, makeWoodMaterial, WOOD_PALETTE
} from '../materials/wood.js';
import { makeStoneMaterial, makeBrickMaterial, makePlasterMaterial } from '../materials/stone.js';
import {
  makeGlazeMaterial, makeTileMaterial, makeIronMaterial, makeGoldMaterial, makePaintedWoodMaterial
} from '../materials/glaze.js';
import { makeRoofTileMaterial } from '../materials/tile-texture.js';

/** 让圆柱构件的木纹沿高度方向（CylinderGeometry 默认 U 绕周长） */
function grainVertical(geometry) {
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, v, u);
  }
  uv.needsUpdate = true;
  return geometry;
}

/**
 * 让出一帧，让浏览器有机会绘制启动画面。
 * 规划 §4.1 要求「requestIdleCallback（不支持则 setTimeout(0)）」分片；
 * 这里再让 rAF 与定时器**竞速**：某些环境（后台标签页、离屏渲染器）会把
 * rAF 节流到 1 Hz，若只等 rAF，整个构建会被拖成十几秒。
 */
const nextFrame = () => new Promise((resolve) => {
  let settled = false;
  const finish = () => { if (!settled) { settled = true; resolve(); } };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(finish);
  setTimeout(finish, 16);
});

/**
 * 建造整座塔。
 *
 * @param {object} opts
 * @param {'high'|'standard'|'low'} [opts.quality]
 * @param {(stage:string, done:number, total:number)=>void} [opts.onProgress]
 * @returns {Promise<object>}
 */
/** 取某明层的 y 区间（避免在循环里重复解构） */
function lv_band(index) {
  return LEVEL_LAYOUT.brightBands[index - 1];
}

export async function buildPagoda(opts = {}) {
  const quality = opts.quality ?? 'high';
  const onProgress = opts.onProgress ?? (() => {});
  const structure = buildStructure();

  const root = new THREE.Group();
  root.name = '应县木塔';

  // ── 材质
  onProgress('正在生成材质纹理', 0, 8);
  await nextFrame();

  const woodSet = makeWoodTextureSet({ seed: 20261025 });
  const woodMat = makeWoodMaterial(woodSet, { color: WOOD_PALETTE.base, roughness: 0.86 });
  const woodMatDark = makeWoodMaterial(woodSet, { color: WOOD_PALETTE.deep, roughness: 0.9, variant: 3 });
  const woodMatWarm = makeWoodMaterial(woodSet, { color: WOOD_PALETTE.variant, roughness: 0.84, variant: 1 });
  const woodMatWeathered = makeWoodMaterial(woodSet, { color: WOOD_PALETTE.weathered, roughness: 0.92, variant: 2 });
  const stoneMat = makeStoneMaterial({ color: 0x9C988E });
  const brickMat = makeBrickMaterial({ color: 0x77746E });
  const plasterMat = makePlasterMaterial({ color: 0xCFC9BC });
  // 二层以上的板壁：暗木色（实照中明层为深褐木壁 + 直棂窗）
  const wallWoodMat = makeWoodMaterial(woodSet, { color: 0x4A3B30, roughness: 0.9, variant: 3 });
  // 一层的檐柱墙：朱红（实照中一层墙为朱红色）
  const cinnabarWallMat = makePaintedWoodMaterial({ color: 0x6E2C22 });
  // 斗栱：风化后的浅灰褐木色，与深色梁柱形成对比（实照中栱色明显偏浅）
  const bracketMat = makeWoodMaterial(woodSet, { color: 0x8A7A64, roughness: 0.9, variant: 2 });
  const tileMat = makeRoofTileMaterial({ color: 0xffffff, roughness: 0.83 });
  const ridgeMat = makeTileMaterial({ color: 0x333A3D, roughness: 0.8 });
  const glazeMat = makeGlazeMaterial({ color: 0x6E7F74 });
  const ironMat = makeIronMaterial({ color: 0x4A4A48 });
  const goldMat = makeGoldMaterial({ color: 0xB39A65 });
  const paintMat = makePaintedWoodMaterial({ color: 0x803D33 });
  const paintGreenMat = makePaintedWoodMaterial({ color: 0x486153 });
  // 新增「估算过渡构架」的材质：颜色取 --mat-* 令牌，仍走 makeWoodMaterial 出口
  const continuityMats = {
    frame: makeWoodMaterial(woodSet, { color: CONTINUITY_MATERIALS.frame, roughness: 0.9, variant: 3 }),
    beam: makeWoodMaterial(woodSet, { color: CONTINUITY_MATERIALS.beam, roughness: 0.88, variant: 1 }),
    brace: makeWoodMaterial(woodSet, { color: CONTINUITY_MATERIALS.brace, roughness: 0.92, variant: 2 }),
    shadow: makeWoodMaterial(woodSet, { color: CONTINUITY_MATERIALS.shadow, roughness: 0.95, variant: 3 }),
    roof: makeWoodMaterial(woodSet, { color: CONTINUITY_MATERIALS.roof, roughness: 0.9, variant: 0 })
  };

  const materials = {
    woodMat, woodMatDark, woodMatWarm, woodMatWeathered,
    wallWoodMat, cinnabarWallMat, bracketMat, ...continuityMats,
    stoneMat, brickMat, plasterMat, tileMat, ridgeMat,
    glazeMat, ironMat, goldMat, paintMat, paintGreenMat
  };

  // ── 楼层分组
  const floors = {};
  const ensureFloor = (key) => {
    if (!floors[key]) {
      const g = new THREE.Group();
      g.name = key;
      root.add(g);
      floors[key] = g;
    }
    return floors[key];
  };
  const globalGroup = new THREE.Group();
  globalGroup.name = 'global';
  root.add(globalGroup);

  const metadata = {
    columnRecords: [],
    /** 既有结构（柱/梁/撑/铺作/屋面）的世界包围盒记录，供连续度检测 A 使用 */
    structureRecords: [],
    statueRecords: [],
    plaqueRecords: [],
    bracketLedger: null,
    counts: {}
  };

  // ── 1. 台基
  onProgress('正在生成台基与角石', 1, 8);
  await nextFrame();
  {
    const base = buildBase(structure);
    const stoneMesh = new THREE.Mesh(mergeSafe(base.stone), stoneMat);
    stoneMesh.name = '台基';
    stoneMesh.castShadow = true;
    stoneMesh.receiveShadow = true;
    globalGroup.add(stoneMesh);

    const csMesh = new THREE.Mesh(mergeSafe(base.cornerStone), stoneMat);
    csMesh.name = '角石与狮头';
    csMesh.castShadow = true;
    csMesh.receiveShadow = true;
    globalGroup.add(csMesh);

    const stMesh = new THREE.Mesh(mergeSafe(base.stair), stoneMat);
    stMesh.name = '台阶';
    stMesh.castShadow = true;
    stMesh.receiveShadow = true;
    globalGroup.add(stMesh);
  }

  // ── 2. 各明层柱网与梁枋
  onProgress('正在生成柱网与梁枋', 2, 8);
  await nextFrame();
  const perFloorWood = {};
  for (let i = 1; i <= 5; i++) {
    const g = ensureFloor(`bright-${i}`);
    const frame = buildLevelFrame(structure, i, { includeSecondary: i === 1 });
    metadata.columnRecords.push(...frame.columnRecords);

    const colGeos = frame.columns.map((c) => grainVertical(c));
    frame.columns.forEach((geo, gi) => {
      geo.computeBoundingBox();
      metadata.structureRecords.push({
        id: `exist:L${i}:col${gi}`, bandId: `L${i}`, kind: 'column',
        y0: lv_band(i).y0, y1: lv_band(i).y1,
        bbox: { min: geo.boundingBox.min.toArray(), max: geo.boundingBox.max.toArray() },
        certainty: 'published'
      });
    });
    frame.beams.forEach((geo, gi) => {
      geo.computeBoundingBox();
      metadata.structureRecords.push({
        id: `exist:L${i}:beam${gi}`, bandId: `L${i}`, kind: 'beam',
        y0: geo.boundingBox.min[1], y1: geo.boundingBox.max[1],
        bbox: { min: geo.boundingBox.min.toArray(), max: geo.boundingBox.max.toArray() },
        certainty: 'published'
      });
    });
    frame.braces.forEach((geo, gi) => {
      geo.computeBoundingBox();
      metadata.structureRecords.push({
        id: `exist:L${i}:brace${gi}`, bandId: `L${i}`, kind: 'brace',
        y0: geo.boundingBox.min[1], y1: geo.boundingBox.max[1],
        bbox: { min: geo.boundingBox.min.toArray(), max: geo.boundingBox.max.toArray() },
        certainty: 'published'
      });
    });
    const colMesh = new THREE.Mesh(mergeSafe(colGeos), woodMat);
    colMesh.name = `第${i}层柱`;
    colMesh.castShadow = true;
    colMesh.receiveShadow = true;
    g.add(colMesh);

    const beamMesh = new THREE.Mesh(mergeSafe(frame.beams), woodMatWarm);
    beamMesh.name = `第${i}层梁枋`;
    beamMesh.castShadow = true;
    beamMesh.receiveShadow = true;
    g.add(beamMesh);

    if (frame.braces.length) {
      const braceMesh = new THREE.Mesh(mergeSafe(frame.braces), woodMatDark);
      braceMesh.name = `第${i}层暗层斜撑`;
      braceMesh.castShadow = true;
      g.add(braceMesh);
    }

    // 柱础
    const lv = structure.levels[i - 1];
    const bases = lv.outer.vertices.map((v) => makeColumnBase({
      x: v.x, z: v.z, y0: lv.band.y0, radius: lv.outer.radius
    }));
    const baseMesh = new THREE.Mesh(mergeSafe(bases), stoneMat);
    baseMesh.name = `第${i}层柱础`;
    baseMesh.receiveShadow = true;
    g.add(baseMesh);

    perFloorWood[i] = { columns: colGeos };
  }

  // ── 2b. 明层墙体（先建，量得真实墙顶供过渡构架用）
  const wallSet = buildAllWalls(structure);
  {
    const wallMesh = new THREE.Mesh(mergeSafe(wallSet.walls), wallWoodMat);
    wallMesh.name = '明层墙体';
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    globalGroup.add(wallMesh);
    const latticeMesh = new THREE.Mesh(mergeSafe(wallSet.lattice), woodMatDark);
    latticeMesh.name = '直棂窗与格子门';
    latticeMesh.castShadow = true;
    globalGroup.add(latticeMesh);
    const floorMesh = new THREE.Mesh(mergeSafe(wallSet.floors), woodMatWeathered);
    floorMesh.name = '楼板';
    floorMesh.receiveShadow = true;
    globalGroup.add(floorMesh);
  }

  // ── 2c. 明暗过渡构架（估算件；补上「层与层之间」的承重视觉链）
  const continuity = opts.continuity === false
    ? { pieces: [], records: [], byOwner: {}, diagnostics: { added: 0, skippedDuplicates: 0, collisions: 0, continuousYRanges: {}, disabled: true } }
    : buildInterlevelContinuity(structure, {
    estimates: CONTINUITY_ESTIMATES,
    existingColumnRecords: metadata.columnRecords,
    wallTops: wallSet.wallTops
  });
  metadata.continuityDiagnostics = continuity.diagnostics;
  metadata.continuityRecords = continuity.records;
  {
    // 按 ownerGroup × materialKey 合批，保持可分楼层显隐
    const batches = new Map();
    for (const piece of continuity.pieces) {
      const key = `${piece.ownerGroup}|${piece.materialKey}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(piece);
    }
    for (const [key, list] of batches) {
      const [ownerGroup, materialKey] = key.split('|');
      const g = ensureFloor(ownerGroup);
      const mesh = new THREE.Mesh(mergeSafe(list.map((p) => p.geometry)), continuityMats[materialKey] ?? woodMat);
      mesh.name = `过渡构架·${ownerGroup}·${materialKey}（估算）`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.isEstimatedSupplement = true;
      g.add(mesh);
    }
  }

  // ── 3. 铺作
  onProgress('正在生成斗栱铺作', 3, 8);
  await nextFrame();
  const allBracketPlacements = [];
  for (let i = 1; i <= 5; i++) {
    const res = buildLevelBrackets(structure, i);
    allBracketPlacements.push(...res.placements);
    const g = ensureFloor(`bright-${i}`);
    const geos = [];
    for (const p of res.placements) {
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const piece of p.pieces) {
        const geo = piece.geometry.clone();
        geo.rotateY(p.rotationY);
        geo.translate(p.position.x, p.position.y, p.position.z);
        geos.push(geo);
        geo.computeBoundingBox();
        const bb = geo.boundingBox;
        minX = Math.min(minX, bb.min.x); minY = Math.min(minY, bb.min.y); minZ = Math.min(minZ, bb.min.z);
        maxX = Math.max(maxX, bb.max.x); maxY = Math.max(maxY, bb.max.y); maxZ = Math.max(maxZ, bb.max.z);
        piece.geometry.dispose();
      }
      // 每套铺作一条世界包围盒记录（供连续度检测 A 的射线粗筛）
      metadata.structureRecords.push({
        id: `exist:L${i}:bracket${metadata.structureRecords.length}`,
        bandId: `L${i}`, kind: 'bracket',
        y0: minY, y1: maxY,
        bbox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
        certainty: 'published'
      });
    }
    const mesh = new THREE.Mesh(mergeSafe(geos), bracketMat);
    mesh.name = `第${i}层斗栱`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  metadata.bracketLedger = summarizeBrackets(allBracketPlacements);

  // ── 4. 屋面
  onProgress('正在生成屋面与瓦作', 4, 8);
  await nextFrame();
  {
    const roofOpts = quality === 'high'
      ? { segmentsPerFace: 10, ringSegments: 6, perFace: 7, density: 1 }
      : quality === 'standard'
        ? { segmentsPerFace: 7, ringSegments: 4, perFace: 5, density: 0.7 }
        : { segmentsPerFace: 5, ringSegments: 3, perFace: 3, density: 0.4 };

    const roofs = buildAllRoofs(structure, roofOpts);
    for (let i = 0; i < roofs.roof.length; i++) {
      const eave = structure.eaves[i];
      const g = ensureFloor(`bright-${eave.ownerLevel}`);
      roofs.roof[i].computeBoundingBox();
      metadata.structureRecords.push({
        id: `exist:${eave.name}`, bandId: `L${eave.ownerLevel}`, kind: 'roof',
        y0: roofs.roof[i].boundingBox.min[1], y1: roofs.roof[i].boundingBox.max[1],
        bbox: { min: roofs.roof[i].boundingBox.min.toArray(), max: roofs.roof[i].boundingBox.max.toArray() },
        certainty: 'published'
      });
      const mesh = new THREE.Mesh(roofs.roof[i], tileMat);
      mesh.name = eave.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    // 垂脊
    const ridgeMesh = new THREE.Mesh(mergeSafe(roofs.ridge), ridgeMat);
    ridgeMesh.name = '垂脊';
    ridgeMesh.castShadow = true;
    globalGroup.add(ridgeMesh);

    // 椽飞椽
    if (roofs.rafter.length) {
      const rafterMesh = new THREE.Mesh(mergeSafe(roofs.rafter), woodMatDark);
      rafterMesh.name = '椽飞椽';
      rafterMesh.castShadow = true;
      globalGroup.add(rafterMesh);
    }

    // 檐口附件
    const wadangMesh = new THREE.Mesh(mergeSafe(roofs.ornament.wadang), ridgeMat);
    wadangMesh.name = '瓦当';
    globalGroup.add(wadangMesh);
    const bellMesh = new THREE.Mesh(mergeSafe(roofs.ornament.bells), ironMat);
    bellMesh.name = '风铎';
    globalGroup.add(bellMesh);
    const beastMesh = new THREE.Mesh(mergeSafe(roofs.ornament.beasts), glazeMat);
    beastMesh.name = '角兽';
    beastMesh.castShadow = true;
    globalGroup.add(beastMesh);
  }

  // ── 5. 平座栏杆
  onProgress('正在生成平座与勾栏', 5, 8);
  await nextFrame();
  {
    const bal = buildAllBalustrades(structure);
    const deckMesh = new THREE.Mesh(mergeSafe(bal.deck), woodMatWeathered);
    deckMesh.name = '平座台面';
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    globalGroup.add(deckMesh);
    const railMesh = new THREE.Mesh(mergeSafe(bal.rail), woodMatWarm);
    railMesh.name = '栏板与横枋';
    railMesh.castShadow = true;
    globalGroup.add(railMesh);
    const postMesh = new THREE.Mesh(mergeSafe(bal.post), woodMat);
    postMesh.name = '望柱';
    postMesh.castShadow = true;
    globalGroup.add(postMesh);
  }

  // ── 6. 塔刹
  onProgress('正在生成塔刹', 6, 8);
  await nextFrame();
  {
    const fin = buildFinial(structure);
    const brickMesh = new THREE.Mesh(mergeSafe(fin.brick), brickMat);
    brickMesh.name = '仰莲刹座';
    brickMesh.castShadow = true;
    globalGroup.add(brickMesh);
    const ironMesh = new THREE.Mesh(mergeSafe(fin.iron), ironMat);
    ironMesh.name = '铁刹';
    ironMesh.castShadow = true;
    globalGroup.add(ironMesh);
  }

  // ── 7. 造像与匾额
  onProgress('正在生成造像与匾额', 7, 8);
  await nextFrame();
  {
    const st = buildStatues(structure);
    metadata.statueRecords = st.records;
    const statueMesh = new THREE.Mesh(mergeSafe(st.statue), goldMat);
    statueMesh.name = '塔内造像（抽象示意）';
    statueMesh.castShadow = true;
    globalGroup.add(statueMesh);
    const seatMesh = new THREE.Mesh(mergeSafe(st.seat), woodMatWarm);
    seatMesh.name = '佛坛与莲座';
    globalGroup.add(seatMesh);

    const pl = buildPlaques(structure);
    metadata.plaqueRecords = pl.faces.map((f) => f.record);
    const boardMesh = new THREE.Mesh(mergeSafe(pl.boards), woodMatDark);
    boardMesh.name = '匾额板';
    boardMesh.castShadow = true;
    globalGroup.add(boardMesh);
    pl.faces.forEach((f) => {
      const mat = new THREE.MeshStandardMaterial({
        map: f.texture, transparent: true, roughness: 0.75, metalness: 0.05,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(f.geometry, mat);
      mesh.name = `匾额-${f.text}`;
      globalGroup.add(mesh);
    });
  }

  // ── 8. 首层墙体、楼板与彩画
  onProgress('正在生成墙体与彩画', 8, 8);
  await nextFrame();
  {
    const walls = buildGroundWalls(structure);
    const groundWallMesh = new THREE.Mesh(mergeSafe(walls), cinnabarWallMat);
    groundWallMesh.name = '首层墙体（朱红）';
    groundWallMesh.castShadow = true;
    groundWallMesh.receiveShadow = true;
    floors['bright-1'].add(groundWallMesh);

    // 彩画：阑额上的赭红 / 黛绿条带（克制点缀）
    // 檐下额枋彩画：朱红地 + 黛绿缘（实照中各层檐下有一道彩画带）
    const paintGeos = [];
    const trimGeos = [];
    structure.levels.forEach((lv) => {
      const topY = lv.columnTopY ?? lv.band.y1;
      lv.outer.vertices.forEach((v, k) => {
        const v2 = lv.outer.vertices[(k + 1) % 8];
        const dx = v2.x - v.x;
        const dz = v2.z - v.z;
        const len = Math.hypot(dx, dz);
        const ang = -Math.atan2(dz, dx);
        const mid = { x: (v.x + v2.x) / 2, z: (v.z + v2.z) / 2 };
        const band = new THREE.BoxGeometry(len * 0.88, 0.26, 0.08);
        band.rotateY(ang);
        band.translate(mid.x, topY - 0.72, mid.z);
        paintGeos.push(band);
        const trim = new THREE.BoxGeometry(len * 0.88, 0.055, 0.09);
        trim.rotateY(ang);
        trim.translate(mid.x, topY - 0.56, mid.z);
        trimGeos.push(trim);
        const trim2 = new THREE.BoxGeometry(len * 0.88, 0.055, 0.09);
        trim2.rotateY(ang);
        trim2.translate(mid.x, topY - 0.88, mid.z);
        trimGeos.push(trim2);
      });
    });
    if (paintGeos.length) {
      const paintMesh = new THREE.Mesh(mergeSafe(paintGeos), paintMat);
      paintMesh.name = '枋心彩画（朱红）';
      globalGroup.add(paintMesh);
      const trimMesh = new THREE.Mesh(mergeSafe(trimGeos), paintGreenMat);
      trimMesh.name = '彩画缘饰（黛绿）';
      globalGroup.add(trimMesh);
    }
  }

  // ── 统计
  const box = new THREE.Box3().setFromObject(root);
  metadata.counts = {
    floors: Object.keys(floors).length,
    brightFloors: Object.keys(floors).filter((k) => k.startsWith('bright-')).length,
    hiddenFloors: Object.keys(floors).filter((k) => k.startsWith('hidden-')).length,
    eaves: structure.eaves.length,
    groundColumns: metadata.columnRecords.filter((r) => r.floor === 1).length,
    columns: metadata.columnRecords.length,
    bracketSets: metadata.bracketLedger.totalSets,
    bracketClasses: metadata.bracketLedger.distinctGeometryClasses,
    statues: metadata.statueRecords.length,
    plaques: metadata.plaqueRecords.length,
    triangles: root.children.reduce((acc, child) => {
      acc += countTriangles(child);
      return acc;
    }, 0),
    boundingBox: {
      min: box.min.toArray().map((v) => Number(v.toFixed(3))),
      max: box.max.toArray().map((v) => Number(v.toFixed(3))),
      size: box.getSize(new THREE.Vector3()).toArray().map((v) => Number(v.toFixed(3)))
    }
  };

  onProgress('完成', 8, 8);

  return {
    root,
    structure,
    floors,
    globalGroup,
    materials,
    metadata,
    dispose() {
      root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      Object.values(materials).forEach((m) => m.dispose?.());
      woodSet.colorMaps?.forEach?.((t) => t.dispose());
      woodSet.normalMap?.dispose?.();
      woodSet.roughnessMap?.dispose?.();
    }
  };
}

function countTriangles(object) {
  let tris = 0;
  object.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    const count = g.index ? g.index.count : (g.attributes.position?.count ?? 0);
    tris += Math.floor(count / 3);
  });
  return tris;
}
