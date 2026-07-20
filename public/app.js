// GYMQUEST frontend (Cardinal) v3
const $=id=>document.getElementById(id);
let TOKEN=localStorage.getItem('gq_token')||null;
const api=async(m,u,b)=>{const o={method:m,headers:{'Content-Type':'application/json'}};if(TOKEN)o.headers['Authorization']='Bearer '+TOKEN;if(b)o.body=JSON.stringify(b);const r=await fetch(u,o);return r.json();};
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ME=null, INFO=null, WATER=0, WGOAL=6, ACH=null, musicOn=true, audioCtx=null, musicTimer=null;

async function boot(){
  INFO=await api('GET','/api/info');
  const s=await api('GET','/api/settings'); if(s.theme&&s.theme!=='dark')document.body.classList.add('theme-'+s.theme); musicOn=s.musicOn!==false;
  if(s.name)$('musicBtn').textContent=musicOn?'🎵':'🔇';
  setupAuth();
  // Si no hay token, mostrar pantalla de cuenta (login/registro)
  if(!TOKEN){ $('auth').classList.remove('hidden'); return; }
  const acc=await api('GET','/api/auth/me');
  if(!acc.loggedIn){ TOKEN=null; localStorage.removeItem('gq_token'); $('auth').classList.remove('hidden'); return; }
  await loadApp();
}
async function loadApp(){
  $('auth').classList.add('hidden');
  let me=await api('GET','/api/me');
  if(me.none){ await api('POST','/api/onboard',{}); me=await api('GET','/api/me'); }
  ME=me.profile;
  $('onboarding').classList.add('hidden');
  if(!ME.onboarding){ $('onboarding').classList.remove('hidden'); }
  renderHome(); renderTrain(); renderProgress(); renderNutri(); renderStore(); renderMore();
  bind();
  startMusicIfOn();
}

// ---- AUTH: login / registro (frontend) ----
let AUTH_MODE='register'; // 'register' | 'login'
function authErr(msg){ const e=$('authErr'); if(!msg){e.classList.add('hidden');return;} e.textContent=msg; e.classList.remove('hidden'); }
async function doAuth(){
  authErr('');
  const email=$('authEmail').value.trim(), pw=$('authPw').value, name=$('authName').value.trim();
  if(!email||!pw){ authErr('Escribe tu email y contraseña'); return; }
  const path=AUTH_MODE==='register'?'/api/auth/register':'/api/auth/login';
  const body=AUTH_MODE==='register'?{email,password:pw,name}:{email,password:pw};
  const r=await api('POST',path,body);
  if(r.token){ TOKEN=r.token; localStorage.setItem('gq_token',TOKEN); await loadApp(); }
  else authErr(r.error||'No se pudo, revisa los datos');
}
async function googleLogin(credential){
  const r=await api('POST','/api/auth/google',{credential});
  if(r.token){ TOKEN=r.token; localStorage.setItem('gq_token',TOKEN); await loadApp(); }
  else authErr(r.error||'Error con Google');
}
function setupAuth(){
  $('authSubmit').addEventListener('click', doAuth);
  $('authToggle').addEventListener('click', e=>{ e.preventDefault();
    AUTH_MODE=AUTH_MODE==='register'?'login':'register';
    $('authSubmit').textContent=AUTH_MODE==='register'?'Crear cuenta':'Iniciar sesión';
    $('authToggleTxt').textContent=AUTH_MODE==='register'?'¿Ya tienes cuenta?':'¿No tienes cuenta?';
    $('authToggle').textContent=AUTH_MODE==='register'?'Inicia sesión':'Regístrate';
    $('authNameL').style.display=AUTH_MODE==='register'?'':'none';
    authErr('');
  });
  $('authSkip').addEventListener('click', async e=>{ e.preventDefault(); TOKEN=null; localStorage.removeItem('gq_token'); await loadApp(); });
  // Google Identity: solo si el server tiene GOOGLE_CLIENT_ID configurado
  const cid=INFO&&INFO.googleClientId;
  if(cid){
    const init=()=>{ if(!window.google||!google.accounts){ setTimeout(init,300); return; }
      google.accounts.id.initialize({ client_id:cid, callback:(resp)=>googleLogin(resp.credential) });
      google.accounts.id.renderButton($('gbtn'),{theme:'filled_blue',size:'large',width:320,text:'continue_with'});
    }; init();
  } else {
    // Sin client_id configurado: ocultar zona Google y mostrar aviso suave
    $('gbtn').style.display='none';
    const fb=$('authGoogleFallback'); fb.classList.remove('hidden');
    fb.addEventListener('click',()=>authErr('El inicio con Google se activa cuando Cardinal configure la clave de Google. Por ahora usa email y contraseña 👇'));
  }
}
function avatarEmoji(){ const b=ME?ME.bought:[]; if(b.includes('avatar_legend'))return '🦸'; if(b.includes('avatar_warrior'))return '🥷'; return '🧍'; }

