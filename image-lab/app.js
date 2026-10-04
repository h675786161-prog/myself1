const $ = id => document.getElementById(id);

const els = {
  settingsBtn:$('settingsBtn'), settingsDialog:$('settingsDialog'), apiBase:$('apiBase'), apiKey:$('apiKey'), imagePath:$('imagePath'), editPath:$('editPath'),
  saveSettingsBtn:$('saveSettingsBtn'), testBtn:$('testBtn'), generateBtn:$('generateBtn'), model:$('model'), prompt:$('prompt'), negativePrompt:$('negativePrompt'),
  count:$('count'), size:$('size'), quality:$('quality'), seed:$('seed'), cfg:$('cfg'), steps:$('steps'), style:$('style'), status:$('status'), gallery:$('gallery'),
  clearBtn:$('clearBtn'), randomPromptBtn:$('randomPromptBtn'), presetChips:$('presetChips'), recipeBtn:$('recipeBtn'), libraryBtn:$('libraryBtn'),
  undoPromptBtn:$('undoPromptBtn'), dedupeBtn:$('dedupeBtn'), clearPromptBtn:$('clearPromptBtn'), recipeHint:$('recipeHint'),
  libraryDialog:$('libraryDialog'), libraryCloseBtn:$('libraryCloseBtn'), librarySearch:$('librarySearch'), libraryGroups:$('libraryGroups'), libraryTabs:$('libraryTabs'),
  smartRecipeBtn:$('smartRecipeBtn'), randomWordsBtn:$('randomWordsBtn'), referenceBox:$('referenceBox'), referenceInput:$('referenceInput'), referenceDrop:$('referenceDrop'),
  clearReferenceBtn:$('clearReferenceBtn'), replaceReferenceBtn:$('replaceReferenceBtn'), referencePreview:$('referencePreview'), referenceImage:$('referenceImage'),
  referenceName:$('referenceName'), referenceInfo:$('referenceInfo'), referenceModeHint:$('referenceModeHint')
};

const STORAGE_KEY='ling-image-lab-settings-v1';
const HISTORY_KEY='ling-image-lab-history-v1';
const FAVORITES_KEY='ling-image-lab-favorites-v1';
const RECENT_KEY='ling-image-lab-recent-v1';
const PROMPT_UNDO=[];
const DRAFT_KEY='ling-image-lab-draft-v1';
const DRAFT_FIELDS=['prompt','negativePrompt','count','size','quality','seed','cfg','steps','style'];
let historyItems=[],historyLoaded=false,draftTimer,activeRun=null,lastFailedRequest=null,cloudVersion=null,settingsDirty=false,referenceRevision=0;
let storageQueue=Promise.resolve();
let apiSchemes=[],activeScheme='',configSaving=false,writerRun=null,writerInputRevision=0;
const WRITER_DRAFT_KEY='ling-image-lab-writer-v1';
let libraryMode='all';
let referenceFile=null;
let referenceObjectUrl='';

const PROMPT_LIBRARY={
  '画风':['高级cg','oc渲染','韩式插画','手绘插画','数字绘画','国漫插画','小说封面插画','拟真','精致人像','非写实','半写实','厚涂','伪厚涂','半厚涂','薄涂','素描','水彩','水粉','岩彩','油画风格','二次元风格','2.5次元','3D建模','日漫风','赛璐璐风格','乙游人像','网游画风','易次元游戏','大师级画作','橙光游戏立绘/人像/建模','RPG(角色扮演游戏)'],
  '长相':['淡颜','浓颜','建模脸','绝美长相','精致五官','攻击性长相','极具冲击力','轮廓深邃','轮廓柔和','五官比例匀称完美','舒服耐看','面容姣好','bjd面容','杏脸桃腮','面容精致','骨相立体','混血感','doll感','人偶感','雌雄莫辨','瓷娃娃长相'],
  '肤色':['冷白皮','粉白皮','暖白皮','小麦色','瓷白肌肤','惨白肤色','白里透红'],
  '脸型':['消瘦','清瘦','瓜子脸','鹅蛋脸','锥子脸','小窄脸','小短脸','小尖脸','小V脸','尖下巴','尖下颌','脸型流畅','小巧纤薄脸型'],
  '眼型':['圆眼','杏眼','猫眼','丹凤眼','小鹿眼','桃花眼','狐狸眼','柳叶眼','吊梢眼','狭长眼型','长眼裂','眼尾上翘','眼尾平缓','眼尾下垂'],
  '气质':['狐系','蛇系','猫系','神性','清冷','高冷','孤傲','冷冽','妖媚','钓系','明媚','冷艳','明艳','妖艳','妖异','妖冶','邪魅','盐系','酷飒','御姐','拽姐','热烈','张扬','甜妹','甜酷','萌系','柔弱','温婉','优雅','甜丧','纯欲','腹黑','阴郁','坚韧','脆弱','病娇','病态','颓靡','颓废','傲娇','野性','叛逆','锋芒','氧气','小鹿系','地母系','冷脸萌','小白花','易碎感','破碎感','中性风','少年感','轻熟感','压迫感','清爽活力','千禧辣妹','风情万种','随性不羁','生人勿近','危险又迷人'],
  '肌理':['清透水光肌','缎面丝绸肌理','真实皮肤纹理','细腻磨砂肌理','柔光缎面肌理','光滑奶油肌','透亮珠光肌理','通透瓷白肌','绒雾面哑光肌','莹润清透薄釉肌理'],
  '神态':['冷漠','哀伤','忧郁','慵懒','松弛','克制','舒展','淡然','愁绪','疏离','迷离','倦怠','落寞','无辜','灵动','娇憨','狡黠','魅惑','邪魅','桀骜','厌世','萎靡','眼神锐利','睥睨','蔑视'],
  '氛围':['明亮','自由','清新','治愈','空灵','华丽','神秘','浪漫','童话','暗黑','清冷','凄美','静谧','荒凉','孤寂','诡谲','诡异','惊悚','压抑','虚幻','梦幻','朦胧','古早','复古','故事感'],
  '光影':['轻曝光','柔光','冷光','暖光','碎光','自然光','轮廓光','丁达尔效应','光影弥散','漫射光','流光溢彩','电影级光影','侧逆光','粒子光斑','大面积打光','明暗对比'],
  '美学风格':['ins风','港风','梦核','Y2K','荒诞','怪诞','亚文化','千禧风','日杂风','哥特风','蒸汽波','田园风','意识流','情绪风','街头风','摇滚风','西方油画（如梵高、莫奈等）','极繁主义','复古未来主义','超现实主义','冷光荧幻','迷幻电子','中式古典','江南烟雨','老上海民国'],
  '质感效果':['鎏金','磨砂','珠光感','胶片感','宝丽来','颗粒','噪点','彩噪','油画布纹理','纸质纹理','柔焦滤镜','ccd相机','复古dv','古早相机','玻璃质感','晶体质感','大荧幕超清质感'],
  '整体色调':['莫兰迪','马卡龙','淡彩','糖果色','洛可可','蓝调','薄荷曼波','意式灰咖','柔色','孟菲斯','低饱和','冷调','清透','灰紫','灰粉','灰蓝','粉紫','粉蓝','雾粉','雾蓝','奶白','高饱和','敦煌色','霓虹色','多巴胺','马蒂斯','蒙德里安']
};

