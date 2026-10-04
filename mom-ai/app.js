const API_ENDPOINT = 'https://ibpffxzdjvgydnhmvmvc.supabase.co/functions/v1/mom-ai';
const STORAGE_KEY = 'mom-ai.state.v2';
const LEGACY_STORAGE_KEY = 'mom-ai.state.v1';
const TOKEN_KEY = 'mom-ai.session.v1';
const PREF_KEY = 'mom-ai.prefs.v1';
const DRAFT_KEY = 'mom-ai.drafts.v1';
const MAX_LOCAL_CONVERSATIONS = 30;
const MAX_MESSAGES_PER_CHAT = 120;
const FONT_LEVELS = ['normal', 'large', 'xl'];

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const uid = () => crypto.randomUUID?.() || String(Date.now()) + '-' + Math.random().toString(16).slice(2);

let state = loadLocalState();
let token = localStorage.getItem(TOKEN_KEY) || '';
let prefs = loadJson(PREF_KEY, { fontSize: 'large' });
let drafts = loadJson(DRAFT_KEY, {});
let sending = false;
let syncTimer = null;
let recognition = null;
let isComposing = false;
let historyQuery = '';
let pendingError = null;
let requestController = null;
let speakingMessageId = '';

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function emptyState() {
  return {
    version: 2,
    activeId: '',
    conversations: [],
    updatedAt: '1970-01-01T00:00:00.000Z'
  };
}

function normalizeState(raw) {
  const base = emptyState();
  const list = Array.isArray(raw?.conversations) ? raw.conversations : [];
  const conversations = list.slice(0, MAX_LOCAL_CONVERSATIONS).map(c => ({
    id: String(c?.id || uid()),
    title: String(c?.title || '新对话').slice(0, 60),
    createdAt: c?.createdAt || new Date().toISOString(),
    updatedAt: c?.updatedAt || c?.createdAt || new Date().toISOString(),
    messages: Array.isArray(c?.messages)
      ? c.messages
          .slice(-MAX_MESSAGES_PER_CHAT)
          .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
          .map(m => ({
            id: String(m.id || uid()),
            role: m.role,
            content: String(m.content || '').slice(0, 30000),
            createdAt: m.createdAt || new Date().toISOString()
          }))
      : []
  }));
  let activeId = String(raw?.activeId || '');
  if (!conversations.some(c => c.id === activeId)) activeId = conversations[0]?.id || '';
  return {
    ...base,
    ...raw,
    version: 2,
    activeId,
    conversations,
    updatedAt: raw?.updatedAt || base.updatedAt
  };
}

function loadLocalState() {
  const current = loadJson(STORAGE_KEY, null);
  if (current) return normalizeState(current);
  const legacy = loadJson(LEGACY_STORAGE_KEY, null);
  if (legacy) {
    const migrated = normalizeState(legacy);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }
  return emptyState();
}

function persistLocal(touch = false) {
  if (touch) state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function savePrefs() {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}

function saveDrafts() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

function draftKey(id = state.activeId) {
  return id || '__new__';
}

function saveCurrentDraft() {
  const input = $('#input');
  if (!input) return;
  const key = draftKey();
  const value = input.value;
  if (value.trim()) drafts[key] = value;
  else delete drafts[key];
  saveDrafts();
}

function loadCurrentDraft() {
  const input = $('#input');
  if (!input) return;
  input.value = drafts[draftKey()] || '';
  autoGrow();
}

function clearCurrentDraft() {
  delete drafts[draftKey()];
  saveDrafts();
}

function getActive() {
  return state.conversations.find(c => c.id === state.activeId) || null;
}

function ensureConversation() {
  let c = getActive();
  if (c) return c;
  c = {
    id: uid(),
    title: '新对话',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };
  const newDraft = drafts.__new__;
  if (newDraft) {
    delete drafts.__new__;
    drafts[c.id] = newDraft;
    saveDrafts();
  }
  state.conversations.unshift(c);
  state.activeId = c.id;
  persistLocal(true);
  return c;
}

function titleFrom(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '新对话';
  return clean.length > 24 ? clean.slice(0, 24) + '…' : clean;
}

function fmtTime(value) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return '';
  }
}

