# 应县木塔（佛宫寺释迦塔）实时三维数字展陈｜一次性执行总规划
> 规划时间：2026-10-25（北京时间）；在线资料访问日：2026-10-25（北京时间，UTC 为 2026-10-24）。版本快照：Three.js 0.186.1（r186 系）、Vite 8.3.5。执行位置：noyzin2006-arch/yingxian-muta-3d / main。身份：首席规划者；本文**只规划，不声称已运行、测量、实现或验收任何代码**。
>
> **核心认识纠偏**：应县木塔是**外观五层六檐**（第一层重檐）、**明五暗四共九层**，不是五檐；**54是斗栱“种类”而非54朵总数**。2018年中国土木工程学会资料提出“54种、480朵”，最新研究的划分可有75种，计数口径须显式记录。67.31m 是广泛使用的通高/复原口径，不能假装代表2026年最新每个构件的现状实测值。1933年中国营造学社考察测绘，1936年梁思成完成论文，1962年陈明达一系复测，20世纪90年代北测、2000年山测及新近三维扫描均可能存在差异。**本项目交付“有证据标注的程序化研究复原”，不是经主管部门认证的毫米级现状数字孪生**。

## 1. 任务理解与可见验收

### 1.1 目标、用户与使用场景
面向中文公众、建筑史/中国古建爱好者、学生和展陈讲解者，在桌面及移动浏览器中以独立、可交互、无在线第三方资源依赖的 Three.js WebGL2 项目，近距离审视辽代佛宫寺释迦塔的整体姿态、八角柱网、层叠木构、斗栱铺作、瓦屋面、内部暗层与造像。打开网页的第一感受应是“真实地站在木塔前”，继而可以从外部观察走向分层理解。交付网页，不做视频播放/静态图代替、旅游预订、文物文献全文转载、考古测量软件、工程安全仿真、付费云部署。

用户主路径：进入→读“应县木塔·辽清宁二年”简洁中文标题→3秒内看到塔的真实实时轮廓/可持续绘制的渐进模型→拖动绕塔→点选六大构件热点→点层级/剖切看“五明四暗”→切换白昼/夕照/夜景→点“还原全貌”回到入口机位→阅读“证据与不确定度”→关闭页面再开依然可正常进入。所有按钮文本中文、状态清晰、鼠标键盘触屏均适用。

### 1.2 约束与裁决顺序
硬约束：macOS 15 arm64；Node 26.0.0、npm 11.12.1；Chrome/Safari/自动化 Chromium；GPU 不明；188GiB 可用；项目目录 /Users/sheng/Projects/20261025040300-yingxian-muta-3d；main 私有仓库；**禁止创建 CI、禁止公开仓库、禁止自动部署**。可执行 Agent 独立 commit/push，但无第二次规划请求。仅用 npm 发布的开源库与本地生成的几何/纹理/文字；无运行时 CDN/跨域模型。性能/高保真冲突时先保留真实轮廓、六重屋檐、柱网与构件分类，再减少瓦片/曲面细分/阴影与后期，不得以几何方盒子替代文物。

事实优先级：当前官方测绘或主管机构公开文件 > 有方法描述的学术实测 > 历史测绘与学术论著 > 高校/科研科普 > 一般新闻 > 网站二次传播。存在多个“高/宽/材分”测量口径时**保留并列**，公开展示采用主口径（总高 67.31，底层直径 30.27），参数标注“公开值/学术推测/本项目估算”；所有无法获得的精确值列待核实，不因用户要求“精确”而捏造。

### 1.3 验收指标（代号在第6节逐项可观察复核）
- A01 可运行：npm ci→npm run dev→浏览器打开本机 URL 后出现可拖动 Three.js Canvas；npm run build 无错误，npm run preview 可访问，联网依赖只存在构建期。
- A02 结构真实性：平面为正八角，5明+4暗内部层次、6檐（底层双檐）、上部八角攒尖、刹和底层副阶周匝肉眼可辨；根级程序验证层数组合 [5,4,6,8]；未见平顶方盒或欧式城堡化。
- A03 可核实比例：模型从基底最低点到铁刹顶为 67.31m；底层塔体“直径”目标 30.27m（测量口径见数据表），高度/底径 = 2.224，模型比值误差 ≤2%；明确当前为“复原主口径”而非全建筑实测。来源精确层面阔依论文尺值导出，相对偏差 ≤2%（仅对同一**柱网测量定义**比较）。仅估算项不得用“与实测误差≤2%”伪验收。
- A04 细节：在近景可辨内外槽柱、栏额/普柏枋、斗栱多种形制且转角/柱头/补间不同、暗层叉手/斜撑、檩椽飞椽、瓦当、吻兽/垂脊、平座勾栏望柱、匾额、风铎与石阶。低端档不可删掉六檐或八角轮廓。
- A05 斗栱可审计：按“54种/480朵（文献口径）”显示中文说明，模型以铺作 typeId/segment/floor 注册实例并显示“本模型实际生成 X 组、分类 Y 类”计数；若未取得逐层480朵位置实测不得宣称精确重现480朵，必须标“模拟排布”。静态字样不能取代真实模型实例统计。
- A06 外观审美：1920×1080、1440×900、390×844下塔体完整不被 UI 遮盖（默认镜头视觉边界留白≥5%）；木材有方向性纹理、至少3种木料明暗变体、瓦砖与金属能区分；没有直线穿帮/悬空斗栱/浮空门窗。
- A07 交互：拖转、缩放、机位预设（正南/西南三分之四/俯看八角/檐下斗栱/剖面/塔刹）、热点说明、明层逐层显示、剖切/分解、昼夕夜切换，每项有动画与可见中文状态/“返回全塔”。
- A08 剖面诚实：9层层序正确、四暗层与八角双圈柱网可见；未测位置标“示意”；任何示意内部造像不得标成修复官方扫描。
- A09 失败/可及性：无 WebGL2、资源错误、contextlost/restore、页面后台、系统减弱动态效果、网络离线及窄屏均有可理解反馈或静态文字降级；所有功能可通过非悬停按钮操控，焦点可见。
- A10 本机实测性能：依据第6节同一记录方式在真实浏览器各三档检验：高档≥55fps、主流≥40fps、低端或软件渲染≥20fps目标（软件渲染达不到时如实记录，提供“极简模型/关闭特效”并保证交互）；计算5段各10s中位 FPS，帧时间 P95，不能只报告空闲帧率。
- A11 中文真实性：介绍至少覆盖始建年代、五层六檐、暗层、54种斗栱、塔刹、佛像群、保护状况、尺度口径与文献链接，任何“后晋始建”“54朵”“世界遗产已列入名录”等错误一票否决。
- A12 证据交付：README、源码、可复核参数数据、截屏、控制台/性能原始日志与 handoff/sflipcloop/execution-report.md 齐全；不得声称浏览器测试通过除非保留真实输出证据。

## 2. 调研证据与设计方向

### 2.1 一手与技术证据登记表
每行包含：编号｜可直接点击来源｜发布/版本日期｜经过核查的结论/局限｜对方案的具体决定。以下“已读”指本轮网页页面/搜索公开摘要已核查，**不等于取得原始CAD/测绘原件**。统一访问日期：2026-10-25 北京时间；无法打开正文的注明“仅搜索摘要可见/正文无法访问”。请把这张表复制或保留在代码数据字典的 sourceId 对照中。

