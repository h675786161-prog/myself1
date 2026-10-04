const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const API = 'https://ibpffxzdjvgydnhmvmvc.supabase.co/functions/v1/code-workbench';

const state = {
  session: localStorage.getItem('lqcode.session') || '',
  repo: '', baseBranch: 'main', model: '', tree: [], contextFiles: new Map(),
  pendingChanges: [], currentFile: null, appliedBranch: '', busy: false,
};

const els = {
  chatPane: $('#chatPane'), hero: $('#hero'), messages: $('#messages'), prompt: $('#promptInput'), send: $('#sendBtn'),
  menu: $('#menuBtn'), settings: $('#settingsBtn'), quickSetup: $('#quickSetupBtn'), openFiles: $('#openFilesBtn'),
  projectDrawer: $('#projectDrawer'), detailDrawer: $('#detailDrawer'), settingsDialog: $('#settingsDialog'), diffDialog: $('#diffDialog'),
  fileSearch: $('#fileSearch'), fileList: $('#fileList'), refreshTree: $('#refreshTreeBtn'), repoLabel: $('#repoLabel'), statusText: $('#statusText'),
  contextBar: $('#contextBar'), autoLocate: $('#autoLocate'), modelBadge: $('#modelBadge'), changesList: $('#changesList'), changeCount: $('#changeCount'),
  applyChanges: $('#applyChangesBtn'), discardChanges: $('#discardChangesBtn'), workBranch: $('#workBranch'), commitMessage: $('#commitMessage'),
  createPr: $('#createPrBtn'), gitLog: $('#gitLog'), detailTitle: $('#detailTitle'), detailSubtitle: $('#detailSubtitle'), detailContent: $('#detailContent'),
  addContext: $('#addContextBtn'), removeContext: $('#removeContextBtn'), repoInput: $('#repoInput'), baseBranchInput: $('#baseBranchInput'),
  githubTokenInput: $('#githubTokenInput'), aiBaseUrlInput: $('#aiBaseUrlInput'), aiKeyInput: $('#aiKeyInput'), modelSelect: $('#modelSelect'),
  manualModelInput: $('#manualModelInput'), loadModels: $('#loadModelsBtn'), saveSettings: $('#saveSettingsBtn'), diffTitle: $('#diffTitle'),
  diffMeta: $('#diffMeta'), diffContent: $('#diffContent'), closeDiff: $('#closeDiffBtn'), toast: $('#toast'),
};

function escapeHtml(v = '') { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function toast(msg, ms = 2400) { els.toast.textContent = msg; els.toast.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => els.toast.classList.remove('show'), ms); }
function openDrawer(el) { el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); }
function closeDrawer(el) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); }
function connectionLabel() { return state.repo ? `${state.repo} · ${state.baseBranch}` : '未连接'; }
function setBusy(v, label = '') { state.busy = v; els.send.disabled = v; els.applyChanges.disabled = v || !state.pendingChanges.length; els.statusText.textContent = v ? (label || '处理中…') : connectionLabel(); }
function renderConnection() { els.repoLabel.textContent = connectionLabel(); els.statusText.textContent = connectionLabel(); els.modelBadge.textContent = state.model || '未选模型'; }
function resizePrompt() { els.prompt.style.height = 'auto'; els.prompt.style.height = `${Math.min(140, els.prompt.scrollHeight)}px`; }

function addMessage(role, text, meta = '') {
  els.hero.classList.add('hidden');
  const wrap = document.createElement('div'); wrap.className = `message ${role}`;
  wrap.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>${meta ? `<div class="message-meta">${escapeHtml(meta)}</div>` : ''}`;
  els.messages.appendChild(wrap); requestAnimationFrame(() => els.chatPane.scrollTop = els.chatPane.scrollHeight); return wrap;
}
function addActionCard(title, text, actions = []) {
  els.hero.classList.add('hidden'); const wrap = document.createElement('div'); wrap.className = 'message assistant';
  const card = document.createElement('div'); card.className = 'action-card';
  card.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p><div class="action-row"></div>`;
  const row = card.querySelector('.action-row');
  actions.forEach(({label, onClick, primary}) => { const b = document.createElement('button'); b.className = primary ? 'primary-btn' : 'small-btn'; b.textContent = label; b.onclick = onClick; row.appendChild(b); });
  wrap.appendChild(card); els.messages.appendChild(wrap); requestAnimationFrame(() => els.chatPane.scrollTop = els.chatPane.scrollHeight);
}

