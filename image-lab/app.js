const $ = (id) => document.getElementById(id);

const els = {
  settingsBtn:$('settingsBtn'), settingsDialog:$('settingsDialog'), apiBase:$('apiBase'), apiKey:$('apiKey'), imagePath:$('imagePath'), editPath:$('editPath'),
  saveSettingsBtn:$('saveSettingsBtn'), testBtn:$('testBtn'), generateBtn:$('generateBtn'), model:$('model'), prompt:$('prompt'),
  negativePrompt:$('negativePrompt'), count:$('count'), size:$('size'), quality:$('quality'), seed:$('seed'), cfg:$('cfg'), steps:$('steps'),
  style:$('style'), status:$('status'), gallery:$('gallery'), clearBtn:$('clearBtn'), randomPromptBtn:$('randomPromptBtn'), presetChips:$('presetChips'),
  recipeBtn:$('recipeBtn'), libraryBtn:$('libraryBtn'), undoPromptBtn:$('undoPromptBtn'), dedupeBtn:$('dedupeBtn'), clearPromptBtn:$('clearPromptBtn'), recipeHint:$('recipeHint'),
  libraryDialog:$('libraryDialog'), libraryCloseBtn:$('libraryCloseBtn'), librarySearch:$('librarySearch'), libraryGroups:$('libraryGroups'), libraryTabs:$('libraryTabs'),
  smartRecipeBtn:$('smartRecipeBtn'), randomWordsBtn:$('randomWordsBtn'),
  referenceBox:$('referenceBox'), referenceInput:$('referenceInput'), referenceDrop:$('referenceDrop'), clearReferenceBtn:$('clearReferenceBtn'), replaceReferenceBtn:$('replaceReferenceBtn'),
  referencePreview:$('referencePreview'), referenceImage:$('referenceImage'), referenceName:$('referenceName'), referenceInfo:$('referenceInfo'), referenceModeHint:$('referenceModeHint')
};

const STORAGE_KEY='ling-image-lab-settings-v1';
const HISTORY_KEY='ling-image-lab-history-v1';
const FAVORITES_KEY='ling-image-lab-favorites-v1';
const RECENT_KEY='ling-image-lab-recent-v1';
const PROMPT_UNDO=[];
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
function appendTerms(terms,{remember=true,label=''}={}){const add=uniqueWords(Array.isArray(terms)?terms:[terms]);if(!add.length)return;pushUndo();const existing=splitPrompt(els.prompt.value),seen=new Set(existing),fresh=add.filter(x=>!seen.has(x));els.prompt.value=[...existing,...fresh].join('，');if(remember)fresh.forEach(rememberTerm);if(label)els.recipeHint.textContent=label+(fresh.length?` · 新加 ${fresh.length} 条`:' · 这些词已经在提示词里了');els.prompt.focus();renderLibrary()}
function dedupePrompt(){pushUndo();const before=splitPrompt(els.prompt.value),after=uniqueWords(before);els.prompt.value=after.join('，');els.recipeHint.textContent=before.length===after.length?'没有重复词，清清白白。':`去掉了 ${before.length-after.length} 个重复词。`}
function clearPrompt(){if(!els.prompt.value.trim())return;pushUndo();els.prompt.value='';els.recipeHint.textContent='提示词已清空。空空如也，模型终于也体验到了脑袋放空。'}
function undoPrompt(){if(!PROMPT_UNDO.length){els.recipeHint.textContent='没有可以撤销的操作。';return}els.prompt.value=PROMPT_UNDO.pop();els.recipeHint.textContent='撤回了一步。';renderLibrary()}
function applyRecipe(){const recipe=RECIPE_POOL[Math.floor(Math.random()*RECIPE_POOL.length)];appendTerms(recipe.words,{label:`已套用「${recipe.name}」`});return recipe}
function addRandomWords(){const cats=Object.keys(PROMPT_LIBRARY),picked=[];while(picked.length<6){const cat=cats[Math.floor(Math.random()*cats.length)],arr=PROMPT_LIBRARY[cat],word=arr[Math.floor(Math.random()*arr.length)];if(!picked.includes(word))picked.push(word)}appendTerms(picked,{label:'随便塞了 6 条'})}