|ID|来源（链接）|出版/版本|核查结论、可信度、局限|影响决定|
|---|---|---|---|---|
|H01|[UNESCO 预备名单编号5803](https://whc.unesco.org/en/tentativelists/5803/)|提交2013-01-29；访问2026-10-25|辽清宁二年1056、八角、五层六檐、五明四暗九层、67.31m、双重柱网、54**种**斗栱；是**Tentative List 预备名单**不是已入世界遗产名单；已读全文|作为主轮廓与展板措辞基准|
|H02|[中国科学技术馆介绍](https://www.cdstm.cn/museum/zphc/hxzg2017x/art/2017/art_47e4f5a92fd24944b0757e46969df732.html)|2017展项（站点显示日期变化）；访问2026-10-25|底层直径30.27m，67.31m；五层六檐九层；石基上下两层、斗栱54种；已读取搜索正文|主直径与双层台基|
|H03|[中国土木工程学会《空间结构简讯》2018年第3期PDF](https://www.cnass.cn/upload/gjgfenhui/5f715c051189e.pdf)|2018-10；访问2026-10-25|2页原PDF已读取并视觉核查：54种、**480朵**；首层56柱三圈；石台基地下深约2m、总厚超过6.4m；“五明四暗”，原文没有“54朵”|纠正数量，生成器保存铺作类别与层级计数|
|H04|[《建筑史学刊》李泽辉等平面丈尺研究](https://www.jgcm.ac.cn/jah/cn/article/doi/10.12329/20969368.2021.02009)|2021论文（站点 DOI）；访问2026-10-25|论文摘要可见，打开正文403：**学术推测**1营造尺≈0.306m；五明层每面外槽面阔依次31.2/30/28.8/27.6/26尺；不是无争议现状实测|外槽主环五层收分的“模型假说”数据|
|H05|[《建筑史学刊》2022年第1期研究作者全文转发](https://www.thepaper.cn/newsDetail_forward_17580348)|2022-04-13转发；访问2026-10-25|论文作者李泽辉/李大卫/刘畅；1933营测/1962陈测/90年代北测/2000山测不同；五层外檐柱头铺作“里/外跳”：陈测0.71/0.74m、北测0.680/0.700m；1尺≈0.306m；论文图表是图片，未在本轮逐格识读，不引申其他小数|五层两组跳距并存；不同规格斗栱而非一件复制全塔|
|H06|[清华大学论文库：李泽辉博士论文](https://newetds.lib.tsinghua.edu.cn/qh/paper/summary?dbCode=ETDQH&sysId=285111)|答辩2023-05-23；访问2026-10-25|题为《基于表里信息探查的应县木塔大木作尺度研究》，645页；本轮只见摘要，全文测绘表**未取得**|将“索取已发表学术尺寸表、逐层模型录入”列数据缺口，不能自称读取表格|
|H07|[中国青年网转载敦煌研究院研究者文章](https://wenhua.youth.cn/zt/jb/jbwh/202410/t20241021_15594169.htm)|2024-10-09；访问2026-10-25|造像现存26：1/5/4/7/9；首层佛像约11m；像座约2.13m（须确认11m是否含座）；分层组合详述；已读全文|每层分组造像，内部模型标注“形制示意”|
|H08|[清华大学专题《应县木塔：云薄万栱的古今传奇》](https://www.tsinghua.edu.cn/info/1182/51169.htm)|2020-07-27；访问2026-10-25|67.31m、五层六檐、斗栱54种；记载震害及演变；访问搜索正文|美学高度比例、层节奏|
|H09|[山西省文物局：“应县木塔将进行局部加固”](https://wwj.shanxi.gov.cn/gzdt/sxxx/202603/t20260325_10086594.shtml)|2026-03-25；访问2026-10-25|搜索公开摘要确认正开展变形监测、全面测绘、信息模型搭建、局部加固；本轮官方正文请求超时，**仅摘要核实**|避免写“已经完全修复/即将落架大修”|
|H10|[国家文物局2026年9月文物动态摘编](https://www.ncha.gov.cn/art/2026/9/20/art_722_204944.html)|2026-09-20；访问2026-10-25|公开摘要显示局部加固方案深化、全面测绘推进；正文无法打开|当前保护状态短说明|
|H11|[国家文物局2024年文物工作回顾](https://www.ncha.gov.cn/art/2025/1/9/art_722_193480.html)|2025-01-09；访问2026-10-25|摘要：全面测绘方案及局部加固初步设计已批复|保护时间线，不做维修状态臆测|
|H12|[中国林业科学体系《木材科学与技术》研究论文](https://www.mckx.net/en/article/doi/10.12326/j.2096-9694.2025112/)|刊期2025,39(6)；网页标2025-11-30，另载修回/接收2026-01（元数据**时间矛盾**）；访问2026-10-25|斗栱界面滑移/嵌压差异、结构长期倾斜；摘要可见，发表时间存在内部不一致|暗层/斗栱不能只做一种无缝连续刚性体，动态说明使用“摩擦/位移”而非已证实抗震动画|
|H13|[中国科学技术馆老介绍](https://cstm.cdstm.cn/cszl/hxzg/jscx/art/2020/art_93b6ad57998d4809b42337eadeff624b.html)|2015-02-03；访问2026-10-25|高67.31、底径30.27、54种|另一独立公开数值参照|
|H14|[合肥工业大学建筑结构科普](https://civil.hfut.edu.cn/2025/0104/c12292a309748/page.htm)|页面标2024-10-18；访问2026-10-25|4m左右台基、56根首层柱、叉柱造；该文用材/重量与其他来源存在差异，不能将用材吨数做数值验收|平台高度仅估算基准；标示叉柱造|
|H15|[山西省文物局古建专题](https://wwj.shanxi.gov.cn/ztzl/whyczsgc/202109/t20210908_1985548.shtml)|省站归档页面2011；访问2026-10-25|官方搜索正文可见1974加固及藏经发现，网页本轮打不开|历史修缮时间线，避免写无损千年|
|H16|[中国营造学社历史测绘的二次学术文献](https://www.thepaper.cn/newsDetail_forward_14552300)|2021-09-18；访问2026-10-25|说明1933年梁思成、莫宗江测绘，现状测绘对原始设计有差异；**原1933图卷/《汇刊》《梁思成全集》原书未取得**|文案引用时注明“据后续学术研究回顾”，不虚构原图尺寸|
|T01|[npm three 包版本页](https://www.npmjs.com/package/three?activeTab=versions)|2026-10-25 查询标 latest=0.186.1（r186），2026-09 附近发布；访问2026-10-25|版本来自已索引 npm 页面，本站直接重开403；npm 本机需复核 lock 解析|依赖固定 exact 0.186.1|
|T02|[Three.js r186 Release](https://github.com/mrdoob/three.js/releases/tag/r186)|2026-09-24；访问2026-10-25|GitHub release r186；0.186.1 为补丁；已读发布说明索引|不混入 r187 的预发布 API|
|T03|[Three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)|网页最近编辑2026-10-16；访问2026-10-25|页面已经提到186→187（属于未来迁移信息）及 185→186；不能假设r187已 npm 稳定|禁止旧版 gammaOutput/outputEncoding 等接口|
|T04|[Three.js OrbitControls 文档](https://threejs.org/docs/pages/OrbitControls.html)|r186站点在线文档，无标注发布日；访问2026-10-25|enableDamping 需要每帧 update；polar/azimuth/距离可设边界|正确定义镜头交互并回归反向拖转|
|T05|[WebGLRenderer 文档](https://threejs.org/docs/pages/WebGLRenderer)|r186在线；访问2026-10-25|仅 WebGL2（自r163不再支持 WebGL1）；outputColorSpace 默认 SRGBColorSpace、toneMapping 支持 ACESFilmic、shadowMap接口|WebGL2 作为基础平台，明确无WebGL反馈|
|T06|[EffectComposer 文档](https://threejs.org/docs/pages/EffectComposer.html) 与 [OutputPass](https://threejs.org/docs/pages/OutputPass.html)|r186在线；访问2026-10-25|composer WebGLRenderer 专用、OutputPass 通常在尾部统一执行色调/色域转换|高档后期策略，避免重复gamma|
|T07|[SMAAPass](https://threejs.org/docs/pages/SMAAPass.html) 与 [SSAOPass](https://threejs.org/docs/pages/SSAOPass.html)|r186在线；访问2026-10-25|SMAA 在 linear-sRGB 中进行、需在 OutputPass 前；SSAO 成本额外|高档可选 Render→SSAO→SMAA→Output；主流简化|
|T08|[RoomEnvironment](https://threejs.org/docs/pages/RoomEnvironment.html) 与 [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html)|r186在线；访问2026-10-25|前者可供 PMREM.fromScene 生成 IBL；是室内studio光，外景不宜无修改照搬|默认自己生成天空/半球光；仅特殊近物特写可用轻量PMREM|
|T09|[GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)、[DRACOLoader](https://threejs.org/docs/pages/DRACOLoader.html)、[KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html)|r186在线；访问2026-10-25|GLTF 支持 setDRACOLoader/setKTX2Loader，KTX2 要本地 WASM/transcoder detectSupport|**本期没有外部 glTF 必要性，默认不接入**；仅用户批准资产且许可可靠时才使用|
|T10|[InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)|r186在线；访问2026-10-25|setMatrixAt 后需 instanceMatrix.needsUpdate，实例须维护空间包围盒|重复斗栱、栏杆、瓦片批量实例化|
|T11|[WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)|r186在线；访问2026-10-25|该 renderer 优先 WebGPU，否则可降 WebGL2；与传统 WebGL EffectComposer 不能随意混搭|本次**锁定 WebGLRenderer**，不以 WebGPU 作为必要条件|
|T12|[Vite 版本](https://www.npmjs.com/package/vite?activeTab=versions) 与 [Vite 官方使用指南](https://vite.dev/guide/)|npm latest=8.3.5（标示2026-10下旬更新）；指南当前要求 Node 20.19+/22.12+；访问2026-10-25|Node26满足；npm索引可用、站点直开受限|无框架 Vite 静态SPA，精确锁依赖|
|V01|[Smithsonian 3D 官方展陈平台](https://3d.si.edu/)|持续更新；页面无统一发布日期；访问2026-10-25|文物馆藏3D可探索；公开站点部分页面打不开，不作版权授权推断|参考物体优先、模型可旋转、分层知识可点选|
|V02|[Sketchfab viewer 功能](https://sketchfab.com/features)|持续更新；页面无日期；访问2026-10-25|搜索可见有注释、PBR、环境光、阴影、动画；正文403；不可复用未经授权模型|热点与表现分层，全部用原创程序几何|
|V03|[Three.js 官方后期教程](https://threejs.org/manual/pages/post-processing.html)|持续更新；访问2026-10-25|示范逐pass、输出链及性能开销|只有高档应用少量后期，不堆叠辉光|
|V04|[Google Arts & Culture](https://artsandculture.google.com/)|持续更新、无该场景明确版本日期；访问2026-10-25|作为典型文博叙事参考；**本轮未核实具体3D项目，不将个例描述为已验证**|分段讲解、作品来源标注、展签克制|

其他传闻审查：二层铁柱“几根”、所谓“蚂蚱做法”、唐代叉手“原样遗存”、逐层出跳数、匾额实际长宽、每层柱高、现状歪斜坐标未取得足够一手数值，均标待核实。寺内山门/观音殿/钟鼓楼/牌楼可用于远背景示意，但**本期范围仅木塔与极简铺地**；不把附属寺殿的年代、方位、在存状态未经核查当真。

### 2.2 事实、推断、审美偏好、待机验证假设
**事实F**：1056辽代建成、八角、五层六檐、九层、67.31公示高度、30.27公示底径、54类斗栱、2018资料480朵/首层56柱、2013 UNESCO 预备名单、现正开展监测测绘加固。**研究假说R**：0.306m营造尺、五明层外槽面阔换算、各层侧脚规律、斗栱类别可细分75类；不得挪用为现状测绘。**设计偏好P**：低饱和灰褐旧木、黛瓦、石灰灰、朱赭微彩、温暖黄昏、碑刻般中文排版。**需本机验证Q**：相机是否遮挡底部、复杂斗栱是否闪面、程序木纹摩尔纹、实例描边拾取、软件WebGL帧率、Safari阴影行为、移动装置memory/contextlost、字体回退。

### 2.3 产品和艺术总方向（可判定）
“古建研究的静谧庄严”而非“仙侠特效塔”。镜头首先从南偏西约28°的地面仰角（约+16°仰视）完整展示全塔，底部连同石基可见，背景是冷灰白天空淡雾与少量极低彩度院墙轮廓（无需复原全寺）。俯看视图揭示八角；近景显示构件接头与深檐阴影；剖切以木质结构色和淡琥珀线强调内外槽。

可复用设计规律：①物体占屏幕中心≥55%高度并留足峰顶空间；②低频大轮廓优先，细节沿用户接近时逐步显现；③热点不超过6个常驻标记，默认贴近建筑轮廓；④“外观／构造／证据”三层内容，不遮塔；⑤光照有明确方向，保持暗部纹理；⑥用户操作始终可复位，剖切动画不可突然跳变。

设计量尺：背景白昼 #D6D7D2、远雾 #C7CBC6；主体木色主色 #47362D、次色 #6A5040、风化面 #7B7165、深檐内 #261F1B；黛瓦 #3B4245、砖 #77746E、石 #A6A298、彩画朱红 #803D33、赭绿 #486153、暗金 #99805C、佛像金 #B39A65。网页墨字 #222723、辅助字 #626A63、面板 #F2F0E9EE；基础字号16px、正文14–15px、标题28/40/52px(移动/笔记本/宽屏)、行高1.6。按钮≥44×44px；分栏24px/移动14px；卡片圆角12px，分隔线 #B8B6AC。动画常用 cubic-bezier(0.22,1,0.36,1)、机位1.15s、剖切1.35s、昼夜1.45s、热点浮层0.22s；reduced-motion 设0ms且不自动巡游。避免高饱和黄、密集发光灯笼、廉价青绿色仙雾、过度胶片bloom。

明确否决：外购/不明授权完整扫描（版权、体量不可控）；依赖Sketchfab iframe（非自主实时模型）；一张图片贴在正方体上（不满足真实性）；默认 WebGPU 或高级PBR必需（兼容弱）；整寺与人物群像（破坏核心精度与性能）；用单一斗栱实例全塔（违背54种）；以真实震害仿真表现“抗震”（没有力学证据）。

## 3. 产品体验与边界状态

### 3.1 信息架构与主界面
独立全屏 Canvas；左上窄标题区“应县木塔 / 佛宫寺释迦塔”“辽·清宁二年（1056）”“研究性数字复原”；右侧宽屏一个不超过340px的“构件注释”卡；下方居中模式切换：“全貌｜结构剖视｜逐层”与“白昼｜夕照｜夜景”；右下控制“全塔”“视角”“画质”；左下比例/资料说明“主轮廓：公开高度口径 / 细部：部分示意”。窄屏顶部标题淡化压缩到两行，底部可左右滑动的操作条，点热点出现可关闭下拉信息抽屉（max 45vh）；小于360px 的菜单折叠为“探索”，保证 Canvas 至少占高55%。

信息卡：层1标题 ≤12字+一句15–35字说明；层2 60–110字解释、层位置和简图/参数出处（来源Hxx）；层3“已核实/设计假说/估算”证据标签，不用“官方原貌”字样。默认六热点：石台基、副阶与柱网、斗栱、平座与暗层、匾额与造像、塔刹。点击同一热点开合；交互变化统一 aria-live 中文提示（不频繁播报镜头帧更新）。

### 3.2 输入映射/状态机
状态枚举：boot→loading-outline→loading-details→ready；ready 的 view=whole|section|exploded|floor(1..5)，light=day|sunset|night，quality=auto|high|standard|low|safe；modal=null|help|evidence|error。镜头 action=idle|orbit|presetTween|focusTween；新操作中止旧Tween并从**当前**相机位置插值；切换模式保留可恢复前视角，进入剖切自动调整镜头到西南视向。每次状态变化有按钮 pressed/selected、标题变化和可见动作，不能只有状态码。

交互：鼠标左键拖动水平旋转、竖直俯仰；滚轮缩放；右键平移限制在塔中心周围；触摸单指转、双指缩放/平移；键盘 Tab 可达按钮、Enter/Space 激活、Escape 关闭说明/退出剖切、R 全貌、1–5视角与明层选择；焦点在输入控件时快捷键禁用。相机不得从地下穿越或进入基座（除专门剖切模式）。所有按钮有可见焦点描边 2px #456A5F，tooltip/aria-label，屏幕阅读器有文案回退。

首次：先出现静态 HTML 启动画面/文案，待首帧真实 WebGL **粗模型**就可转；细节分组批次 build，显示“正在生成檐口 / 斗栱 / 纹理”进度（以已完成 task 数，而非假装网络下载百分比）。3秒是快速设备目标；低配超时以“正在准备轻量版”和可选“直接进入低画质”代替隐去。成功提示“可拖动木塔探索”。加载失败提供“重试轻量版/阅读文字简介”。本地材质文件不可用时用程序生成纹理；字符字体不可用时 CSS 系统中文字体回退；浏览器不支持 WebGL2 时展示文本剖面层表及原因，不放预渲染伪互动图。

空态：未选构件显示“点选塔身构件，了解结构”；选层无可靠尺寸显示“本层尺寸暂无公开可信数据，以示意呈现”；无任何外部资源时完整运行。失焦/后台暂停 requestAnimationFrame 的重计算或降到按需更新；页面恢复对时钟delta截断避免跳镜。context lost 显示遮罩并暂停输入；restored 重建资源与 state、重置渲染器（必要时提示刷新），不得继续引用失效 WebGL buffer。按下“还原”清空剖切、透明热点状态并恢复初始机位和默认灯光（若用户已选择光照则保留并提示）。

### 3.3 视觉分级与渲染预算
优先级守恒：1六檐+尖塔刹+八角比例；2柱廊/栏杆/斗栱群/瓦条；3纹理细节/风铎/瓦当/角兽；4环境修饰。**高档**：DPR min(devicePixelRatio,1.75)；1024–2048级联/主太阳shadow map（实际 WebGL 只单图，建议2048×2048），PCFSoftShadowMap；可选SSA0半分辨率+SMAA；斗栱LOD0（例如每个栱端截面≥6段）、椽瓦可见实例密度100%，桌面draw calls目标<450，triangle目标<1.2M、纹理常驻<220MB。**主流**：DPR≤1.35、shadow 1024、关闭SSAO、SMAA按性价比开或renderer MSAA二选一、瓦片每2片合并一组、斗栱LOD1截面4段，draw calls<300、triangles<450k、纹理<120MB。**低端/软件渲染**：DPR≤1.0（可0.7），shadow off、无后期、无透明粒子、斗栱LOD2保持连贯的斗/栱/昂轮廓、瓦沿稀疏条带（每3–4根椽抽样）、静态按需渲染，draw calls<130、triangles<120k、纹理<40MB。预算是**工程目标非已实测保证**，浏览器内测后再按实际调。自动检测帧时间：在交互状态持续10s P95>30ms 主流降一档、>50ms 低端，回升须连续20s P95<阈值×0.75并避免频繁切换；quality=手动时不自动升档，仅严重卡顿给建议。不依据 GPU 品牌猜性能。

## 4. 技术架构、米制数据、建模与视觉参数

### 4.1 技术栈与文件边界
依赖 exact：three=0.186.1、vite=8.3.5；Node26/npm11，ES modules + vanilla JS + CSS，package-lock.json 固定；npm scripts：dev（vite --host 127.0.0.1）、build（vite build）、preview（vite preview --host 127.0.0.1）、test（node --test）、check（npm run test && npm run build）。不给安装到全局环境；GitHub私仓，禁止CI/部署。WebGLRenderer 优先（WebGL2，alpha false，antialias 视是否启用composer，high-performance仅提示）；renderer.outputColorSpace=SRGBColorSpace、toneMapping=ACESFilmicToneMapping、exposure按光照态调整。相机 PerspectiveCamera(45°, aspect, near=0.15m, far=350m)；clip基于mode调整但近裁≤0.15，避免近景穿模。OrbitControls addon，enableDamping=true，dampingFactor=0.075，minPolarAngle≈0.20rad，maxPolarAngle≈1.51rad（视角不能钻地）、minDistance=12m（近景聚焦可5m但需要target改位）、maxDistance=185m；controls.target 默认(0,29,0)，pan 限位在(-12..12, 6..58, -12..12)，不使用OrbitControls错误方向的手写极坐标公式。

目录（每文件只负责一种变化原因）：
- index.html；package.json；package-lock.json；README.md；vite.config.js；.gitignore；public（静态本地小型资产及license清单）。
- src/main.js（启动与失败恢复）；src/app/state.js（纯状态机/订阅）；src/app/ui.js、ui.css、a11y.js（中文控制与反馈）；src/app/manifest.js（来源标签）。
- src/data/evidence.js（来源/可信级别/版本），dimensions.js（**下面每个米制项**、provenance、value/estimate/null/measurementDatum），structure.js（层/组件拓扑、铺作类型分类）；src/data/content.zh.js（各层讲解）。
- src/geometry/math-octagon.js、mesh-profile.js、profiles.js；src/geometry/base.js、columns.js、brackets.js、roof.js、balustrade.js、finial.js、statues.js、inscriptions.js、building.js；src/materials/wood.js、stone.js、glaze.js、sky.js；src/render/scene.js、lighting.js、camera.js、quality.js、composer.js、picker.js、section.js、frame-stats.js、resource.js。
- tests/dimensions.test.js、geometry.test.js、brackets.test.js、content.test.js、state.test.js；reports/screenshots/（本机执行后创建，不由规划者制作）；handoff/sflipcloop/execution-report.md。

数据流：dimensions/evidence→几何纯函数输出可分批的 ComponentRecord(id,typeId,floor,ring,face,index,bounds,confidence,sourceIds,group)→场景注册 GeometryGroup + InstancedMesh arrays→renderer；UI action→state reducer→camera/section/light/quality→统一 render loop→FPS/截图/报告。几何批次以时间片requestIdleCallback（不支持则setTimeout(0)）、每轮≤8ms、先完整壳再精细构件，避免同步建模首帧卡死；dispose释放缓存/贴图/几何/render targets。

### 4.2 实测尺寸数据表（全部米；逐项明确口径与来源）
**重要**：“实测尺寸数据表”在此是一个带实测/公布/论文重建设计/估算/待核实的**证据登记表**。本轮未取得陈明达《应县木塔》原卷逐层尺寸、1933年《中国营造学社汇刊》完整测绘图、最新全面测绘原始表，故严禁伪称下列推算值为实测。单位全部m，除特别注明“类别/件数”外。来源Hxx对应上表；“E”仅为本项目**临时几何默认值**，不属于实测；后续若取得有明确测线的资料，应换源并记录日期/口径。

|序号|参数/测量位置|数值（m）及来源|可信标识/模型使用办法|
|---|---|---|---|
|M01|地面至刹顶通高|**67.31** H01/H02/H03|已公布主口径；未证明2026现状高度；模型选67.31|
|M02|底层直径|**30.27** H02/H03|公布值；未说明穿过哪两个最远点/角柱轴线；先以“底层塔身整体最远顶点距离”校正，UI标口径待核|
|M03|首层石砌台基地上总高|**约4.0** H14|高校科普约值；作为模型估算，不据此验收实测厘米|
|M04|台基地面以下深度|**约2** H03|报道“仅深入地下部分就达2米”；不可见；仅剖切标示估|
|M05|石台基上下总厚度|**>6.4** H03|下限；不要在模型标签写成精确6.4；可视地上只用约4m|
|M06|下层方形石基正方形边长|**待核实**（二次传播约40）|H01/H03只证实方形；模型 E=40，标估算；所有四向月台形制可用小型示意|
|M07|上层八角石基对角宽|**待核实**（二次传播约35.47）|H03证八角未给宽；模型 E=35.47、标估算；与下层基座不得混同|
|M08|下层基座出露高度/上层八角基座高度|**待核实/待核实**|模型 E=1.6/2.4，和=4.0；非测绘|
|M09|须弥座束腰、上下枭混、叠涩层高与挑出|**全部待核实**|模型为层高 [0.30,0.28,0.45,0.27,0.30]m 组合（仅位于M08内部，勿重复加高）；示意型，逐层位置放数据文件|
|M10|上层基座四面月台各伸出长度/宽度|**待核实**|模型南北两侧优先、E延伸2.4m/宽8m，其余短延伸1.2m；都标估|
|M11|明层一至五的**外槽柱线每面面阔**（设计假说）|**9.5472 / 9.18 / 8.8128 / 8.4456 / 7.956** = [31.2,30,28.8,27.6,26]尺×0.306m H04/H05|“推测原设计柱线面阔”，不是现状柱径/檐外径；用于五明层八角外槽柱网。每面中间3开间的各分间值另待核实|
|M12|M11 对应八角柱线顶点对顶点直径（几何推导）|**24.95 / 23.99 / 23.03 / 22.07 / 20.79**（四舍五入，公式 d=s/sin(π/8)）|由研究假说**推导**；与M02底层整体直径不属同一测线，切勿强制相等|
|M13|明层一至五外槽每面三开间：明间与次间分配|**逐层待核实**|E比例明:次:次=0.42:0.29:0.29（共一面，非实测）；完整栏杆与窗在三间内布置|
|M14|各层外槽柱头/柱脚标高、逐层柱高|**逐层全部待核实**|几何临时标高在表4.3，单独列provenance=estimate；避免把“屋檐高度”误作“柱高”|
|M15|首层内槽八角直径/外槽至内槽净跨度|**待核实**（非一手二次传播有约10.25m内槽直径）|模型 E内槽顶点直径10.25m，所有楼层内槽半径可逐级按外槽缩放，标估|
|M16|首层三圈柱/外圈根数|**56柱 = 24副阶+24外槽+8内槽** H03/H14（根数非m）|真实数值为结构数量；柱的直径逐根待核，模型E副阶直径0.55m，外槽0.65m，内槽0.56m|
|M17|二至五明层外槽/内槽柱数|**每层24/8** H14（数量）|基础轴线布置值；应单列后加支撑柱与修缮痕迹，不能由56推导每层都56|
|M18|柱“侧脚”倾斜角、偏移量与各向现状弯曲|**待核实** H04指出存在不均匀侧脚|默认均匀中心缩进、极轻柱向内倾≤0.6°为E；不能假装复刻现状病害|
|M19|首层**下檐**与**上檐**檐口标高|**待核实/待核实**|模型 E=10.5/16.0，恰组成双檐；不是考古数据|
|M20|二至五明层檐口标高|**逐层待核实**|模型 E=25.0/34.5/44.0/54.1；整体五层六檐|
|M21|明层屋面檐口从柱线外挑出距离（六檐）|**待核实（逐檐）**|模型 E=[2.2,2.0,1.9,1.8,1.7,1.5]；顶部第五层相对缩小；证据不足不与M05混同|
|M22|六檐对应屋面起坡/折点/上举与各个角端起翘|**逐檐待核实**|模型 E：内侧径向抬升 1.1–2.7m（按每檐可用高度截断），角端上翘 0.12–0.30m，详算法；非《营造法式》实测举折|
|M23|五明层平座外圈半径/宽/栏杆外缘位置|**逐层待核实**|E宽1.4–1.8m（模型需保证在出檐之内且墙外）；按柱网八角多边形法向偏移生成；不可直接按环形圆柱|
|M24|平座铺作层厚度/类型与斜撑位置|**待核实** H01/H03支持“内设暗层斜撑”|E结构层厚1.3–2.2m，叉手对角支撑示意，数据标签注明推断|
|M25|五层外檐**柱头铺作里跳/外跳总尺寸**|陈测 **0.71/0.74**；北测 **0.680/0.700** H05|两组不同实测，不取平均当真；default优先北测 0.680/0.700并在信息卡列争议；“跳”这里按论文语境为**里/外总出跳值**，不是每一跳尺寸|
|M26|各层转角/柱头/补间铺作“铺作数”、出跳级数|**全部待核实** H05只有第五层局部描述|须生成至少3类可视不同原型，typeId不代表54种已准确几何|
|M27|斗口宽/斗底宽高、栌斗尺寸|**待核实** H05图表图片未逐项复核|E基元：斗宽0.34、高0.19、底宽0.28；仅参数图示|
|M28|华栱、泥道栱、令栱、慢栱/瓜子栱各长宽高|**待核实**|E以材宽/厚参数驱动：五层单材宽约0.257m、足材宽约0.367m，厚0.153–0.184m (H05论文尺寸假说，由尺×0.306换算)；栱长在 0.55–1.5m 区间**模型估算**，必须按type做差异|
|M29|昂、耍头、乳栿等每跳长度、昂起角/昂嘴尺寸|**待核实**|E昂长度1.0–1.7m、抬角10–22°、耍头0.6–0.9m；不把宋代通则等同此塔实测|
|M30|五层斗栱“横栱/栌斗/散斗”的真实断面分布|**待核实** H05仅表格图片|模型按柱头>补间截面、转角最大，保留同层位置差异|
|M31|檩条、椽、飞椽间距/截面与屋瓦长度宽度|**全部待核实**|E椽间距0.22–0.30m、椽直径0.13m、瓦片长0.32m宽0.24m；以性能分档动态抽样|
|M32|八角攒尖屋面屋脊/屋面坡度/檐角翘起与正脊|**全部待核实**|八角攒尖屋顶无单条水平传统正脊，八条斜向垂脊汇顶；将“正脊长度”标“不适用”，需研究戗脊/吻兽具体位置|
|M33|塔刹总高和刹杆分段|**高约10m** H14/古建简介二次口径；另见二次文献12m异说，**未核定**|E从57.31m至67.31m共10m；仰莲/覆钵/五重相轮/圆光/仰月/宝盖/宝珠分段默认 [1.0,1.0,3.8,1.0,0.7,1.0,1.5]m 总=10.0；全为E非实测，铁链8条|
|M34|匾额的逐块真实尺寸/木板厚/位置标高|**待核实**|根据公开结构位置设：三层南“释迦塔”、四层南“天下奇观”、五层南“峻极神工”等，位置为二次文献参考，尺寸E三层宽2.1高0.65，其余按视场缩放；字形需核对禁用伪古文字|
|M35|五层各造像身高、坛座长宽|**除首层其余全待核实** H07|首层像高约11m、座约2.13m（是否包含坐像高度口径需核实，勿相加造虚高）；分布1/5/4/7/9；模型各层内体块造像0.9–4.2m仅示意，不造未经证实的神态细部|
|M36|首层六壁佛画高度|**约8.0** H07|论文/考古权威性不等同本轮官方复测；不得复制壁画图片，使用文字图例或抽象占位面|
|M37|栏杆望柱高/头饰、栏板厚/榫口、望柱间距|**均待核实**|E望柱高1.15m、截面0.15m，按平座八边每面四至六跨，栏板高0.72m厚0.07m；做直棂/钩栏风格示意，绝不称精准|
|M38|南侧台阶步数/单步踏高、踏面、宽|**全部待核实**|E踏高0.16m、踏面0.30m、步数随4m台基与月台布局自动整数求得；明显标示“示意踏步”，不杜撰历史步数|
|M39|瓦兽/滴水/风铎实际尺寸/数量|**均待核实**|E瓦兽长0.45m、风铎高0.18m，风铎在檐角/转角点可见，仅作为装饰示意|
|M40|二层“铁柱”数量、截面、位置|**待核实且不能确认二层铁柱这一描述成立**|本期不加入铁柱，以“未证实”列证据缺口；不允许工程性臆测|
|M41|“蚂蚱做法”、唐代叉手遗存的具体构件|**术语/位置未核实**|不纳入事实卡；暗层斜撑/叉手仅作已知功能示意|
|M42|各构件当前偏移、歪闪/裂缝/维修痕迹精确值|**待核实** H09/H12说明存在病害|保持建筑轴线规整，设置“示意未还原具体病害”显性标签；禁编病害模拟数据|

**平面换算边界**：论文H04“每面面阔”针对外槽柱线，不等于最外副阶柱线，也不等于瓦檐最大投影。数学 d=s/sin(π/8) 仅在 s 为正八边形边长时成立；若M02实际是对边净宽，则上表算法校正必须单独记录数据口径。原有不同来源可能给出现状塔高65.84/65.77等数值，但本轮只找到**非官方第三方网站**引用，未取得原始报告与基准点，故不把它们作为可认证精确值。

### 4.3 临时施工几何层位表（全是E：演示用，不是文物实测）
世界坐标：地面Y=0、塔心X=Z=0、向南为-Z；建模纵轴Y。为了尽快落出能比较比例的造型，固定总高67.31、基座可见顶4.00、刹顶起57.31。层位：
- 方基 y=0..1.6；八角上基 y=1.6..4.0；第一副阶柱脚y=4.0。
- 六重檐口 y=[10.50,16.00,25.00,34.50,44.00,54.10]；八角顶脊汇顶 y=57.31；刹杆 y=57.31..67.31。全部必须在文件中用 provenance: "ESTIMATE" 标识。
- 五个明层主要展示带从下至上 y区间[4.0..12.5, 17.0..23.4, 26.2..32.8, 35.8..42.3, 45.2..52.0]；暗层空间在两明层间，[14.8..17.0,23.4..26.2,32.8..35.8,42.3..45.2]（与檐重叠意味着仅示意建筑拓扑，几何须避免楼板/梁架实相穿插）。重点：模型以“**多层体量比例默认**”身份展示，执行者可为消除相交调 E 数值，须在报告记录更改。
- 每层明层外槽八角柱线 M11 推算 s 列；首层副阶外顶点半径≈15.135m；第2–5层外缘可随柱网内收，外檐最大半径由柱线 radius +挑出构成；第一层总直径30.27的比对只针对标注的同口径几何基准点，避免把瓦椽伸出错误纳入直径。

### 4.4 参数化建模算法及逐件责任（执行伪代码）
**八角与收分**：函数 octagon(s,y,rotation=π/8) 设 R=s/(2sinπ/8)、A=s/(2tanπ/8)。v_k=(Rcos(rotation+kπ/4),y,Rsin(...))；需要“某边严格朝正南”时通过法向最小Z校准rotation；创建faceEdge[k]=[v_k,v_(k+1)]并做统一逆时针法线和索引方向；里外槽八角柱线按各自半径；每面三开间柱点 t∈[0,.29,.71,1]（外槽共有24个唯一外围柱；8边×4角/端去重，数学上每面端柱共享 +每面2内柱 =8+16=24）。不得每面造3个独立柱造成32或48根；每层内槽8角柱，首层另24副阶柱→56。截面可用8/10边圆柱，加轻微压弯但不能破坏柱轴连续；角柱可以轻微侧脚。

**楼层骨架/暗层**：每层 createRing(outer24,inner8)；梁枋沿每面与内外槽径向联结，层间叉柱造上层脚接下层铺作但模型不必做力学榫卯；每个暗层额外斜撑成 V/交叉模式，依据对应内外槽的角柱连接；地伏、栏额、普柏枋分别不同高度/截面，避免一根同色“环形橡皮圈”。暗层为可单独显示 group；楼板环形多边形中央留洞，剖面时真实看到中心空腔。柱仅在露出部分可分段以便剖切，材质UV方向一致。

**六套屋面系统**：对每檐定义 columnRing polygon P 与挑出 d；朝外法向 offsetPolygon(P,d)，八角向外偏移按“**边法线偏移后求相邻直线交点**”（非直接R+d混用）；檐口由8条控制边构成，按边分成N段，边中央檐口基高e、靠角端上翘Δ，z/y(边参数u)=e+Δ×|2u−1|^p（p=1.7）并做局部微弯；由檐口 ring 到内侧檩/顶点对同一面做曲面网格，沿归一径向t设置 rise(t)=h×[0.62t+0.38t²]（0檐口、1上檩），再叠加举折微量 sin(πt)×0.08m，不以纯圆锥挡住屋脊。屋面高低层须防上檐穿过下层斗栱；每个屋面三角面按一致线性三角/四边可见划瓦当行，瓦的筒瓦/板瓦为交替截面细条；椽从檐口沿坡向内，飞椽在外缘延伸且外梢上翘。八角攒尖顶8面自外圈汇至 apex (0,57.31,0)，**没有一条横贯东西的正脊**；8条垂脊/角脊有连贯的深灰陶瓦脊饰，角兽按有证照片轮廓的抽象示意；每个屋檐8角风铎（长度仅E）。所有面顶点法线合规；对上中下三采样环均测 z-fighting 与三角反面。

**斗栱铺作生成器（最难之一）**：不用“一个方块代表斗栱”，先建 6 primitives：栌斗/散斗（倒锥台或分层斗）、华栱（前后跳横臂/雕卷端）、泥道栱（沿面平行贯通）、令栱/横栱（承檐水平）、昂/耍头（斜昂与翼形昂嘴）、驼峰/垫木。局部坐标 +X沿檐面、+Z向建筑外、+Y向上；piece由profile挤压沿长轴并按实际节点贴合、局部不悬空。prototype键为 floorIndex × positionKind(corner,head,intermediate) × sectionKind(eave,pingzuo,inner) × variantId；每个prototype有层级 nTiao（仅E若无实测）和方向，提供 LOD0/1/2 三套几何。corner 处理两面夹角，用rotation Y=faceAngle ±π/8 拼正交出栱，不能复制一套面中铺作导致各角漂浮。沿8面柱头24、角柱8、补间依“柱网端点”布点；**先创建审计清单**（frame/floor/kind/sourceId/estimated/count），不先指定“模型480朵”然后乱塞。伪码：
  for floor f in 1..5:
    for ring in [outer,inner] and section in supported:
      for face=0..7:
        at corners, column centers, verified/estimated intermediate slots -> make keyed placement
        buildPrototype(key); attach via matrix(faceTangent,outwardNormal,Y,point)
        assert positive support contact and no instance collision within tolerance
  output ledger floor×ring×kind×prototype count, total ledger, distinct geometry classes and literature baseline (480/54) separately
间距/朵数出现缺口时以标牌“排布示意，逐层数量未实测”代替硬凑。五层柱头里外跳采用M25的北测E选项0.680/0.700，另一个实测来源0.71/0.74支持切换数据标签；“每跳长度”从nTiao与总出跳分配仅为建模公式，不能称原构件测量。

**材分化**：五层以0.306m尺推导足材0.3672、单材0.2570（论文单材1尺的0.84可得0.25704）、材厚0.153–0.184m 的假说；用 unitCai 驱动件尺度，其余层只借作**示意缩放模板**，组件注册可信度ESTIMATE，不暗示全部同材。栱端用2–3段卷杀曲线；斗口和挑口有真实凹面。按 plane vs angle 两类实例池使用 InstancedMesh (matrices/colors metadata lookup index），修改完矩阵设置 needsUpdate 并 computeBoundingSphere；拾取 raycast instanceId→typeId+floor 解析；数组按状态换池/visibility 控制；剖切时需解决 InstancedMesh **单个实例不可直接逐件裁**：采用分组重建可见实例矩阵池（或单材mesh裁切统一 clipping plane，剖切内部高档可对主要架构 Mesh 使用 clipping；透明顺序副作用时优先隐藏半个几何pool），保证右半部剖去的构件包括斗栱、瓦、柱、装饰，不能只剖墙面却保留空中的栱。

**平座栏杆**：外圈多边形每边法向扩展平台 width；方形望柱按每边k等分并共享8个角柱，望柱含矮柱身+素头；上下横枋、竖棂与中间栏板独立网格；栏杆不悬空/不侵入门洞或瓦。层级结构中按明层2–5有平座，首层只做回廊与副阶；手动剖切时平座同样剖去半边。石台基方下八角上，叠涩、角石狮头E小体块，台阶按 floor(E_total/0.16) 步数布局到入口，踏步不会越过基座立面。

**刹**：在 apex y57.31 建上窄下宽分段同轴铁构（仰莲、覆钵、五重相轮、圆光、仰月、宝盖、宝珠），每段E由M33分段合计刚好10.00m；8根铁链指向八檐脊端；相轮必须具有5重可数环，金属不可做成随意发光球；当接口更精确时更新细段 height array，assert sum to 67.31m。

**造像**：模型不是佛像扫描替代。先支持每层内槽中央佛坛，分组 1/5/4/7/9 的人体几何采用由椭球、锥体、曲面/扫掠曲线合并的**雕塑占位**，至少有莲座、身形、发髻、垂衣、手势方向层次，脸部省略写实五官以避假装复原；标牌“原像组合位置参考文献；造型为抽象示意”。首层座像与2.13m莲座必须避免11m口径相加到超室内净高。第2层一佛四菩萨（其中2胁侍）、第3层四方佛、第4层7人（文殊普贤坐骑与两位牵兽者按H07）、第5层毗卢遮那佛及8菩萨。只有剖面/聚焦时显示雕像；内部暗层可点击但不拟真穿墙漫游。

**匾额**：HTML/CSS2DOverlay 或 CanvasTexture 原创文字，离线字体系统 fallback PingFang SC、Hiragino Sans GB、Noto Sans CJK SC(若存在)、serif；匾板深色木+金字，保证阅读方向，透明面板与前缘避免穿模。既有匾额“释迦塔”“天下奇观”“峻极神工”等位置采用H相关历史资料并明示标高E，年代/书法尚需校对则文案不称“原字扫描”。可以把匾额 SVG 自写为路径以消除字形环境差，但严禁直接转载博物馆版权照片。

### 4.5 材质、程序木纹、昼夜
木材：MeshStandardMaterial，roughness=0.78–0.93、metalness=0、base #47362D；程序 CanvasTexture(256×1024，连续垂直木纹，粒度≤0.045色差幅，fbm/分形噪声+沿纹理方向低频条纹、节点附近微扰，生成从seed可复现的4种变体)，手写生成 normal/bump 或简易共用粗糙度贴图；木纹朝梁/柱长方向投影，以BoxGeometry各面的UV方向和件旋转矫正，不要出现横向“斑马纹”，mipmap + anisotropy最多8、色域贴图 SRGB、法线/粗糙度保持Linear。边角磨损通过几何浅倒角（≤2%构件宽）与高频随机浅色，再用枋口/斗口深部阴影表现，不要所有表面同材同色。柱头接缝不加闪烁随机白噪点。
黛色筒瓦 roughness .83 metalness 0，细微蓝黑渐变；琉璃脊饰（局部）metalness .06 roughness .38，釉质反光有限；石基/砖 roughness .9–1.0 带0.03–0.06细微色差、砖缝mesh深0.015m，禁大片玻璃/亮塑料；彩画只在枋心/斗栱点缀赭红+黛绿+暗金，不把整个木塔变成宫廷朱红色。佛像 matte golden earthy，roughness0.57、metalness0.1，谨慎局部贴金亮面。

白昼：sky #D6D7D2，环境 HemisphereLight(0xE4E7E2,0x50463B,intensity=2.1)；太阳 DirectionalLight 色0xF8EAD2 intensity=3.2，从西南(-40,90,30)向塔心，阴影 PCFSoft，shadow camera包住±38m Y=0..70m，bias约-0.0002、normalBias .025（根据实际阴影伪影调），fog linear near≈120 far≈250；renderer曝光=0.90。夕照：sky #DBC6B1、地平远雾 #C7B3A0；太阳颜色0xFFBA75 intensity2.4 位(-70,33,12)，环境1.15，曝光0.94，暗面可辨；太阳确实低角，与投影方向一致。夜景：sky #171F29、环境0x5D7083/intensity0.45，月光direction色0xB8C7DD intensity1.1，曝光1.02，8–12个很弱暖色灯笼点光中的**仅2–3盏真实可投影点光**，其他 emissive材质/精简点光，其亮度远弱于塔轮廓；可选内部佛坛微弱灯0xE8B97A、intensity0.6、距离8m。夜不使用强烈金光/荧光边缘；bloom默认关闭，需要开启时强度≤0.12、阈值>1.0，避免“佛光”真实文物错觉。灯态插值对 light intensity/color、fog、background/曝光进行，1.45s ease cubic-bezier(0.22,1,0.36,1)，始终保持 PBR材质。

环境贴图：不下载任意HDRI；默认Hemisphere+sun，无环境贴图亦能表现；仅高档近景玻璃/釉面如确需亮斑，用 RoomEnvironment + PMREMGenerator.fromScene 并一次dispose环境场景，不能让“摄影棚高光”主导露天场景。Composer 高档可 RenderPass→SSAOPass(半分辨率/较小kernel)→SMAAPass→OutputPass；主流关闭SSAO，低端renderer.render无后期。避免同时tone map两遍；shader custom颜色管理参照T05/T06。

### 4.6 相机、剖切和分解动画
初始化 target=(0,29,0)，camera=(−55,33,93)（距塔约110m），FOV≈42–45°；在实际1080p与移动视口按Box3模型包围体自动计算“fitDistance = (radius / sin(fovVertical/2))×1.18”，保证塔顶/基底入画，窄屏因宽比优先按horizontalFOV再求距离。全貌预设、南正立面、东北高位俯看、南侧檐下近景、五层斗栱近景、塔刹、九层剖面共至少7个机位；每个保存 position,target,fov 或 zoom，使用 Vector3.lerp + Quaternion.slerp 或 spherical interpolation，机位目标不能错误转向外面；Tween新操作中断旧。参数模式局部焦点仍以构件中心为target，距离不得越过包围边界；可“全貌”快速退出。

剖切：whole→section: 从西南看沿一条过塔心的轴向竖直剖面，移去朝镜头半侧的外墙/屋面/柱/斗栱/栏杆，保留另半结构和九层纵向说明层标（不要把整塔变成透明玻璃）；进入时保持center frame，按group visibility控制，1.35s对剩余实例渐出/移出，透明仅临时可见短于0.25s，避免大量透明材质排序。exploded：五个明层+四暗层 roof components 纵向移开E间隔1.5–2.0m，**需要临时缩小模型到适配视场而不可改变状态里的原始米制尺寸**；动画回归精确原坐标避免累计位移漂移。切换至structure时在测量标签标原始坐标而非动画偏移。点击“查看这一层”可隔离指定明层、其上半透明（低配直接隐藏），高亮构件3s后恢复。

### 4.7 数据补全策略（已决策，不是留给用户的问题）
执行者不必继续在线研究才能完成本期，但若本机能访问正版/公开完整测绘资料，可只取“有明确图号/页码/测线”的数据填 dimensions.js，每条新增字段 {valueM,measureType,location,sourceId,page,confidence,date}；严禁未经授权分发扫描图或把非商用图复制进public。未取得者始终 null in evidence 并使用独立 estimateM；构建“真实值/估值”双通道，UI点击“证据”可查看。重要：尺寸表中的学术推算比精细图片更加可靠时优先遵守其柱网；但当现状真实歪斜与设计假说冲突时保留可复原的规整形而披露缺口。

## 5. 面向本机执行 Agent 的有序实施步骤
每步按“目标｜前置/输入｜操作（文件/算法）｜产物｜即时核验（命令/观测）｜失败排查与完成分支”执行。任何步骤不可跳过本轮本该提供的算法、参数和验收。全部由**本机执行 Agent**独立实施、调试与测试，首席规划者只给要求。

**S00 工程与证据基线。** 输入本规划、已有.git目录、Node26/npm11。建 package.json exact three0.186.1/vite8.3.5、scripts、.gitignore、README骨架、index中文loading骨架；将上文M01–M42映射到dimensions.js字段（sourceId、unit、certainty、measurementDatum、estimate），content.zh.js给中文标签，项目包含[来源/未核实说明]入口。产物空场景工程。即时核验：node -v、npm -v、npm install --save-exact three@0.186.1、npm install -D --save-exact vite@8.3.5、npm run dev -- --host 127.0.0.1（若脚本本身host已固定，避免重复选项）；预期终端输出Local URL、无需CDN。失败查 Node/npm registry、Vite插件ESM、占用端口；依赖未安装绝不“跳过”到写源码。

**S01 最小可运行实景（绝不先做全细节）。** 输入S00。写 main/scene/camera/lighting/geometry/base/building：方形+八角台基、五层八角折线塔体/六檐简化曲面、攒尖和分段铁刹、Hemisphere+Directional、OrbitControls及响应式 resize；Canvas实际WebGL可交互。产物能从正南偏西完整看塔的粗模型。即时核验：npm run dev，Chrome打开页面、拖转和滚轮、打开Console无红错；临时显示height67.31、baseWidth30.27、heightRatio2.224。失败优先查 WebGL2/context、摄像机target不对、NaN geometry、剖面法线、renderer pixel ratio。条件：只有无错误且能转的真实3D场景才进S02。

**S02 八角柱网与楼层结构。** 输入S01/M11–M24。建 math-octagon、columns、structure、floor groups；五明层M11 8面×3间24外柱 +8内柱，首层再24副阶柱，地伏/栏额/普柏枋、四暗层环形梁架/斜撑、楼板中庭洞。用纯函数生成数据，分 floor/group 命名。即时核验：node --test tests/geometry.test.js 验证所有面阔公式、外槽每明层24柱/内槽8柱、首层总56、层次数；浏览器剖一面能看到两重柱圈、柱底石础，旋转360°无虚空侧。失败查多边形方向、角柱去重、闭环端点、层位重叠。条件：柱数/收分和柱间空间正确。

**S03 斗栱分件模型实验台。** 输入S02/M25–M30。先在独立 debug 页面/参数开关展示一个五层柱头、一个转角、一个补间铺作：栌斗→华栱/泥道栱→令栱/昂/耍头至少6件，显示部件名称与局部轴；用.profile mesh+倒角和材分参数建3类比例不同prototype；演示M25两组出跳值切换，只是可视验证，不当作最终可选给公众的真实性。产物 bracket prototype+元数据。即时核验 node --test tests/brackets.test.js（每个primitive有正包围盒、连接点偏差≤0.03m、旋转到8角法向后XZ位置正确）；浏览器放大无穿插/漂浮且三种类型肉眼不同。失败查local Z方向/negative scale、中心原点偏移、料长和连接槽错位。条件：单个斗栱合格才允许大规模复制。

**S04 斗栱铺作阵列与精细LOD（高风险拆解）。** 输入S03。第一小步构建 placement ledger（五层明/暗、内外槽、柱头/转角/补间）而非直接建mesh；第二小步prototype按 key 缓存geometry和material，按LOD组建InstancedMesh；第三小步镜像转角+法向定位、instanceId→元信息拾取表，核查与瓦口接触；第四小步批次建模、对同层每面四角转向自动对齐；第五小步 UI 数据栏同时显示“文献54种480朵/当前模型总计X、示意Y种”；第六小步相机切近景确认三档质量对斗栱形制的变化。即时核验 8角各取至少3个像素截图、程序 ledgerSum==实际instanceCount、每组合法 floor/typeId、无NaN、首层和上层不出现重复柱头漂浮。失败首先看共享顶点+实例顺序、矩阵法向/left-handed、InstancedMesh更新标志/BoundingSphere。条件：造型按人眼能辨才进入屋顶。

**S05 六檐举折、椽瓦与屋脊（高风险拆解）。** 输入S01轮廓/S04铺作范围。第一小步每檐只生成8面屋面曲面（正确法线）；第二小步按顶点y/eaveRise/eaveUpturn排查边线连续 C0 和接缝不裂；第三小步沿坡铺椽、飞椽，确保至少两种瓦形；第四小步用实例瓦与檐角滴水、角兽、风铎，8条屋脊通往塔尖；第五小步层层从底檐到顶檐对高度、挑出与“第一层重檐”的遮挡关系逐个截图；第六小步高/中/低密度切换，保持屋面整体外形完全一致。即时核验：node --test tests/geometry.test.js 屋面八面、邻缝差<0.005m、每檐min/max高度非NaN、上举正向、互相不穿檐；侧面/俯看截图。失败查 polygon offset交点、瓦面法向、屋面网格winding、角脊接缝、topology。条件：六重檐口可数，最上屋顶攒尖而非方形。

**S06 木纹、石瓦、脊兽和彩画。** 输入S05。制作 deterministic CanvasTexture 木纹4变体（seed固定）、各轴投影、mipmap；材质库可按quality重用而不能每构件新建texture；石基叠涩缝+角石兽示意、瓦深黛色、枋心局部朱/绿彩画；灯光先只白昼，依据专章roughness/metalness校正。即时核验：近景屏截图至少有“柱/斗栱/檐瓦/石基”各一张；灯角变化深浅一致、木纹走向沿柱长、无网纹、无粉白斑；renderer.info.memory textures低于相应档预算。失败查 UV、纹理wrap、colorSpace、normal贴图通道、重复申请。条件：无纯色塑料感。

**S07 平座、入口、匾额、造像。** 输入S06。2–5层每层平座、栏杆望柱、门窗；底层副阶周匝与踏步；用CanvasTexture或DOM label自写中文匾额，位置标签E；造像1/5/4/7/9组按H07 **抽象雕塑**，首层11m与莲座口径防净高溢出，其他层尺寸用E。即时核验：看正南、近各层平座、八角角柱共享、匾文从南外可读；剖视可数内部四暗层和造像每层组数；node --test统计26造像示意对象与对应 floor。失败查中文Canvas字体宽度、镜面倒字、模型碰墙、楼板挡像/性能。条件：所有东西都可查证/标示示意，才允许对外科普文案。

**S08 相机预设、热点和结构探索（高风险拆解）。** 输入S07。state reducer与独立相机动画；每个preset存目标和距离，随视口fit重新计算；拾取用 raycaster，对InstancedMesh解析 instanceId→ComponentRecord；只6种常驻热点、键盘可选热点；剖切优先分组隐藏半侧（生成visibleInstances池），必要时mesh clippingPlanes 设置 renderer.localClippingEnabled，确保内部不被瓦壳遮住；exploded 基于未动画原坐标，时间轴统一、取消Tween自动采当前状态；同一按钮再按退出模式。即时核验：Chrome连续快速依序 机位A→B→剖→分解→回全塔，前后模型height和worldMatrix回到初始误差<1e−4m，Console无错、无遗留透明片/悬空斗栱。失败查控制器target/Orbit保持update、cancel token、实例池visibility过滤、shader clipping。条件：任何状态可逆，controls始终可接管镜头。

**S09 日/夕/夜光照、后期与语义说明。** 输入S08。lighting三态数值详§4.5；高档composer Render/SMAA/Output，可选SSAO，低端无composer；曝光和雾插值，夜灯绝不刺眼；UI全部中文、来源卡展示sourceId/日期和“估算”徽标、ARIA标签及动画减弱。即时核验相同机位3张图、目检夜景不过曝/清晰轮廓；关闭后期前后颜色不大幅反转、无重复tone mapping；CSS键盘/触屏试通。失败查OutputPass顺序、色域、光源同步与阴影、夜点光数量。条件：三态均可看清斗栱下阴影和铭牌。

**S10 性能、降级、恢复和离线。** 输入S09。加quality profiles、FPS/帧时间仪表可参数开启 (?debug=1)、window.__yingxianDebug只在开发环境或debug允许输出getStats、getDimensions、getCounts、setQuality、setView、getReadyState；自动quality按§3.3阈值；页面失焦按需绘制、resize observer/visibility、WebGLcontextlost fallback；public assets清单本地化。即时核验：npm run build，npm run preview，在网络DevTools offline模式依旧能重新打开预先已加载的页面——注意Vite静态文件**首次离线**需要文件已在本地/本地server仍运行，并非要求在普通在线站点首次离线装载；禁第三方请求；模拟错误并看到中文回退。失败查 npm构建资产绝对路径、渐进任务取消、缓存内存、contextrestored回调。条件：功能不因一个装饰构件失败而崩溃。

**S11 本机真实验收与审计交付。** 输入S10。执行§6全测、写截图/原始fps记录/Console日志，核对每项A01–A12。npm test/ npm run build的结果贴进 handoff/sflipcloop/execution-report.md，README写运行和模型非精测说明/来源与授权；本机commit push main（遵守不部署不CI）。未达标项必须标FAIL或NOT TESTED并解释，不能“创造”测试成功。若性能差优先退LOD或关阴影而不删除六檐；若比例错先从geometry数据与测量口径修正；若文案学术错误先修证据标记。完成条件：可交付WebGL网页+诚实证据，所有必需项可追溯。

## 6. 验证与视觉验收（由本机Agent执行）

### 6.1 真实运行命令和环境记录
在 /Users/sheng/Projects/20261025040300-yingxian-muta-3d：
- node -v && npm -v；npm ci；npm test；npm run build；npm run dev -- --host 127.0.0.1（若配置重复host命令可改 npm run dev）。
- 浏览器访问实际终端Local URL，Chrome和Safari都测。也跑 npm run preview -- --host 127.0.0.1，检查dist自包含与路径。浏览器DevTools Console/Network勾“Preserve log”，保存错误计数/离线测试截图；Network third-party requests 必须0。
- 截图视口最少：1920×1080 DPR1、1440×900 DPR2（Mac Retina视真实）、768×1024 DPR1、390×844 DPR3模拟、320×640；高低端 quality都测最重要的3视口。每个按规定设置截图文件名，保存真实图片，不以设计稿冒充。
- 浏览器自动化可用 Chromium 的话用 Playwright/CDP 控制（无需依赖新CI），在页面Ready/frames稳定之后截 Canvas 和整体UI；Safari 人工核对。WebGL截图如果黑屏，先检 preserveDrawingBuffer/截图时机；必要在渲染帧后获取toDataURL而非拿空Canvas，并在报告备注截图方法。

### 6.2 帧率本机可重现实验
在打开的页面启用 ?debug=1 打开性能仪表（这个仪表按S10实施）。requestAnimationFrame记录前后连续时间：frameDelta=timestamp[i]−timestamp[i−1]，对每段10s样本计算fps=1000/median(deltaMs)，同时报告fps_by_count=nFrames/elapsedSeconds及P95(deltaMs)；如果是按需渲染会导致静止阶段降帧，所以测试必须**持续旋转/稳定相机动画**，保证保持渲染。5段×10秒：①全貌自动缓慢环绕②三层檐口微近景③结构剖切④夜景⑤连续缩放/平移；每段第一个2s暖机不计；主观卡顿不能代替P95。总报告同时列视口、devicePixelRatio、浏览器版本、renderer.info.render.calls/triangles、quality、GPU renderer/WebGL信息（只写可得到的信息；隐私敏感ID无需存）、是否软件渲染、最低/中位帧率、最高P95、内存（如可用）。可用 Chrome DevTools Performance 再核对长任务≥50ms；Safari Performance Timelines补测。三档按高/主流/低功能档**强制切换**，非“预设这台电脑属于高端”，如有浏览器命令支持 software WebGL/SwiftShader，再使用单独 Chromium 启动参数进行软件模拟并明确记录；不强求启动软件GPU不可用时虚构结果。

### 6.3 验收追溯矩阵
|验收ID|前置与执行操作|可观察通过条件|证据路径建议|
|---|---|---|---|
|A01|npm ci/test/build；dev与preview各打开、拖动|实际Canvas可转，build成功、无WebGL报错|reports/console-start.txt、reports/screenshots/01-first-frame.png|
|A02|从南、斜45°、俯看数檐与层；开启剖视|6檐（底2）/8角/5明4暗/攒尖真实可见；至少首层56柱数据正确|reports/screenshots/02-south.png、03-top.png、04-section.png、test输出|
|A03|调用debug.getDimensions、对Box3高度/对径（明确measurementDatum）|height=67.31 ±1%；base=30.27 ±2%；ratio=2.224 ±2%，M11外槽侧长每层 ±2%；估算项只查内部逻辑不冒称“实测吻合”|reports/dimension-check.json、screenshots/05-proportions.png|
|A04|机位檐下/石阶/塔刹各看细部|至少6组件类别、栱形变化、角瓦、栏杆、石阶、牌匾可目辨；无大量穿插|screenshots/06-brackets.png、07-base.png、08-finial.png|
|A05|debug.getCounts + 手动看3种铺作prototype|模型实例统计与ledger一致，文案显示54**种**480朵资料口径且模型差异明示；不能谎称精准480|reports/bracket-ledger.json、screenshots/06-brackets.png|
|A06|1920/1440/390全貌和局部查看|塔尖/基座未被裁切；默认留白≥5%；木纹沿件长轴、没有纯色塑料/闪烁|screenshots/09-desktop.png、10-mobile.png、11-detail.png|
|A07|按全部按钮+鼠标拖/滚轮+全貌重置|每动作有视觉反馈，镜头不倒置、不越界、连续切换无残影，退出剖切完好|screenshots/12-ui.png、13-exploded.png、reports/interaction-check.md|
|A08|剖面数26组位置/四个暗层/双圈柱|明五暗四分层标签与原模型结构对应；造像卡写“示意”|screenshots/04-section.png、reports/structure-check.json|
|A09|WebGL2关闭或模拟contextlost、网络断开、键盘Tab、系统reduced motion、320/390窄屏|可读文字回退、菜单可点、焦点可见、不无限加载、不白屏|screenshots/14-failure.png、15-320.png、reports/edge-cases.md|
|A10|三档 × 5场景×10s（每段2s暖机）|高55/主40/低20中位目标与P95记录；不达标诚实降档或标限|reports/performance.json、reports/performance.md|
|A11|逐条抽查中文热点、来源与年份|无英文残留UI，无“后晋1056”、无“54朵”、无“UNESCO已列遗”|reports/content-audit.md、screenshots/16-evidence.png|
|A12|检查 git diff、readme、execution报告、截图|所有项 pass/fail/not tested 明确，本机真实日志含被测Git SHA/浏览器版本|handoff/sflipcloop/execution-report.md、reports/|

### 6.4 量化外形与人工视觉清单
量化：把M01/02/M11/12/19–23/25/33的坐标从运行场景真实 meshes worldMatrix 及 metadata 导出，逐条表：datum、source原值、modelValue、absDev、relDev、status。对M01/02/M11同口径验≤2%；M19–23为E只验证模型与E在0.01m之内及无穿插，不能声称实物吻合；当源是区间/待核实时不输出虚假误差百分比。对M33每个子高度合计10m且总高67.31m。截屏叠加以白色轮廓辅助线/八角顶点可检查（图只在debug出现），无需侵犯未获授权照片。

人工逐视角：正南入口台阶是否对门；首层副阶双檐是否构成明显大小层次；明层自下而上是否有稳定收分而非“蛋糕一样同宽”；八角角脊是否圆顺、阴阳面亮度差异；斗栱每一跳连着梁而不是漂浮；五层顶脊八面是否真正汇顶；匾额文字与方向；平座栏杆的望柱节奏；石板缝不会反光像铝；木纹长向且各构件颜色不机械完全一致；昼夜同一建筑无过饱和“夜游灯光秀”；近拍“木构古建”而非简笔塔；移动屏按钮不遮塔/可用；全部功能可“回到全貌”。若质量欠佳，优先修**比例/斗栱/檐口/材质**而非增加粒子或镜头特效。

## 7. 风险、偏差和决策权

|风险（真实影响）|触发指标|预防/缓解|失败恢复与披露|
|---|---|---|---|
|公开测绘不完整|M表多项null，源口径不同|事实/估算隔离、首轮只保证结构拓扑；高可信论文派生尺值校准|保留E并标“研究性复原/非官方精测”，不硬编码假精度|
|错误把54种当54朵/现状480朵分配|模型文案出现“54朵”或分层480凭空配置|H03/H05记录文献计数、ledger显示本模型值|改中文文案与ledger、恢复各部件多样性|
|斗栱/屋面几何穿插、漂浮|近景可见 >0.03m 间隙、法线闪烁|S03实验台先打样、正常方向和局部轴一致、包围盒断言|关闭可选装饰，回退已验证原型，不牺牲六檐|
|细节多导致掉帧/软件GPU崩溃|P95 frame>50ms或context lost|InstancedMesh、共享纹理/LOD、批次生成、按质量删细节|一键safe画质、停后期阴影、保留梁柱/斗栱拓扑|
|木纹显卡差异显“条形塑料”|近景明显方向错/重复纹理|4种procedural色差、低频波动与roughness，限制纹理幅值|回退哑光木颗粒，先纠纠方向及光照|
|Safari/Chromium色域或后期不一致|夜景泛白/过曝/蓝灰偏色|WebGL2基线、只在高档composer和OutputPass、各态单独曝光|一键关composer，renderer直出，记录浏览器及截图|
|剖切实例未完全分离|上半天空中剩悬空斗栱/瓦片|group分片/实例可见池重建，标签只显示剩余建筑|安全回退“分层拆解”（逐层隐藏）仍保留可探索|
|中文字体/匾额版权/无障碍|macOS Safari汉字截断/牌匾字体不对|系统字体回退、CSS文本先于CanvasTexture、原创文字|改为DOM文字标牌、跳过未获版权的原匾图|
|夜间“佛光”误导文化表达|过曝遮挡结构、观感像游戏副本|限制灯功率/辉光和饱和度，“艺术模拟光照”标注|取消佛光，仅月光/微弱暖灯|
|误报修缮现状/年代|展示成“已经落架修复”或“世界遗产”|H09/H10与H01原始措辞卡审读|退回“正在监测测绘与局部加固”+来源标日期|

执行Agent**有权**决定几何细分数、E默认值小范围调参、精简材质实现、DOM布局细微尺寸、fallback和测量脚本实现、性能档开关，只要不偏离A01–A12及史实/结构；不得擅自取消五层六檐、内部暗层、实时3D、交互、来源标签或修改GitHub公开性/部署权限。偏离记录于 execution-report：“原规划条目→实际决策→触发证据→对形体/质量/性能影响→测试结果→剩余限制”，**不可隐藏缺项为PASS**。重要未核实数值的添加必须给真实文献页码与测量口径；执行Agent可以在资料获取失败时继续已定义的E分支，不要求用户答复。

## 8. 交付物与证据清单

**最终源代码**：上文目录完整，核心使用JS生成的几何和原创程序纹理，assets-manifest中每个静态文件给作者、来源、许可证；无需外部CDN、密钥或模型下载。README必含：（1）项目/文物身份；（2）Node≥官方Vite门槛与本机锁定；（3）cd /Users/sheng/Projects/20261025040300-yingxian-muta-3d && npm ci && npm run dev；（4）npm test、npm run build、npm run preview；（5）鼠标/触控/键盘操作；（6）有争议数值与M表来源；（7）说明程序化模型**不等于现状高精度测绘、不适合工程修缮/安全评估**；（8）WebGL2与三档性能；（9）不自动部署、无CI。

**必须提交**：源码、package-lock、README、evidence/dimensions/structure内容表、测试、reports/screenshots/ 中至少 01-first-frame、02-south、03-top、04-section、06-brackets、07-base、08-finial、09-desktop、10-mobile、11-detail、12-ui、13-exploded、14-failure、16-evidence 及三态 day/sunset/night 各一张；reports/console-start.txt、reports/performance.json、reports/dimension-check.json、reports/bracket-ledger.json、reports/interaction-check.md、reports/edge-cases.md、reports/content-audit.md。个别截图确实无法完成要写 NOT TESTED；不要上传设备隐私信息或非法授权原图。

**执行报告固定路径** handoff/sflipcloop/execution-report.md；报告模板：执行日期/机器和浏览器/源码 commit SHA；已实现模块与文件清单；全部真实命令及退出码；验收A01–A12 表格PASS/FAIL/NOT TESTED、逐项对应截图/日志路径；主流和低端FPS原始数据；已核实 vs 估算 vs 未核实字段统计；模型斗栱 ledger合计与文献数字差异解释；所有风险与偏离；未完成项；交付判定；明确无CI/无部署。达到验收才写“可交付”，但本规划状态 complete **仅代表“规划文档写完”，不代表实现完成**。

### 最终一页交付判据
在真实 Chrome/Safari 打开时，不看任何介绍，观察者应一眼看出是一座有**六层屋檐而非六个开放楼层**的八角辽代高耸木塔：底层双檐、层层收分、瓦坡有举折、沉稳的旧木与复杂可数的斗栱、顶部清楚有相轮和刹、内部分层真实可见；用户能自由观察、缩放、读构件、切剖面、切昼夜、返回全景；可在本机按README重现，不联网访问第三方静态模型；每个尚未证实的米制数字不假扮文物实测。**“尽善尽美”的落点是：真实比例+可追溯的诚实程度+独立可运行的精致交互，而不是凭空编造细节。**