async function api(action, payload = {}, opts = {}) {
  const headers = {'Content-Type':'application/json'};
  if (state.session && !opts.noAuth) headers.Authorization = `Bearer ${state.session}`;
  const res = await fetch(API, {method:'POST', headers, body: JSON.stringify({action, ...payload})});
  const text = await res.text(); let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(`服务端返回异常：${text.slice(0,180)}`); }
  if (!res.ok) {
    if (res.status === 401 && action !== 'login') { state.session = ''; localStorage.removeItem('lqcode.session'); }
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }
  return data;
}

function formPayload(includeSecrets = true) {
  const payload = {
    repo: els.repoInput.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, ''),
    base_branch: els.baseBranchInput.value.trim() || 'main',
    ai_base_url: els.aiBaseUrlInput.value.trim(),
    model: els.manualModelInput.value.trim() || els.modelSelect.value || state.model || '',
  };
  if (includeSecrets && els.githubTokenInput.value.trim()) payload.github_token = els.githubTokenInput.value.trim();
  if (includeSecrets && els.aiKeyInput.value.trim()) payload.ai_key = els.aiKeyInput.value.trim();
  return payload;
}

async function ensureSession({allowExisting = true} = {}) {
  if (allowExisting && state.session) return true;
  const githubToken = els.githubTokenInput.value.trim();
  if (!githubToken) throw new Error('第一次连接需要 GitHub Fine-grained Token');
  const data = await api('login', formPayload(true), {noAuth:true});
  state.session = data.token; localStorage.setItem('lqcode.session', state.session);
  applyConfig(data.config || {});
  els.githubTokenInput.value = ''; els.aiKeyInput.value = '';
  return true;
}

function applyConfig(cfg) {
  if (cfg.repo) state.repo = cfg.repo;
  if (cfg.base_branch) state.baseBranch = cfg.base_branch;
  if (cfg.model) state.model = cfg.model;
  els.repoInput.value = state.repo || els.repoInput.value;
  els.baseBranchInput.value = state.baseBranch || 'main';
  if (cfg.ai_base_url) els.aiBaseUrlInput.value = cfg.ai_base_url;
  if (cfg.model) { state.model = cfg.model; els.manualModelInput.value = cfg.model; }
  renderConnection();
}

async function loadStatus() {
  if (!state.session) return;
  try { const data = await api('status'); applyConfig(data.config || {}); }
  catch { state.session = ''; localStorage.removeItem('lqcode.session'); }
}

async function saveSettings() {
  setBusy(true, '保存连接…');
  try {
    if (!state.session) await ensureSession({allowExisting:false});
    else {
      const data = await api('setup', formPayload(true)); applyConfig(data.config || {});
      els.githubTokenInput.value = ''; els.aiKeyInput.value = '';
    }
    state.repo = els.repoInput.value.trim(); state.baseBranch = els.baseBranchInput.value.trim() || 'main';
    state.model = els.manualModelInput.value.trim() || els.modelSelect.value || state.model;
    els.settingsDialog.close(); renderConnection(); toast('连接信息已放到私有后端');
    await refreshTree();
  } catch (e) { toast(`连接失败：${e.message}`, 4000); }
  finally { setBusy(false); }
}

async function loadModels() {
  els.loadModels.disabled = true; els.loadModels.textContent = '拉取中…';
  try {
    if (!state.session) await ensureSession({allowExisting:false});
    else if (els.aiBaseUrlInput.value.trim() || els.aiKeyInput.value.trim()) await api('setup', formPayload(true));
    const data = await api('models'); const models = data.models || [];
    els.modelSelect.innerHTML = `<option value="">选择模型</option>${models.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('')}`;
    if (state.model && models.includes(state.model)) els.modelSelect.value = state.model;
    toast(`拉到 ${models.length} 个模型`);
  } catch (e) { toast(`拉取失败：${e.message}`, 4000); }
  finally { els.loadModels.disabled = false; els.loadModels.textContent = '拉取模型'; }
}