function getFavorites(){return safeRead(FAVORITES_KEY,[])}
function toggleFavorite(term){const f=getFavorites(),next=f.includes(term)?f.filter(x=>x!==term):[term,...f];safeWrite(FAVORITES_KEY,next.slice(0,120));renderLibrary()}
function categoryOf(term){for(const [cat,words] of Object.entries(PROMPT_LIBRARY))if(words.includes(term))return cat;return '其他'}
function buildChip(term){const fav=getFavorites().includes(term),wrap=document.createElement('span');wrap.className='library-chip-wrap';const add=document.createElement('button');add.type='button';add.className='library-chip';add.textContent=term;add.addEventListener('click',()=>appendTerms([term],{label:`已加入「${term}」`}));const star=document.createElement('button');star.type='button';star.className='chip-star'+(fav?' active':'');star.textContent=fav?'★':'☆';star.setAttribute('aria-label',fav?'取消收藏':'收藏');star.addEventListener('click',()=>toggleFavorite(term));wrap.append(add,star);return wrap}
function renderFlat(words,title){if(!words.length){els.libraryGroups.innerHTML='<div class="library-empty">这里还是空的。先去点几条词，网站才有东西可以装作很懂你。</div>';return}const section=document.createElement('section');section.className='library-flat';const h=document.createElement('div');h.className='library-flat-title';h.textContent=title;const chips=document.createElement('div');chips.className='library-chips';words.forEach(w=>chips.appendChild(buildChip(w)));section.append(h,chips);els.libraryGroups.appendChild(section)}
function renderLibrary(){if(!els.libraryGroups)return;const q=(els.librarySearch?.value||'').trim().toLowerCase();els.libraryGroups.innerHTML='';if(libraryMode==='favorites'){renderFlat(getFavorites().filter(w=>!q||w.toLowerCase().includes(q)||categoryOf(w).toLowerCase().includes(q)),'★ 收藏');return}if(libraryMode==='recent'){renderFlat(safeRead(RECENT_KEY,[]).filter(w=>!q||w.toLowerCase().includes(q)||categoryOf(w).toLowerCase().includes(q)),'最近用过');return}for(const [cat,words] of Object.entries(PROMPT_LIBRARY)){const filtered=words.filter(w=>!q||w.toLowerCase().includes(q)||cat.toLowerCase().includes(q));if(!filtered.length)continue;const details=document.createElement('details');details.className='library-group';if(q)details.open=true;const summary=document.createElement('summary');summary.innerHTML=`<span>${escapeHtml(cat)}</span><small>${filtered.length}</small>`;const body=document.createElement('div');body.className='library-group-body';const actions=document.createElement('div');actions.className='library-category-actions';const addAll=document.createElement('button');addAll.type='button';addAll.className='ghost-btn';addAll.textContent='整类加入';addAll.addEventListener('click',()=>appendTerms(filtered,{label:`已加入「${cat}」整类`}));actions.appendChild(addAll);const chips=document.createElement('div');chips.className='library-chips';filtered.forEach(w=>chips.appendChild(buildChip(w)));body.append(actions,chips);details.append(summary,body);els.libraryGroups.appendChild(details)}if(!els.libraryGroups.children.length)els.libraryGroups.innerHTML='<div class="library-empty">没搜到。换个词，别和搜索框较劲，它只是个输入框。</div>'}
function openLibrary(){renderLibrary();els.libraryDialog.showModal();setTimeout(()=>els.librarySearch?.focus(),80)}

