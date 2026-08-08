(function(){
'use strict';

/* ===== 状态 & 持久化 ===== */
const DEF={
 settings:{mode:'system',showUserAvatar:true,showUserName:true,showTimestamp:true,showMsgActions:true,showModelName:true,showTokenStats:false,bubbleStyle:'default',autoCollapseThinking:true,enterToSend:true,search:false,reason:false},
 userName:'用户',
 assistants:[{id:'a1',name:'默认助手',prompt:'你是一个乐于助人的助手。',temperature:0.6,topP:1,contextMessages:64,streaming:true}],
 curA:'a1',
 providers:[
  {id:'openai',name:'OpenAI',apiKey:'',baseUrl:'https://api.openai.com',enabled:true,models:[{id:'gpt-4o',name:'GPT-4o',tags:['视觉','工具']},{id:'gpt-4o-mini',name:'GPT-4o mini',tags:['快速']},{id:'o1',name:'o1',tags:['推理']}]},
  {id:'gemini',name:'Google',apiKey:'',baseUrl:'https://generativelanguage.googleapis.com',enabled:true,models:[{id:'gemini-2.0-flash',name:'Gemini 2.0 Flash',tags:['快速','视觉']}]}
 ],
 model:{provider:'OpenAI',id:'gpt-4o',label:'GPT-4o',chip:'4o'},
 convs:[],cur:null
};
let S;
function load(){try{S=JSON.parse(localStorage.getItem('kelivo'))}catch(e){S=null}if(!S)S=JSON.parse(JSON.stringify(DEF));S.settings=Object.assign({},DEF.settings,S.settings||{});if(!S.assistants||!S.assistants.length)S.assistants=JSON.parse(JSON.stringify(DEF.assistants));if(!S.providers||!S.providers.length)S.providers=JSON.parse(JSON.stringify(DEF.providers));if(!S.convs)S.convs=[];if(!S.model)S.model=JSON.parse(JSON.stringify(DEF.model));if(!S.curA)S.curA=S.assistants[0].id;if(!S.userName)S.userName=DEF.userName;}
const save=()=>{try{localStorage.setItem('kelivo',JSON.stringify(S))}catch(e){}};
const uid=()=>Math.random().toString(36).slice(2,9);

/* ===== 深浅色（仅light/dark，非9套主题）===== */
function applyMode(){
 const dark=S.settings.mode==='dark'||(S.settings.mode==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);
 const s=document.documentElement.style,set=(k,v)=>s.setProperty(k,v);
 if(dark){
  set('--primary','#B6C4FF');set('--on-primary','#1D2D61');set('--primary-container','#354479');set('--on-primary-container','#DCE1FF');set('--secondary','#C2C5DD');
  set('--surface','#121213');set('--on-surface','#F9F9F9');set('--on-surface-variant','#CECECE');set('--surface-card','#1E1E20');set('--surface-fill','#2A2A2D');
  set('--outline','rgba(255,255,255,0.10)');set('--outline-variant','rgba(255,255,255,0.08)');set('--shadow-soft','0 6px 18px rgba(0,0,0,0.25)');
 }else{
  set('--primary','#4D5C92');set('--on-primary','#FFFFFF');set('--primary-container','#DCE1FF');set('--on-primary-container','#03174B');set('--secondary','#595D72');
  set('--surface','#F7F7F7');set('--on-surface','#202020');set('--on-surface-variant','#646464');set('--surface-card','#FFFFFF');set('--surface-fill','#EDEDED');
  set('--outline','rgba(0,0,0,0.20)');set('--outline-variant','rgba(0,0,0,0.06)');set('--shadow-soft','0 6px 18px rgba(0,0,0,0.05)');
 }
 document.documentElement.style.colorScheme=dark?'dark':'light';
}

/* ===== 工具 ===== */
const $=id=>document.getElementById(id);
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const esc=s=>(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const stamp=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;};
function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,1600);}
const curAssistant=()=>S.assistants.find(a=>a.id===S.curA)||S.assistants[0];

