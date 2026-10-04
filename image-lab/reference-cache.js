(() => {
  const PREPARED_KEY='ling-image-lab-reference-url-v1';
  const MIN_VALID_MS=60*1000;
  let preparedReference=null;
  let prepareBusy=false;
  let prepareButton=null;
  let prepareNote=null;

  function token(){try{return localStorage.getItem('privateSitesSession')||''}catch{return''}}
  function validPrepared(meta=preparedReference){return !!(referenceFile&&meta&&typeof meta.url==='string'&&/^https:\/\//i.test(meta.url)&&typeof meta.path==='string'&&Number(meta.expiresAt)>Date.now()+MIN_VALID_MS);}
  function remaining(meta=preparedReference){const ms=Math.max(0,Number(meta?.expiresAt||0)-Date.now());if(ms>=3600000)return `${Math.ceil(ms/3600000)} 小时`;if(ms>=60000)return `${Math.ceil(ms/60000)} 分钟`;return '即将过期';}

  function injectStyle(){
    if(document.getElementById('referenceUrlStyle'))return;
    const style=document.createElement('style');style.id='referenceUrlStyle';style.textContent=`
      .reference-url-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
      .reference-url-tools .reference-url-note{font-size:12px;line-height:1.5;color:var(--muted,#9d93aa);flex:1 1 180px}
      .reference-url-tools .ghost-btn{white-space:nowrap}
      .reference-url-tools.ready .reference-url-note{color:#9fd8b8}
    `;document.head.appendChild(style);
  }
  function ensureUi(){
    if(prepareButton)return;
    const preview=els.referencePreview||document.getElementById('referencePreview');if(!preview)return;
    injectStyle();
    const wrap=document.createElement('div');wrap.className='reference-url-tools';wrap.id='referenceUrlTools';
    prepareButton=document.createElement('button');prepareButton.type='button';prepareButton.className='ghost-btn';prepareButton.id='prepareReferenceUrlBtn';
    prepareNote=document.createElement('span');prepareNote.className='reference-url-note';prepareNote.id='referenceUrlNote';
    prepareButton.addEventListener('click',prepareReferenceUrl);
    wrap.append(prepareButton,prepareNote);preview.appendChild(wrap);
  }
  function updateUi(){
    ensureUi();if(!prepareButton)return;
    const wrap=document.getElementById('referenceUrlTools');
    if(!referenceFile){prepareButton.hidden=true;if(wrap)wrap.classList.remove('ready');return;}
    prepareButton.hidden=false;prepareButton.disabled=prepareBusy;
    if(prepareBusy){prepareButton.textContent='正在适配 URL…';prepareNote.textContent='只做这一次，生成时不会重复上传。';if(wrap)wrap.classList.remove('ready');return;}
    if(validPrepared()){
      prepareButton.textContent='重新适配 URL';prepareNote.textContent=`已适配 · ${remaining()}内可反复使用`;if(wrap)wrap.classList.add('ready');
      if(els.referenceModeHint)els.referenceModeHint.textContent='URL 已适配 · 生成时直接复用，不再重复创建';
    }else{
      prepareButton.textContent='适配参考图 URL';prepareNote.textContent='适配一次，后续生成重复使用同一 URL';if(wrap)wrap.classList.remove('ready');
      if(els.referenceModeHint)els.referenceModeHint.textContent='已上传 · 需要 URL 时先点“适配参考图 URL”';
    }
  }
  async function storePrepared(meta){
    preparedReference=meta||null;try{await queueStorage(()=>dbPut(PREPARED_KEY,preparedReference));}catch{}updateUi();
  }
  async function releasePrepared(meta){
    if(!meta?.path)return;const session=token();if(!session)return;
    try{await fetch(API_BRIDGE_ENDPOINT,{method:'POST',headers:{'x-site-access':session,'Content-Type':'application/json'},body:JSON.stringify({action:'release-reference',referencePath:meta.path}),signal:AbortSignal.timeout(10000)});}catch{}
  }
  async function invalidatePrepared({releaseRemote=false}={}){
    const old=preparedReference;preparedReference=null;try{await queueStorage(()=>dbPut(PREPARED_KEY,null));}catch{}updateUi();if(releaseRemote&&old)releasePrepared(old);
  }
  async function loadPrepared(){
    try{
      const stored=await dbGet(PREPARED_KEY);preparedReference=stored||null;
      if(preparedReference&&!validPrepared()){const old=preparedReference;preparedReference=null;await queueStorage(()=>dbPut(PREPARED_KEY,null)).catch(()=>{});releasePrepared(old);}
    }catch{preparedReference=null;}
    updateUi();
  }
  function connectionForPrepare(){
    const base=normalizeBase(els.apiBase.value),key=els.apiKey.value.trim(),path=normalizePath(els.editPath.value,'/images/edits');
    if(!base||!key)throw new Error('先把 API 方案填好并保存。');
    return {base,key,path};
  }
  async function prepareReferenceUrl(){
    if(prepareBusy)return;if(!referenceFile){setStatus('先上传参考图。','bad');return;}
    let connection;try{connection=connectionForPrepare();}catch(e){setStatus(e.message,'bad');els.settingsDialog?.showModal();return;}
    const session=token();if(!session){setStatus('登录已过期，请刷新页面重新进入。','bad');return;}
    const fileAtStart=referenceFile,revisionAtStart=referenceRevision,previous=preparedReference;
    prepareBusy=true;updateUi();setStatus('正在适配参考图 URL…');
    try{
      const form=new FormData();form.append('action','prepare-reference');form.append('base',connection.base);form.append('key',connection.key);form.append('path',connection.path);form.append('method','POST');form.append('reference',fileAtStart,fileAtStart.name||'reference.png');
      const r=await fetch(API_BRIDGE_ENDPOINT,{method:'POST',headers:{'x-site-access':session},body:form});const raw=await r.text();let data={};try{data=JSON.parse(raw)}catch{}
      if(!r.ok)throw new Error(data?.error?.message||data?.message||`URL 适配失败（HTTP ${r.status}）`);
      if(typeof data.url!=='string'||typeof data.path!=='string'||!Number(data.expiresAt))throw new Error('URL 适配响应不完整，请再试一次。');
      if(referenceFile!==fileAtStart||referenceRevision!==revisionAtStart){releasePrepared(data);return;}
      await storePrepared({url:data.url,path:data.path,expiresAt:Number(data.expiresAt),createdAt:Date.now(),name:fileAtStart.name||'',size:fileAtStart.size||0,type:fileAtStart.type||''});
      if(previous?.path&&previous.path!==data.path)releasePrepared(previous);
      setStatus('参考图 URL 已适配 ✓ 现在可以反复生成，不会每次重建 URL。','ok');
    }catch(e){setStatus(e?.message||'参考图 URL 适配失败，请稍后再试。','bad');}
    finally{prepareBusy=false;updateUi();}
  }

  const originalSetReference=setReference;
  setReference=function(file){
    originalSetReference(file);
    if(referenceFile===file){invalidatePrepared({releaseRemote:true});updateUi();}
  };
  const originalClearReference=clearReference;
  clearReference=function(){const old=preparedReference;originalClearReference();preparedReference=null;queueStorage(()=>dbPut(PREPARED_KEY,null)).catch(()=>{});updateUi();if(old)releasePrepared(old);};

  const originalRequestGeneration=requestGeneration;
  requestGeneration=async function(request,signal){
    if(request?.file&&request.referenceFormat==='auto'&&shouldBridge(request.base,request.connectionMode)&&usesApiBridge(request.base)){request.referenceFormat='url';request.autoConverted=true;}
    if(request?.file&&request.referenceFormat==='url'){
      if(!validPrepared())throw new Error('参考图 URL 还没适配或已经过期。先点“适配参考图 URL”，成功后再生成。');
      const session=token();if(!session)throw new Error('登录已过期，请刷新页面重新进入。');
      return fetch(API_BRIDGE_ENDPOINT,{method:'POST',headers:{'x-site-access':session,'Content-Type':'application/json'},body:JSON.stringify({base:request.base,key:request.key,path:request.path,method:'POST',payload:request.payload,referenceField:request.referenceField,referenceFormat:'url',referenceUrl:preparedReference.url,referencePath:preparedReference.path}),signal});
    }
    return originalRequestGeneration(request,signal);
  };

  for(const id of ['referenceFormat','referenceField','connectionMode'])document.getElementById(id)?.addEventListener('change',updateUi);
  ensureUi();updateUi();
  Promise.resolve(workspaceReady).then(loadPrepared).catch(()=>updateUi());
})();