function fmtHistoryTime(value) {
  try {
    const d = new Date(value);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return '今天 ' + fmtTime(value);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return '昨天 ' + fmtTime(value);
    return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    return '';
  }
}

function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

function renderMarkdown(text) {
  let s = esc(text);
  const codeBlocks = [];
  s = s.replace(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g, (_, code) => {
    const key = '@@CODE' + codeBlocks.length + '@@';
    codeBlocks.push('<pre><code>' + code.replace(/^\n|\n$/g, '') + '</code></pre>');
    return key;
  });
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>');
  s = s.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  s = s.replace(/(?:<li>.*<\/li>\n?)+/g, block => '<ul>' + block + '</ul>');
  s = s.replace(/^#{1,3}\s+(.+)$/gm, '<strong class="md-heading">$1</strong>');
  const parts = s.split(/\n{2,}/).map(part => {
    if (/^<(ul|ol|pre|blockquote)/.test(part)) return part;
    return '<p>' + part.replace(/\n/g, '<br>') + '</p>';
  });
  s = parts.join('');
  codeBlocks.forEach((html, i) => { s = s.replace('@@CODE' + i + '@@', html); });
  return s;
}

function lastPreview(c) {
  const m = [...(c.messages || [])].reverse().find(x => x.content?.trim());
  if (!m) return '还没有消息';
  const text = m.content.replace(/\s+/g, ' ').trim();
  return text.length > 34 ? text.slice(0, 34) + '…' : text;
}

function renderMessages({ scroll = false } = {}) {
  const box = $('#messages');
  const c = getActive();
  const messages = c?.messages || [];
  $('#welcomeCard').classList.toggle('hidden', messages.length > 0);

  box.innerHTML = messages.map((m, index) => {
    const mine = m.role === 'user';
    const lastAssistant = !mine && index === messages.length - 1;
    const speakButton = !mine && 'speechSynthesis' in window
      ? '<button class="message-action" type="button" data-speak-id="' + esc(m.id) + '">' + (speakingMessageId === m.id ? '停止朗读' : '朗读') + '</button>'
      : '';
    return '<div class="message-row ' + (mine ? 'user' : 'assistant') + '" data-message-id="' + esc(m.id) + '">' +
      (mine ? '' : '<div class="msg-avatar">七</div>') +
      '<div class="message">' +
        '<div class="bubble' + (mine ? '' : ' md') + '">' + (mine ? esc(m.content).replace(/\n/g, '<br>') : renderMarkdown(m.content)) + '</div>' +
        '<div class="message-meta"><span>' + fmtTime(m.createdAt) + '</span></div>' +
        (!mine ? '<div class="message-actions">' +
          speakButton +
          '<button class="message-action" type="button" data-copy-id="' + esc(m.id) + '">复制</button>' +
          (lastAssistant ? '<button class="message-action" type="button" data-regenerate="1">重新回答</button>' : '') +
        '</div>' : '') +
      '</div>' +
    '</div>';
  }).join('');

  renderPendingError();
  renderHistory();
  if (scroll) requestAnimationFrame(() => scrollBottom(true));
}

function renderPendingError() {
  $('#requestError')?.remove();
  if (!pendingError || pendingError.conversationId !== state.activeId) return;
  const wrap = document.createElement('div');
  wrap.id = 'requestError';
  wrap.className = 'request-error';
  wrap.innerHTML = '<div><strong>' + esc(pendingError.title) + '</strong><span>' + esc(pendingError.detail) + '</span></div>' +
    '<button type="button" id="retryBtn">再试一次</button>';
  $('#messages').appendChild(wrap);
  $('#retryBtn')?.addEventListener('click', retryLastRequest);
}

function renderHistory() {
  const list = $('#historyList');
  const q = historyQuery.trim().toLowerCase();
  const sorted = [...state.conversations]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .filter(c => {
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || c.messages.some(m => m.content.toLowerCase().includes(q));
    });

  list.innerHTML = sorted.length ? sorted.map(c =>
    '<div class="history-item' + (c.id === state.activeId ? ' active' : '') + '">' +
      '<button class="history-open" type="button" data-open-chat="' + esc(c.id) + '">' +
        '<div class="history-title">' + esc(c.title || '新对话') + '</div>' +
        '<div class="history-preview">' + esc(lastPreview(c)) + '</div>' +
        '<div class="history-meta">' + esc(fmtHistoryTime(c.updatedAt)) + ' · ' + c.messages.length + ' 条</div>' +
      '</button>' +
      '<button class="history-delete" type="button" data-delete-chat="' + esc(c.id) + '" aria-label="删除这段聊天">删除</button>' +
    '</div>'
  ).join('') : '<div class="empty-history">' + (q ? '没搜到相关聊天。' : '这里还没有聊天记录。') + '</div>';
}

function scrollBottom(smooth = true) {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}

function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2100);
}