Object.assign(PROMPT_LIBRARY,{
  '主体与关系':['单人插画','成年女性','两位成年女性','自然体态','人物身份一致','人物之间有自然互动','并肩站立','相对而坐','一前一后错位站立','保持各自的发色与服装','眼神交流','安静陪伴','自然距离感','主体清晰','人物与环境形成叙事关系','单一视觉中心'],
  '构图与景别':['全身完整入镜','腰部以上半身构图','胸部以上近景','肩部以上肖像','近距离大头肖像','远景中的小人物','三分法构图','居中构图','非对称构图','对角线构图','前景框景','画面留白','背景适度简化','头顶留出呼吸空间','脚部完整入镜','不裁切手指','不裁切四肢关节','横版构图','竖版构图','宽幅故事场景','人物轮廓完整','主体与背景有清晰层次'],
  '镜头与视角':['平视镜头','轻微俯视','轻微仰视','人物侧身45度','正面视角','三分之四侧面','背面视角','侧面轮廓','自然抓拍视角','肩后视角','正常透视','避免广角畸变','柔和景深','背景轻微虚化','人物视线外留白','镜头距离与景别一致'],
  '动作与姿态':['自然站姿','放松坐姿','蹲在贩卖机前','靠窗静坐','微微侧身回望','低头看手里的物品','抬手整理耳侧头发','一手轻握饮料罐','一手松捏硬币','双手自然交叠','手臂放松下垂','手肘自然弯曲','身体重心稳定','肩膀放松','步行中的自然瞬间','微风中轻拢裙摆','一手比耶','双脚自然落地','动作幅度克制','姿势与道具接触合理'],
  '视线与表情':['不看镜头','看向画面外','看向手中物品','微微垂眸','自然闭眼微笑','轻轻扬起嘴角','俏皮眨眼','轻微吐舌','有点发呆','柔软安静的神态','放松的眼神','克制的愉悦','眉眼舒展','嘴角与眼神情绪一致','表情自然不过度夸张','保留原图表情'],
  '身体比例':['成年人物比例','自然头身比','头颈连接自然','肩颈过渡连贯','头部与身体透视一致','肩宽与体态协调','手臂长度自然','双腿长度协调','四肢关节清晰','身体重心与支撑点一致','左右肩膀透视合理','避免头身分离','躯干姿态自然','衣服包裹身体结构'],
  '手部结构':['每只手五根手指','拇指位置正确','手指长度自然','指节清晰但不过分突出','手掌厚度自然','指尖轮廓柔和','手腕连接连贯','手部透视正确','手指与物品自然接触','握持姿势符合受力','两只手前后关系清楚','左手压在右手下方','手指不互相融合','手臂与手掌方向一致','手部大小与身体比例协调'],
  '发型与轮廓':['粉色长发','浅粉长卷发','雾粉色直发','柔顺光滑的长发','后部束起的双马尾','耳侧一绺细麻花辫','头顶两侧自然隆起的发束','柔和低矮的发束轮廓','自然刘海','轻薄侧分刘海','发尾形成清晰大色块','发量饱满但不过度蓬松','发束随动作自然垂落','耳侧头发轮廓清楚','顺滑的大束卷发','低位马尾','半扎发','肩后垂落的长发','胸前保留少量发束','柔和发色渐变'],
  '头发连接与遮挡':['发束从头顶自然连续生长','鬓角与后脑发束连接清楚','马尾根部连接后脑','左右马尾数量完整','耳侧辫子与后部马尾区分清楚','辫子长度与整体发型协调','胸前发束位于衣服前方','肩后发束位于外套后方','同一发束的前后关系保持一致','头发不与肩膀粘连','发梢自然垂落','减少细碎杂乱发丝','发束走向服从重力','保持原有发型与发量'],
  '服装与版型':['白色吊带连衣裙','奶白针织内搭','浅棕粉色毛衣','轻薄开衫','现代轻甜穿搭','简洁日常服装','到小腿的自然裙长','端庄自然的裙摆','宽松外套','合体但不紧绷的版型','低饱和白粉搭配','白色衬衫','简洁长裤','柔和层叠穿搭','衣褶沿身体受力形成','面料垂坠自然','基础内搭','无多余装饰的设定服装','简洁旗袍版型','保留原图服装设计'],
  '服装连接与遮挡':['肩线位置准确','袖子从肩部自然连接','袖口包裹手腕','内搭与外套层级分明','包带连续跨过肩膀','包带压在衣料上方','包包与包带自然连接','发束与包带前后关系一致','外套轮廓不与头发混在一起','蝴蝶结透视正确','裙摆受风幅度自然','衣料不穿过身体'],
  '配饰与材质':['小巧蝴蝶结','自然垂坠的珠饰','淡灰绿色点缀','少量花朵元素','简洁项链','细金属边','半透明珠光','柔和珍珠光泽','哑光针织面料','轻柔棉布','清透玻璃','磨砂金属','低反光丝绸','透明雨伞','白色草帽','长尾蝴蝶结随风轻摆','配饰数量克制','配饰尺度与人物协调'],
  '场景与环境':['雨后街角','深夜自动贩卖机','安静便利店门口','傍晚海边','海风中的步道','校园草坪','树荫下的小路','安静图书馆','窗边书桌','花房内部','温室走廊','带有植物的阳台','轻雨中的车站','街边小咖啡馆','室内工作台','干净的卧室一角','旧街区的小巷','月光下的屋顶','清晨厨房','节日灯笼下的小院','背景建筑适度概括','远处保留少量灯光','环境细节围绕主体','空间尺度与人物一致'],
  '日常叙事':['买饮料时短暂发呆','冰饮轻贴脸颊','低头数手里的硬币','等待朋友的安静瞬间','随手整理头发','窗边读书','画画时停下观察','边走边看街边小店','刚从雨中走到屋檐下','坐在台阶上休息','轻轻触碰花瓣','与猫安静相处','两人分享一把伞','一起看远处的灯','轻松自然的自拍','被朋友逗笑的瞬间','不刻意摆拍','通过动作表达故事'],
  '天气与季节':['雨后湿润空气','刚停的细雨','透明的雨滴','地面少量积水反光','轻柔海风','春日薄雾','夏日傍晚','秋日凉风','冬日冷空气','柔和阴天','晴天散射光','低密度飘雪','远处朦胧水汽','薄云遮住阳光','轻风带动发梢','天气效果克制','不遮挡人物五官','湿润感集中在环境'],
  '时间与光源':['凌晨街灯','傍晚蓝调时刻','清晨窗光','正午树荫','深夜冷白灯','贩卖机发出的冷白偏粉蓝光','远处少量暖色灯','窗外自然漫射光','桌面柔和台灯','月光侧照','背后的柔和轮廓光','阴天均匀光线','白色霓虹反光','室内外冷暖光交汇','光源方向清楚','场景中可辨认的主光源'],
  '光影控制':['柔和明暗过渡','脸部光影自然','五官不被过曝吞没','冷光照亮脸与手','头发光泽简洁统一','单一主光方向','暗部保留轮廓','阴影色彩统一','减少零碎高光','皮肤通透但不油腻','浅色衣服保留体积','人物与背景光照一致','光影强调大形','反光范围克制','面部明暗与表情协调'],
  '配色组合':['白粉主色加淡灰绿点缀','奶白与雾粉','冷白与浅酒红','灰蓝与灰紫','低饱和粉白灰','粉蓝冷光与少量暖黄','浅灰与淡雾绿','奶油白与雾紫','微雾蓝紫','柔和薄荷绿','清透冷色为主','色彩数量克制','主色与点缀色比例清楚','人物配色与背景协调','阴影偏灰蓝','高光偏冷白','背景饱和度低于主体','避免高饱和碎色点'],
  '干净画面':['干净、平滑、统一','强调大色块叙事','整体轮廓清晰','边缘清晰利落','减少高频纹理','无细碎噪点','无脏污颗粒','无密集小装饰','画面呼吸感强','一目了然','发丝形成整齐大束','表面干净','背景适度留白','简洁统一的明暗块面','避免无意义的细节堆砌','柔和但不糊的边缘'],
  'OC 锚点·粉发':['粉色长发与后部双马尾','灰粉雾感大眼','白粉主色','淡灰绿点缀','蝴蝶结与垂坠珠饰','克制的花朵元素','柔软安静有点发呆','成年体与自然比例','头顶两侧是自然发束而非猫耳','头顶发束更低更柔和','双马尾从后脑扎起','耳侧细辫独立于后部马尾','保留角色基础识别点','不增加无关包包'],
  '三视图与设定集':['横版角色设定集','正面、侧面、背面三视图','同一人物各视角身份一致','各视图头身比例统一','成年人物素体模板','穿着简洁基础内搭','二次元平涂画风','线条清晰流畅','低饱和粉白灰上色','中性自然站姿','无多余装饰','背景干净统一','各视图等比例排列','发型结构在各视角一致','少量必要局部细节','设定图用于后续角色一致性'],
  '头像与表情':['二次元平涂头像','清晰的脸部轮廓','自然微笑','俏皮可爱的神态','眨眼表情','头部与肩颈连贯','少量必要配饰','背景简洁','头像裁切保留发型识别点','表情与眉眼协调','轻柔明亮的面部光线','保持成年人物特征'],
  '参考图·身份保留':['保持原图人物身份','保持脸部五官和表情','保持发色与发型设计','保持服装设计','保持镜头角度与自拍构图','保持手势与动作','保持背景和整体配色','保持原图画风','只修改指定局部','其余区域尽量保持一致','不新增装饰物','不改变人物年龄与气质','保留原图发量与长度','局部修正融入原有明暗'],
  '结构修正·局部':['仅修正头发和外套的连接','梳理肩膀、手臂、衣服的遮挡层级','明确胸前与肩后的发束','修正悬空的马尾根部','补全缺失的一侧马尾','修正耳侧细辫的连接与长度','调整蝴蝶结透视','修正手指数量与握持结构','修正头颈与身体连接','统一包带和头发的前后关系','保留服装设计并修正袖子连接','降低过度飘起的裙摆','移除指定的无关包包','保持人物识别点再修正局部'],
  '负面词·结构':['多余手指','缺失手指','融合手指','畸形手掌','异常手腕','多余肢体','缺失肢体','不合理关节','悬空马尾','发束断裂','头身分离','错误遮挡','衣物穿模','包带断裂','不一致的人物身份','异常身体比例'],
  '负面词·画面':['细碎噪点','高频纹理','脏污颗粒','过度锐化','油腻皮肤','零碎高光','杂乱背景','密集小装饰','五官过曝','过度模糊','无关文字','水印','无关包包','过度飘起的裙摆','不自然广角畸变','配色混乱']
});

const RECIPE_POOL=[
  {name:'韩系清冷',words:['韩式插画','伪厚涂','精致五官','冷白皮','清瘦','狭长眼型','清冷','绒雾面哑光肌','疏离','静谧','柔光','侧逆光','低饱和','灰粉']},
  {name:'乙游华丽',words:['高级cg','乙游人像','绝美长相','骨相立体','瓷白肌肤','鹅蛋脸','桃花眼','优雅','透亮珠光肌理','魅惑','华丽','电影级光影','珠光感','洛可可']},
  {name:'港风胶片',words:['半写实','精致人像','浓颜','暖白皮','鹅蛋脸','杏眼','明艳','真实皮肤纹理','松弛','复古','港风','暖光','胶片感','ccd相机']},
  {name:'国风清冷',words:['国漫插画','半厚涂','面容精致','瓷白肌肤','小巧纤薄脸型','柳叶眼','清冷','柔光缎面肌理','淡然','空灵','中式古典','漫射光','低饱和','灰蓝']},
  {name:'梦核易碎',words:['数字绘画','非写实','瓷娃娃长相','惨白肤色','小窄脸','小鹿眼','易碎感','莹润清透薄釉肌理','迷离','梦幻','梦核','光影弥散','柔焦滤镜','雾蓝']},
  {name:'日漫清透',words:['日漫风','赛璐璐风格','面容姣好','粉白皮','小短脸','圆眼','清爽活力','清透水光肌','灵动','明亮','自然光','淡彩']},
  {name:'暗黑病感',words:['高级cg','半写实','骨相立体','惨白肤色','消瘦','狭长眼型','阴郁','病态','绒雾面哑光肌','厌世','暗黑','明暗对比','哥特风','灰紫']},
  {name:'千禧甜酷',words:['oc渲染','2.5次元','建模脸','粉白皮','小V脸','猫眼','甜酷','千禧辣妹','光滑奶油肌','狡黠','Y2K','霓虹色','粒子光斑']},
  {name:'干净成年体平涂',words:['二次元平涂画风','自然头身比','线条清晰流畅','低饱和粉白灰','整体轮廓清晰','背景适度留白']},
  {name:'深夜冷光日常',words:['自然抓拍视角','贩卖机发出的冷白偏粉蓝光','远处少量暖色灯','灰蓝与灰紫','柔和明暗过渡','通过动作表达故事']},
  {name:'冷白酒红 CG',words:['韩式插画','伪厚涂','冷白与浅酒红','皮肤通透但不油腻','头发光泽简洁统一','画面呼吸感强']},
  {name:'柔软珠光轻甜',words:['白粉主色加淡灰绿点缀','半透明珠光','自然垂坠的珠饰','柔软安静的神态','边缘清晰利落','配饰数量克制']},
  {name:'清透日常头像',words:['二次元平涂头像','清晰的脸部轮廓','俏皮可爱的神态','头部与肩颈连贯','背景简洁','柔和明暗过渡']}
];

