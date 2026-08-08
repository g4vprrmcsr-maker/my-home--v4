(function () {
  'use strict';

  const field    = document.getElementById('input-field');
  const sendBtn  = document.getElementById('btn-send');
  const messages = document.getElementById('messages');

  /* ---------- 工具函数 ---------- */
  function autoGrow(){
    field.style.height = 'auto';
    field.style.height = Math.min(field.scrollHeight, 132) + 'px';
  }
  function refreshSend(){ sendBtn.disabled = field.value.trim().length === 0; }
  function isTouch(){ return window.matchMedia('(pointer: coarse)').matches; }
  function scrollBottom(){ messages.scrollTop = messages.scrollHeight; }

  // 时间戳：yyyy-MM-dd HH:mm:ss（chat_message_widget 真值格式）
  function nowStamp(){
    const d = new Date(), p = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} `
         + `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  const SVG = {
    user:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    model:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 14h.01M15 14h.01"/></svg>',
    copy:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    regen:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    tts:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12"/></svg>',
    more:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>'
  };

  /* ---------- 消息渲染 ---------- */
  function appendUser(text){
    const row = document.createElement('div');
    row.className = 'msg user';
    row.innerHTML =
      `<div class="msg-head"><span class="msg-name">你</span>`
      + `<div class="avatar user-avatar">${SVG.user}</div></div>`
      + `<div class="user-bubble"></div>`;
    row.querySelector('.user-bubble').textContent = text;
    messages.appendChild(row);
    scrollBottom();
  }

  // 返回助手行的 body 元素，便于把"三点"替换成正文
  function appendAssistant(){
    const row = document.createElement('div');
    row.className = 'msg assistant';
    row.innerHTML =
      `<div class="msg-head"><div class="avatar model-avatar">${SVG.model}</div>`
      + `<div class="msg-head-col"><span class="msg-name">GPT-4o</span>`
      + `<span class="msg-time">${nowStamp()}</span></div></div>`
      + `<div class="assistant-body"><div class="loading-dots"><span></span><span></span><span></span></div></div>`;
    messages.appendChild(row);
    scrollBottom();
    return row;
  }

  function fillAssistant(row, text){
    const body = row.querySelector('.assistant-body');
    body.innerHTML = '<p></p>';
    body.querySelector('p').textContent = text;
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.innerHTML =
      `<button class="msg-act" data-act="copy" aria-label="复制">${SVG.copy}</button>`
      + `<button class="msg-act" data-act="regen" aria-label="重新生成">${SVG.regen}</button>`
      + `<button class="msg-act" data-act="tts" aria-label="朗读">${SVG.tts}</button>`
      + `<button class="msg-act" data-act="more" aria-label="更多">${SVG.more}</button>`;
    row.appendChild(actions);
    scrollBottom();
  }

  /* ---------- 发送流程 ---------- */
  function send(){
    const text = field.value.trim();
    if (!text) return;
    appendUser(text);
    field.value = '';
    autoGrow();
    refreshSend();
    const row = appendAssistant();                 // 先显示加载三点
    setTimeout(() => fillAssistant(row, '（这里将接入模型回复）'), 900);
  }

  /* ---------- 复制（事件委托，含已有的示例消息）---------- */
  messages.addEventListener('click', (e) => {
    const btn = e.target.closest('.msg-act');
    if (!btn) return;
    const act = btn.dataset.act;
    const row = btn.closest('.msg');
    if (act === 'copy'){
      const body = row.querySelector('.assistant-body') || row.querySelector('.user-bubble');
      const txt = body ? body.innerText.trim() : '';
      if (navigator.clipboard && txt){
        navigator.clipboard.writeText(txt).then(() => {
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1200);
        });
      }
    } else {
      console.log('msg action:', act);
    }
  });

  /* ---------- 输入框 ---------- */
  field.addEventListener('input', () => { autoGrow(); refreshSend(); });
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTouch()){ e.preventDefault(); send(); }
  });
  sendBtn.addEventListener('click', send);

  /* ---------- 功能键：搜索 / 推理 切换高亮 ---------- */
  ['btn-search','btn-reason'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(){
      this.classList.toggle('active');
    });
  });

  /* ---------- 其余按钮（后续阶段接面板/弹窗）---------- */
  ['btn-drawer','btn-minimap','btn-newchat','btn-model','btn-more','title-sub']
    .forEach(id => document.getElementById(id).addEventListener('click', () => console.log(id)));

  /* ---------- 初始化 ---------- */
  autoGrow();
  refreshSend();
  scrollBottom();
})();
