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

const RECIPE_POOL=[
  {name:'韩系清冷',words:['韩式插画','伪厚涂','精致五官','冷白皮','清瘦','狭长眼型','清冷','绒雾面哑光肌','疏离','静谧','柔光','侧逆光','低饱和','灰粉']},
  {name:'乙游华丽',words:['高级cg','乙游人像','绝美长相','骨相立体','瓷白肌肤','鹅蛋脸','桃花眼','优雅','透亮珠光肌理','魅惑','华丽','电影级光影','珠光感','洛可可']},
  {name:'港风胶片',words:['半写实','精致人像','浓颜','暖白皮','鹅蛋脸','杏眼','明艳','真实皮肤纹理','松弛','复古','港风','暖光','胶片感','ccd相机']},
  {name:'国风清冷',words:['国漫插画','半厚涂','面容精致','瓷白肌肤','小巧纤薄脸型','柳叶眼','清冷','柔光缎面肌理','淡然','空灵','中式古典','漫射光','低饱和','灰蓝']},
  {name:'梦核易碎',words:['数字绘画','非写实','瓷娃娃长相','惨白肤色','小窄脸','小鹿眼','易碎感','莹润清透薄釉肌理','迷离','梦幻','梦核','光影弥散','柔焦滤镜','雾蓝']},
  {name:'日漫清透',words:['日漫风','赛璐璐风格','面容姣好','粉白皮','小短脸','圆眼','清爽活力','清透水光肌','灵动','明亮','自然光','淡彩']},
  {name:'暗黑病感',words:['高级cg','半写实','骨相立体','惨白肤色','消瘦','狭长眼型','阴郁','病态','绒雾面哑光肌','厌世','暗黑','明暗对比','哥特风','灰紫']},
  {name:'千禧甜酷',words:['oc渲染','2.5次元','建模脸','粉白皮','小V脸','猫眼','甜酷','千禧辣妹','光滑奶油肌','狡黠','Y2K','霓虹色','粒子光斑']}
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
function pushUndo(){const now=els.prompt.value,last=PROMPT_UNDO[PROMPT_UNDO.length-1];if(now!==last){PROMPT_UNDO.push(now);if(PROMPT_UNDO.length>30)PROMPT_UNDO.shift()}}
function rememberTerm(term){const recent=safeRead(RECENT_KEY,[]);safeWrite(RECENT_KEY,[term,...recent.filter(x=>x!==term)].slice(0,36))}
function appendTerms(terms,{remember=true,label=''}={}){const add=uniqueWords(Array.isArray(terms)?terms:[terms]);if(!add.length)return;pushUndo();const seen=new Set(splitPrompt(els.prompt.value)),fresh=add.filter(x=>!seen.has(x)),current=els.prompt.value.trimEnd();els.prompt.value=current+(current&&fresh.length?'，':'')+fresh.join('，');if(remember)fresh.forEach(rememberTerm);if(label)els.recipeHint.textContent=label+(fresh.length?` · 新加 ${fresh.length} 条`:' · 这些词已经在提示词里了');if(!els.libraryDialog.open)els.prompt.focus();saveDraft();renderLibrary()}
function dedupePrompt(){pushUndo();const before=splitPrompt(els.prompt.value),after=uniqueWords(before);els.prompt.value=after.join('，');els.recipeHint.textContent=before.length===after.length?'没有重复词，清清白白。':`去掉了 ${before.length-after.length} 个重复词。`;saveDraft();renderLibrary()}
function clearPrompt(){if(!els.prompt.value.trim())return;pushUndo();els.prompt.value='';els.recipeHint.textContent='提示词已清空。';saveDraft();renderLibrary()}
function undoPrompt(){if(!PROMPT_UNDO.length){els.recipeHint.textContent='没有可以撤销的操作。';return}els.prompt.value=PROMPT_UNDO.pop();els.recipeHint.textContent='撤回了一步。';saveDraft();renderLibrary()}
function applyRecipe(){const recipe=RECIPE_POOL[Math.floor(Math.random()*RECIPE_POOL.length)];appendTerms(['成年女性','自然体态',...recipe.words],{label:`已套用「${recipe.name}」`});return recipe}
function addRandomWords(){const cats=Object.keys(PROMPT_LIBRARY),picked=[];while(picked.length<6){const cat=cats[Math.floor(Math.random()*cats.length)],arr=PROMPT_LIBRARY[cat],word=arr[Math.floor(Math.random()*arr.length)];if(!picked.includes(word))picked.push(word)}appendTerms(picked,{label:'随便塞了 6 条'})}

function getFavorites(){return safeRead(FAVORITES_KEY,[])}
function toggleFavorite(term){const f=getFavorites(),next=f.includes(term)?f.filter(x=>x!==term):[term,...f];safeWrite(FAVORITES_KEY,next.slice(0,120));renderLibrary()}
function categoryOf(term){for(const [cat,words] of Object.entries(PROMPT_LIBRARY))if(words.includes(term))return cat;return '其他'}
function buildChip(term){const fav=getFavorites().includes(term),wrap=document.createElement('span');wrap.className='library-chip-wrap';const add=document.createElement('button');add.type='button';add.className='library-chip';add.textContent=term;const chosen=splitPrompt(els.prompt.value).includes(term);add.classList.toggle('chosen',chosen);add.setAttribute('aria-pressed',String(chosen));add.addEventListener('click',()=>appendTerms([term],{label:`已加入「${term}」`}));const star=document.createElement('button');star.type='button';star.className='chip-star'+(fav?' active':'');star.textContent=fav?'★':'☆';star.setAttribute('aria-label',(fav?'取消收藏':'收藏')+' '+term);star.addEventListener('click',()=>toggleFavorite(term));wrap.append(add,star);return wrap}
function renderFlat(words,title){if(!words.length){els.libraryGroups.innerHTML='<div class="library-empty">这里还是空的。</div>';return}const section=document.createElement('section');section.className='library-flat';const h=document.createElement('div');h.className='library-flat-title';h.textContent=title;const chips=document.createElement('div');chips.className='library-chips';words.forEach(w=>chips.appendChild(buildChip(w)));section.append(h,chips);els.libraryGroups.appendChild(section)}
function renderLibrary(){if(!els.libraryGroups)return;const q=(els.librarySearch?.value||'').trim().toLowerCase(),expanded=new Set([...els.libraryGroups.querySelectorAll('details[open]')].map(d=>d.dataset.category));els.libraryGroups.innerHTML='';if(libraryMode==='favorites'){renderFlat(getFavorites().filter(w=>!q||w.toLowerCase().includes(q)||categoryOf(w).toLowerCase().includes(q)),'★ 收藏');return}if(libraryMode==='recent'){renderFlat(safeRead(RECENT_KEY,[]).filter(w=>!q||w.toLowerCase().includes(q)||categoryOf(w).toLowerCase().includes(q)),'最近用过');return}for(const [cat,words] of Object.entries(PROMPT_LIBRARY)){const filtered=words.filter(w=>!q||w.toLowerCase().includes(q)||cat.toLowerCase().includes(q));if(!filtered.length)continue;const details=document.createElement('details');details.className='library-group';details.dataset.category=cat;details.open=!!q||expanded.has(cat);const summary=document.createElement('summary');summary.innerHTML=`<span>${escapeHtml(cat)}</span><small>${filtered.length}</small>`;const body=document.createElement('div');body.className='library-group-body';const actions=document.createElement('div');actions.className='library-category-actions';const addAll=document.createElement('button');addAll.type='button';addAll.className='ghost-btn';addAll.textContent='整类加入';addAll.addEventListener('click',()=>appendTerms(filtered,{label:`已加入「${cat}」整类`}));actions.appendChild(addAll);const chips=document.createElement('div');chips.className='library-chips';filtered.forEach(w=>chips.appendChild(buildChip(w)));body.append(actions,chips);details.append(summary,body);els.libraryGroups.appendChild(details)}if(!els.libraryGroups.children.length)els.libraryGroups.innerHTML='<div class="library-empty">没搜到。</div>'}
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
function settingsValues(){return {apiBase:normalizeBase(els.apiBase.value),apiKey:els.apiKey.value.trim(),imagePath:normalizePath(els.imagePath.value,'/images/generations'),editPath:normalizePath(els.editPath.value,'/images/edits'),model:selectedModel(),quality:els.quality.value||'auto',referenceFormat:$('referenceFormat').value,referenceField:$('referenceField').value};}
function writeLocalSettings(){if(!safeWrite(STORAGE_KEY,settingsValues()))throw new Error('本机设置存不下，请保留 API 配置');}
function applySettings(s){els.apiBase.value=s.apiBase||'';els.apiKey.value=s.apiKey||'';els.imagePath.value=s.imagePath||'/images/generations';els.editPath.value=s.editPath||'/images/edits';$('referenceFormat').value=['auto','json','multipart'].includes(s.referenceFormat)?s.referenceFormat:'auto';$('referenceField').value=s.referenceField==='images'?'images':'image';if(s.model)chooseModel(s.model);if(s.quality&&[...els.quality.options].some(o=>o.value===s.quality))els.quality.value=s.quality;}
function loadSettings(){applySettings(safeRead(STORAGE_KEY,{}));if(els.apiBase.value&&els.apiKey.value)setStatus('API 设置已恢复，可直接生成','ok');}
function setConfigStatus(text,type=''){$('configStatus').textContent=text;$('configStatus').className='status '+type;}
function toCloud(s){return {base:s.apiBase,key:s.apiKey,model:s.model,imagePath:s.imagePath,editPath:s.editPath,quality:s.quality,referenceFormat:s.referenceFormat,referenceField:s.referenceField};}
function fromCloud(c){return {apiBase:c.base||'',apiKey:c.key||'',model:c.model||'',imagePath:c.imagePath,editPath:c.editPath,quality:c.quality,referenceFormat:c.referenceFormat,referenceField:c.referenceField};}
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
  const button=els.saveSettingsBtn;button.disabled=true;
  try{
    validateConnection();const manual=$('manualModel').value.trim();if(manual)chooseModel(manual);writeLocalSettings();
    setConfigStatus('本机已保存，正在同步云端…');
    if(cloudVersion===null){const d=await configCall('load');if(d.found){cloudVersion=d.version;throw new Error('云端已有配置，请先读取，避免覆盖另一台设备的设置。');}cloudVersion=d.version;}
    const s=settingsValues(),d=await configCall('save',{version:cloudVersion,config:toCloud(s)});cloudVersion=d.version;settingsDirty=false;
    setConfigStatus('API 配置已加密同步 ✓','ok');setStatus('API 设置已保存，其他设备会自动恢复','ok');els.settingsDialog.close();
  }catch(e){setConfigStatus(e.message+'（本机设置保留）','bad');setStatus(e.message,'bad');}
  finally{button.disabled=false;}
}
async function fetchModels(){
  const {base,key}=validateConnection(),snapshot=base+'\n'+key;
  els.testBtn.disabled=true;els.testBtn.textContent='连接中…';
  try{
    const r=await fetch(`${base}/models`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(20000)});
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
  return {base,key,draft,model,payload,file:referenceFile,referenceFormat:$('referenceFormat').value,referenceField:$('referenceField').value,path:normalizePath(referenceFile?els.editPath.value:els.imagePath.value,referenceFile?'/images/edits':'/images/generations')};
}
function fileDataUrl(file,signal){return new Promise((resolve,reject)=>{const reader=new FileReader(),abort=()=>{reader.abort();reject(new DOMException('Stopped','AbortError'));};const cleanup=()=>signal?.removeEventListener('abort',abort);if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});reader.onload=()=>{cleanup();resolve(String(reader.result));};reader.onerror=()=>{cleanup();reject(new Error('参考图读取失败，请重新上传'));};reader.onabort=cleanup;reader.readAsDataURL(file);});}
function requiresJson(detail){return /application\s*\/\s*json/i.test(detail)&&/(仅|只|必须|要求|支持|only|support|expect|require|content.?type|media.?type)/i.test(detail);}
async function rememberJsonFormat(request){
  if($('referenceFormat').value!=='auto'||normalizeBase(els.apiBase.value)!==request.base||els.apiKey.value.trim()!==request.key)return;
  $('referenceFormat').value='json';try{writeLocalSettings();}catch{}settingsDirty=true;
  try{
    const d=await configCall('load'),c=d.config;
    if(!d.found||c.base!==request.base||c.key!==request.key||normalizePath(c.editPath,'/images/edits')!==request.path){setConfigStatus('已记住 JSON 格式；点保存同步到其他设备。','ok');return;}
    const saved=await configCall('save',{version:d.version,config:{...c,referenceFormat:'json'}});
    if(cloudVersion===d.version)cloudVersion=saved.version;
    setConfigStatus('JSON 参考图格式已同步到云端 ✓','ok');
  }catch{setConfigStatus('本机已记住 JSON 格式；下次点保存可同步云端。');}
}
async function requestGeneration(request,signal){
  let body,headers={Authorization:`Bearer ${request.key}`};
  if(request.file&&request.referenceFormat==='json'){const image=await fileDataUrl(request.file,signal),payload={...request.payload};delete payload.response_format;if(request.referenceField==='images')payload.images=[image];else payload.image=image;headers['Content-Type']='application/json';body=JSON.stringify(payload);}
  else if(request.file){body=new FormData();for(const [key,value] of Object.entries(request.payload)){if(key!=='response_format')body.append(key,String(value));}body.append('image',request.file,request.file.name||'reference.png');}
  else{headers['Content-Type']='application/json';body=JSON.stringify(request.payload);}
  return fetch(request.base+request.path,{method:'POST',headers,body,signal});
}
async function readGenerationResult(r){const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{data={};}return {r,data,detail:String(data?.error?.message||data?.message||raw.slice(0,240)||`HTTP ${r.status}`)};}
function setRunBusy(busy){els.generateBtn.disabled=busy;$('stopBtn').hidden=!busy;els.generateBtn.textContent=busy?'正在生成…':referenceFile?'参考图生成':'生成图片';}
async function generate(request=null){
  if(activeRun)return;
  try{request=request||snapshotRequest();}catch(e){setStatus(e.message,'bad');if(!els.apiBase.value||!els.apiKey.value)els.settingsDialog.showModal();return;}
  await workspaceReady;
  if(activeRun)return;
  saveDraft();$('retryBtn').hidden=true;lastFailedRequest=null;
  const run={controller:new AbortController(),started:Date.now(),stopped:false,timedOut:false};activeRun=run;setRunBusy(true);
  const progress=()=>{const elapsed=Math.floor((Date.now()-run.started)/1000);setStatus(`${request.file?'参考图':'图片'}生成中 · ${elapsed} 秒${elapsed>60?' · 还在等待模型返回':''}`);};progress();run.interval=setInterval(progress,1000);
  run.timeout=setTimeout(()=>{run.timedOut=true;run.controller.abort();},240000);
  try{
    let result=await readGenerationResult(await requestGeneration(request,run.controller.signal));
    if(request.file&&request.referenceFormat==='auto'&&[400,415,422].includes(result.r.status)&&requiresJson(result.detail)){
      request.referenceFormat='json';request.autoConverted=true;setStatus('接口需要 JSON，正在换格式上传参考图…');
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
    else{lastFailedRequest=request;$('retryBtn').hidden=false;setStatus(run.timedOut?'等待超过 4 分钟，请稍后重试':e.name==='TypeError'?'连接未完成，请检查网络和接口的跨域支持':e.message||'生成失败','bad');}
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
for(const id of ['apiBase','apiKey','imagePath','editPath','manualModel','referenceFormat','referenceField'])$(id).addEventListener('input',()=>{settingsDirty=true;setConfigStatus('配置已修改，记得点保存。');});
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

initQualityOptions();loadSettings();restoreDraft();renderHistory();renderLibrary();
const workspaceReady=loadWorkspace();
els.generateBtn.disabled=true;workspaceReady.finally(()=>{if(!activeRun)els.generateBtn.disabled=false;});
restoreCloudSettings();