function safeRead(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}}
function safeWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
function normalizeBase(v){return v.trim().replace(/\/+$/,'')}
function normalizePath(v,fallback){const x=(v||fallback).trim();return x.startsWith('/')?x:'/'+x}
function setStatus(t,type=''){els.status.textContent=t;els.status.className='status '+type}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function splitPrompt(text){return String(text||'').split(/[，,\n]+/).map(s=>s.trim()).filter(Boolean)}
function uniqueWords(words){return [...new Set(words.map(s=>String(s).trim()).filter(Boolean))]}
function humanBytes(n){if(n<1024)return `${n} B`;if(n<1048576)return `${(n/1024).toFixed(1)} KB`;return `${(n/1048576).toFixed(1)} MB`}
function pushUndo(){const now={prompt:els.prompt.value,negativePrompt:els.negativePrompt.value},last=PROMPT_UNDO[PROMPT_UNDO.length-1];if(JSON.stringify(now)!==JSON.stringify(last)){PROMPT_UNDO.push(now);if(PROMPT_UNDO.length>30)PROMPT_UNDO.shift()}}
function rememberTerm(term){const recent=safeRead(RECENT_KEY,[]);safeWrite(RECENT_KEY,[term,...recent.filter(x=>x!==term)].slice(0,36))}
function appendTerms(terms,{remember=true,label=''}={}){const add=uniqueWords(Array.isArray(terms)?terms:[terms]);if(!add.length)return;pushUndo();const seen=new Set(splitPrompt(els.prompt.value)),fresh=add.filter(x=>!seen.has(x)),current=els.prompt.value.trimEnd();els.prompt.value=current+(current&&fresh.length?'，':'')+fresh.join('，');if(remember)fresh.forEach(rememberTerm);if(label)els.recipeHint.textContent=label+(fresh.length?` · 新加 ${fresh.length} 条`:' · 这些词已经在提示词里了');if(!els.libraryDialog.open)els.prompt.focus();saveDraft();renderLibrary()}
function dedupePrompt(){pushUndo();const before=splitPrompt(els.prompt.value),after=uniqueWords(before);els.prompt.value=after.join('，');els.recipeHint.textContent=before.length===after.length?'没有重复词，清清白白。':`去掉了 ${before.length-after.length} 个重复词。`;saveDraft();renderLibrary()}
function clearPrompt(){if(!els.prompt.value.trim())return;pushUndo();els.prompt.value='';els.recipeHint.textContent='提示词已清空。';saveDraft();renderLibrary()}
function undoPrompt(){if(!PROMPT_UNDO.length){els.recipeHint.textContent='没有可以撤销的操作。';return}const old=PROMPT_UNDO.pop();els.prompt.value=old.prompt;els.negativePrompt.value=old.negativePrompt;els.recipeHint.textContent='撤回了一步。';saveDraft();renderLibrary()}
function applyRecipe(){const recipe=RECIPE_POOL[Math.floor(Math.random()*RECIPE_POOL.length)];appendTerms(['成年女性','自然体态',...recipe.words],{label:`已套用「${recipe.name}」`});return recipe}
function addRandomWords(){const cats=Object.keys(PROMPT_LIBRARY).filter(cat=>!cat.startsWith('负面词')),picked=[];while(picked.length<6){const cat=cats[Math.floor(Math.random()*cats.length)],arr=PROMPT_LIBRARY[cat],word=arr[Math.floor(Math.random()*arr.length)];if(!picked.includes(word))picked.push(word)}appendTerms(picked,{label:'随便塞了 6 条'})}

function getFavorites(){return safeRead(FAVORITES_KEY,[])}
function toggleFavorite(term){const f=getFavorites(),next=f.includes(term)?f.filter(x=>x!==term):[term,...f];safeWrite(FAVORITES_KEY,next.slice(0,120));renderLibrary()}
function categoryOf(term){for(const [cat,words] of Object.entries(PROMPT_LIBRARY))if(words.includes(term))return cat;return '其他'}
function isNegativeTerm(term){return Object.entries(PROMPT_LIBRARY).some(([cat,words])=>cat.startsWith('负面词')&&words.includes(term));}
function appendLibraryTerms(terms,options={}){const positive=terms.filter(t=>!isNegativeTerm(t)),negative=terms.filter(isNegativeTerm);if(positive.length)appendTerms(positive,options);if(negative.length){pushUndo();els.negativePrompt.value=uniqueWords([...splitPrompt(els.negativePrompt.value),...negative]).join('，');negative.forEach(rememberTerm);saveDraft();renderLibrary();els.recipeHint.textContent=`已加入 ${negative.length} 条负面词`;}}
function buildChip(term){const fav=getFavorites().includes(term),wrap=document.createElement('span');wrap.className='library-chip-wrap';const add=document.createElement('button');add.type='button';add.className='library-chip';add.textContent=term;const chosen=splitPrompt(isNegativeTerm(term)?els.negativePrompt.value:els.prompt.value).includes(term);add.classList.toggle('chosen',chosen);add.setAttribute('aria-pressed',String(chosen));add.title=isNegativeTerm(term)?'加入负面词':'加入提示词';add.addEventListener('click',()=>appendLibraryTerms([term],{label:`已加入「${term}」`}));const star=document.createElement('button');star.type='button';star.className='chip-star'+(fav?' active':'');star.textContent=fav?'★':'☆';star.setAttribute('aria-label',(fav?'取消收藏':'收藏')+' '+term);star.addEventListener('click',()=>toggleFavorite(term));wrap.append(add,star);return wrap}
function renderFlat(words,title){if(!words.length){els.libraryGroups.innerHTML='<div class="library-empty">这里还是空的。</div>';return}const section=document.createElement('section');section.className='library-flat';const h=document.createElement('div');h.className='library-flat-title';h.textContent=title;const chips=document.createElement('div');chips.className='library-chips';words.forEach(w=>chips.appendChild(buildChip(w)));section.append(h,chips);els.libraryGroups.appendChild(section)}
function renderLibrary(){if(!els.libraryGroups)return;$('librarySelection').textContent=`提示词 ${uniqueWords(splitPrompt(els.prompt.value)).length} 条 · 负面词 ${uniqueWords(splitPrompt(els.negativePrompt.value)).length} 条`; const q=(els.librarySearch?.value||'').trim().toLowerCase(),expanded=new Set([...els.libraryGroups.querySelectorAll('details[open]')].map(d=>d.dataset.category));els.libraryGroups.innerHTML='';if(libraryMode==='favorites'){renderFlat(getFavorites().filter(w=>!q||w.toLowerCase().includes(q)||categoryOf(w).toLowerCase().includes(q)),'★ 收藏');return}if(libraryMode==='recent'){renderFlat(safeRead(RECENT_KEY,[]).filter(w=>!q||w.toLowerCase().includes(q)||categoryOf(w).toLowerCase().includes(q)),'最近用过');return}for(const [cat,words] of Object.entries(PROMPT_LIBRARY)){const filtered=words.filter(w=>!q||w.toLowerCase().includes(q)||cat.toLowerCase().includes(q));if(!filtered.length)continue;const details=document.createElement('details');details.className='library-group';details.dataset.category=cat;details.open=!!q||expanded.has(cat)||(!expanded.size&&els.libraryGroups.children.length===0);const summary=document.createElement('summary');summary.innerHTML=`<span>${escapeHtml(cat)}</span><small>${filtered.length}</small>`;const body=document.createElement('div');body.className='library-group-body';const actions=document.createElement('div');actions.className='library-category-actions';const addAll=document.createElement('button');addAll.type='button';addAll.className='ghost-btn';addAll.textContent='整类加入';addAll.addEventListener('click',()=>appendLibraryTerms(filtered,{label:`已加入「${cat}」整类`}));actions.appendChild(addAll);const chips=document.createElement('div');chips.className='library-chips';filtered.forEach(w=>chips.appendChild(buildChip(w)));body.append(actions,chips);details.append(summary,body);els.libraryGroups.appendChild(details)}if(!els.libraryGroups.children.length)els.libraryGroups.innerHTML='<div class="library-empty">没搜到。</div>'}
function openLibrary(){renderLibrary();els.libraryDialog.showModal();if(matchMedia('(pointer:fine)').matches)els.librarySearch?.focus()}

function setReference(file){if(!file)return;if(!String(file.type||'').startsWith('image/')){setStatus('这不是图片文件。','bad');return}if(file.size>25*1024*1024){setStatus('参考图超过 25MB，先压缩一下。','bad');return}if(referenceObjectUrl)URL.revokeObjectURL(referenceObjectUrl);referenceFile=file;referenceObjectUrl=URL.createObjectURL(file);els.referenceImage.src=referenceObjectUrl;els.referenceName.textContent=file.name||'粘贴的图片';els.referenceInfo.textContent=`${file.type||'image'} · ${humanBytes(file.size)}`;els.referenceDrop.hidden=true;els.referencePreview.hidden=false;els.clearReferenceBtn.hidden=false;els.referenceBox.classList.add('has-reference');els.referenceModeHint.textContent='已启用 · 生成时自动走参考图接口';els.generateBtn.textContent='参考图生成';setStatus('参考图已载入。','ok')}
function clearReference(){referenceFile=null;if(referenceObjectUrl){URL.revokeObjectURL(referenceObjectUrl);referenceObjectUrl=''}els.referenceInput.value='';els.referenceImage.removeAttribute('src');els.referenceDrop.hidden=false;els.referencePreview.hidden=true;els.clearReferenceBtn.hidden=true;els.referenceBox.classList.remove('has-reference','dragover');els.referenceModeHint.textContent='可选 · 上传后自动切换参考图生成';els.generateBtn.textContent='生成图片'}

function initQualityOptions(){
  const old=els.quality?.value||'auto';
  if(!els.quality)return;
  const options=[['auto','自动（推荐）'],['low','Low'],['medium','Medium'],['standard','Standard'],['high','High'],['hd','HD']];
  els.quality.innerHTML=options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
  els.quality.value=options.some(([v])=>v===old)?old:'auto';
}
function selectedQuality(){const q=els.quality?.value||'auto';return q==='auto'?'':q}
function isLowMediumQualityError(text){const s=String(text||'').toLowerCase();return s.includes('quality')&&s.includes('low')&&s.includes('medium')}