// ---- HOME ----
function renderHome(){
  if(!ME)return;
  let rank=INFO.ranks[0].name; for(const x of INFO.ranks){if(ME.xp>=x.min)rank=x.name;}
  const next=INFO.ranks.map(x=>x.min).filter(z=>z>ME.xp).sort((a,b)=>a-b); const nx=next.length?next[0]:null;
  const cur=ME.level*100, pct=nx?Math.min(100,(ME.xp/cur)*100):100;
  const b=ME.boss, bp=Math.min(100,(b.progress/b.goal)*100);
  $('view-home').innerHTML=`
    <div class="hero"><div class="avatar">${avatarEmoji()}</div>
      <div class="rank">⚔️ ${esc(rank)}</div><div class="level">Nivel ${ME.level} · ${esc(ME.settings.name)}</div>
      <div class="xpbar"><div class="xpfill" style="width:${pct}%"></div><span>${nx?`${ME.xp}/${cur} XP (falta ${nx-ME.xp})`:`${ME.xp} XP · MÁX`}</span></div>
      <div class="streak">🔥 Racha: ${ME.streak} días</div></div>
    <button id="trainBtn" class="bigbtn">▶ ENTRENAR AHORA (+XP)</button>
    <div class="stats-row">
      <div class="stat"><span class="sv">${ME.attributes.str}</span><span class="sl">Fuerza</span></div>
      <div class="stat"><span class="sv">${ME.attributes.res}</span><span class="sl">Resist.</span></div>
      <div class="stat"><span class="sv">${ME.attributes.agi}</span><span class="sl">Agilid.</span></div>
      <div class="stat"><span class="sv">${ME.attributes.vit}</span><span class="sl">Vital.</span></div></div>
    <div class="boss"><h3>👹 Jefe Semanal</h3><div class="bossbar"><div class="bossfill" style="width:${bp}%"></div><span>${b.progress}/${b.goal}</span></div>
      <p class="muted small">${b.defeated?`✅ ¡Jefe vencido! +${b.reward}🪙`:`Vence al jefe entrenando ${b.goal} días esta semana.`}</p></div>
    <div class="card"><h3>✅ Hábitos de hoy</h3><div id="habitsBox"></div></div>
    <div class="quote" id="quoteBox">"${esc(INFO.quotes[Math.floor(Math.random()*INFO.quotes.length)])}"</div>`;
  $('trainBtn').onclick=()=>show('train');
  renderHabits();
}
async function renderHabits(){
  const h=await api('GET','/api/habit');
  const box=$('habitsBox'); if(!box)return;
  box.innerHTML=INFO.habits.map(x=>`<div class="habit ${h.habits[x.id]?'done':''}" data-id="${x.id}"><span>${esc(x.name)} <span class="pill">+${x.xp} XP</span></span><div class="chk">${h.habits[x.id]?'✓':''}</div></div>`).join('');
  box.querySelectorAll('.habit').forEach(el=>el.onclick=async()=>{ const done=el.classList.toggle('done'); await api('POST','/api/habit',{id:el.dataset.id,done}); if(done){ME.xp+=5;ME.coins+=1;renderHome();confetti();} });
}

