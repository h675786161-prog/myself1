(() => {
  const current = document.currentScript;
  const base = new URL('.', current?.src || location.href);
  const load = (name) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL(name, base).href + '?v=20261005-voice-share';
    s.async = false;
    s.onload = resolve;
    s.onerror = () => reject(new Error(name + ' 加载失败'));
    document.head.appendChild(s);
  });

  load('./app-core.js')
    .then(() => load('./runtime-enhancements.js'))
    .catch((e) => {
      console.error('mom-ai runtime load failed', e);
      const el = document.getElementById('statusText');
      if (el) el.textContent = '页面更新没加载完整，请刷新一次';
    });
})();