const IC={
 bot:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 14h.01M15 14h.01"/></svg>',
 user:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
 copy:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
 regen:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
 tts:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15 9a3 3 0 0 1 0 6"/></svg>',
 dots:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
 chev:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
 back:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
 plus:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 trash:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>'
};

/* ===== 会话数据 ===== */
function curConv(){return S.convs.find(c=>c.id===S.cur);}
function newConv(){const c={id:uid(),title:'新的对话',msgs:[],ts:Date.now()};S.convs.unshift(c);S.cur=c.id;save();renderMessages();renderDrawer();updateTopbar();}
function ensureConv(){if(!curConv())newConv();return curConv();}
function delConv(id){S.convs=S.convs.filter(c=>c.id!==id);if(S.cur===id)S.cur=S.convs[0]?S.convs[0].id:null;save();renderDrawer();renderMessages();updateTopbar();}
function switchConv(id){S.cur=id;save();renderMessages();updateTopbar();closeDrawer();}

/* ===== 顶栏 ===== */
function updateTopbar(){
 const c=curConv();
 $('title-main').textContent=c?c.title:'新的对话';
 $('title-sub').textContent=`${S.model.label} (${S.model.provider})`;
 $('model-chip').textContent=S.model.chip||S.model.label.slice(0,4);
}

/* ===== 消息渲染 ===== */
function renderMessages(){
 const box=$('messages');box.innerHTML='';
 const c=curConv();
 if(!c||!c.msgs.length){return;}
 c.msgs.forEach(m=>box.appendChild(m.role==='user'?userRow(m):assistantRow(m)));
 box.scrollTop=box.scrollHeight;
}
function userRow(m){
 const st=S.settings,head=[];
 if(st.showUserName)head.push(`<span class="msg-name">${esc(S.userName)}</span>`);
 if(st.showTimestamp&&m.ts)head.push(`<span class="msg-time">${m.ts}</span>`);
 const av=st.showUserAvatar?`<div class="avatar user-avatar">${IC.user}</div>`:'';
 const row=el('div','msg user',`<div class="msg-head">${head.join('')}${av}</div><div class="user-bubble">${esc(m.text)}</div>`);
 return row;
}
function assistantRow(m){
 const st=S.settings;
 const av=st.showModelName?`<div class="avatar model-avatar">${IC.bot}</div>`:'';
 const head=`<div class="msg-head">${av}<div class="msg-head-col">${st.showModelName?`<span class="msg-name">${esc(S.model.label)}</span>`:''}${st.showTimestamp&&m.ts?`<span class="msg-time">${m.ts}</span>`:''}</div></div>`;
 const row=el('div','msg assistant',head);
 // 思维链
 if(m.thinking){
  const cot=el('div','cot-card'+(st.autoCollapseThinking?'':' open'),
   `<div class="cot-head"><span class="ttl">深度思考</span>${m.dur?`<span class="dur">(${m.dur}s)</span>`:''}<span class="chev">${IC.chev.replace('width="16" height="16"','width="18" height="18"')}</span></div><div class="cot-body">${esc(m.thinking)}</div>`);
  cot.querySelector('.cot-head').onclick=()=>cot.classList.toggle('open');
  row.appendChild(cot);
 }
 const body=el('div','assistant-body'+(st.bubbleStyle!=='default'?' '+st.bubbleStyle:''));
 if(m.loading){body.innerHTML='<div class="loading-dots"><span></span><span></span><span></span></div>';}
 else{body.innerHTML=`<p>${esc(m.text)}</p>`;}
 row.appendChild(body);
 if(!m.loading&&st.showMsgActions){
  const acts=el('div','msg-actions',
   `<button class="msg-act" data-a="copy">${IC.copy}</button><button class="msg-act" data-a="regen">${IC.regen}</button><button class="msg-act" data-a="tts">${IC.tts}</button><button class="msg-act" data-a="more">${IC.dots}</button>`
   +(st.showTokenStats?`<span class="tok-stat">${(m.text||'').length} tok</span>`:''));
  acts.querySelectorAll('.msg-act').forEach(b=>b.onclick=()=>{
   const a=b.dataset.a;
   if(a==='copy'){navigator.clipboard&&navigator.clipboard.writeText(m.text);b.classList.add('copied');setTimeout(()=>b.classList.remove('copied'),1200);toast('已复制');}
   else if(a==='regen'){toast('重新生成');}
   else if(a==='tts'){toast('朗读');}
   else toast('更多');
  });
  row.appendChild(acts);
 }
 return row;
}

