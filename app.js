(function () {
  'use strict';

  const field = document.getElementById('input-field');
  const sendBtn = document.getElementById('btn-send');
  const messages = document.getElementById('messages');

  function autoGrow() {
    field.style.height = 'auto';
    field.style.height = Math.min(field.scrollHeight, 140) + 'px';
  }

  function refreshSendState() {
    sendBtn.disabled = field.value.trim().length === 0;
  }

  field.addEventListener('input', () => { autoGrow(); refreshSendState(); });

  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTouch()) {
      e.preventDefault();
      send();
    }
  });

  function isTouch() {
    return window.matchMedia('(pointer: coarse)').matches;
  }

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function appendUser(text) {
    const row = document.createElement('div');
    row.className = 'msg-row user';
    const bubble = document.createElement('div');
    bubble.className = 'bubble user-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    messages.appendChild(row);
    scrollToBottom();
  }

  function appendAssistant(text) {
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.innerHTML = `
      <div class="assistant-head">
        <div class="assistant-avatar">K</div>
        <span class="assistant-name">Kelivo</span>
      </div>
      <div class="bubble assistant-bubble"><p></p></div>`;
    row.querySelector('p').textContent = text;
    messages.appendChild(row);
    scrollToBottom();
  }

  function send() {
    const text = field.value.trim();
    if (!text) return;
    appendUser(text);
    field.value = '';
    autoGrow();
    refreshSendState();
    setTimeout(() => appendAssistant('（这里将接入模型回复）'), 300);
  }

  sendBtn.addEventListener('click', send);

  document.getElementById('btn-drawer').addEventListener('click', () => console.log('打开抽屉'));
  document.getElementById('btn-minimap').addEventListener('click', () => console.log('打开导航'));
  document.getElementById('btn-newchat').addEventListener('click', () => console.log('新对话'));
  document.getElementById('btn-add').addEventListener('click', () => console.log('添加附件'));
  document.getElementById('btn-tools').addEventListener('click', () => console.log('工具'));
  document.getElementById('title-sub').addEventListener('click', () => console.log('选择模型'));

  autoGrow();
  refreshSendState();
  scrollToBottom();
})();
