// Runtime enhancements for 七｜妈妈专线.
// Loaded after app.js by mom-ai-web so it shares the same script scope.
const MOM_STT_ENDPOINT = 'https://ibpffxzdjvgydnhmvmvc.supabase.co/functions/v1/mom-ai-stt';
let fallbackRecorder = null;
let voiceAutoSend = false;

function decorateShareButtons() {
  document.querySelectorAll('.message-row.assistant[data-message-id]').forEach(row => {
    const actions = row.querySelector('.message-actions');
    if (!actions || actions.querySelector('[data-share-id]')) return;
    const btn = document.createElement('button');
    btn.className = 'message-action';
    btn.type = 'button';
    btn.dataset.shareId = row.dataset.messageId || '';
    btn.textContent = '分享/转发';
    const regenerateBtn = actions.querySelector('[data-regenerate]');
    if (regenerateBtn) actions.insertBefore(btn, regenerateBtn);
    else actions.appendChild(btn);
  });
}

const baseRenderMessages = renderMessages;
renderMessages = function enhancedRenderMessages(options = {}) {
  baseRenderMessages(options);
  decorateShareButtons();
};
decorateShareButtons();

async function shareAssistantMessage(id) {
  const c = getActive();
  const m = c?.messages.find(x => x.id === id);
  if (!m) return;
  const text = String(m.content || '').trim();
  if (!text) return;
  const data = { title: '七｜妈妈专线', text };
  try {
    if (navigator.share) {
      await navigator.share(data);
      toast('已经打开分享');
      return;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('内容已复制，直接粘贴转发就行');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('内容已复制，直接粘贴转发就行'); }
    catch { toast('长按这条回答也可以复制转发'); }
    ta.remove();
  }
}

document.addEventListener('click', e => {
  const share = e.target.closest('[data-share-id]');
  if (share) shareAssistantMessage(share.dataset.shareId);
});

function setVoiceButtonState(mode) {
  const btn = $('#voiceBtn');
  if (!btn) return;
  btn.hidden = false;
  if (mode === 'recording') {
    btn.classList.add('listening');
    btn.textContent = '■';
    btn.setAttribute('aria-label', '停止录音并发送');
    btn.title = '再点一下，结束录音并发送';
  } else if (mode === 'recognizing') {
    btn.classList.remove('listening');
    btn.textContent = '…';
    btn.setAttribute('aria-label', '正在识别语音');
    btn.title = '正在识别语音';
  } else {
    btn.classList.remove('listening');
    btn.textContent = '🎙';
    btn.setAttribute('aria-label', '语音输入');
    btn.title = '点一下开始说，再点一下发送';
  }
}

function concatFloat32(chunks) {
  let length = 0;
  for (const chunk of chunks) length += chunk.length;
  const out = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('读取录音失败'));
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.readAsDataURL(blob);
  });
}

async function transcribeAndSend(blob) {
  if (!blob || blob.size < 300) {
    toast('这段录音太短了，再说一次');
    setVoiceButtonState('idle');
    return;
  }
  setVoiceButtonState('recognizing');
  setStatus('正在识别你说的话…', 'thinking');
  try {
    const audio = await blobToBase64(blob);
    const res = await fetch(MOM_STT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      cache: 'no-store',
      body: JSON.stringify({ audio, mime_type: blob.type || 'audio/webm' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || '语音识别暂时没连上');
    const text = String(data.text || '').trim();
    if (!text) throw new Error('没听清');
    $('#input').value = text;
    autoGrow();
    saveCurrentDraft();
    setVoiceButtonState('idle');
    setStatus('听清了，正在发送…', 'thinking');
    await sendMessage();
  } catch (e) {
    setVoiceButtonState('idle');
    setStatus(navigator.onLine ? '在线' : '离线', navigator.onLine ? 'ok' : 'warn');
    toast(e?.message === '没听清' ? '没听清，再说一次' : '语音识别没成功，文字输入还能正常用');
  }
}

async function startFallbackRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('这个浏览器不允许网页直接用麦克风，请用系统浏览器打开');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    const stopTracks = () => stream.getTracks().forEach(t => t.stop());

    if ('MediaRecorder' in window) {
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(type));
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
      recorder.onstop = () => {
        clearTimeout(fallbackRecorder?.timer);
        const blob = new Blob(chunks, { type: recorder.mimeType || preferred || 'audio/webm' });
        stopTracks();
        fallbackRecorder = null;
        transcribeAndSend(blob);
      };
      recorder.onerror = () => {
        clearTimeout(fallbackRecorder?.timer);
        stopTracks();
        fallbackRecorder = null;
        setVoiceButtonState('idle');
        toast('录音失败，再试一次');
      };
      recorder.start(250);
      fallbackRecorder = { mode: 'media', recorder, stream, timer: setTimeout(stopFallbackRecording, 45000) };
    } else {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { stopTracks(); throw new Error('浏览器不支持录音'); }
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const samples = [];
      processor.onaudioprocess = e => samples.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(processor);
      processor.connect(ctx.destination);
      fallbackRecorder = {
        mode: 'wav', stream, ctx, source, processor, samples,
        timer: setTimeout(stopFallbackRecording, 45000)
      };
    }
    setVoiceButtonState('recording');
    setStatus('正在听…再点一下就发送', 'thinking');
  } catch (e) {
    setVoiceButtonState('idle');
    if (String(e?.name || '').includes('NotAllowed')) toast('需要先允许麦克风权限');
    else toast(e?.message || '麦克风暂时打不开');
  }
}

function stopFallbackRecording() {
  const current = fallbackRecorder;
  if (!current) return;
  clearTimeout(current.timer);
  if (current.mode === 'media') {
    if (current.recorder.state !== 'inactive') current.recorder.stop();
    return;
  }
  fallbackRecorder = null;
  try { current.processor.disconnect(); } catch {}
  try { current.source.disconnect(); } catch {}
  current.stream.getTracks().forEach(t => t.stop());
  const sampleRate = current.ctx.sampleRate || 48000;
  current.ctx.close().catch(() => {});
  const blob = encodeWav(concatFloat32(current.samples), sampleRate);
  transcribeAndSend(blob);
}

function enhanceBuiltInSpeechRecognition() {
  const btn = $('#voiceBtn');
  if (!btn) return;
  btn.hidden = false;
  if (!recognition) {
    setVoiceButtonState('idle');
    btn.addEventListener('click', () => {
      if (fallbackRecorder) stopFallbackRecording();
      else startFallbackRecording();
    });
    return;
  }

  const oldResult = recognition.onresult;
  const oldEnd = recognition.onend;
  const oldError = recognition.onerror;
  recognition.onresult = e => {
    oldResult?.(e);
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) voiceAutoSend = true;
    }
  };
  recognition.onerror = e => {
    voiceAutoSend = false;
    oldError?.(e);
  };
  recognition.onend = e => {
    oldEnd?.(e);
    if (!voiceAutoSend) return;
    voiceAutoSend = false;
    const text = $('#input')?.value.trim();
    if (text && !sending) setTimeout(() => sendMessage(), 80);
  };
  btn.title = '点一下直接说，说完会自动发送';
}

enhanceBuiltInSpeechRecognition();