// ---- TRAIN ----
function renderTrain(){
  $('view-train').innerHTML=`
    <h2>🎯 Entrenar</h2>
    <form id="trainForm" class="card">
      <label>Tipo<select id="tType"><option value="fuerza">Fuerza</option><option value="cardio">Cardio/Resistencia</option><option value="agilidad">Agilidad/Movilidad</option><option value="mixto">Mixto</option></select></label>
      <label>Duración (min)<input id="tDur" type="number" min="5" max="300" value="45"></label>
      <label>Ejercicio principal (para PR, opcional)<input id="tEx" list="exList" placeholder="Sentadilla"><datalist id="exList">${INFO.exercises.map(e=>`<option value="${esc(e.name)}">`).join('')}</datalist></label>
      <label>Peso usado (kg, opcional)<input id="tW" type="number" step="0.5" placeholder="60"></label>
      <label>Enfoque<input id="tFocus" type="text" placeholder="ej. Pecho"></label>
      <label>Notas<textarea id="tNotes" rows="2"></textarea></label>
      <button type="submit" class="btn">✅ Completar (+XP)</button>
    </form>
    <div id="trainResult" class="result hidden"></div>
    <h3>⏱️ Temporizador de descanso</h3>
    <div id="timerDisp">60</div><button id="timerStart" class="btn sec">Iniciar 60s</button>
    <h3>📚 Biblioteca de ejercicios</h3><div class="ex-grid">${INFO.exercises.map(e=>`<div class="ex"><img src="${e.icon}" alt=""><div class="nm">${esc(e.name)}</div><div class="mu">${esc(e.muscle)}</div><div class="tips">${esc(e.tips)}</div></div>`).join('')}</div>
    <h3>🌟 Rutinas estilo influencers</h3>${INFO.influencers.map(i=>`<div class="card"><h3>${esc(i.name)}</h3><p class="muted small">${esc(i.style)} · ${esc(i.goal)}</p><p class="small muted">${esc(i.note)}</p>${i.routine.map(d=>`<div class="routine-day"><span><b>${esc(d.day)}</b> · ${esc(d.focus)}</span><span>${esc(d.exercises.join(', '))}</span></div>`).join('')}</div>`).join('')}`;
  $('trainForm').onsubmit=async(e)=>{ e.preventDefault();
    const r=await api('POST','/api/train',{type:$('tType').value,duration:Number($('tDur').value),exercise:$('tEx').value,weight:Number($('tW').value),focus:$('tFocus').value,notes:$('tNotes').value});
    ME=await (await api('GET','/api/me')).profile; renderHome();
    const res=$('trainResult'); res.classList.remove('hidden'); res.innerHTML=`<b>¡Entrenamiento completado!</b><br>+${r.xp} XP · +${r.coins}🪙<br>Nivel ${ME.level} · ${r.rank}${r.rec.streak?'<br>🔥 Racha '+ME.streak+' días':''}`; confetti(); $('trainForm').reset();
  };
  let tmr=null; $('timerStart').onclick=()=>{ let s=60; $('timerDisp').textContent=s; clearInterval(tmr); tmr=setInterval(()=>{s--;$('timerDisp').textContent=s;if(s<=0){clearInterval(tmr);alert('¡Descanso terminado! 💪');}} ,1000); };
}