/* ===== 发送 ===== */
function send(){
 const t=$('input-field').value.trim();if(!t)return;
 const c=ensureConv();
 c.msgs.push({role:'user',text:t,ts:stamp()});
 if(c.title==='新的对话'){c.title=t.slice(0,20);}
 $('input-field').value='';autoGrow();refreshSend();
 const a={role:'assistant',text:'',loading:true,ts:stamp()};
 c.msgs.push(a);save();renderMessages();updateTopbar();renderDrawer();
 setTimeout(()=>{
  a.loading=false;
  if(S.settings.reason){a.thinking='用户发送了消息，我需要根据助手设定组织一个回复……（这里是思考过程占位）';a.dur=(1+Math.random()*2).toFixed(1);}
  a.text='（这里将接入模型回复）'+(S.settings.search?' [已联网]':'');
  save();renderMessages();
 },900);
}
function autoGrow(){const f=$('input-field');f.style.height='auto';f.style.height=Math.min(f.scrollHeight,132)+'px';}
function refreshSend(){$('btn-send').disabled=$('input-field').value.trim().length===0;}

/* ===== 侧边栏 ===== */
function openDrawer(){$('drawer').classList.add('open');$('scrim').hidden=false;}
function closeDrawer(){$('drawer').classList.remove('open');$('scrim').hidden=true;}
function renderDrawer(){
 $('drawer-assistant-name').textContent=curAssistant().name;
 $('drawer-assistant-avatar').textContent=curAssistant().name.slice(0,1);
 $('user-name').textContent=S.userName;
 $('user-avatar').textContent=S.userName.slice(0,1);
 const list=$('drawer-list');list.innerHTML='';
 const q=($('drawer-search-input').value||'').trim();
 let convs=S.convs;
 if(q)convs=convs.filter(c=>c.title.includes(q));
 if(!convs.length){list.appendChild(el('div','grp-label',q?'无匹配':'暂无对话'));return;}
 const today=new Date().toDateString();
 const groups={今天:[],更早:[]};
 convs.forEach(c=>{(new Date(c.ts).toDateString()===today?groups['今天']:groups['更早']).push(c);});
 Object.keys(groups).forEach(g=>{
  if(!groups[g].length)return;
  list.appendChild(el('div','grp-label',g));
  groups[g].forEach(c=>{
   const tile=el('div','chat-tile'+(c.id===S.cur?' active':''),
    `<span class="t">${esc(c.title)}</span><button class="del">${IC.trash}</button>`);
   tile.querySelector('.t').onclick=()=>switchConv(c.id);
   tile.onclick=e=>{if(!e.target.closest('.del'))switchConv(c.id);};
   tile.querySelector('.del').onclick=e=>{e.stopPropagation();if(confirm('删除这个对话？'))delConv(c.id);};
   list.appendChild(tile);
  });
 });
}

/* ===== 底部弹窗框架 ===== */
function sheet(title,build){
 const host=$('sheet-host');host.hidden=false;host.innerHTML='';
 const scr=el('div','sheet-scrim');const sh=el('div','sheet',`<div class="sheet-grip"></div>${title?`<div class="sheet-title">${esc(title)}</div>`:''}`);
 host.appendChild(scr);host.appendChild(sh);
 scr.onclick=closeSheet;
 build(sh);
}
function closeSheet(){$('sheet-host').hidden=true;$('sheet-host').innerHTML='';}
function sheetItem(label,opts){
 opts=opts||{};
 const it=el('div','sheet-item'+(opts.danger?' danger':''),`${opts.icon||''}<span>${esc(label)}${opts.sub?` <span class="sub">${esc(opts.sub)}</span>`:''}</span>${opts.checked?'<span class="ck">✓</span>':''}`);
 if(opts.onClick)it.onclick=()=>{opts.onClick();};
 return it;
}