const CONFIG_ENDPOINT='https://ibpffxzdjvgydnhmvmvc.supabase.co/functions/v1/api-settings';
const API_BRIDGE_ENDPOINT='https://ibpffxzdjvgydnhmvmvc.supabase.co/functions/v1/image-lab-api';
function usesApiBridge(base){try{const u=new URL(base);return u.protocol==='https:'&&u.hostname==='gensoukyou.xyz'&&!u.port&&u.pathname.replace(/\/+$/,'')==='/v1';}catch{return false;}}
async function bridgeRequest({base,key,path,method='POST',payload={},file=null,referenceField='openai',referenceFormat='url'},signal){
  const token=localStorage.getItem('privateSitesSession')||'';if(!token)throw new Error('登录已过期，请刷新页面');
  let body,headers={'x-site-access':token};
  if(file){body=new FormData();for(const [name,value] of Object.entries({base,key,path,method,referenceField,referenceFormat,payload:JSON.stringify(payload)}))body.append(name,value);body.append('reference',file,file.name||'reference.png');}
  else{headers['Content-Type']='application/json';body=JSON.stringify({base,key,path,method,payload});}
  return fetch(API_BRIDGE_ENDPOINT,{method:'POST',headers,body,signal});
}
function shouldBridge(base,mode=$('connectionMode').value){return mode==='proxy'||(mode!=='direct'&&usesApiBridge(base));}
function requestModels(base,key,signal,mode=$('connectionMode').value){return shouldBridge(base,mode)?bridgeRequest({base,key,path:'/models',method:'GET'},signal):fetch(base+'/models',{headers:{Authorization:`Bearer ${key}`},signal});}

function draftValues(){return Object.fromEntries(DRAFT_FIELDS.map(id=>[id,els[id].value]));}
function updatePromptCount(){$('promptCount').textContent=`${els.prompt.value.length} 字`;}
function saveDraft(){clearTimeout(draftTimer);const ok=safeWrite(DRAFT_KEY,{...draftValues(),updatedAt:Date.now()});$('draftStatus').textContent=ok?'草稿已保存':'草稿暂时存不下，请复制备份';updatePromptCount();}
function restoreDraft(){const d=safeRead(DRAFT_KEY,{});for(const id of DRAFT_FIELDS){if(d[id]!==undefined){const field=els[id];if(field.tagName!=='SELECT'||[...field.options].some(o=>o.value===d[id]))field.value=d[id];}}updatePromptCount();if(d.updatedAt)$('draftStatus').textContent='已恢复上次草稿';}
function switchView(view){document.querySelector('.workspace').dataset.view=view;$('workspaceTabs').querySelectorAll('button').forEach(b=>{const chosen=b.dataset.view===view;b.classList.toggle('active',chosen);b.setAttribute('aria-pressed',String(chosen));});}

let dbPromise;
function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error('当前浏览器不能保存大图'));return;}
    const request=indexedDB.open('ling-image-lab-v2',1);
    const timer=setTimeout(()=>reject(new Error('图片存储暂时不可用')),5000);
    request.onupgradeneeded=()=>request.result.createObjectStore('workspace');
    request.onsuccess=()=>{clearTimeout(timer);resolve(request.result);};
    request.onerror=()=>{clearTimeout(timer);reject(request.error);};
    request.onblocked=()=>{clearTimeout(timer);reject(new Error('关闭其他跑图台页面后再试'));};
  });
  return dbPromise;
}
async function dbGet(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('workspace','readonly'),r=tx.objectStore('workspace').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function dbPut(key,value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('保存中断'));});}
function queueStorage(task){const next=storageQueue.catch(()=>{}).then(task);storageQueue=next;return next;}
function rememberReference(file){queueStorage(()=>dbPut('reference',file?{file,name:file.name,type:file.type}:null)).catch(()=>{$('draftStatus').textContent='提示词已保存；参考图需重新上传';});}
const referenceView=setReference,referenceClearView=clearReference;
setReference=function(file){referenceView(file);if(referenceFile===file){referenceRevision++;rememberReference(file);}};
clearReference=function(){referenceRevision++;referenceClearView();rememberReference(null);};

function getHistory(){return historyItems;}
async function persistHistory(){
  const snapshot=historyItems.slice(0,30);
  try{await queueStorage(()=>dbPut('history',snapshot));localStorage.removeItem(HISTORY_KEY);$('galleryNotice').textContent='图片与生成参数已保存到这台设备 · 最多保留最近 30 张';return true;}
  catch{
    if(safeWrite(HISTORY_KEY,snapshot)){$('galleryNotice').textContent='历史已保存在本机';return true;}
    $('galleryNotice').textContent='本机存储空间不足，本次图片暂时只在页面里。请先保存图片再刷新。';return false;
  }
}
async function loadWorkspace(){
  const legacy=safeRead(HISTORY_KEY,[]),referenceAtStart=referenceRevision;
  historyItems=Array.isArray(legacy)?legacy:[];
  try{const stored=await dbGet('history');if(Array.isArray(stored))historyItems=stored;if(!stored&&historyItems.length)await persistHistory();const ref=await dbGet('reference');if(ref?.file&&referenceRevision===referenceAtStart){const file=new File([ref.file],ref.name||'reference.png',{type:ref.type||ref.file.type});referenceView(file);}}
  catch{$('galleryNotice').textContent='当前浏览器无法保存大图；空间不足时请先下载图片。';}
  historyItems=historyItems.filter(item=>safeImageSource(item.src)).slice(0,30);
  historyLoaded=true;renderHistory();
}