// ---- PROGRESS ----
function renderProgress(){
  $('view-progress').innerHTML=`
    <h2>📊 Tu Progreso</h2>
    <div class="card"><h3>⚖️ Peso</h3><input id="wInput" type="number" step="0.1" placeholder="kg"><input id="wGoal" type="number" step="0.1" placeholder="objetivo kg"><button id="wSave" class="btn sec">Guardar</button><canvas id="weightChart" width="320" height="140"></canvas></div>
    <div class="card"><h3>📏 Medidas corporales</h3><div id="measBox"></div><div class="measure-row"><input id="mPart" placeholder="parte (brazo)"><input id="mVal" type="number" step="0.1" placeholder="cm"><button id="mSave" class="btn sec">+</button></div></div>
    <div class="card"><h3>🏆 Récords personales (PR)</h3><div id="prBox"></div><div class="pr-row"><input id="prEx" placeholder="ejercicio"><input id="prVal" type="number" step="0.5" placeholder="kg"><button id="prSave" class="btn sec">+</button></div></div>
    <div class="card"><h3>📸 Fotos de progreso</h3><input id="phFile" type="file" accept="image/*"><input id="phNote" type="text" placeholder="nota (opcional)"><button id="phSave" class="btn sec">Subir</button><div class="photo-grid" id="phGrid"></div></div>
    <div class="card"><h3>💡 Tip del día</h3><p class="small">${esc(INFO.tips[Math.floor(Math.random()*INFO.tips.length)])}</p></div>`;
  loadProgressData();
  $('wSave').onclick=async()=>{ await api('POST','/api/weight',{weight:Number($('wInput').value),goalWeight:Number($('wGoal').value)||null}); loadProgressData(); alert('Peso guardado'); };
  $('mSave').onclick=async()=>{ await api('POST','/api/measure',{part:$('mPart').value,value:Number($('mVal').value)}); loadProgressData(); };
  $('prSave').onclick=async()=>{ await api('POST','/api/pr',{exercise:$('prEx').value,value:Number($('prVal').value)}); loadProgressData(); };
  $('phSave').onclick=async()=>{ const f=$('phFile').files[0]; if(!f)return; const d=await fileToDataURL(f); await api('POST','/api/photo',{data:d,note:$('phNote').value}); loadProgressData(); };
}
async function loadProgressData(){
  const wl=await api('GET','/api/weight'); drawWeight(wl.weightLog,wl.goal);
  const ms=await api('GET','/api/measure'); $('measBox').innerHTML=Object.entries(ms.measures).map(([p,arr])=>`<div class="small">${esc(p)}: ${arr[arr.length-1].value} cm <span class="muted">(${arr.length} regs)</span></div>`).join('')||'<p class="small muted">Sin medidas aún.</p>';
  const pr=await api('GET','/api/pr'); $('prBox').innerHTML=Object.entries(pr.prs).map(([e,v])=>`<div class="small">${esc(e)}: <b>${v} kg</b></div>`).join('')||'<p class="small muted">Sin PR aún.</p>';
  const ph=await api('GET','/api/photo'); $('phGrid').innerHTML=ph.photos.map(p=>`<img src="${p.data}" alt="${esc(p.note)}" title="${esc(p.date)}"><div class="small">${esc(p.note)}</div>`).join('')||'<p class="small muted">Sube tu primera foto.</p>';
}
function drawWeight(log,goal){ const c=$('weightChart'); if(!c)return; const ctx=c.getContext('2d'); ctx.clearRect(0,0,320,140); if(!log||log.length<1){ctx.fillStyle='#94a3b8';ctx.font='12px sans-serif';ctx.fillText('Sin datos',130,70);return;} const vals=log.map(l=>l.weight); const min=Math.min(...vals,goal||min),max=Math.max(...vals,goal||max); const X=i=>20+i*(280/(log.length-1||1)), Y=v=>125-((v-min)/((max-min)||1))*100; ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;ctx.beginPath(); log.forEach((l,i)=>{const px=X(i),py=Y(l.weight);i?ctx.lineTo(px,py):ctx.moveTo(px,py);}); ctx.stroke(); if(goal){ctx.strokeStyle='#fbbf24';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(20,Y(goal));ctx.lineTo(300,Y(goal));ctx.stroke();ctx.setLineDash([]);} }
function fileToDataURL(f){ return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);}); }

