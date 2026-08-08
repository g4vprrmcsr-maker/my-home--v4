(function () {
  'use strict';
  const field = document.getElementById('input-field');
  const sendBtn = document.getElementById('btn-send');
  const messages = document.getElementById('messages');

  function autoGrow(){ field.style.height='auto'; field.style.height=Math.min(field.scrollHeight,140)+'px'; }
  function refreshSend(){ sendBtn.disabled = field.value.trim().length===0; }
  function isTouch(){ return window.matchMedia('(pointer: coarse)').matches; }
  function scrollBottom(){ messages.scrollTop = messages.scrollHeight; }

  field.addEventListener('input',()=>{autoGrow();refreshSend();});
  field.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'&&!e.shiftKey&&!isTouch()){ e.preventDefault(); send(); }
  });

  function appendUser(text){
    const row=document.createElement('div'); row.className='msg-row user';
    row.innerHTML=`<div class="msg-head"><span class="msg-name">你</span><div class="user-avatar sm">我</div></div>
      <div class="bubble user-bubble"></div>`;
    row.querySelector('.user-bubble').textContent=text;
    messages.appendChild(row); scrollBottom();
  }
  function appendAssistant(text){
    const row=document.createElement('div'); row.className='msg-row assistant';
    row.innerHTML=`<div class="msg-head"><div class="assistant-avatar sm">K</div><span class="msg-name">Kelivo</span></div>
      <div class="bubble assistant-bubble"><p></p></div>`;
    row.querySelector('p').textContent=text;
    messages.appendChild(row); scrollBottom();
  }
  function send(){
    const text=field.value.trim(); if(!text) return;
    appendUser(text); field.value=''; autoGrow(); refreshSend();
    setTimeout(()=>appendAssistant('（这里将接入模型回复）'),300);
  }

  sendBtn.addEventListener('click',send);
  ['btn-drawer','btn-minimap','btn-newchat','btn-model','btn-search','btn-reason','btn-more','btn-voice','title-sub']
    .forEach(id=>document.getElementById(id).addEventListener('click',()=>console.log(id)));

  // 可切换高亮的功能键（搜索/推理），点击切换 active
  ['btn-search','btn-reason'].forEach(id=>{
    document.getElementById(id).addEventListener('click',function(){ this.classList.toggle('active'); });
  });

  autoGrow(); refreshSend(); scrollBottom();
})();