async function refreshTree() {
  if (!state.session || !state.repo) return els.settingsDialog.showModal();
  setBusy(true, '读取仓库…');
  try {
    const data = await api('tree', {repo:state.repo, branch:state.baseBranch}); state.tree = data.files || []; renderFileList(); toast(`已读取 ${state.tree.length} 个文件`);
  } catch (e) { toast(`仓库读取失败：${e.message}`, 4000); }
  finally { setBusy(false); }
}
function likelyText(path) { return !/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|mp3|mp4|webm|zip|pdf|bin|lock)$/i.test(path) && !/(^|\/)(node_modules|dist|build|\.git)(\/|$)/.test(path); }
function renderFileList() {
  const q = els.fileSearch.value.trim().toLowerCase(); const rows = state.tree.filter(f => likelyText(f.path) && (!q || f.path.toLowerCase().includes(q))).slice(0,500);
  if (!rows.length) { els.fileList.className='file-list empty-state'; els.fileList.textContent = state.tree.length ? '没搜到文件' : '连接仓库后显示文件'; return; }
  els.fileList.className='file-list'; els.fileList.innerHTML = rows.map(f => { const p=f.path.split('/'), n=p.pop(); return `<button class="file-row" data-path="${escapeHtml(f.path)}"><div class="file-main"><div class="file-name">${escapeHtml(n)}</div><div class="file-path">${escapeHtml(p.join('/')||'/')}</div></div><span class="file-badge">${state.contextFiles.has(f.path)?'上下文':''}</span></button>`; }).join('');
  $$('#fileList .file-row').forEach(b => b.onclick = () => openFile(b.dataset.path));
}
async function fetchFile(path, ref = state.baseBranch) { const d = await api('file',{repo:state.repo,path,ref}); return {path,content:d.content||'',sha:d.sha,size:d.size||0}; }
async function openFile(path) {
  openDrawer(els.detailDrawer); els.detailTitle.textContent=path.split('/').pop(); els.detailSubtitle.textContent=path; els.detailContent.textContent='读取中…';
  try { const f=await fetchFile(path); state.currentFile=f; els.detailContent.textContent=f.content; const has=state.contextFiles.has(path); els.addContext.classList.toggle('hidden',has); els.removeContext.classList.toggle('hidden',!has); }
  catch(e){ els.detailContent.textContent=`读取失败：${e.message}`; }
}
function renderContext() { const keys=[...state.contextFiles.keys()]; els.contextBar.classList.toggle('hidden',!keys.length); els.contextBar.innerHTML=keys.map(p=>`<button class="context-chip" data-path="${escapeHtml(p)}">${escapeHtml(p.split('/').pop())} ×</button>`).join(''); $$('#contextBar .context-chip').forEach(b=>b.onclick=()=>{state.contextFiles.delete(b.dataset.path);renderContext();renderFileList();}); }
function addCurrentToContext(){if(!state.currentFile)return;state.contextFiles.set(state.currentFile.path,state.currentFile.content);renderContext();renderFileList();els.addContext.classList.add('hidden');els.removeContext.classList.remove('hidden');}
function removeCurrentFromContext(){if(!state.currentFile)return;state.contextFiles.delete(state.currentFile.path);renderContext();renderFileList();els.addContext.classList.remove('hidden');els.removeContext.classList.add('hidden');}