// ---- NUTRI ----
function renderNutri(){
  $('view-nutri').innerHTML=`
    <h2>🥗 Nutrición</h2>
    <div class="card"><h3>🧮 Calcula tus macros</h3>
      <label>Peso<input id="cW" type="number" step="0.1"></label><label>Altura (cm)<input id="cH" type="number"></label><label>Edad<input id="cA" type="number"></label>
      <label>Sexo<select id="cSex"><option value="m">M</option><option value="f">F</option></select></label>
      <label>Actividad<select id="cAct">${Object.entries({sedentario:'Sedentario',ligero:'Ligero',moderado:'Moderado',intenso:'Intenso',atleta:'Atleta'}).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>Objetivo<select id="cGoal"><option value="mantenimiento">Mantenimiento</option><option value="volumen">Volumen</option><option value="definicion">Definición</option></select></label>
      <button id="calcBtn" class="btn">Calcular</button></div>
    <div id="calcResult" class="result hidden"></div>
    <div class="card"><h3>💧 Hidratación</h3><div class="waterctrl"><button id="wMinus" class="btn sec">−</button><span id="waterCount" class="big">0</span><button id="wPlus" class="btn sec">+</button></div><p class="muted small">Meta: <span id="waterGoal">6</span> vasos</p></div>
    <h3>🍽️ Dietas</h3>${INFO.diets.map(d=>`<div class="card"><h3>${esc(d.name)}</h3><p class="muted small">${esc(d.kcalNote)}</p><p class="small">Proteína ${esc(d.macros.protein)} · Carbs ${esc(d.macros.carbs)} · Grasa ${esc(d.macros.fat)}</p>${d.meals.map(m=>`<div class="meal"><b>${esc(m[0])}</b><span>${esc(m[1])}</span></div>`).join('')}</div>`).join('')}
    <h3>🍳 Recetas rápidas</h3>${INFO.recipes.map(r=>`<div class="meal"><b>${esc(r.name)}</b><span class="pill">${esc(r.tag)}</span><span>${r.kcal} kcal</span></div><div class="small muted">${esc(r.ing)}</div>`).join('')}`;
  $('calcBtn').onclick=async()=>{ const r=await api('POST','/api/calc',{weight:Number($('cW').value),height:Number($('cH').value),age:Number($('cA').value),sex:$('cSex').value,activity:$('cAct').value,goal:$('cGoal').value}); const b=$('calcResult'); b.classList.remove('hidden'); if(r.error){b.innerHTML='Faltan datos';return;} b.innerHTML=`<b>IMC:</b> ${r.imc} (${r.imcLabel})<br><b>TDEE:</b> ${r.tdee} kcal<br><b>Proteína:</b> ${r.protein} g · <b>Grasa:</b> ${r.fat} g · <b>Carbs:</b> ${r.carbs} g`; };
  loadWater();
  $('wPlus').onclick=async()=>{const r=await api('POST','/api/water',{add:1});WATER=r.water;$('waterCount').textContent=WATER;};
  $('wMinus').onclick=async()=>{const r=await api('POST','/api/water',{add:-1});WATER=r.water;$('waterCount').textContent=WATER;};
}
async function loadWater(){ const s=await api('GET','/api/settings'); WGOAL=s.waterGoal||6; const me=await api('GET','/api/me'); const t=new Date().toISOString().slice(0,10); WATER=(me.profile.waterLog&&me.profile.waterLog[t])||0; $('waterCount').textContent=WATER; $('waterGoal').textContent=WGOAL; }