function setReference(file){if(!file)return;if(!String(file.type||'').startsWith('image/')){setStatus('这不是图片文件。参考图多少得先是张图。','bad');return}if(file.size>25*1024*1024){setStatus('参考图超过 25MB，先压一压再喂，接口也有胃容量。','bad');return}if(referenceObjectUrl)URL.revokeObjectURL(referenceObjectUrl);referenceFile=file;referenceObjectUrl=URL.createObjectURL(file);els.referenceImage.src=referenceObjectUrl;els.referenceName.textContent=file.name||'粘贴的图片';els.referenceInfo.textContent=`${file.type||'image'} · ${humanBytes(file.size)}`;els.referenceDrop.hidden=true;els.referencePreview.hidden=false;els.clearReferenceBtn.hidden=false;els.referenceBox.classList.add('has-reference');els.referenceModeHint.textContent='已启用 · 生成时自动走参考图接口';els.generateBtn.textContent='参考图生成';setStatus('参考图已载入。现在生成会自动带上它。','ok')}
function clearReference(){referenceFile=null;if(referenceObjectUrl){URL.revokeObjectURL(referenceObjectUrl);referenceObjectUrl=''}els.referenceInput.value='';els.referenceImage.removeAttribute('src');els.referenceDrop.hidden=false;els.referencePreview.hidden=true;els.clearReferenceBtn.hidden=true;els.referenceBox.classList.remove('has-reference','dragover');els.referenceModeHint.textContent='可选 · 上传后自动切换参考图生成';els.generateBtn.textContent='生成图片'}

