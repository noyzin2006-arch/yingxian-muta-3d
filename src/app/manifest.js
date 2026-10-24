/**
 * src/app/manifest.js
 *
 * 资产清单 —— 全部资产均为**运行时程序化生成**，不含任何外部模型、
 * 图片或字体文件，因此没有运行时第三方请求，也没有授权不清的素材。
 */

export const ASSET_MANIFEST = Object.freeze([
  Object.freeze({
    id: 'geometry-octagon',
    kind: 'geometry',
    name: '八角柱网与几何原语',
    source: '原创程序生成',
    license: '本项目原创',
    note: '正八角柱线、边法线偏移、逐层收分与侧脚。'
  }),
  Object.freeze({
    id: 'geometry-brackets',
    kind: 'geometry',
    name: '斗栱铺作分件',
    source: '原创程序生成',
    license: '本项目原创',
    note: '栌斗 / 华栱 / 泥道栱 / 令栱 / 昂 / 耍头 / 驼峰 / 散斗 / 替木；形制依据营造学社测绘描述，几何为示意。'
  }),
  Object.freeze({
    id: 'geometry-roof',
    kind: 'geometry',
    name: '六重屋面与瓦作',
    source: '原创程序生成',
    license: '本项目原创',
    note: '举折曲面、八条垂脊、椽飞椽、瓦当、风铎与角兽示意。'
  }),
  Object.freeze({
    id: 'geometry-statues',
    kind: 'geometry',
    name: '塔内造像',
    source: '原创程序生成（抽象雕塑占位）',
    license: '本项目原创',
    note: '依 H07 的造像组合与件数布置；造型为抽象示意，非佛像复原。'
  }),
  Object.freeze({
    id: 'texture-wood',
    kind: 'texture',
    name: '程序木纹（4 变体 + 法线 + 粗糙度）',
    source: '原创程序生成（固定 seed）',
    license: '本项目原创'
  }),
  Object.freeze({
    id: 'texture-stone',
    kind: 'texture',
    name: '砖石 / 灰泥贴图',
    source: '原创程序生成',
    license: '本项目原创'
  }),
  Object.freeze({
    id: 'texture-tile',
    kind: 'texture',
    name: '黛色筒瓦 / 板瓦贴图',
    source: '原创程序生成',
    license: '本项目原创'
  }),
  Object.freeze({
    id: 'texture-plaque',
    kind: 'texture',
    name: '匾额文字',
    source: '原创 Canvas 排版（非原匾扫描）',
    license: '本项目原创',
    note: '字体走系统中文回退链：PingFang SC / Hiragino Sans GB / Noto Sans CJK SC / serif。'
  }),
  Object.freeze({
    id: 'font',
    kind: 'font',
    name: '中文字体',
    source: '系统字体回退，无网络字体',
    license: '系统自带'
  })
]);

/** 第三方运行时依赖 */
export const RUNTIME_DEPENDENCIES = Object.freeze([
  Object.freeze({ name: 'three', version: '0.186.1', license: 'MIT', role: '渲染引擎' }),
  Object.freeze({ name: 'vite', version: '8.3.5', license: 'MIT', role: '构建工具（仅构建期）' })
]);

/** 断言：运行时不得有任何第三方网络请求 */
export function assertNoExternalAssets() {
  const externals = [];
  performance.getEntriesByType?.('resource')?.forEach((e) => {
    const url = new URL(e.name, location.href);
    if (url.origin !== location.origin) externals.push(e.name);
  });
  return externals;
}