// ---- STORE ----
async function renderStore(){
  const me=await api('GET','/api/me'); ME=me.profile; ACH=await api('GET','/api/achievements');
  const bought=new Set(ME.bought||[]);
  $('view-store').innerHTML=`
    <h2>🛍️ Tienda y Perfil</h2>
    <div class="card"><h3>🪙 Monedas: ${ME.coins}</h3><p class="small muted">Gana monedas entrenando. ¡Gasálas en cosméticos!</p>
      <label>Tu nombre<input id="setName" value="${esc(ME.settings.name)}"></label><button id="setNameBtn" class="btn sec">Guardar nombre</button></div>
    <h3>🎨 Cosméticos</h3>${INFO.cosmetics.map(c=>`<div class="shop-item"><span><b>${esc(c.name)}</b><br><span class="muted small">${c.cost} 🪙</span></span><button data-id="${c.id}" ${bought.has(c.id)?'disabled':''}>${bought.has(c.id)?'✔':'Comprar'}</button></div>`).join('')}
    <h3>🌈 Temas</h3>${INFO.themes.map(t=>`<div class="shop-item"><span><b>${esc(t.name)}</b></span><button data-theme="${t.id}">Aplicar</button></div>`).join('')}
    <div class="card"><h3>⭐ Cardinal Pro</h3><p class="small">${ME.pro?'✅ ACTIVO — desbloqueaste retos y más.':'Desbloquea retos compartidos y análisis avanzado.'}</p>${ME.pro?'':'<input id="proCode" placeholder="código (pídelo a Cardinal)"><button id="proBtn" class="btn sec">Activar</button>'}</div>
    <div id="challengesBox"></div>
    <button id="addChallenge" class="btn wide">➕ Crear reto (Pro)</button>`;
  $('view-store').querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{ const r=await api('POST','/api/shop/buy',{id:b.dataset.id}); if(r.error){alert('Sin monedas 😅');return;} ME.coins=r.coins; if(b.dataset.id.startsWith('theme_')){} alert('¡Comprado! 🎉'); renderStore(); });
  $('view-store').querySelectorAll('[data-theme]').forEach(b=>b.onclick=async()=>{ await api('POST','/api/settings',{theme:b.dataset.theme}); document.body.className=''; if(b.dataset.theme!=='dark')document.body.classList.add('theme-'+b.dataset.theme); alert('Tema aplicado'); });
  $('setNameBtn').onclick=async()=>{ await api('POST','/api/settings',{name:$('setName').value}); renderStore(); };
  const proBtn=$('proBtn'); if(proBtn)proBtn.onclick=async()=>{ const r=await api('POST','/api/pro/activate',{code:$('proCode').value}); if(r.error){alert('Código incorrecto');return;} alert('¡Cardinal Pro activado! 🎉'); renderStore(); };
  $('addChallenge').onclick=async()=>{ if(!ME.pro){alert('Activa Cardinal Pro para crear retos');return;} const name=prompt('Nombre del reto:'); if(!name)return; await api('POST','/api/challenge',{name,type:'train',goal:5,reward:50}); renderStore(); };
  renderChallenges();
}
async function renderChallenges(){
  const c=await api('GET','/api/challenge'); const box=$('challengesBox'); if(!box)return;
  box.innerHTML=`<h3>🏆 Tus retos</h3>`+(c.challenges.length?'':'<p class="small muted">Sin retos. Crea uno para competir contigo mismo.</p>')+c.challenges.map(ch=>{const p=Math.min(100,((ch.progress||0)/ch.goal)*100);return `<div class="challenge"><div><b>${esc(ch.name)}</b> ${ch.done?'✅':''}</div><div class="muted small">${ch.progress||0}/${ch.goal} · +${ch.reward}🪙</div><div class="cbar"><div class="cfill" style="width:${p}%"></div></div></div>`;}).join('');
}