function loadSettings(){const s=safeRead(STORAGE_KEY,{});els.apiBase.value=s.apiBase||'';els.apiKey.value=s.apiKey||'';els.imagePath.value=s.imagePath||'/images/generations';els.editPath.value=s.editPath||'/images/edits';if(s.model)els.model.dataset.saved=s.model;if(s.apiBase&&s.apiKey){setStatus('已读取本地 API 设置，可拉取模型','ok');fetchModels().catch(()=>{})}}
function saveSettings(){const s={apiBase:normalizeBase(els.apiBase.value),apiKey:els.apiKey.value.trim(),imagePath:normalizePath(els.imagePath.value,'/images/generations'),editPath:normalizePath(els.editPath.value,'/images/edits'),model:els.model.value||els.model.dataset.saved||''};safeWrite(STORAGE_KEY,s);setStatus('API 设置已保存在本机浏览器','ok');els.settingsDialog.close()}
function authHeaders(){return {'Content-Type':'application/json','Authorization':`Bearer ${els.apiKey.value.trim()}`}}
async function fetchModels(){const base=normalizeBase(els.apiBase.value),key=els.apiKey.value.trim();if(!base||!key)throw new Error('请先填写 API 地址和 Key');els.testBtn.disabled=true;els.testBtn.textContent='连接中…';try{const r=await fetch(`${base}/models`,{headers:{Authorization:`Bearer ${key}`}});if(!r.ok)throw new Error(`模型列表请求失败：HTTP ${r.status}`);const data=await r.json(),list=Array.isArray(data.data)?data.data:Array.isArray(data)?data:[],ids=list.map(x=>typeof x==='string'?x:x?.id).filter(Boolean);if(!ids.length)throw new Error('接口连上了，但没读到模型列表');els.model.innerHTML=ids.map(id=>`<option value="${escapeHtml(id)}">${escapeHtml(id)}</option>`).join('');const saved=els.model.dataset.saved;if(saved&&ids.includes(saved))els.model.value=saved;setStatus(`连接成功 · ${ids.length} 个模型`,'ok');return ids}finally{els.testBtn.disabled=false;els.testBtn.textContent='测试并拉取模型'}}
function composedPrompt(){const prompt=els.prompt.value.trim();if(!prompt)throw new Error('提示词还空着。模型不是算命先生。');const negative=els.negativePrompt.value.trim();return negative?`${prompt}\n\nNegative prompt: ${negative}`:prompt}
function buildPayload(){if(!els.model.value)throw new Error('先选一个模型');const p={model:els.model.value,prompt:composedPrompt(),n:Number(els.count.value||1),size:els.size.value,quality:els.quality.value,response_format:'url'};if(els.seed.value!=='')p.seed=Number(els.seed.value);if(els.cfg.value!=='')p.cfg_scale=Number(els.cfg.value);if(els.steps.value!=='')p.steps=Number(els.steps.value);if(els.style.value.trim())p.style=els.style.value.trim();return p}
function buildReferenceForm(){if(!referenceFile)throw new Error('参考图不见了，请重新上传');if(!els.model.value)throw new Error('先选一个模型');const form=new FormData();form.append('model',els.model.value);form.append('prompt',composedPrompt());form.append('image',referenceFile,referenceFile.name||'reference.png');form.append('n',String(Number(els.count.value||1)));form.append('size',els.size.value);if(els.quality.value)form.append('quality',els.quality.value);if(els.seed.value!=='')form.append('seed',els.seed.value);if(els.cfg.value!=='')form.append('cfg_scale',els.cfg.value);if(els.steps.value!=='')form.append('steps',els.steps.value);if(els.style.value.trim())form.append('style',els.style.value.trim());return form}
async function requestGeneration(base,key){if(referenceFile){const path=normalizePath(els.editPath.value,'/images/edits');const r=await fetch(base+path,{method:'POST',headers:{Authorization:`Bearer ${key}`},body:buildReferenceForm()});return {r,path,mode:'reference'}}const path=normalizePath(els.imagePath.value,'/images/generations');const r=await fetch(base+path,{method:'POST',headers:authHeaders(),body:JSON.stringify(buildPayload())});return {r,path,mode:'text'}}
async function generate(){const base=normalizeBase(els.apiBase.value),key=els.apiKey.value.trim();if(!base||!key){els.settingsDialog.showModal();throw new Error('先配置 API')}els.generateBtn.disabled=true;els.generateBtn.textContent=referenceFile?'参考图生成中…':'正在生成…';setStatus(referenceFile?'参考图和提示词都发出去了，等模型开工…':'请求已发出，等模型把像素揉成一团再展开…');try{const {r,path,mode}=await requestGeneration(base,key);const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data={raw}}if(!r.ok){const detail=data?.error?.message||data?.message||raw.slice(0,240)||`HTTP ${r.status}`;if(mode==='reference'&&(r.status===404||r.status===405))throw new Error(`参考图接口不可用：${path}。去 API 设置里改“参考图路径”。`);throw new Error(detail)}const images=extractImages(data);if(!images.length)throw new Error('接口返回成功，但没找到图片 URL/base64。可能这家接口字段长得比较有个性。');prependHistory(images.map(src=>({src,prompt:els.prompt.value.trim(),model:els.model.value,size:els.size.value,at:Date.now(),reference:!!referenceFile,referenceName:referenceFile?.name||''})));renderHistory();setStatus(`生成完成 · ${images.length} 张${referenceFile?' · 已使用参考图':''}`,'ok')}catch(e){setStatus(e.message||String(e),'bad');throw e}finally{els.generateBtn.disabled=false;els.generateBtn.textContent=referenceFile?'参考图生成':'生成图片'}}
function extractImages(data){const arr=Array.isArray(data?.data)?data.data:Array.isArray(data?.images)?data.images:[],out=[];for(const item of arr){if(typeof item==='string')out.push(item);else if(item?.url)out.push(item.url);else if(item?.b64_json)out.push(`data:image/png;base64,${item.b64_json}`);else if(item?.image_url)out.push(item.image_url)}if(typeof data?.url==='string')out.push(data.url);if(typeof data?.image==='string')out.push(data.image.startsWith('http')||data.image.startsWith('data:')?data.image:`data:image/png;base64,${data.image}`);return out}
function getHistory(){return safeRead(HISTORY_KEY,[])}
function setHistory(v){safeWrite(HISTORY_KEY,v.slice(0,30))}
function prependHistory(items){setHistory([...items,...getHistory()])}
function renderHistory(){const h=getHistory();if(!h.length){els.gallery.classList.add('empty');els.gallery.innerHTML='<div class="empty-state"><div class="empty-icon">✦</div><p>图片会出现在这里。</p><span>历史记录只保存在这个浏览器里。</span></div>';return}els.gallery.classList.remove('empty');els.gallery.innerHTML='';const tpl=$('imageCardTemplate');h.forEach(item=>{const node=tpl.content.cloneNode(true),img=node.querySelector('img');img.src=item.src;const wrap=node.querySelector('.image-wrap'),[w,hh]=String(item.size||'1x1').split('x').map(Number);if(w&&hh)wrap.style.aspectRatio=`${w}/${hh}`;node.querySelector('.meta-copy').textContent=`${item.reference?'参考图 · ':''}${item.model||'unknown'} · ${item.prompt||''}`;node.querySelector('.open-btn').href=item.src;node.querySelector('.copy-btn').addEventListener('click',async()=>{await navigator.clipboard.writeText(item.prompt||'');setStatus('提示词已复制','ok')});els.gallery.appendChild(node)})}
function saveModelOnly(){const s=safeRead(STORAGE_KEY,{});s.model=els.model.value;safeWrite(STORAGE_KEY,s)}