function validateConnection(){
  const base=normalizeBase(els.apiBase.value),key=els.apiKey.value.trim();
  if(!base||!key)throw new Error('先填写 API 地址和 Key');
  let url;try{url=new URL(base);}catch{throw new Error('API 地址格式不对');}
  if(url.protocol!=='https:')throw new Error('API 地址请使用 https');
  if(url.username||url.password||url.search||url.hash)throw new Error('API 地址不要包含账号、参数或 #');
  return {base,key};
}
function selectedModel(){return els.model.value||els.model.dataset.saved||'';}
function chooseModel(value){if(!value)return;if(![...els.model.options].some(o=>o.value===value))els.model.add(new Option(value,value));els.model.value=value;els.model.dataset.saved=value;$('manualModel').value=value;}
function connectionValues(){return {apiBase:normalizeBase(els.apiBase.value),apiKey:els.apiKey.value.trim(),imagePath:normalizePath(els.imagePath.value,'/images/generations'),editPath:normalizePath(els.editPath.value,'/images/edits'),model:selectedModel(),quality:els.quality.value||'auto',referenceFormat:$('referenceFormat').value,referenceField:$('referenceField').value,connectionMode:$('connectionMode').value,writerSameApi:$('writerSameApi').checked,writerBase:normalizeBase($('writerBase').value),writerKey:$('writerKey').value.trim(),writerModel:$('writerModel').value.trim(),writerPath:normalizePath($('writerPath').value,'/chat/completions')};}
function settingsValues(){return {...connectionValues(),schemes:apiSchemes.map(s=>({...s})),activeScheme,schemeName:$('schemeName').value.trim()};}
function writeLocalSettings(){if(!safeWrite(STORAGE_KEY,settingsValues()))throw new Error('本机设置存不下，请保留 API 配置');}
function renderSchemes(){const select=$('schemeSelect');select.replaceChildren(new Option(activeScheme?'选择方案':'新方案（待保存）',''),...apiSchemes.map(s=>new Option(s.name,s.id)));select.value=activeScheme;$('deleteSchemeBtn').disabled=configSaving||!activeScheme;}
function updateWriterConnection(){const same=$('writerSameApi').checked;$('writerConnectionFields').hidden=same;for(const id of ['writerBase','writerKey'])$(id).disabled=same;const model=$('writerModel').value.trim();$('writerConnectionHint').textContent=model?`写词模型：${model} · ${same?'共用生图接口':'独立接口'}`:'先在 API 方案中选择文字模型';}
function applySettings(s,{collection=true}={}){
  els.apiBase.value=s.apiBase||'';els.apiKey.value=s.apiKey||'';els.imagePath.value=s.imagePath||'/images/generations';els.editPath.value=s.editPath||'/images/edits';
  els.model.replaceChildren(new Option('先连接 API',''));els.model.dataset.saved='';$('manualModel').value='';if(s.model)chooseModel(s.model);
  $('referenceFormat').value=['auto','json','multipart','url'].includes(s.referenceFormat)?s.referenceFormat:'auto';$('referenceField').value=normalizeReferenceField(s.referenceField);$('connectionMode').value=['auto','direct','proxy'].includes(s.connectionMode)?s.connectionMode:'auto';
  if(s.quality&&[...els.quality.options].some(o=>o.value===s.quality))els.quality.value=s.quality;
  $('writerSameApi').checked=s.writerSameApi!==false;for(const id of ['writerBase','writerKey','writerModel'])$(id).value=s[id]||'';$('writerPath').value=s.writerPath||'/chat/completions';$('writerModels').replaceChildren();
  if(collection){
    apiSchemes=Array.isArray(s.schemes)?s.schemes.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string').slice(0,20).map(x=>({...x})):[];
    if(!Array.isArray(s.schemes)&&s.apiBase&&s.apiKey)apiSchemes=[{...connectionValues(),id:'legacy',name:'原有方案'}];
    activeScheme=apiSchemes.some(x=>x.id===s.activeScheme)?s.activeScheme:(!Array.isArray(s.schemes)&&apiSchemes.length?apiSchemes[0].id:'');
  }
  $('schemeName').value=s.schemeName||apiSchemes.find(x=>x.id===activeScheme)?.name||'常用方案';renderSchemes();updateWriterConnection();
}
function loadSettings(){applySettings(safeRead(STORAGE_KEY,{}));if(els.apiBase.value&&els.apiKey.value)setStatus('API 设置已恢复，可直接生成','ok');}
function setConfigStatus(text,type=''){$('configStatus').textContent=text;$('configStatus').className='status '+type;}
function flatToCloud(s){return {base:s.apiBase,key:s.apiKey,model:s.model,imagePath:s.imagePath,editPath:s.editPath,quality:s.quality,referenceFormat:s.referenceFormat,referenceField:s.referenceField,connectionMode:s.connectionMode,writerSameApi:s.writerSameApi!==false,writerBase:s.writerBase,writerKey:s.writerKey,writerModel:s.writerModel,writerPath:s.writerPath};}
function toCloud(s){return {...flatToCloud(s),activeScheme:s.activeScheme,schemeName:s.schemeName,schemes:(s.schemes||[]).map(x=>({...flatToCloud(x),id:x.id,name:x.name}))};}
function flatFromCloud(c){return {apiBase:c.base||'',apiKey:c.key||'',model:c.model||'',imagePath:c.imagePath,editPath:c.editPath,quality:c.quality,referenceFormat:c.referenceFormat,referenceField:c.referenceField,connectionMode:c.connectionMode,writerSameApi:c.writerSameApi!==false,writerBase:c.writerBase,writerKey:c.writerKey,writerModel:c.writerModel,writerPath:c.writerPath};}
function fromCloud(c){return {...flatFromCloud(c),activeScheme:c.activeScheme,schemeName:c.schemeName,...(Array.isArray(c.schemes)?{schemes:c.schemes.map(x=>({...flatFromCloud(x),id:x.id,name:x.name}))}:{})};}
function newApiScheme(){if(configSaving)return;if(apiSchemes.length>=20){setConfigStatus('最多保存 20 个方案，先删除一个再新增。','bad');return;}activeScheme='';$('schemeName').value=`方案 ${apiSchemes.length+1}`;settingsDirty=true;renderSchemes();setConfigStatus('填写新名称后点保存，会保留原来的方案。');$('schemeName').focus();}
function switchApiScheme(id){if(configSaving){renderSchemes();return;}const target=apiSchemes.find(x=>x.id===id);if(!target){renderSchemes();return;}if(settingsDirty&&!confirm('当前修改还没同步。切换到已保存的方案？')){renderSchemes();return;}activeScheme=id;applySettings({...target,schemeName:target.name},{collection:false});settingsDirty=true;try{writeLocalSettings();setConfigStatus(`已切换到「${target.name}」，点保存同步当前选择。`,'ok');setStatus(`已使用「${target.name}」`,'ok');}catch(e){setConfigStatus(e.message,'bad');}}
function setConfigBusy(busy){configSaving=busy;els.saveSettingsBtn.disabled=busy;$('newSchemeBtn').disabled=busy;$('schemeSelect').disabled=busy;$('deleteSchemeBtn').disabled=busy||!activeScheme;$('restoreSettingsBtn').disabled=busy;}
async function syncConfig(snapshot){if(cloudVersion===null){const d=await configCall('load');cloudVersion=d.version;if(d.found)throw new Error('云端已有方案，请先读取，避免覆盖另一台设备的设置。');}const d=await configCall('save',{version:cloudVersion,config:toCloud(snapshot)});cloudVersion=d.version;if(JSON.stringify(settingsValues())===JSON.stringify(snapshot))settingsDirty=false;return d;}
async function deleteApiScheme(){if(configSaving||!activeScheme)return;const current=apiSchemes.find(x=>x.id===activeScheme);if(!confirm(`删除「${current?.name||'当前方案'}」？`))return;setConfigBusy(true);try{apiSchemes=apiSchemes.filter(x=>x.id!==activeScheme);activeScheme=apiSchemes[0]?.id||'';applySettings(apiSchemes[0]?{...apiSchemes[0],schemeName:apiSchemes[0].name}:{},{collection:false});settingsDirty=true;writeLocalSettings();await syncConfig(settingsValues());setConfigStatus('方案已删除并同步。','ok');}catch(e){setConfigStatus(e.message+'（本机删除已保留）','bad');}finally{setConfigBusy(false);}}
async function configCall(action,extra={}){
  const token=localStorage.getItem('privateSitesSession')||'';
  if(!token)throw new Error('请刷新页面并重新登录');
  const r=await fetch(CONFIG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-site-access':token},body:JSON.stringify({profile:'image-lab',action,...extra}),signal:AbortSignal.timeout(15000)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(r.status===409?'另一台设备已经改过配置。先读取云端，再决定要改哪些。':r.status===401?'登录已过期，请刷新重新登录':'云端暂时没连上，本机设置还在');e.status=r.status;throw e;}
  return data;
}
async function restoreCloudSettings({manual=false}={}){
  const dirtyAtStart=settingsDirty,localAtStart=JSON.stringify(settingsValues());
  setConfigStatus('正在读取云端配置…');
  try{
    const d=await configCall('load');cloudVersion=d.version;
    if(d.found){
      if(!manual&&(dirtyAtStart||settingsDirty||JSON.stringify(settingsValues())!==localAtStart)){setConfigStatus('云端已有配置，你正在编辑的内容已保留。可点读取云端。');return;}
      applySettings(fromCloud(d.config||{}));writeLocalSettings();settingsDirty=false;setConfigStatus('API 配置已从云端恢复 ✓','ok');
    }else{
      const s=settingsValues();
      if(!settingsDirty&&s.apiBase&&s.apiKey){const saved=await configCall('save',{version:cloudVersion,config:toCloud(s)});cloudVersion=saved.version;setConfigStatus('原有 API 配置已迁入云端 ✓','ok');}
      else setConfigStatus('填好后点保存，其他设备登录后自动读取。');
    }
    if(els.apiBase.value&&els.apiKey.value)fetchModels().catch(e=>{setStatus('模型列表暂时未读到；已保存的模型仍可用','bad');});
  }catch(e){setConfigStatus(e.message,'bad');}
}
async function saveSettings(){
  if(configSaving)return;setConfigBusy(true);
  try{
    validateConnection();const manual=$('manualModel').value.trim();if(manual)chooseModel(manual);
    if(!$('writerSameApi').checked&&($('writerBase').value.trim()||$('writerKey').value.trim()))validateWriterConnection({requireModel:false});
    const name=$('schemeName').value.trim().slice(0,80);if(!name)throw new Error('给方案起个名字再保存');
    if(apiSchemes.some(s=>s.name===name&&s.id!==activeScheme))throw new Error('这个名称已经用了，换个名称或选择已有方案');
    if(!activeScheme&&apiSchemes.length>=20)throw new Error('最多保存 20 个方案');
    activeScheme=activeScheme||crypto.randomUUID();const scheme={...connectionValues(),id:activeScheme,name};
    apiSchemes=apiSchemes.filter(s=>s.id!==activeScheme);apiSchemes.push(scheme);renderSchemes();settingsDirty=true;writeLocalSettings();
    const snapshot=settingsValues();setConfigStatus('方案已保存在本机，正在同步云端…');await syncConfig(snapshot);
    setConfigStatus(settingsDirty?'方案已同步；刚才的新修改还需要保存。':'API 方案已加密同步 ✓','ok');setStatus(`「${name}」已保存`,'ok');if(!settingsDirty)els.settingsDialog.close();
  }catch(e){setConfigStatus(e.message+'（本机设置保留）','bad');setStatus(e.message,'bad');}
  finally{setConfigBusy(false);}
}
async function fetchModels(){
  const {base,key}=validateConnection(),snapshot=base+'\n'+key;
  els.testBtn.disabled=true;els.testBtn.textContent='连接中…';
  try{
    const r=await requestModels(base,key,AbortSignal.timeout(20000));
    if(!r.ok)throw new Error(`模型列表请求失败：HTTP ${r.status}`);
    const data=await r.json(),list=Array.isArray(data.data)?data.data:Array.isArray(data.models)?data.models:Array.isArray(data)?data:[];
    const ids=uniqueWords(list.map(x=>typeof x==='string'?x:x?.id||x?.name).filter(Boolean));
    if(!ids.length)throw new Error('接口连上了，但没有返回模型列表；可以手填模型名');
    if(normalizeBase(els.apiBase.value)+'\n'+els.apiKey.value.trim()!==snapshot)return ids;
    const saved=selectedModel()||$('manualModel').value.trim();
    els.model.replaceChildren(...ids.map(id=>new Option(id,id)));if(saved)chooseModel(saved);else chooseModel(ids[0]);
    setStatus(`连接成功 · ${ids.length} 个模型`,'ok');setConfigStatus(`拉到 ${ids.length} 个模型。选好模型后点保存。`,'ok');return ids;
  }catch(e){setConfigStatus(e.name==='TimeoutError'?'拉取模型超时，可手动填写模型名':e.message,'bad');throw e;}
  finally{els.testBtn.disabled=false;els.testBtn.textContent='测试并拉取模型';}
}
const PROMPT_WRITER_SYSTEM=`你是一位懂构图和人物结构的插画提示词助手。把用户的白话描述整理成可直接用于生图的提示词，不要生成图片。
准确保留用户明确给出的身份、发型、颜色、服装、动作、左右方位、场景与画风；修正互相矛盾的构图措辞，说明合理的连接和遮挡关系。参考图修改任务只强调要修改的部位，保留其他识别点，不凭空编造看不到的参考图细节。
按主体、动作、构图、环境、光线、色彩、画风的自然顺序组织，减少同义堆词和无效画质口号。没有特别要求时，偏好干净、平滑、统一的大色块、清晰轮廓、自然体态；人物默认成年，不擅自添加暴露服装、挑逗镜头或密集装饰。已有明确设定优先于这些默认偏好。
结合现有提示词时，以用户这次的要求为准，保留不冲突的内容。负面词只针对实际容易出错的结构和画面问题，保持简短。遵守用户选择的语言和详细程度。
只返回 JSON 对象，格式为 {"prompt":"完整提示词","negative_prompt":"负面词"}，不要附解释或 Markdown。`;
function writerStatus(text,type=''){$('writerStatus').textContent=text;$('writerStatus').className='status '+type;}
function writerDraft(){return {brief:$('writerBrief').value,language:$('writerLanguage').value,detail:$('writerDetail').value,useCurrent:$('writerUseCurrent').checked,prompt:$('writerPromptResult').value,negative:$('writerNegativeResult').value};}
function saveWriterDraft(){safeWrite(WRITER_DRAFT_KEY,writerDraft());}
function restoreWriterDraft(){const d=safeRead(WRITER_DRAFT_KEY,{});$('writerBrief').value=String(d.brief||'').slice(0,8000);$('writerLanguage').value=d.language==='en'?'en':'zh';$('writerDetail').value=['balanced','concise','detailed'].includes(d.detail)?d.detail:'balanced';$('writerUseCurrent').checked=d.useCurrent!==false;$('writerPromptResult').value=String(d.prompt||'').slice(0,16000);$('writerNegativeResult').value=String(d.negative||'').slice(0,6000);$('writerResult').hidden=!$('writerPromptResult').value.trim();}
function openWriter(){if(els.libraryDialog.open)els.libraryDialog.close();updateWriterConnection();$('writerDialog').showModal();if(matchMedia('(pointer:fine)').matches)$('writerBrief').focus();}
function validateWriterConnection({requireModel=true}={}){
  const same=$('writerSameApi').checked,base=normalizeBase((same?els.apiBase:$('writerBase')).value),key=(same?els.apiKey:$('writerKey')).value.trim(),model=$('writerModel').value.trim();
  if(!base||!key)throw new Error('先在 API 方案里填写写词接口的地址和 Key');
  let url;try{url=new URL(base);}catch{throw new Error('写词 API 地址格式不对');}if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('写词 API 地址请使用不带参数的 https 地址');
  if(requireModel&&!model)throw new Error('先在 API 方案里选择一个文字模型');
  return {base,key,model,connectionMode:$('connectionMode').value,path:normalizePath($('writerPath').value,'/chat/completions')};
}
async function fetchWriterModels(){
  const button=$('writerModelsBtn');button.disabled=true;button.textContent='拉取中…';
  try{const request=validateWriterConnection({requireModel:false}),r=await requestModels(request.base,request.key,AbortSignal.timeout(20000));if(!r.ok)throw new Error(`模型列表请求失败：HTTP ${r.status}`);const data=await r.json(),list=Array.isArray(data.data)?data.data:Array.isArray(data.models)?data.models:[],ids=uniqueWords(list.map(x=>typeof x==='string'?x:x?.id||x?.name).filter(Boolean));if(!ids.length)throw new Error('没有返回模型列表，可以手填文字模型名');const current=validateWriterConnection({requireModel:false});if(current.base!==request.base||current.key!==request.key)return;$('writerModels').replaceChildren(...ids.map(id=>new Option(id,id)));setConfigStatus(`已拉取 ${ids.length} 个模型，在文字模型框输入或选择支持聊天的模型。`,'ok');}
  catch(e){setConfigStatus(e.message,'bad');}finally{button.disabled=false;button.textContent='拉取写词模型';}
}
function parseWriterOutput(data){
  const content=data?.choices?.[0]?.message?.content;
  const text=(typeof content==='string'?content:Array.isArray(content)?content.map(p=>typeof p==='string'?p:p?.text||'').join('\n'):'').trim();
  if(!text)throw new Error('模型没有返回提示词，请确认选的是文字模型');
  const raw=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();let parsed;
  try{parsed=JSON.parse(raw);}catch{const match=raw.match(/\{[\s\S]*\}/);if(match)try{parsed=JSON.parse(match[0]);}catch{}}
  if(parsed){if(typeof parsed.prompt!=='string'||!parsed.prompt.trim())throw new Error('模型返回的提示词结构不完整，请重新整理');return {prompt:parsed.prompt.trim().slice(0,16000),negative:typeof parsed.negative_prompt==='string'?parsed.negative_prompt.trim().slice(0,6000):''};}
  if(/^[{[]/.test(raw))throw new Error('模型返回的 JSON 不完整，请重新整理');
  return {prompt:raw.slice(0,16000),negative:''};
}
function parseWriterResponse(raw){try{return JSON.parse(raw);}catch{}let content='';for(const line of raw.split(/\r?\n/)){if(!line.startsWith('data:'))continue;const payload=line.slice(5).trim();if(!payload||payload==='[DONE]')continue;try{const part=JSON.parse(payload);if(part.error)return part;content+=part.choices?.[0]?.delta?.content||part.choices?.[0]?.message?.content||'';}catch{}}return {choices:[{message:{content}}]};}
async function generateWriterPrompt(){
  if(writerRun)return;let request;
  try{request=validateWriterConnection();const brief=$('writerBrief').value.trim();if(!brief)throw new Error('先说说你想画什么');if(brief.length>8000)throw new Error('描述超过 8000 字，先精简一下');request.brief=brief;request.language=$('writerLanguage').value;request.detail=$('writerDetail').value;request.context=$('writerUseCurrent').checked?{prompt:els.prompt.value.slice(0,12000),negativePrompt:els.negativePrompt.value.slice(0,6000)}:null;}
  catch(e){writerStatus(e.message,'bad');return;}
  saveWriterDraft();const run={controller:new AbortController(),started:Date.now(),revision:writerInputRevision,stopped:false,timedOut:false};writerRun=run;
  $('writerGenerateBtn').disabled=true;$('writerGenerateBtn').textContent='正在整理…';$('writerStopBtn').hidden=false;$('writerResult').hidden=true;
  const progress=()=>writerStatus(`正在整理画面 · ${Math.floor((Date.now()-run.started)/1000)} 秒`);progress();run.interval=setInterval(progress,1000);run.timeout=setTimeout(()=>{run.timedOut=true;run.controller.abort();},90000);
  try{
    const user={画面描述:request.brief,输出语言:request.language==='en'?'英文':'中文',详细程度:({balanced:'适中，抓住主要画面',concise:'简短，少堆词',detailed:'详细，细化构图和结构'})[request.detail],现有提示词:request.context,参考图状态:referenceFile?'已上传；本次写词请求不包含图像，不推断图中细节':'无参考图'};
    const payload={model:request.model,stream:shouldBridge(request.base,request.connectionMode),messages:[{role:'system',content:PROMPT_WRITER_SYSTEM},{role:'user',content:JSON.stringify(user)}]};
    const r=await (shouldBridge(request.base,request.connectionMode)?bridgeRequest({...request,payload},run.controller.signal):fetch(request.base+request.path,{method:'POST',headers:{Authorization:`Bearer ${request.key}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:run.controller.signal}));
    const raw=await r.text(),data=parseWriterResponse(raw);
    if(!r.ok||data.error){const detail=String(data?.error?.message||data?.message||`HTTP ${r.status}`).replaceAll(request.key,'[Key]').slice(0,240);throw new Error(r.status===429?'写词接口繁忙或额度不足，稍后再试':r.status===401?'写词 Key 未通过验证，请检查 API 方案':detail);}
    if(run.stopped||run.controller.signal.aborted)throw new DOMException('Stopped','AbortError');
    const result=parseWriterOutput(data);$('writerPromptResult').value=result.prompt;$('writerNegativeResult').value=result.negative;$('writerResult').hidden=false;saveWriterDraft();clearInterval(run.interval);writerStatus(run.revision===writerInputRevision?'整理好了，可以修改后填入编辑器。':'已按提交时的描述整理；你刚修改了描述，可以再生成一版。','ok');
  }catch(e){$('writerResult').hidden=!$('writerPromptResult').value.trim();writerStatus(run.stopped?'已停止整理':run.timedOut?'整理超过 90 秒，稍后再试':e.name==='TypeError'?'写词接口未连通，请检查网络和跨域支持':e.message||'整理失败','bad');}
  finally{clearInterval(run.interval);clearTimeout(run.timeout);writerRun=null;$('writerGenerateBtn').disabled=false;$('writerGenerateBtn').textContent='整理成提示词';$('writerStopBtn').hidden=true;}
}
function stopWriter(){if(writerRun){writerRun.stopped=true;writerRun.controller.abort();}}
function applyWriterPrompt({append=false}={}){if(writerRun)return;const prompt=$('writerPromptResult').value.trim(),negative=$('writerNegativeResult').value.trim();if(!prompt){writerStatus('还没有可用的提示词','bad');return;}pushUndo();els.prompt.value=append?[els.prompt.value.trim(),prompt].filter(Boolean).join('\n\n'):prompt;els.negativePrompt.value=append?uniqueWords([...splitPrompt(els.negativePrompt.value),...splitPrompt(negative)]).join('，'):negative;saveDraft();renderLibrary();switchView('editor');$('writerDialog').close();setStatus(append?'AI 提示词已追加，可以撤销':'AI 提示词已填入，可以修改或撤销','ok');}
async function copyWriterPrompt(){try{const prompt=$('writerPromptResult').value.trim(),negative=$('writerNegativeResult').value.trim();if(!prompt)throw new Error('还没有可复制的提示词');await navigator.clipboard.writeText(prompt+(negative?'\n\nNegative prompt: '+negative:''));writerStatus('提示词已复制','ok');}catch(e){writerStatus(e.message||'复制未成功，可以长按结果复制','bad');}}
function composedPrompt(draft=draftValues()){
  const prompt=draft.prompt.trim();if(!prompt)throw new Error('先写一点提示词');const negative=draft.negativePrompt.trim();return negative?`${prompt}\n\nNegative prompt: ${negative}`:prompt;
}
function snapshotRequest(){
  const {base,key}=validateConnection(),draft=draftValues(),model=selectedModel();if(!model)throw new Error('先选模型，或在设置里填写模型名');
  const payload={model,prompt:composedPrompt(draft),n:Number(draft.count||1),size:draft.size,response_format:'url'};
  if(draft.quality!=='auto')payload.quality=draft.quality;
  for(const [id,name,min,max,integer] of [['seed','seed',0,Number.MAX_SAFE_INTEGER,true],['cfg','cfg_scale',1,30,false],['steps','steps',1,100,true]]){
    if(draft[id]==='')continue;const value=Number(draft[id]);if(!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))throw new Error(`${id} 参数不在有效范围内`);payload[name]=value;
  }
  if(draft.style.trim())payload.style=draft.style.trim();
  const referenceFormat=$('referenceFormat').value,referenceField=$('referenceField').value;
  return {base,key,draft,model,payload,file:referenceFile,connectionMode:$('connectionMode').value,schemeId:activeScheme,referenceFormat,referenceField,referencePreference:{format:referenceFormat,field:referenceField},path:normalizePath(referenceFile?els.editPath.value:els.imagePath.value,referenceFile?'/images/edits':'/images/generations')};
}
function fileDataUrl(file,signal){return new Promise((resolve,reject)=>{const reader=new FileReader(),abort=()=>{reader.abort();reject(new DOMException('Stopped','AbortError'));};const cleanup=()=>signal?.removeEventListener('abort',abort);if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});reader.onload=()=>{cleanup();resolve(String(reader.result));};reader.onerror=()=>{cleanup();reject(new Error('参考图读取失败，请重新上传'));};reader.onabort=cleanup;reader.readAsDataURL(file);});}
function requiresJson(detail){return /application\s*\/\s*json/i.test(detail)&&/(仅|只|必须|要求|支持|only|support|expect|require|content.?type|media.?type)/i.test(detail);}
function normalizeReferenceField(field){return ['image','images','url-object'].includes(field)?field:'openai';}
function requiresUrlObject(detail){return /每个\s*image\s*都必须提供有效(?:的)?\s*url|请使用\s*image\.url/i.test(detail);}
function invalidReferenceJson(detail){return /图片编辑\s*JSON\s*请求无效|invalid\s+json\s+(?:request|body)|(?:images(?:\[0\]|\.0)?|image_url).*(?:object|dictionary|对象|字段|missing|required)|(?:object|dictionary|对象).*(?:images|image_url)/i.test(detail);}
function requiresImageUrl(detail){return /每个\s*image.*(?:有效|合法).*URL|(?:image|图片).*(?:valid\s+(?:https?\s+)?URL|必须.*(?:https?|在线).*链接)|(?:base64|data.?url).*(?:不支持|not\s+supported)/i.test(detail);}
async function rememberJsonFormat(request){
  const original=request.referencePreference;
  if(!original||activeScheme!==request.schemeId||$('referenceFormat').value!==original.format||$('referenceField').value!==original.field||normalizeBase(els.apiBase.value)!==request.base||els.apiKey.value.trim()!==request.key||normalizePath(els.editPath.value,'/images/edits')!==request.path)return;
  $('referenceFormat').value=request.referenceFormat;$('referenceField').value=request.referenceField;apiSchemes=apiSchemes.map(s=>s.id===request.schemeId?{...s,referenceFormat:request.referenceFormat,referenceField:request.referenceField}:s);try{writeLocalSettings();}catch{}settingsDirty=true;
  try{
    const d=await configCall('load'),c=d.config;
    if(!d.found||c.base!==request.base||c.key!==request.key||normalizePath(c.editPath,'/images/edits')!==request.path||(c.referenceFormat||'auto')!==original.format||normalizeReferenceField(c.referenceField)!==original.field){setConfigStatus('已记住参考图上传方式；点保存同步到其他设备。','ok');return;}
    const schemes=Array.isArray(c.schemes)?c.schemes.map(s=>s.id===request.schemeId?{...s,referenceFormat:request.referenceFormat,referenceField:request.referenceField}:s):undefined;
    const saved=await configCall('save',{version:d.version,config:{...c,referenceFormat:request.referenceFormat,referenceField:request.referenceField,...(schemes?{schemes}:{})}});
    if(cloudVersion===d.version)cloudVersion=saved.version;
    setConfigStatus('参考图上传方式已同步到云端 ✓','ok');
  }catch{setConfigStatus('本机已记住参考图上传方式；下次点保存可同步云端。');}
}
async function requestGeneration(request,signal){
  if(shouldBridge(request.base,request.connectionMode)||request.file&&request.referenceFormat==='url'){if(request.file&&request.referenceFormat==='auto'&&usesApiBridge(request.base)){request.referenceFormat='url';request.autoConverted=true;}return bridgeRequest(request,signal);}
  let body,headers={Authorization:`Bearer ${request.key}`};
  if(request.file&&request.referenceFormat==='json'){const image=await fileDataUrl(request.file,signal),payload={...request.payload};delete payload.response_format;if(request.referenceField==='images')payload.images=[image];else if(request.referenceField==='image')payload.image=image;else if(request.referenceField==='url-object')payload.images=[{url:image}];else payload.images=[{image_url:image}];headers['Content-Type']='application/json';body=JSON.stringify(payload);}
  else if(request.file){body=new FormData();for(const [key,value] of Object.entries(request.payload)){if(key!=='response_format')body.append(key,String(value));}body.append('image',request.file,request.file.name||'reference.png');}
  else{headers['Content-Type']='application/json';body=JSON.stringify(request.payload);}
  return fetch(request.base+request.path,{method:'POST',headers,body,signal});
}
async function readGenerationResult(r){const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{data={};}return {r,data,detail:String(data?.error?.message||data?.message||raw.slice(0,240)||`HTTP ${r.status}`)};}
async function diagnoseConnection(request,{signal}={}){
  if(navigator.onLine===false)return {message:'设备当前离线，请恢复网络后再试',detail:'浏览器报告设备离线。'};
  const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)controller.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(()=>controller.abort(),8000);
  try{const r=await requestModels(request.base,request.key,controller.signal,request.connectionMode);return {message:r.ok?'接口的模型列表能连接，但生成请求没有返回响应。请检查生成路径，或用较小参考图测试。':`接口可达（连接检查 HTTP ${r.status}），但生成请求没有返回响应。请检查接口设置或服务商状态。`,detail:`目标：${request.base+request.path}\n连接方式：${usesApiBridge(request.base)?'后端转发':'浏览器直连'}\n失败阶段：发送请求或读取响应；未取得生成请求的 HTTP 状态。\n模型列表检查：HTTP ${r.status}。模型检查成功也不代表生成路径已开放跨域。`};}
  catch{return {message:'生成请求和模型列表检查都没有取得响应，请检查网络、接口地址，以及服务商是否支持浏览器调用。',detail:`目标：${request.base+request.path}\n失败阶段：发送请求或读取响应；浏览器未提供 HTTP 状态。\n模型列表检查：未取得响应（包含检查超时）。无法仅凭此结果确定是跨域、网络还是服务商故障。`};}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
function setRunBusy(busy){els.generateBtn.disabled=busy;$('stopBtn').hidden=!busy;els.generateBtn.textContent=busy?'正在生成…':referenceFile?'参考图生成':'生成图片';}
async function generate(request=null){
  if(activeRun)return;
  try{request=request||snapshotRequest();}catch(e){setStatus(e.message,'bad');if(!els.apiBase.value||!els.apiKey.value)els.settingsDialog.showModal();return;}
  await workspaceReady;
  if(activeRun)return;
  saveDraft();$('retryBtn').hidden=true;$('connectionDiagnostic').hidden=true;lastFailedRequest=null;
  const run={controller:new AbortController(),started:Date.now(),stopped:false,timedOut:false};activeRun=run;setRunBusy(true);
  const progress=()=>{const elapsed=Math.floor((Date.now()-run.started)/1000);setStatus(`${request.file?'参考图':'图片'}生成中 · ${elapsed} 秒${elapsed>60?' · 还在等待模型返回':''}`);};progress();run.interval=setInterval(progress,1000);
  run.timeout=setTimeout(()=>{run.timedOut=true;run.controller.abort();},240000);
  try{
    let result=await readGenerationResult(await requestGeneration(request,run.controller.signal));
    if(request.file&&request.referenceFormat==='auto'&&[400,415,422].includes(result.r.status)&&requiresJson(result.detail)){
      request.referenceFormat='json';request.autoConverted=true;setStatus('接口需要 JSON，正在换格式上传参考图…');
      result=await readGenerationResult(await requestGeneration(request,run.controller.signal));
    }
    if(request.file&&['json','url'].includes(request.referenceFormat)&&normalizeReferenceField(request.referenceField)!=='openai'&&[400,415,422].includes(result.r.status)&&invalidReferenceJson(result.detail)){
      request.referenceField='openai';request.autoConverted=true;setStatus('接口要求标准图片格式，正在重新提交参考图…');
      result=await readGenerationResult(await requestGeneration(request,run.controller.signal));
    }
    if(request.file&&['json','url'].includes(request.referenceFormat)&&request.referenceField!=='url-object'&&[400,415,422].includes(result.r.status)&&requiresUrlObject(result.detail)){
      request.referenceField='url-object';request.autoConverted=true;setStatus('接口要求 url 图片字段，正在适配参考图格式…');
      result=await readGenerationResult(await requestGeneration(request,run.controller.signal));
    }
    if(request.file&&request.referenceFormat!=='url'&&[400,415,422].includes(result.r.status)&&requiresImageUrl(result.detail)){
      request.referenceFormat='url';request.autoConverted=true;setStatus('接口需要在线图片地址，正在创建临时参考图链接…');
      result=await readGenerationResult(await requestGeneration(request,run.controller.signal));
    }
    if(result.r.status===400&&isLowMediumQualityError(result.detail)&&request.payload.quality!=='medium'){
      request.payload.quality='medium';request.draft.quality='medium';setStatus('接口要求 low / medium，改用 medium 重试…');
      result=await readGenerationResult(await requestGeneration(request,run.controller.signal));
    }
    if(!result.r.ok){if(request.file&&[404,405].includes(result.r.status))throw new Error(`参考图接口 ${request.path} 不可用，请检查设置里的路径`);if(result.r.status===413)throw new Error('参考图超过接口大小限制，请压缩后重新上传');if(result.r.status===401)throw new Error('API Key 未通过验证，请检查接口设置');if(result.r.status===429)throw new Error('接口现在繁忙或额度不足，稍后再试');throw new Error(result.detail.replaceAll(request.key,'[Key]').slice(0,260));}
    if(run.stopped||run.controller.signal.aborted)throw new DOMException('Stopped','AbortError');
    const images=extractImages(result.data);if(!images.length)throw new Error('接口成功返回，但没有找到图片。请确认选的是生图模型');
    if(request.autoConverted)rememberJsonFormat(request);
    clearInterval(run.interval);
    const at=Date.now();historyItems=[...images.map(src=>({id:crypto.randomUUID(),src,prompt:request.draft.prompt.trim(),negativePrompt:request.draft.negativePrompt,submittedPrompt:request.payload.prompt,model:request.model,size:request.draft.size,at,reference:!!request.file,referenceName:request.file?.name||'',draft:{...request.draft}})),...historyItems].slice(0,30);
    renderHistory();switchView('gallery');const stored=await persistHistory();setStatus(`生成完成 · ${images.length} 张${stored?' · 已保存历史':' · 请先保存图片'}`,'ok');
  }catch(e){
    if(run.stopped)setStatus('已停止等待，这次请求的结果不会自动保存');
    else{lastFailedRequest=request;$('retryBtn').hidden=false;if(e.name==='TypeError'&&!run.timedOut){clearInterval(run.interval);setStatus('请求没有返回响应，正在检查接口连接…');const diagnosis=await diagnoseConnection(request,{signal:run.controller.signal});$('connectionDiagnosticText').textContent=diagnosis.detail;$('connectionDiagnostic').hidden=false;setStatus(run.stopped?'已停止连接检查':diagnosis.message,'bad');}else setStatus(run.timedOut?'等待超过 4 分钟，请稍后重试':e.message||'生成失败','bad');}
  }finally{clearInterval(run.interval);clearTimeout(run.timeout);activeRun=null;setRunBusy(false);}
}
function safeImageSource(src){if(typeof src!=='string')return '';if(/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i.test(src))return src;try{const u=new URL(src);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?src:'';}catch{return '';}}
function extractImages(data){const arr=Array.isArray(data?.data)?data.data:Array.isArray(data?.images)?data.images:[],out=[];const add=src=>{const safe=safeImageSource(src);if(safe&&!out.includes(safe))out.push(safe);};for(const item of arr){if(typeof item==='string')add(item);else if(item?.url)add(item.url);else if(item?.b64_json)add(`data:image/png;base64,${item.b64_json}`);else if(item?.image_url)add(typeof item.image_url==='string'?item.image_url:item.image_url.url);}if(data?.url)add(data.url);if(typeof data?.image==='string')add(/^(https?:|data:)/.test(data.image)?data.image:`data:image/png;base64,${data.image}`);return out;}
async function copyText(text){try{await navigator.clipboard.writeText(text);setStatus('提示词已复制','ok');}catch{setStatus('复制未成功，请长按提示词复制','bad');}}
function previewImage(item){$('previewFullImage').src=item.src;$('previewPrompt').textContent=item.submittedPrompt||item.prompt||'';$('previewOriginal').href=item.src;$('previewDialog').showModal();}
function reuseImage(item){pushUndo();const d=item.draft||{prompt:item.prompt||'',negativePrompt:item.negativePrompt||'',size:item.size||'1024x1024'};for(const id of DRAFT_FIELDS){if(d[id]!==undefined){const field=els[id];if(field.tagName==='SELECT'&&![...field.options].some(o=>o.value===d[id]))field.add(new Option(d[id],d[id]));field.value=d[id];}}chooseModel(item.model);saveDraft();switchView('editor');setStatus(item.reference&&!referenceFile?'参数已复用；这张图原来用过参考图，需要重新选参考图':'已复用这张图的提示词与参数','ok');}
async function useImageAsReference(item){try{const r=await fetch(item.src,{credentials:'omit',signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error();const blob=await r.blob();if(!blob.type.startsWith('image/'))throw new Error();setReference(new File([blob],'generated-reference.'+(blob.type.split('/')[1]||'png'),{type:blob.type}));switchView('editor');setStatus('已把这张图设为参考图，写下要修改的地方即可','ok');}catch{previewImage(item);setStatus('图片服务器不允许直接读取。请先保存图片，再上传作参考图','bad');}}
async function downloadImage(item){try{const r=await fetch(item.src,{credentials:'omit',signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error();const blob=await r.blob();if(!blob.type.startsWith('image/'))throw new Error();const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ling-image-${item.at||Date.now()}.${blob.type.split('/')[1]||'png'}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);setStatus('图片已交给浏览器保存','ok');}catch{previewImage(item);setStatus('打开了原图预览，手机上可以长按图片保存');}}
function renderHistory(){
  const h=getHistory();$('historyCount').textContent=String(h.length);els.gallery.replaceChildren();
  if(!h.length){els.gallery.classList.add('empty');els.gallery.innerHTML='<div class="empty-state"><div class="empty-icon">✦</div><p>还没有出图。</p><span>先写提示词生成；历史图可以复用参数或继续修改。</span></div>';return;}
  els.gallery.classList.remove('empty');const tpl=$('imageCardTemplate');
  h.forEach(item=>{const node=tpl.content.cloneNode(true),img=node.querySelector('img'),wrap=node.querySelector('.image-wrap');img.src=item.src;img.onerror=()=>{img.alt='图片链接可能已过期，仍可复用参数重新生成';wrap.classList.add('image-unavailable');};const [w,height]=String(item.size||'1x1').split('x').map(Number);if(w&&height)wrap.style.aspectRatio=`${w}/${height}`;
    node.querySelector('.image-info').textContent=`${item.reference?'参考图 · ':''}${item.model||'未知模型'} · ${item.size||''}`;node.querySelector('.meta-copy').textContent=item.prompt||'';
    node.querySelector('.preview-btn').addEventListener('click',()=>previewImage(item));node.querySelector('.copy-btn').addEventListener('click',()=>copyText(item.submittedPrompt||item.prompt||''));node.querySelector('.reuse-btn').addEventListener('click',()=>reuseImage(item));node.querySelector('.reference-btn').addEventListener('click',()=>useImageAsReference(item));node.querySelector('.download-btn').addEventListener('click',()=>downloadImage(item));els.gallery.append(node);
  });
}
function saveModelOnly(){try{writeLocalSettings();settingsDirty=true;setConfigStatus('本机已保存；点 API 设置里的保存可同步到其他设备。');}catch(e){setConfigStatus(e.message,'bad');}}

els.settingsBtn.addEventListener('click',()=>els.settingsDialog.showModal());
$('schemeSelect').addEventListener('change',e=>switchApiScheme(e.target.value));
$('newSchemeBtn').addEventListener('click',newApiScheme);$('deleteSchemeBtn').addEventListener('click',deleteApiScheme);
$('writerSameApi').addEventListener('change',()=>{updateWriterConnection();settingsDirty=true;setConfigStatus('写词接口已修改，记得保存方案。');});
$('writerModelsBtn').addEventListener('click',fetchWriterModels);
for(const id of ['promptWriterBtn','libraryWriterBtn'])$(id).addEventListener('click',openWriter);
$('libraryDoneBtn').addEventListener('click',()=>{els.libraryDialog.close();switchView('editor');});
$('writerCloseBtn').addEventListener('click',()=>$('writerDialog').close());
$('writerDialog').addEventListener('close',()=>{stopWriter();saveWriterDraft();});
$('writerDialog').addEventListener('click',e=>{if(e.target===$('writerDialog'))$('writerDialog').close();});
$('writerSettingsBtn').addEventListener('click',()=>{$('writerDialog').close();els.settingsDialog.showModal();});
$('writerGenerateBtn').addEventListener('click',generateWriterPrompt);$('writerStopBtn').addEventListener('click',stopWriter);
$('writerApplyBtn').addEventListener('click',()=>applyWriterPrompt());$('writerAppendBtn').addEventListener('click',()=>applyWriterPrompt({append:true}));$('writerCopyBtn').addEventListener('click',copyWriterPrompt);
for(const id of ['writerBrief','writerLanguage','writerDetail','writerUseCurrent'])$(id).addEventListener('input',()=>{writerInputRevision++;saveWriterDraft();});
for(const id of ['writerPromptResult','writerNegativeResult'])$(id).addEventListener('input',saveWriterDraft);
els.saveSettingsBtn.addEventListener('click',saveSettings);
$('restoreSettingsBtn').addEventListener('click',()=>{if(settingsDirty&&!confirm('读取云端会替换当前未同步的 API 设置，继续吗？'))return;restoreCloudSettings({manual:true});});
els.testBtn.addEventListener('click',()=>fetchModels().catch(e=>setStatus(e.message,'bad')));
els.generateBtn.addEventListener('click',()=>generate());
$('retryBtn').addEventListener('click',()=>{if(lastFailedRequest)generate(lastFailedRequest);});
$('stopBtn').addEventListener('click',()=>{if(activeRun){activeRun.stopped=true;activeRun.controller.abort();}});
$('workspaceTabs').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)switchView(b.dataset.view);});
$('copyPromptBtn').addEventListener('click',()=>{try{copyText(composedPrompt());}catch(e){setStatus(e.message,'bad');}});
$('previewCloseBtn').addEventListener('click',()=>$('previewDialog').close());
$('previewDialog').addEventListener('click',e=>{if(e.target===$('previewDialog'))$('previewDialog').close();});
$('previewDialog').addEventListener('close',()=>{$('previewFullImage').removeAttribute('src');});
els.model.addEventListener('change',()=>{$('manualModel').value=els.model.value;els.model.dataset.saved=els.model.value;saveModelOnly();});
els.quality.addEventListener('change',saveModelOnly);
for(const id of ['apiBase','apiKey','imagePath','editPath','manualModel','referenceFormat','referenceField','connectionMode','schemeName','writerBase','writerKey','writerModel','writerPath'])$(id).addEventListener('input',()=>{settingsDirty=true;updateWriterConnection();setConfigStatus('配置已修改，记得点保存。');});
for(const id of DRAFT_FIELDS){els[id].addEventListener('input',()=>{updatePromptCount();clearTimeout(draftTimer);draftTimer=setTimeout(saveDraft,250);});els[id].addEventListener('change',saveDraft);}
window.addEventListener('pagehide',saveDraft);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveDraft();});
els.clearBtn.addEventListener('click',async()=>{if(!historyLoaded||activeRun){setStatus('请等当前加载或生成结束后再清空');return;}if(!historyItems.length||!confirm('清空这台设备的出图历史？已下载的图片不受影响。'))return;historyItems=[];renderHistory();await persistHistory();setStatus('本机出图历史已清空');});
els.presetChips.addEventListener('click',e=>{const btn=e.target.closest('button[data-text]');if(btn)appendTerms(splitPrompt(btn.dataset.text),{label:`已加入「${btn.textContent.trim()}」`});});
els.randomPromptBtn.addEventListener('click',()=>{const p=['雨后深夜街角，冷白偏粉蓝灯光，成年女性，自然抓拍感','花房内部，半身近景，微侧身回望，柔雾光线，安静疏离气质','复古木质房间，窗边逆光，低饱和粉灰配色，电影静帧感','未来都市天台，夜风，霓虹反光，清透CG插画，强轮廓光'];pushUndo();els.prompt.value=p[Math.floor(Math.random()*p.length)];els.recipeHint.textContent='换了一个场景灵感。';saveDraft();});
els.recipeBtn.addEventListener('click',applyRecipe);els.libraryBtn.addEventListener('click',openLibrary);els.undoPromptBtn.addEventListener('click',undoPrompt);els.dedupeBtn.addEventListener('click',dedupePrompt);els.clearPromptBtn.addEventListener('click',clearPrompt);
els.libraryCloseBtn.addEventListener('click',()=>els.libraryDialog.close());
els.smartRecipeBtn.addEventListener('click',()=>{const r=applyRecipe();els.recipeHint.textContent=`已套用「${r.name}」；词库保持打开。`;});
els.randomWordsBtn.addEventListener('click',addRandomWords);els.librarySearch.addEventListener('input',renderLibrary);
els.libraryTabs.addEventListener('click',e=>{const btn=e.target.closest('[data-library-mode]');if(!btn)return;libraryMode=btn.dataset.libraryMode;els.libraryTabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));renderLibrary();});
els.libraryDialog.addEventListener('click',e=>{if(e.target===els.libraryDialog)els.libraryDialog.close();});
els.referenceDrop.addEventListener('click',()=>els.referenceInput.click());els.replaceReferenceBtn.addEventListener('click',()=>els.referenceInput.click());els.clearReferenceBtn.addEventListener('click',clearReference);els.referenceInput.addEventListener('change',()=>setReference(els.referenceInput.files?.[0]));
['dragenter','dragover'].forEach(type=>els.referenceBox.addEventListener(type,e=>{e.preventDefault();els.referenceBox.classList.add('dragover');}));
['dragleave','drop'].forEach(type=>els.referenceBox.addEventListener(type,e=>{e.preventDefault();els.referenceBox.classList.remove('dragover');}));
els.referenceBox.addEventListener('drop',e=>{const file=[...(e.dataTransfer?.files||[])].find(f=>String(f.type||'').startsWith('image/'));if(file)setReference(file);});
document.addEventListener('paste',e=>{const file=[...(e.clipboardData?.files||[])].find(f=>String(f.type||'').startsWith('image/'));if(file){e.preventDefault();setReference(file);}});

initQualityOptions();loadSettings();restoreDraft();restoreWriterDraft();renderHistory();renderLibrary();
const workspaceReady=loadWorkspace();
els.generateBtn.disabled=true;workspaceReady.finally(()=>{if(!activeRun)els.generateBtn.disabled=false;});
restoreCloudSettings();