// ---- MORE ----
async function renderMore(){
  const mon=INFO.monetization;
  $('view-more').innerHTML=`
    <h2>⋯ Más</h2>
    <div id="acctBox" class="secret" style="border-style:solid;border-color:var(--panel2)"></div>
    <button id="exportBtn" class="btn wide">⬇ Exportar datos</button>
    <label class="btn wide filebtn">⬆ Importar datos<input id="importFile" type="file" accept=".json" hidden></label>
    <button id="themeBtn" class="btn wide sec">🌗 Cambiar tema rápido</button>
    <div class="secret"><h3>💰 Monetización (tu billetera)</h3><p class="small muted">${esc(mon.note)}</p>
      <label>PayPal (link o correo)<input id="mPaypal" value="${esc(mon.paypal||'')}" placeholder="https://paypal.me/tucuenta"></label>
      <label>BTC<input id="mBtc" value="${esc(mon.crypto.btc||'')}" placeholder="dirección BTC"></label>
      <label>ETH<input id="mEth" value="${esc(mon.crypto.eth||'')}" placeholder="dirección ETH"></label>
      <label>USDT<input id="mUsdt" value="${esc(mon.crypto.usdt||'')}" placeholder="dirección USDT"></label>
      <button id="saveMoney" class="btn">Guardar y generar botón de propina</button>
      <div id="tipBox"></div></div>
    <p class="muted small" style="margin-top:14px">GYMQUEST · Cardinal — tu empresa de apps. 100% local y gratis.</p>`;
  $('exportBtn').onclick=()=>{window.location='/api/export';};
  $('importFile').onchange=async(e)=>{const f=e.target.files[0];if(!f)return;const d=JSON.parse(await f.text());await api('POST','/api/import',{data:d});alert('Importado');location.reload();};
  $('themeBtn').onclick=async()=>{const light=document.body.classList.toggle('theme-light');if(!light)document.body.className='';await api('POST','/api/settings',{theme:light?'light':'dark'});};
  $('saveMoney').onclick=()=>{ const pay=$('mPaypal').value, btc=$('mBtc').value, eth=$('mEth').value, usdt=$('mUsdt').value;
    const link=pay||(btc?'bitcoin:'+btc:'')||(eth?'ethereum:'+eth:'')||(usdt?'ethereum:'+usdt:'');
    localStorage.setItem('gq_pay',JSON.stringify({pay,btc,eth,usdt}));
    const tip=link?`<a class="btn wide" href="${esc(link.startsWith('http')?link:'https://'+link)}" target="_blank">☕ Invítame un café (propina)</a>`:'<p class="small muted">Pega tu PayPal/crypto arriba.</p>';
    $('tipBox').innerHTML=tip; alert('¡Listo! Tu botón de propina está activo. Comparte tu app y recibe pagos directo a tu billetera.'); };
  const saved=localStorage.getItem('gq_pay'); if(saved){const m=JSON.parse(saved);const link=m.pay||(m.btc?'bitcoin:'+m.btc:'');if(link)$('tipBox').innerHTML=`<a class="btn wide" href="${esc(link.startsWith('http')?link:'https://'+link)}" target="_blank">☕ Invítame un café (propina)</a>`;}
  // Cuenta actual + logout
  const acc=await api('GET','/api/auth/me');
  const box=$('acctBox');
  if(acc.loggedIn){
    box.innerHTML=`<h3>👤 Tu cuenta</h3><p class="small">${esc(acc.user.name||'')} · <span class="muted">${esc(acc.user.email||'')}</span> ${acc.user.provider==='google'?'<span class="muted">(Google)</span>':''}</p><button id="logoutBtn" class="btn wide sec">🚪 Cerrar sesión</button>`;
    $('logoutBtn').onclick=async()=>{ await api('POST','/api/auth/logout'); TOKEN=null; localStorage.removeItem('gq_token'); location.reload(); };
  } else {
    box.innerHTML=`<h3>👤 Cuenta</h3><p class="small muted">Estás sin cuenta: tu progreso se guarda solo en este equipo.</p><button id="loginNowBtn" class="btn wide">Crear cuenta / Iniciar sesión</button>`;
    $('loginNowBtn').onclick=()=>{ $('auth').classList.remove('hidden'); };
  }
}