async function aiChat(messages, options={}) { const d=await api('ai',{messages,model:state.model,temperature:options.temperature??0.1,max_tokens:options.maxTokens||12000}); return d.reply||''; }
function parseJsonReply(raw) { const c=String(raw).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''); try{return JSON.parse(c);}catch{const a=c.indexOf('{'),b=c.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(c.slice(a,b+1));throw new Error('模型没有按约定返回 JSON');} }
function candidatePaths(){const x=/(^|\/)(node_modules|dist|build|vendor|coverage|\.git)(\/|$)|\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|mp3|mp4|zip|pdf|lock)$/i;return state.tree.map(v=>v.path).filter(p=>!x.test(p)).slice(0,700);}
async function autoLocateFiles(task){const paths=candidatePaths();if(!paths.length)return[];const raw=await aiChat([{role:'system',content:'你是代码仓库定位助手。根据任务和文件树挑最可能需要读取的文件。只返回 JSON：{"read":["path"],"note":"一句话"}。read 最多 8 个，路径必须来自给定列表，不要编造。'},{role:'user',content:`任务：${task}\n\n文件树：\n${paths.join('\n')}`}],{temperature:0,maxTokens:1200});const p=parseJsonReply(raw);return(p.read||[]).filter(x=>paths.includes(x)).slice(0,8);}
async function gatherContext(task){const files=new Map(state.contextFiles);if(els.autoLocate.checked){if(!state.tree.length)await refreshTree();for(const p of await autoLocateFiles(task)){if(files.has(p))continue;try{const f=await fetchFile(p);if(f.content.length<=60000)files.set(p,f.content);}catch{}}}let total=0;const chunks=[];for(const[p,c]of files){if(total>160000)break;const clip=c.slice(0,60000);chunks.push(`\n===== FILE: ${p} =====\n${clip}`);total+=clip.length;}return{files,text:chunks.join('\n')};}
async function askForChanges(task){const ctx=await gatherContext(task);if(!ctx.text)throw new Error('没有拿到相关文件。先刷新仓库或手动加入上下文。');const system='你是手机端代码修改代理。规则：1. 不要擅自重构与任务无关的成熟功能。2. 仅修改必要文件。3. 返回完整文件内容，不要返回 diff 片段。4. 不删除文件。5. 只返回严格 JSON：{"summary":"...","changes":[{"path":"仓库路径","reason":"...","content":"完整新内容"}]}。6. path 必须是已提供文件之一，除非任务明确要求新增文件。';const raw=await aiChat([{role:'system',content:system},{role:'user',content:`任务：${task}\n\n仓库上下文：${ctx.text}`}],{temperature:.1,maxTokens:16000});const p=parseJsonReply(raw);if(!Array.isArray(p.changes)||!p.changes.length)throw new Error(p.summary||'模型没有返回可应用改动');return p;}
async function hydrateChanges(changes){const out=[];for(const ch of changes.slice(0,12)){if(!ch?.path||typeof ch.content!=='string')continue;let old=state.contextFiles.get(ch.path)||'';if(!old&&state.tree.some(x=>x.path===ch.path)){try{old=(await fetchFile(ch.path)).content;}catch{}}out.push({path:ch.path,reason:ch.reason||'',content:ch.content,oldContent:old});}return out;}
async function sendPrompt(){const task=els.prompt.value.trim();if(!task||state.busy)return;if(!state.session||!state.repo||!state.model){els.settingsDialog.showModal();return toast('先连接仓库和模型');}addMessage('user',task);els.prompt.value='';resizePrompt();setBusy(true,'AI 正在翻仓库…');try{const r=await askForChanges(task);state.pendingChanges=await hydrateChanges(r.changes);renderChanges();addActionCard('已生成修改方案',`${r.summary||'修改已准备'}（${state.pendingChanges.length} 个文件）`,[{label:'查看改动',primary:true,onClick:()=>{openDrawer(els.projectDrawer);switchProjectTab('changes');}},{label:'全部丢弃',onClick:discardChanges}]);}catch(e){addMessage('assistant',`没改成：${e.message}`,'没有向 GitHub 写入任何东西');}finally{setBusy(false);}}

