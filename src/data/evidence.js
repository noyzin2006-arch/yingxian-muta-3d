/**
 * src/data/evidence.js
 *
 * 来源登记表 —— 每条尺寸、每条文案都要能回指到一条来源。
 *
 * certainty 分级：
 *   published 官方 / 主管机构公开口径
 *   academic  有方法描述的学术实测或推算
 *   estimate   本项目临时估值
 *   unverified 未核实
 *
 * H/T/V 系列来自网页版 ChatGPT 规划的 §2.1（网页端已核查）；L 系列是本机独立核实补充的。
 */

export const SOURCES = Object.freeze({
  // ── 一手与官方 ────────────────────────────────────────────
  H01: {
    id: 'H01',
    title: 'UNESCO 世界遗产预备名单 5803 —— 释迦塔',
    publisher: 'UNESCO',
    date: '提交于 2013-01-29',
    url: 'https://whc.unesco.org/en/tentativelists/5803/',
    kind: 'official',
    note: '是「预备名单」，不是已列入《世界遗产名录》。'
  },
  H02: {
    id: 'H02',
    title: '应县木塔 · 佛宫寺释迦塔',
    publisher: '中国科学技术馆',
    date: '2017 展项',
    url: 'https://www.cdstm.cn/museum/zphc/hxzg2017x/art/2017/art_47e4f5a92fd24944b0757e46969df732.html',
    kind: 'official', note: '底层直径 30.27 m、67.31 m 的来源之一。'
  },
  H03: {
    id: 'H03',
    title: '《空间结构简讯》2018 年第 3 期',
    publisher: '中国土木工程学会',
    date: '2018-10',
    url: 'https://www.cnass.cn/upload/gjgfenhui/5f715c051189e.pdf',
    kind: 'academic',
    note: '「54 种、480 朵」；首层 56 柱三圈；「五明四暗」。原文没有「54 朵」。'
  },
  H04: {
    id: 'H04',
    title: '应县木塔平面丈尺假说（平面尺度研究）',
    publisher: '《建筑史学刊》',
    date: '2021',
    url: 'https://www.jgcm.ac.cn/jah/cn/article/doi/10.12329/20969368.2021.02009',
    kind: 'academic',
    note: '1 营造尺 ≈ 0.306 m；五明层外槽面阔复原 31.2/30/28.8/27.6/26 尺。学术假说，非现状测绘。'
  },
  H05: {
    id: 'H05',
    title: '应县木塔大木作尺度研究（作者全文转发）',
    publisher: '《建筑史学刊》2022 年第 1 期 / 澎湃新闻',
    date: '2022-04-13',
    url: 'https://www.thepaper.cn/newsDetail_forward_17580348',
    kind: 'academic',
    note: '五层柱头铺作里/外跳：陈测 0.71/0.74 m，北测 0.680/0.700 m。'
  },
  H06: {
    id: 'H06',
    title: '《基于表里信息探查的应县木塔大木作尺度研究》博士论文',
    publisher: '清华大学',
    date: '答辩 2023-05-23',
    url: 'https://newetds.lib.tsinghua.edu.cn/qh/paper/summary?dbCode=ETDQH&sysId=285111',
    kind: 'academic', note: '645 页；本项目未取得全文测绘表。'
  },
  H07: {
    id: 'H07',
    title: '应县木塔造像组合与现状（转载）',
    publisher: '中国青年网 / 敦煌研究院研究者',
    date: '2024-10-09',
    url: 'https://wenhua.youth.cn/zt/jb/jbwh/202410/t20241021_15594169.htm',
    kind: 'academic',
    note: '各层造像组数 1/5/4/7/9；首层像高约 11 m、像座约 2.13 m。'
  },
  H08: {
    id: 'H08',
    title: '应县木塔：云薄万栱的古今传奇',
    publisher: '清华大学',
    date: '2020-07-27',
    url: 'https://www.tsinghua.edu.cn/info/1182/51169.htm',
    kind: 'official', note: '高度与层数表述；震害与演变。'
  },
  H09: {
    id: 'H09',
    title: '应县木塔将进行局部加固',
    publisher: '山西省文物局',
    date: '2026-03-25',
    url: 'https://wwj.shanxi.gov.cn/gzdt/sxxx/202603/t20260325_10086594.shtml',
    kind: 'official',
    note: '本轮仅核实公开摘要：变形监测、全面测绘、信息模型搭建、局部加固在推进。'
  },
  H10: {
    id: 'H10',
    title: '2026 年 9 月文物动态摘编',
    publisher: '国家文物局',
    date: '2026-09-20',
    url: 'https://www.ncha.gov.cn/art/2026/9/20/art_722_204944.html',
    kind: 'official', note: '局部加固方案深化、全面测绘推进。'
  },
  H11: {
    id: 'H11',
    title: '2024 年文物工作回顾',
    publisher: '国家文物局',
    date: '2025-01-09',
    url: 'https://www.ncha.gov.cn/art/2025/1/9/art_722_193480.html',
    kind: 'official', note: '全面测绘方案及局部加固初步设计已批复。'
  },
  H12: {
    id: 'H12',
    title: '应县木塔斗栱界面滑移与嵌压差异研究',
    publisher: '《木材科学与技术》',
    date: '刊期 2025, 39(6)',
    url: 'https://www.mckx.net/en/article/doi/10.12326/j.2096-9694.2025112/',
    kind: 'academic', note: '长期倾斜与斗栱界面行为；发表元数据存在时间矛盾。'
  },
  H13: {
    id: 'H13',
    title: '应县木塔（老介绍）',
    publisher: '中国科学技术馆',
    date: '2015-02-03',
    url: 'https://cstm.cdstm.cn/cszl/hxzg/jscx/art/2020/art_93b6ad57998d4809b42337eadeff624b.html',
    kind: 'official', note: '67.31 m / 30.27 m / 54 种 的独立公开参照。'
  },
  H14: {
    id: 'H14',
    title: '应县木塔结构科普',
    publisher: '合肥工业大学',
    date: '页面标 2024-10-18',
    url: 'https://civil.hfut.edu.cn/2025/0104/c12292a309748/page.htm',
    kind: 'academic',
    note: '约 4 m 台基、56 根首层柱、叉柱造。该文用材/重量口径与他源有别。'
  },
  H15: {
    id: 'H15',
    title: '应县木塔古建专题',
    publisher: '山西省文物局',
    date: '归档页面 2011',
    url: 'https://wwj.shanxi.gov.cn/ztzl/whyczsgc/202109/t20210908_1985548.shtml',
    kind: 'official', note: '1974 年加固与藏经发现；本轮网页正文未打开。'
  },
  H16: {
    id: 'H16',
    title: '中国营造学社历史测绘的二次学术文献',
    publisher: '澎湃新闻',
    date: '2021-09-18',
    url: 'https://www.thepaper.cn/newsDetail_forward_14552300',
    kind: 'academic', note: '1933 年梁思成、莫宗江测绘回顾；原始图卷未取得。'
  },

  // ── 技术 ──────────────────────────────────────────────────
  T01: {
    id: 'T01', title: 'three —— npm 版本页', publisher: 'npm', date: '2026-10-25 查询',
    url: 'https://www.npmjs.com/package/three?activeTab=versions', kind: 'tech',
    note: 'latest = 0.186.1（r186）。本项目锁定 exact 版本。'
  },
  T02: {
    id: 'T02', title: 'Three.js r186 Release', publisher: 'mrdoob/three.js', date: '2026-09-24',
    url: 'https://github.com/mrdoob/three.js/releases/tag/r186', kind: 'tech', note: '0.186.1 为补丁版本。'
  },
  T03: {
    id: 'T03', title: 'Three.js Migration Guide', publisher: 'mrdoob/three.js', date: '最近编辑 2026-10-16',
    url: 'https://github.com/mrdoob/three.js/wiki/Migration-Guide', kind: 'tech',
    note: '禁止使用旧版 gammaOutput / outputEncoding 等已移除接口。'
  },
  T04: {
    id: 'T04', title: 'OrbitControls', publisher: 'Three.js 官方文档', date: 'r186 在线文档',
    url: 'https://threejs.org/docs/pages/OrbitControls.html', kind: 'tech', note: 'enableDamping 需每帧 update。'
  },
  T05: {
    id: 'T05', title: 'WebGLRenderer', publisher: 'Three.js 官方文档', date: 'r186 在线文档',
    url: 'https://threejs.org/docs/pages/WebGLRenderer', kind: 'tech',
    note: '自 r163 起仅支持 WebGL2；outputColorSpace 默认 SRGBColorSpace，支持 ACESFilmic 色调映射。'
  },
  T06: {
    id: 'T06', title: 'EffectComposer / OutputPass', publisher: 'Three.js 官方文档', date: 'r186 在线文档',
    url: 'https://threejs.org/docs/pages/EffectComposer.html', kind: 'tech', note: 'OutputPass 通常置于链尾统一做色调/色域转换。'
  },
  T07: {
    id: 'T07', title: 'SMAAPass / SSAOPass', publisher: 'Three.js 官方文档', date: 'r186 在线文档',
    url: 'https://threejs.org/docs/pages/SMAAPass.html', kind: 'tech', note: 'SMAA 在 linear-sRGB 中进行，须置于 OutputPass 之前。'
  },
  T08: {
    id: 'T08', title: 'RoomEnvironment / PMREMGenerator', publisher: 'Three.js 官方文档', date: 'r186 在线文档',
    url: 'https://threejs.org/docs/pages/RoomEnvironment.html', kind: 'tech', note: '室内影棚光，外景不宜照搬。'
  },
  T09: {
    id: 'T09', title: 'GLTFLoader / DRACOLoader / KTX2Loader', publisher: 'Three.js 官方文档', date: 'r186 在线文档',
    url: 'https://threejs.org/docs/pages/GLTFLoader.html', kind: 'tech', note: '本期不接入外部 glTF。'
  },
  T10: {
    id: 'T10', title: 'InstancedMesh', publisher: 'Three.js 官方文档', date: 'r186 在线文档',
    url: 'https://threejs.org/docs/pages/InstancedMesh.html', kind: 'tech', note: 'setMatrixAt 后须 needsUpdate 并维护包围球。'
  },
  T11: {
    id: 'T11', title: 'WebGPURenderer', publisher: 'Three.js 官方文档', date: 'r186 在线文档',
    url: 'https://threejs.org/docs/pages/WebGPURenderer.html', kind: 'tech', note: '本次锁定 WebGLRenderer。'
  },
  T12: {
    id: 'T12', title: 'Vite 使用指南', publisher: 'Vite', date: '2026-10 下旬',
    url: 'https://vite.dev/guide/', kind: 'tech', note: '要求 Node 20.19+/22.12+；本机 Node 26 满足。'
  },

  // ── 视觉标杆 ──────────────────────────────────────────────
  V01: {
    id: 'V01', title: 'Smithsonian 3D', publisher: 'Smithsonian', date: '持续更新',
    url: 'https://3d.si.edu/', kind: 'reference', note: '物体优先、可旋转、分层知识可点选。'
  },
  V02: {
    id: 'V02', title: 'Sketchfab viewer 功能', publisher: 'Sketchfab', date: '持续更新',
    url: 'https://sketchfab.com/features', kind: 'reference', note: '注释、PBR、环境光、阴影、动画。'
  },
  V03: {
    id: 'V03', title: 'Three.js 后期处理教程', publisher: 'Three.js 官方手册', date: '持续更新',
    url: 'https://threejs.org/manual/pages/post-processing.html', kind: 'reference', note: '逐 pass 演示与开销说明。'
  },
  V04: {
    id: 'V04', title: 'Google Arts & Culture', publisher: 'Google', date: '持续更新',
    url: 'https://artsandculture.google.com/', kind: 'reference', note: '分段讲解与展签克制。'
  },

  // ── 本机独立补充（L 系列）────────────────────────────────
  L01: {
    id: 'L01', title: '应县木塔结构实测与台基形制（结构监测文献）',
    publisher: '学术文献（转引实测）', date: '2026 检索',
    url: '', kind: 'academic',
    note: '台基下层方形边长约 40 m（四向月台）；上层八角对角径 35.47 m（东/西/南三向月台）；角石凸雕辽代狮头。'
  },
  L02: {
    id: 'L02', title: '应县木塔「北测」「山测」实测均值（王贵祥 / 柴泽俊实测数据整理）',
    publisher: '澎湃新闻·学术（转引中国营造学社与山西古建所实测）', date: '2021-09-18',
    url: 'https://m.thepaper.cn/baijiahao_14552300', kind: 'academic',
    note: '明层柱头面阔均值 9553/9148/8800/8439/8004 mm；八角控制网边长 7.358 m、面到面 17 764 mm；实测精度 ≤0.5 cm。'
  },
  L03: {
    id: 'L03', title: '应县木塔一层三周柱网与内槽尺寸',
    publisher: '学术文献（转引实测）', date: '2026 检索', url: '', kind: 'academic',
    note: '内槽直径 10.25 m；内槽墙厚约 2.86 m；外檐柱墙距内槽 2.38 m、厚 2.6 m。'
  },
  L04: {
    id: 'L04', title: '应县木塔各层侧脚量',
    publisher: '澎湃新闻·学术（转引实测）', date: '2021-09-18',
    url: 'https://m.thepaper.cn/baijiahao_14552300', kind: 'academic',
    note: '明层自一至五侧脚收束 6/2/2/2/2 寸；平座二、三、五层约 2/2/1 寸；1 寸 ≈ 0.0306 m。'
  },
  L05: {
    id: 'L05', title: '应县木塔立面比例与檐口做法',
    publisher: '澎湃新闻·学术', date: '2021-09-18',
    url: 'https://m.thepaper.cn/baijiahao_14552300', kind: 'academic',
    note: '各层塔檐基本平直，角翘十分平缓；平座、塔身、塔檐三层水平线条重叠。'
  },
  L06: {
    id: 'L06', title: '佛宫寺释迦塔（应县木塔）（第一批国保）',
    publisher: '山西省文物局', date: '2021-09-08',
    url: 'https://wwj.shanxi.gov.cn/wwzy/wwlb/bkydww/qgzdwwbhdw/dypgb/202109/t20210908_1980823.shtml',
    kind: 'official',
    note: '砖砌仰莲刹座 2.17 m、铁质刹身 9.95 m；逐层檐柱向内收半柱径；叉柱造；每边面宽三间。'
  },
  L07: {
    id: 'L07', title: '陈明达《应县木塔》的比例控制法（经二次文献转引）',
    publisher: '澎湃新闻·学术', date: '2021-09-18',
    url: 'https://m.thepaper.cn/baijiahao_14552300', kind: 'academic',
    note: '以三层塔身面阔 A = 8.83 m 为模数：塔基 A/2、塔身及两层砖仰莲 6A、铁刹 1⅛A，合计 7⅝A = 67.31 m。'
  }
});

export const SOURCE_LIST = Object.freeze(Object.values(SOURCES));

/** 取来源的安全包装（未知 id 返回 null） */
export function getSource(id) {
  return SOURCES[id] || null;
}

/** 取一组来源的可读标签 */
export function sourceLabels(ids = []) {
  return ids.map((id) => SOURCES[id]?.title || id);
}