// ---- MUSIC (Web Audio, generada, sin archivos) ----
function startMusicIfOn(){ if(musicOn)startMusic(); }
function startMusic(){
  try{ audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)(); if(musicTimer)return;
    const notes=[220,277,330,294,247,262]; let i=0;
    musicTimer=setInterval(()=>{ const o=audioCtx.createOscillator(),g=audioCtx.createGain(); o.type='sine'; o.frequency.value=notes[i%notes.length]; g.gain.value=0.04; o.connect(g);g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+1.6); o.stop(audioCtx.currentTime+1.6); i++; },1400);
  }catch(e){}
}
function stopMusic(){ if(musicTimer){clearInterval(musicTimer);musicTimer=null;} }
$('musicBtn').onclick=async()=>{ musicOn=!musicOn; $('musicBtn').textContent=musicOn?'🎵':'🔇'; if(musicOn)startMusic();else stopMusic(); await api('POST','/api/settings',{musicOn}); };

// ---- NAV ----
function show(v){ document.querySelectorAll('.view').forEach(x=>x.classList.add('hidden')); $('view-'+v).classList.remove('hidden'); document.querySelectorAll('.mitem').forEach(m=>m.classList.toggle('active',m.dataset.view===v)); if(v==='store')renderStore(); if(v==='progress')loadProgressData(); }
function bind(){ document.querySelectorAll('.mitem').forEach(m=>m.onclick=()=>show(m.dataset.view)); }

// ---- ONBOARDING (robusto: multiples mecanismos de cierre, nunca se queda pillado) ----
function closeOnboarding(){ const o=$('onboarding'); if(o)o.classList.add('hidden'); }
// 1) Delegacion de eventos en document (funciona aunque el DOM tarde en existir)
function tryCloseOnboarding(target){
  if(!target) return;
  // click en X, Empezar o Saltar -> cerramos (Empezar/Saltar tambien guardan)
  if(target.id==='oClose' || target.id==='oSkip'){ doSkip(); return; }
  if(target.id==='oStart'){ doStart(); return; }
}
document.addEventListener('click', (e)=>{ tryCloseOnboarding(e.target); }, true);
// 2) Tap fuera de la card (en el overlay) cierra
document.addEventListener('click', (e)=>{
  const ov=$('onboarding'); if(!ov||ov.classList.contains('hidden'))return;
  if(e.target===ov){ closeOnboarding(); }
}, false);
// 3) Auto-cierre de red de seguridad: si a los 15s sigue el overlay, se cierra solo
setTimeout(()=>{ const ov=$('onboarding'); if(ov && !ov.classList.contains('hidden')){ console.log('auto-close onboarding'); closeOnboarding(); } }, 15000);

async function doStart(){
  const b={name:$('oName').value||'Atleta',weight:Number($('oWeight').value)||null,height:Number($('oHeight').value)||null,age:Number($('oAge').value)||null,sex:$('oSex').value,activity:$('oAct').value,goal:$('oGoal').value,goalWeight:Number($('oGoalW').value)||null};
  try{ await api('POST','/api/onboard',b); }catch(e){}
  closeOnboarding();
  try{ ME=await (await api('GET','/api/me')).profile; renderHome(); confetti(); }catch(e){}
}
async function doSkip(){
  try{ await api('POST','/api/onboard',{name:$('oName').value||'Atleta',weight:null,height:null,age:null,sex:'m',activity:'moderado',goal:'mantenimiento',goalWeight:null}); }catch(e){}
  closeOnboarding();
  try{ ME=await (await api('GET','/api/me')).profile; renderHome(); }catch(e){}
}

// ---- CONFETI ----
let confettiRAF=null;
function confetti(){ const c=$('confetti'); c.classList.remove('hidden'); const ctx=c.getContext('2d'); c.width=innerWidth;c.height=innerHeight; const ps=Array.from({length:90},()=>({x:Math.random()*c.width,y:-10,vy:2+Math.random()*3,col:`hsl(${Math.random()*360},80%,60%)`,s:4+Math.random()*5})); let f=0; cancelAnimationFrame(confettiRAF); const iv=setInterval(()=>{ctx.clearRect(0,0,c.width,c.height);ps.forEach(p=>{p.y+=p.vy;ctx.fillStyle=p.col;ctx.fillRect(p.x,p.y,p.s,p.s);});f++;if(f>120){clearInterval(iv);c.classList.add('hidden');}},16); }

boot();