els.settingsBtn.addEventListener('click',()=>els.settingsDialog.showModal());
els.saveSettingsBtn.addEventListener('click',saveSettings);
els.testBtn.addEventListener('click',()=>fetchModels().catch(e=>setStatus(e.message,'bad')));
els.generateBtn.addEventListener('click',()=>generate().catch(()=>{}));
els.model.addEventListener('change',saveModelOnly);
els.clearBtn.addEventListener('click',()=>{try{localStorage.removeItem(HISTORY_KEY)}catch{}renderHistory();setStatus('本地出图历史已清空')});
els.presetChips.addEventListener('click',e=>{const btn=e.target.closest('button[data-text]');if(!btn)return;appendTerms(splitPrompt(btn.dataset.text),{label:`已加入「${btn.textContent.trim()}」`})});
els.randomPromptBtn.addEventListener('click',()=>{const p=['雨后深夜街角，冷白偏粉蓝灯光，成年女性，自然抓拍感','花房内部，半身近景，微侧身回望，柔雾光线，安静疏离气质','复古木质房间，窗边逆光，低饱和粉灰配色，电影静帧感','未来都市天台，夜风，霓虹反光，清透CG插画，强轮廓光'];pushUndo();els.prompt.value=p[Math.floor(Math.random()*p.length)];els.recipeHint.textContent='换了一个场景灵感。'});
els.recipeBtn.addEventListener('click',applyRecipe);
els.libraryBtn.addEventListener('click',openLibrary);
els.undoPromptBtn.addEventListener('click',undoPrompt);
els.dedupeBtn.addEventListener('click',dedupePrompt);
els.clearPromptBtn.addEventListener('click',clearPrompt);
els.libraryCloseBtn.addEventListener('click',()=>els.libraryDialog.close());
els.smartRecipeBtn.addEventListener('click',()=>{const r=applyRecipe();els.recipeHint.textContent=`已套用「${r.name}」；词库保持打开，想改哪条继续点。`});
els.randomWordsBtn.addEventListener('click',addRandomWords);
els.librarySearch.addEventListener('input',renderLibrary);
els.libraryTabs.addEventListener('click',e=>{const btn=e.target.closest('[data-library-mode]');if(!btn)return;libraryMode=btn.dataset.libraryMode;els.libraryTabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));renderLibrary()});
els.libraryDialog.addEventListener('click',e=>{if(e.target===els.libraryDialog)els.libraryDialog.close()});

els.referenceDrop.addEventListener('click',()=>els.referenceInput.click());
els.replaceReferenceBtn.addEventListener('click',()=>els.referenceInput.click());
els.clearReferenceBtn.addEventListener('click',clearReference);
els.referenceInput.addEventListener('change',()=>setReference(els.referenceInput.files?.[0]));
['dragenter','dragover'].forEach(type=>els.referenceBox.addEventListener(type,e=>{e.preventDefault();els.referenceBox.classList.add('dragover')}));
['dragleave','drop'].forEach(type=>els.referenceBox.addEventListener(type,e=>{e.preventDefault();els.referenceBox.classList.remove('dragover')}));
els.referenceBox.addEventListener('drop',e=>{const file=[...(e.dataTransfer?.files||[])].find(f=>String(f.type||'').startsWith('image/'));if(file)setReference(file)});
document.addEventListener('paste',e=>{const file=[...(e.clipboardData?.files||[])].find(f=>String(f.type||'').startsWith('image/'));if(file)setReference(file)});

loadSettings();
renderHistory();
renderLibrary();