/* ===== 模型选择 ===== */
function modelSheet(){
 sheet('选择模型',sh=>{
  S.providers.filter(p=>p.enabled).forEach(p=>{
   sh.appendChild(el('div','grp-label',p.name));
   p.models.forEach(m=>{
    const sel=S.model.id===m.id&&S.model.provider===p.name;
    sh.appendChild(sheetItem(m.name,{sub:m.tags.join('·'),checked:sel,onClick:()=>{
     S.model={provider:p.name,id:m.id,label:m.name,chip:m.name.replace(/[^0-9a-zA-Z]/g,'').slice(0,4)};
     save();updateTopbar();closeSheet();toast('已切换模型');
    }}));
   });
  });
 });
}

/* ===== 助手切换 ===== */
function assistantSheet(){
 sheet('选择助手',sh=>{
  S.assistants.forEach(a=>{
   sh.appendChild(sheetItem(a.name,{checked:a.id===S.curA,sub:a.prompt.slice(0,20),onClick:()=>{
    S.curA=a.id;save();renderDrawer();closeSheet();toast('已切换助手');
   }}));
  });
  const add=el('button','btn primary full','管理助手');add.style.marginTop='12px';
  add.onclick=()=>{closeSheet();openScreen(assistantListScreen());};
  sh.appendChild(add);
 });
}