function setStatus(text, kind = 'ok') {
  $('#statusText').textContent = text;
  const dot = $('.dot');
  dot.dataset.kind = kind;
}

function setConnectionBanner(text = '', kind = 'warn') {
  const el = $('#connectionBanner');
  if (!text) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.dataset.kind = kind;
  el.textContent = text;
}

async function api(action, body = {}, auth = true, signal = undefined) {
  const headers = { 'content-type': 'application/json' };
  if (auth && token) headers.authorization = 'Bearer ' + token;
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers,
    cache: 'no-store',
    signal,
    body: JSON.stringify({ action, ...body })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || ('HTTP ' + res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function login() {
  const code = $('#accessCode').value.trim();
  if (!code) return;
  const btn = $('#loginBtn');
  btn.disabled = true;
  $('#loginError').textContent = '';
  try {
    const data = await api('login', { access_code: code }, false);
    token = data.token || '';
    if (!token) throw new Error('没有拿到登录凭证');
    localStorage.setItem(TOKEN_KEY, token);
    $('#accessCode').value = '';
    $('#loginScreen').classList.add('hidden');
    await pullState();
    setStatus(data.configured === false ? '等待接口配置' : '在线', data.configured === false ? 'warn' : 'ok');
  } catch (e) {
    $('#loginError').textContent = e.status === 401 ? '口令不对，再看看。' : '连接失败：' + e.message;
  } finally {
    btn.disabled = false;
  }
}

function logoutToLogin() {
  token = '';
  localStorage.removeItem(TOKEN_KEY);
  $('#loginScreen').classList.remove('hidden');
}

async function validateSession() {
  if (!token) {
    $('#loginScreen').classList.remove('hidden');
    return false;
  }
  try {
    const data = await api('status');
    $('#loginScreen').classList.add('hidden');
    setStatus(data.configured ? '在线' : '等待接口配置', data.configured ? 'ok' : 'warn');
    setConnectionBanner('');
    return true;
  } catch (e) {
    if (e.status === 401) {
      logoutToLogin();
      return false;
    }
    $('#loginScreen').classList.add('hidden');
    setStatus('网络不稳定', 'warn');
    setConnectionBanner('现在网络不太稳定，聊天记录仍会先保存在这台手机。');
    return false;
  }
}

async function pullState() {
  try {
    const data = await api('load_state');
    if (data?.state && typeof data.state === 'object') {
      const remote = normalizeState(data.state);
      if (data.updated_at && (!remote.updatedAt || remote.updatedAt === emptyState().updatedAt)) remote.updatedAt = data.updated_at;
      const localTime = new Date(state.updatedAt || 0).getTime();
      const remoteTime = new Date(remote.updatedAt || data.updated_at || 0).getTime();

      if (!state.conversations.length && remote.conversations.length) {
        state = remote;
        persistLocal(false);
      } else if (remoteTime > localTime) {
        state = remote;
        persistLocal(false);
      } else if (localTime > remoteTime && state.conversations.length) {
        scheduleCloudSave(150);
      }
    }
    renderMessages();
    loadCurrentDraft();
    setConnectionBanner('');
  } catch (e) {
    if (e.status === 401) logoutToLogin();
    else {
      setStatus('仅本机保存', 'warn');
      setConnectionBanner('云端同步暂时没连上，聊天仍会保存在这台手机。');
      renderMessages();
      loadCurrentDraft();
    }
  }
}

function scheduleCloudSave(delay = 650) {
  persistLocal(true);
  clearTimeout(syncTimer);
  syncTimer = setTimeout(saveCloud, delay);
}

async function saveCloud() {
  if (!token || !state.conversations.length) return;
  try {
    await api('save_state', { state });
    setStatus(navigator.onLine ? '在线' : '离线', navigator.onLine ? 'ok' : 'warn');
    if (navigator.onLine) setConnectionBanner('');
  } catch (e) {
    if (e.status === 401) logoutToLogin();
    else {
      setStatus('仅本机保存', 'warn');
      setConnectionBanner('这次云端同步没成功，记录还在本机，不会因为这一会儿断网就消失。');
    }
  }
}

function newConversation(closeDialogs = true) {
  saveCurrentDraft();
  stopSpeaking();
  pendingError = null;
  state.activeId = '';
  persistLocal(false);
  if (closeDialogs) {
    $('#historyDialog')?.close();
    $('#clearDialog')?.close();
  }
  renderMessages();
  loadCurrentDraft();
  $('#input').focus();
}

function openConversation(id) {
  if (!state.conversations.some(c => c.id === id)) return;
  saveCurrentDraft();
  stopSpeaking();
  pendingError = null;
  state.activeId = id;
  persistLocal(false);
  renderMessages({ scroll: true });
  loadCurrentDraft();
  $('#historyDialog').close();
}

function deleteConversation(id) {
  saveCurrentDraft();
  state.conversations = state.conversations.filter(c => c.id !== id);
  delete drafts[id];
  saveDrafts();
  if (state.activeId === id) state.activeId = state.conversations[0]?.id || '';
  pendingError = null;
  scheduleCloudSave(120);
  renderMessages({ scroll: true });
  loadCurrentDraft();
}

function showTyping() {
  $('#typingRow')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'message-row assistant typing';
  wrap.id = 'typingRow';
  wrap.innerHTML = '<div class="msg-avatar">七</div><div class="message"><div class="bubble"><i></i><i></i><i></i><span>正在想</span></div></div>';
  $('#messages').appendChild(wrap);
  scrollBottom(true);
}

function hideTyping() {
  $('#typingRow')?.remove();
}

function appendMessage(role, content) {
  const c = ensureConversation();
  const msg = { id: uid(), role, content: String(content), createdAt: new Date().toISOString() };
  c.messages.push(msg);
  c.messages = c.messages.slice(-MAX_MESSAGES_PER_CHAT);
  c.updatedAt = msg.createdAt;
  if (role === 'user' && (c.title === '新对话' || !c.title)) c.title = titleFrom(content);
  state.conversations.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  state.activeId = c.id;
  persistLocal(true);
  renderMessages({ scroll: true });
  return msg;
}

function conversationForApi(c) {
  return (c?.messages || []).slice(-32).map(m => ({ role: m.role, content: m.content }));
}

function requestErrorInfo(e) {
  if (e?.name === 'AbortError') return { title: '已经停止', detail: '刚才那次回答被你停掉了，可以直接继续问。' };
  if (!navigator.onLine) return { title: '现在没网', detail: '消息已经留在聊天里，网络恢复后点“再试一次”。' };
  if (e.status === 429) return { title: '接口有点忙', detail: '稍等一会儿再试，不用重新输入。' };
  if (e.status === 503 && e.data?.error === 'not_configured') return { title: '还没接好 AI 接口', detail: '网页本身已经能用了，等玲把旧反代配置迁进来就能正常回答。' };
  return { title: '刚才没连成功', detail: '消息没有丢，点“再试一次”就行。' };
}

async function requestAssistant({ regenerate = false } = {}) {
  if (sending) return;
  const c = getActive();
  const lastUser = [...(c?.messages || [])].reverse().find(m => m.role === 'user');
  if (!c || !lastUser) return;

  sending = true;
  pendingError = null;
  $('#sendBtn').disabled = true;
  $('#input').disabled = true;
  $('#stopBtn').hidden = false;
  showTyping();
  setStatus(regenerate ? '七重新想一下…' : '七正在看…', 'thinking');
  requestController = new AbortController();

  try {
    const data = await api('chat', {
      conversation_id: c.id,
      messages: conversationForApi(c),
      regenerate
    }, true, requestController.signal);
    hideTyping();
    const reply = String(data.reply || '').trim();
    if (!reply) throw new Error('这次没有收到回复');
    appendMessage('assistant', reply);
    scheduleCloudSave(180);
    setStatus('在线', 'ok');
  } catch (e) {
    hideTyping();
    if (e.status === 401) {
      logoutToLogin();
      toast('登录过期了，再输一次口令');
    } else {
      const info = requestErrorInfo(e);
      pendingError = { conversationId: c.id, ...info };
      renderMessages({ scroll: true });
      setStatus(info.title, e?.name === 'AbortError' ? 'idle' : 'warn');
    }
  } finally {
    requestController = null;
    sending = false;
    $('#sendBtn').disabled = false;
    $('#input').disabled = false;
    $('#stopBtn').hidden = true;
    $('#input').focus();
  }
}

async function sendMessage(forcedText = '') {
  if (sending) return;
  const input = $('#input');
  const text = String(forcedText || input.value).trim();
  if (!text) return;
  if (!token) {
    $('#loginScreen').classList.remove('hidden');
    return;
  }

  pendingError = null;
  input.value = '';
  clearCurrentDraft();
  autoGrow();
  appendMessage('user', text);
  scheduleCloudSave();
  await requestAssistant();
}

async function retryLastRequest() {
  if (sending) return;
  pendingError = null;
  renderMessages();
  await requestAssistant();
}

async function regenerate() {
  if (sending) return;
  const c = getActive();
  if (!c?.messages?.length) return;
  const last = c.messages[c.messages.length - 1];
  if (last?.role === 'assistant') {
    c.messages.pop();
    c.updatedAt = new Date().toISOString();
    persistLocal(true);
  }
  pendingError = null;
  renderMessages({ scroll: true });
  await requestAssistant({ regenerate: true });
}

function stopRequest() {
  if (requestController) requestController.abort();
}

function autoGrow() {
  const el = $('#input');
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 148) + 'px';
}

function cleanForSpeech(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, '代码内容已略过。')
    .replace(/[`*_>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  speakingMessageId = '';
}

function speakMessage(id) {
  if (!('speechSynthesis' in window)) return;
  if (speakingMessageId === id) {
    stopSpeaking();
    renderMessages();
    return;
  }
  const c = getActive();
  const m = c?.messages.find(x => x.id === id);
  if (!m) return;
  stopSpeaking();
  const text = cleanForSpeech(m.content);
  if (!text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 0.96;
  utter.pitch = 1;
  const voices = window.speechSynthesis.getVoices?.() || [];
  const zhVoice = voices.find(v => /^zh(-CN)?/i.test(v.lang)) || voices.find(v => /^zh/i.test(v.lang));
  if (zhVoice) utter.voice = zhVoice;
  utter.onend = utter.onerror = () => {
    speakingMessageId = '';
    renderMessages();
  };
  speakingMessageId = id;
  renderMessages();
  window.speechSynthesis.speak(utter);
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $('#voiceBtn').hidden = true;
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'zh-CN';
  recognition.interimResults = true;
  recognition.continuous = false;

  let before = '';
  recognition.onstart = () => {
    before = $('#input').value.trim();
    $('#voiceBtn').classList.add('listening');
    setStatus('正在听…', 'thinking');
  };
  recognition.onresult = e => {
    let text = '';
    for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
    $('#input').value = [before, text].filter(Boolean).join(before ? ' ' : '');
    saveCurrentDraft();
    autoGrow();
  };
  recognition.onerror = () => {
    $('#voiceBtn').classList.remove('listening');
    setStatus('在线', 'ok');
    toast('没听清，再点一次麦克风');
  };
  recognition.onend = () => {
    $('#voiceBtn').classList.remove('listening');
    setStatus(navigator.onLine ? '在线' : '离线', navigator.onLine ? 'ok' : 'warn');
  };
}

function applyPrefs(showToast = false) {
  if (!FONT_LEVELS.includes(prefs.fontSize)) prefs.fontSize = 'large';
  document.body.dataset.fontSize = prefs.fontSize;
  const names = { normal: '标准字', large: '大字', xl: '特大字' };
  $('#fontBtn').setAttribute('aria-label', '字号：' + names[prefs.fontSize]);
  $('#fontBtn').title = '字号：' + names[prefs.fontSize];
  if (showToast) toast('已切换为' + names[prefs.fontSize]);
}

function cycleFontSize() {
  const i = FONT_LEVELS.indexOf(prefs.fontSize);
  prefs.fontSize = FONT_LEVELS[(i + 1) % FONT_LEVELS.length];
  savePrefs();
  applyPrefs(true);
}

function openNewChatConfirm() {
  const c = getActive();
  if (c?.messages?.length) $('#clearDialog').showModal();
  else newConversation();
}

function setupViewport() {
  if (!window.visualViewport) return;
  const update = () => {
    document.documentElement.style.setProperty('--vvh', Math.round(window.visualViewport.height) + 'px');
  };
  update();
  window.visualViewport.addEventListener('resize', update);
}

$('#loginBtn').addEventListener('click', login);
$('#accessCode').addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});

$('#input').addEventListener('input', () => {
  autoGrow();
  saveCurrentDraft();
});
$('#input').addEventListener('compositionstart', () => { isComposing = true; });
$('#input').addEventListener('compositionend', () => { isComposing = false; });
$('#input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !isComposing && window.innerWidth >= 700) {
    e.preventDefault();
    sendMessage();
  }
});
$('#sendBtn').addEventListener('click', () => sendMessage());
$('#stopBtn').addEventListener('click', stopRequest);
$('#fontBtn').addEventListener('click', cycleFontSize);

$('#voiceBtn').addEventListener('click', () => {
  if (!recognition) return;
  try {
    if ($('#voiceBtn').classList.contains('listening')) recognition.stop();
    else recognition.start();
  } catch {}
});

$('#newChatBtn').addEventListener('click', openNewChatConfirm);
$('#confirmNewBtn').addEventListener('click', () => newConversation());
$('#historyBtn').addEventListener('click', () => {
  historyQuery = '';
  $('#historySearch').value = '';
  renderHistory();
  $('#historyDialog').showModal();
  setTimeout(() => $('#historySearch').focus(), 80);
});
$('#historyNewBtn').addEventListener('click', () => newConversation());
$('#historySearch').addEventListener('input', e => {
  historyQuery = e.target.value || '';
  renderHistory();
});

$$('[data-close-dialog]').forEach(btn => btn.addEventListener('click', () => {
  const el = document.getElementById(btn.dataset.closeDialog);
  if (el?.open) el.close();
}));

document.addEventListener('click', async e => {
  const quick = e.target.closest('[data-quick]');
  if (quick) {
    $('#input').value = quick.dataset.quick || '';
    saveCurrentDraft();
    autoGrow();
    $('#input').focus();
  }

  const open = e.target.closest('[data-open-chat]');
  if (open) openConversation(open.dataset.openChat);

  const del = e.target.closest('[data-delete-chat]');
  if (del) {
    const c = state.conversations.find(x => x.id === del.dataset.deleteChat);
    if (c && confirm('删除“' + c.title + '”这段聊天？')) deleteConversation(c.id);
  }

  const copy = e.target.closest('[data-copy-id]');
  if (copy) {
    const c = getActive();
    const m = c?.messages.find(x => x.id === copy.dataset.copyId);
    if (m) {
      try {
        await navigator.clipboard.writeText(m.content);
        toast('已经复制');
      } catch {
        toast('复制失败，长按文字也可以复制');
      }
    }
  }

  const speak = e.target.closest('[data-speak-id]');
  if (speak) speakMessage(speak.dataset.speakId);
  if (e.target.closest('[data-regenerate]')) regenerate();
});

window.addEventListener('online', () => {
  setStatus('在线', 'ok');
  setConnectionBanner('');
  if (token) {
    saveCloud();
    pullState();
  }
});
window.addEventListener('offline', () => {
  setStatus('离线', 'warn');
  setConnectionBanner('现在没有网络，聊天记录会先保存在这台手机。');
});
window.addEventListener('beforeunload', () => {
  saveCurrentDraft();
  persistLocal(false);
});

async function boot() {
  applyPrefs(false);
  setupSpeechRecognition();
  setupViewport();
  renderMessages();
  loadCurrentDraft();
  autoGrow();
  const ok = await validateSession();
  if (ok) await pullState();
}

boot();