function renderChanges(){els.changeCount.textContent=String(state.pendingChanges.length);els.applyChanges.disabled=state.busy||!state.pendingChanges.length;if(!state.pendingChanges.length){els.changesList.className='changes-list empty-state';els.changesList.textContent='还没有待应用改动';return;}els.changesList.className='changes-list';els.changesList.innerHTML=state.pendingChanges.map((ch,i)=>`<button class="change-row" data-index="${i}"><div class="change-main"><div class="change-name">${escapeHtml(ch.path)}</div><div class="change-reason">${escapeHtml(ch.reason||'修改文件')}</div></div><span class="file-badge">Diff</span></button>`).join('');$$('#changesList .change-row').forEach(b=>b.onclick=()=>showDiff(Number(b.dataset.index)));}
function diffLines(aText,bText){const a=String(aText).split('\n'),b=String(bText).split('\n');if(a.length*b.length>220000)return[{type:'del',text:`--- 原文件 (${a.length} 行) ---`},...a.slice(0,260).map(x=>({type:'del',text:`- ${x}`})),{type:'add',text:`+++ 新文件 (${b.length} 行) +++`},...b.slice(0,260).map(x=>({type:'add',text:`+ ${x}`})),{type:'same',text:'… 大文件预览已截断 …'}];const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);const o=[];let i=0,j=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){o.push({type:'same',text:`  ${a[i++]}`});j++;}else if(dp[i+1][j]>=dp[i][j+1])o.push({type:'del',text:`- ${a[i++]}`});else o.push({type:'add',text:`+ ${b[j++]}`});}while(i<a.length)o.push({type:'del',text:`- ${a[i++]}`});while(j<b.length)o.push({type:'add',text:`+ ${b[j++]}`});return o;}
function showDiff(i){const ch=state.pendingChanges[i];if(!ch)return;els.diffTitle.textContent=ch.path;els.diffMeta.textContent=ch.reason||'改动预览';els.diffContent.innerHTML=diffLines(ch.oldContent,ch.content).map(l=>`<span class="diff-line ${l.type}">${escapeHtml(l.text)}</span>\n`).join('');els.diffDialog.showModal();}
function discardChanges(){state.pendingChanges=[];renderChanges();toast('已丢弃未应用改动');}
function logGit(t){const r=document.createElement('div');r.textContent=t;els.gitLog.prepend(r);}
async function applyChanges(){if(!state.pendingChanges.length||state.busy)return;const branch=els.workBranch.value.trim();if(!branch||branch===state.baseBranch)return toast('工作分支不能空，也不能等于 main');setBusy(true,'写入工作分支…');try{await api('ensure_branch',{repo:state.repo,branch,base:state.baseBranch});const msg=els.commitMessage.value.trim()||'feat: apply AI code changes';for(const ch of state.pendingChanges){await api('put_file',{repo:state.repo,branch,path:ch.path,content:ch.content,message:`${msg}: ${ch.path}`});logGit(`✓ ${ch.path}`);}state.appliedBranch=branch;els.createPr.disabled=false;addMessage('assistant',`已经把 ${state.pendingChanges.length} 个文件写入 ${branch}。基础分支还没动。`,'GitHub 工作分支');state.pendingChanges=[];renderChanges();switchProjectTab('git');}catch(e){logGit(`✗ ${e.message}`);toast(`应用失败：${e.message}`,4000);}finally{setBusy(false);}}
async function createPullRequest(){const branch=state.appliedBranch||els.workBranch.value.trim();if(!branch)return toast('还没有工作分支');setBusy(true,'创建 Draft PR…');try{const d=await api('create_pr',{repo:state.repo,head:branch,base:state.baseBranch,title:els.commitMessage.value.trim()||'AI code changes',draft:true});addActionCard(`Draft PR #${d.number} 已创建`,d.url,[{label:'复制链接',primary:true,onClick:()=>navigator.clipboard.writeText(d.url).then(()=>toast('已复制 PR 链接'))}]);logGit(`PR #${d.number} ${d.url}`);}catch(e){toast(`PR 创建失败：${e.message}`,4000);}finally{setBusy(false);}}
function switchProjectTab(n){$$('.project-tabs .tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.projectTab===n));['files','changes','git'].forEach(t=>$(`#${t}Tab`).classList.toggle('active',t===n));}

function wire(){els.menu.onclick=()=>openDrawer(els.projectDrawer);els.settings.onclick=()=>els.settingsDialog.showModal();els.quickSetup.onclick=()=>els.settingsDialog.showModal();els.openFiles.onclick=()=>openDrawer(els.projectDrawer);$$('.close-drawer').forEach(b=>b.onclick=()=>closeDrawer($(`#${b.dataset.close}`)));$$('.project-tabs .tab-btn').forEach(b=>b.onclick=()=>switchProjectTab(b.dataset.projectTab));els.fileSearch.oninput=renderFileList;els.refreshTree.onclick=refreshTree;els.addContext.onclick=addCurrentToContext;els.removeContext.onclick=removeCurrentFromContext;els.loadModels.onclick=loadModels;els.saveSettings.onclick=e=>{e.preventDefault();saveSettings();};els.send.onclick=sendPrompt;els.prompt.oninput=resizePrompt;els.prompt.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendPrompt();}};els.applyChanges.onclick=applyChanges;els.discardChanges.onclick=discardChanges;els.createPr.onclick=createPullRequest;els.closeDiff.onclick=()=>els.diffDialog.close();els.modelSelect.onchange=()=>{if(els.modelSelect.value){els.manualModelInput.value='';state.model=els.modelSelect.value;renderConnection();}};}

async function init(){wire();resizePrompt();renderChanges();renderContext();if(!els.workBranch.value)els.workBranch.value=`ai/mobile-${Date.now().toString().slice(-6)}`;await loadStatus();renderConnection();if(state.session&&state.repo)refreshTree();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}
init();