/* ===== +工具面板 ===== */
const TOOLS=[
 {k:'camera',n:'拍照',ic:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/></svg>'},
 {k:'album',n:'相册',ic:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>'},
 {k:'upload',n:'上传文件',ic:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>'},
 {k:'clear',n:'清除上下文',ic:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16a2 2 0 0 1 0-3l8-8 8 8-8 8"/><path d="m18 7-6 6"/></svg>'}
];
function toggleTools(){
 const p=$('tools-panel');
 if(!p.hidden){p.hidden=true;return;}
 p.innerHTML='';
 TOOLS.forEach(t=>{
  const b=el('button','tool-item',`<span class="ic">${t.ic}</span>${t.n}`);
  b.onclick=()=>{
   p.hidden=true;
   if(t.k==='clear'){const c=curConv();if(c){c.msgs=[];save();renderMessages();}toast('已清除上下文');}
   else toast(t.n+'（本地演示）');
  };
  p.appendChild(b);
 });
 p.hidden=false;
}

/* ===== 全屏页面栈 ===== */
function openScreen(node){
 $('screen-host').appendChild(node);
 requestAnimationFrame(()=>node.classList.add('open'));
}
function closeScreen(node){node.classList.remove('open');setTimeout(()=>node.remove(),280);}
function screen(title,rightBtn){
 const sc=el('div','screen');
 const bar=el('div','screen-bar',`<button class="appbar-btn back">${IC.back}</button><span class="ttl">${esc(title)}</span>`);
 if(rightBtn)bar.appendChild(rightBtn);
 sc.appendChild(bar);
 const body=el('div','screen-body');sc.appendChild(body);
 bar.querySelector('.back').onclick=()=>closeScreen(sc);
 sc._body=body;
 return sc;
}
/* 通用构件 */
function navRow(icon,label,val,onClick){
 const r=el('div','nav-row',`<span class="ic">${icon}</span><span class="lbl">${esc(label)}</span>${val!=null?`<span class="val">${esc(val)}</span>`:''}<span class="chev">${IC.chev}</span>`);
 if(onClick)r.onclick=onClick;return r;
}
function swRow(icon,label,sub,get,set){
 const r=el('div','sw-row',`<span class="ic">${icon}</span><div class="txt"><div class="l">${esc(label)}</div>${sub?`<div class="s">${esc(sub)}</div>`:''}</div>`);
 const sw=el('button','ios-sw'+(get()?' on':''));
 sw.onclick=()=>{const v=!get();set(v);sw.classList.toggle('on',v);save();};
 r.appendChild(sw);return r;
}
function sliderRow(label,min,max,step,get,set,fmt){
 const r=el('div','slider-row',`<div class="top"><span class="l">${esc(label)}</span><span class="v">${fmt?fmt(get()):get()}</span></div>`);
 const inp=el('input');inp.type='range';inp.min=min;inp.max=max;inp.step=step;inp.value=get();
 inp.oninput=()=>{set(parseFloat(inp.value));r.querySelector('.v').textContent=fmt?fmt(get()):get();};
 inp.onchange=save;r.appendChild(inp);return r;
}
function card(children){const c=el('div','sec-card');children.forEach((ch,i)=>{if(i)c.appendChild(el('div','row-div'));c.appendChild(ch);});return c;}
function I18(w){return IC.bot;} // 占位图标

/* ===== 设置页 ===== */
function settingsScreen(){
 const sc=screen('设置');const b=sc._body;
 b.appendChild(el('div','sec-header','通用'));
 b.appendChild(card([
  navRow(IC.bot,'颜色模式',{system:'跟随系统',light:'浅色',dark:'深色'}[S.settings.mode],()=>{
   sheet('颜色模式',sh=>{[['system','跟随系统'],['light','浅色'],['dark','深色']].forEach(([k,n])=>{
    sh.appendChild(sheetItem(n,{checked:S.settings.mode===k,onClick:()=>{S.settings.mode=k;save();applyMode();closeSheet();closeScreen(sc);openScreen(settingsScreen());}}));});});
  }),
  navRow(IC.bot,'显示',null,()=>openScreen(displayScreen())),
  navRow(IC.bot,'助手',curAssistant().name,()=>openScreen(assistantListScreen()))
 ]));
 b.appendChild(el('div','sec-header','模型与服务'));
 b.appendChild(card([
  navRow(IC.bot,'默认模型',S.model.label,()=>modelSheet()),
  navRow(IC.bot,'供应商',S.providers.length+' 个',()=>openScreen(providersScreen()))
 ]));
 b.appendChild(el('div','sec-header','数据'));
 b.appendChild(card([
  navRow(IC.bot,'用户名',S.userName,()=>{const v=prompt('用户名',S.userName);if(v){S.userName=v.slice(0,24);save();renderDrawer();closeScreen(sc);openScreen(settingsScreen());}}),
  navRow(IC.bot,'清空所有数据',null,()=>{if(confirm('清空全部数据并恢复默认？')){localStorage.removeItem('kelivo');location.reload();}})
 ]));
 return sc;
}

/* ===== 显示设置 ===== */
function displayScreen(){
 const sc=screen('显示');const b=sc._body;const st=S.settings;
 b.appendChild(el('div','sec-header','聊天条目显示'));
 b.appendChild(card([
  swRow(IC.user,'显示用户头像',null,()=>st.showUserAvatar,v=>{st.showUserAvatar=v;renderMessages();}),
  swRow(IC.user,'显示用户名',null,()=>st.showUserName,v=>{st.showUserName=v;renderMessages();}),
  swRow(IC.bot,'显示时间戳',null,()=>st.showTimestamp,v=>{st.showTimestamp=v;renderMessages();}),
  swRow(IC.bot,'显示消息操作',null,()=>st.showMsgActions,v=>{st.showMsgActions=v;renderMessages();}),
  swRow(IC.bot,'显示模型名',null,()=>st.showModelName,v=>{st.showModelName=v;renderMessages();}),
  swRow(IC.bot,'显示Token统计',null,()=>st.showTokenStats,v=>{st.showTokenStats=v;renderMessages();})
 ]));
 b.appendChild(el('div','sec-header','行为'));
 b.appendChild(card([
  swRow(IC.bot,'自动折叠思考',null,()=>st.autoCollapseThinking,v=>{st.autoCollapseThinking=v;renderMessages();}),
  swRow(IC.bot,'回车发送','桌面端 Enter 发送',()=>st.enterToSend,v=>{st.enterToSend=v;})
 ]));
 b.appendChild(el('div','sec-header','消息背景样式'));
 b.appendChild(card([
  navRow(IC.bot,'气泡样式',{default:'默认(无背景)',frosted:'磨砂',solid:'实色'}[st.bubbleStyle],()=>{
   sheet('消息背景样式',sh=>{[['default','默认(无背景)'],['frosted','磨砂'],['solid','实色']].forEach(([k,n])=>{
    sh.appendChild(sheetItem(n,{checked:st.bubbleStyle===k,onClick:()=>{st.bubbleStyle=k;save();renderMessages();closeSheet();closeScreen(sc);openScreen(displayScreen());}}));});});
  })
 ]));
 return sc;
}

/* ===== 助手列表 ===== */
function assistantListScreen(){
 const add=el('button','appbar-btn',IC.plus);
 const sc=screen('助手',add);const b=sc._body;
 function refresh(){b.innerHTML='';S.assistants.forEach(a=>{
  const c=el('div','list-card',`<div class="av">${esc(a.name.slice(0,1))}</div><div class="col"><div class="nm">${esc(a.name)}</div><div class="sub">${esc(a.prompt)}</div></div>`+(S.assistants.length>1?`<button class="del">${IC.trash}</button>`:''));
  c.onclick=e=>{if(!e.target.closest('.del'))openScreen(assistantEditScreen(a,()=>{closeScreen(sc);openScreen(assistantListScreen());}));};
  const d=c.querySelector('.del');if(d)d.onclick=e=>{e.stopPropagation();if(confirm('删除该助手？')){S.assistants=S.assistants.filter(x=>x.id!==a.id);if(S.curA===a.id)S.curA=S.assistants[0].id;save();refresh();renderDrawer();}};
  b.appendChild(c);
 });}
 add.onclick=()=>{const a={id:uid(),name:'新助手',prompt:'',temperature:0.6,topP:1,contextMessages:64,streaming:true};S.assistants.push(a);save();openScreen(assistantEditScreen(a,()=>{closeScreen(sc);openScreen(assistantListScreen());}));};
 refresh();return sc;
}

/* ===== 助手基础设置编辑 ===== */
function assistantEditScreen(a,onBack){
 const sc=screen('助手设置');const b=sc._body;
 const idcard=el('div','big-card');
 idcard.innerHTML=`<div class="field-lbl">名称</div>`;
 const nm=el('input','field-in');nm.value=a.name;nm.oninput=()=>{a.name=nm.value;save();renderDrawer();};
 idcard.appendChild(nm);
 idcard.insertAdjacentHTML('beforeend',`<div class="field-lbl">系统提示词</div>`);
 const pr=el('textarea','field-in');pr.value=a.prompt;pr.oninput=()=>{a.prompt=pr.value;save();};
 idcard.appendChild(pr);
 b.appendChild(idcard);
 b.appendChild(el('div','sec-header','参数'));
 b.appendChild(card([
  sliderRow('温度 Temperature',0,2,0.05,()=>a.temperature,v=>a.temperature=v,v=>v.toFixed(2)),
  sliderRow('Top P',0,1,0.05,()=>a.topP,v=>a.topP=v,v=>v.toFixed(2)),
  sliderRow('上下文消息数',1,256,1,()=>a.contextMessages,v=>a.contextMessages=v,v=>v+' 条'),
  swRow(IC.bot,'流式输出',null,()=>a.streaming,v=>a.streaming=v)
 ]));
 return sc;
}

/* ===== 供应商列表 ===== */
function providersScreen(){
 const add=el('button','appbar-btn',IC.plus);
 const sc=screen('供应商',add);const b=sc._body;
 function refresh(){b.innerHTML='';S.providers.forEach(p=>{
  const c=el('div','list-card',`<div class="av">${esc(p.name.slice(0,1))}</div><div class="col"><div class="nm">${esc(p.name)}</div><div class="sub">${p.models.length} 个模型 · ${p.enabled?'已启用':'已禁用'}</div></div><button class="del">${IC.trash}</button>`);
  c.onclick=e=>{if(!e.target.closest('.del'))openScreen(providerDetailScreen(p,()=>{closeScreen(sc);openScreen(providersScreen());}));};
  c.querySelector('.del').onclick=e=>{e.stopPropagation();if(confirm('删除该供应商？')){S.providers=S.providers.filter(x=>x.id!==p.id);save();refresh();}};
  b.appendChild(c);
 });}
 add.onclick=()=>{const p={id:uid(),name:'新供应商',apiKey:'',baseUrl:'',enabled:true,models:[]};S.providers.push(p);save();openScreen(providerDetailScreen(p,()=>{closeScreen(sc);openScreen(providersScreen());}));};
 refresh();return sc;
}

/* ===== 供应商详情 ===== */
function providerDetailScreen(p,onBack){
 const sc=screen(p.name);const b=sc._body;
 const cfg=el('div','big-card');
 const mk=(lbl,val,cb,pwd)=>{cfg.insertAdjacentHTML('beforeend',`<div class="field-lbl">${esc(lbl)}</div>`);const i=el('input','field-in');i.value=val||'';if(pwd)i.type='password';i.oninput=()=>{cb(i.value);save();};cfg.appendChild(i);};
 mk('名称',p.name,v=>{p.name=v;sc.querySelector('.ttl').textContent=v;});
 mk('API Key',p.apiKey,v=>p.apiKey=v,true);
 mk('Base URL',p.baseUrl,v=>p.baseUrl=v);
 b.appendChild(cfg);
 b.appendChild(swRowCard('启用',()=>p.enabled,v=>{p.enabled=v;}));
 b.appendChild(el('div','sec-header','模型'));
 const mcard=el('div','sec-card');
 function refreshModels(){mcard.innerHTML='';p.models.forEach((m,i)=>{
  if(i)mcard.appendChild(el('div','row-div'));
  const r=el('div','nav-row',`<span class="ic">${IC.bot}</span><span class="lbl">${esc(m.name)}<br><span style="font-size:11px;opacity:.6">${m.tags.map(t=>`<span class="model-tag">${esc(t)}</span>`).join('')}</span></span><button class="del" style="border:none;background:none;color:var(--error);cursor:pointer">${IC.trash}</button>`);
  r.querySelector('.del').onclick=()=>{p.models.splice(i,1);save();refreshModels();};
  mcard.appendChild(r);
 });}
 refreshModels();b.appendChild(mcard);
 const addm=el('button','btn primary full','添加模型');addm.style.marginTop='12px';
 addm.onclick=()=>{const id=prompt('模型ID(如 gpt-4o)');if(id){p.models.push({id,name:id,tags:[]});save();refreshModels();}};
 b.appendChild(addm);
 return sc;
}
function swRowCard(label,get,set){const c=el('div','sec-card');c.appendChild(swRow(IC.bot,label,null,get,set));return c;}

/* ===== 绑定 ===== */
function bind(){
 $('btn-drawer').onclick=openDrawer;
 $('scrim').onclick=closeDrawer;
 $('btn-newchat').onclick=()=>{newConv();};
 $('btn-minimap').onclick=()=>toast('导航');
 $('title-sub').onclick=modelSheet;
 $('btn-model').onclick=modelSheet;
 $('btn-settings').onclick=()=>{closeDrawer();openScreen(settingsScreen());};
 $('btn-translate').onclick=()=>toast('翻译');
 $('btn-history').onclick=()=>toast('历史');
 $('assistant-bar').onclick=assistantSheet;
 $('btn-more').onclick=toggleTools;
 $('btn-send').onclick=send;
 $('btn-search').onclick=function(){S.settings.search=!S.settings.search;this.classList.toggle('active',S.settings.search);save();};
 $('btn-reason').onclick=function(){S.settings.reason=!S.settings.reason;this.classList.toggle('active',S.settings.reason);save();};
 const f=$('input-field');
 f.addEventListener('input',()=>{autoGrow();refreshSend();});
 f.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&S.settings.enterToSend&&!matchMedia('(pointer:coarse)').matches){e.preventDefault();send();}});
 $('drawer-search-input').addEventListener('input',renderDrawer);
 matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(S.settings.mode==='system')applyMode();});
}

/* ===== 初始化 ===== */
function init(){
 load();applyMode();bind();
 if(S.settings.search)$('btn-search').classList.add('active');
 if(S.settings.reason)$('btn-reason').classList.add('active');
 renderDrawer();renderMessages();updateTopbar();autoGrow();refreshSend();
}
init();
})();
