// GYMQUEST — Backend (Cardinal) v4. Node.js puro. Puerto desde $PORT (Render) o 3001.
// Almacenamiento: Redis si REDIS_URL está set (Render), si no data.json local.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const SEED = require('./seed');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const PORT_HTTP = 3002, ROOT = __dirname;
const DATA_FILE = path.join(ROOT,'data.json');
const BACKUP_DIR = path.join(ROOT,'backups');
const PUBLIC_DIR = path.join(ROOT,'public');
const REDIS_URL = process.env.REDIS_URL || null;

let DATA = defaultData();
let redis = null;

function defaultData(){ return { profiles:{}, current:null, settings:{ theme:'dark', waterGoal:6, reminderTime:'18:00', name:'Atleta', onboarded:false, musicOn:true } }; }
function round2(n){ return Math.round(Number(n)*100)/100; }
function sendJSON(res,s,o){ res.writeHead(s,{'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(o)); }
function readBody(req){ return new Promise((res)=>{ let b=''; req.on('data',c=>b+=c); req.on('end',()=>{try{res(b?JSON.parse(b):{})}catch(e){res({})}}); }); }
function newId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function weekKey(){ const d=new Date(); const onejan=new Date(d.getFullYear(),0,1); return d.getFullYear()+'-W'+Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7); }
function has(arr,id){ return (arr||[]).some(a=>(a.id||a)===id); }
function rankFor(xp){ let r=SEED.RANKS[0].name; for(const x of SEED.RANKS){ if(xp>=x.min)r=x.name; } return r; }
function xpForNext(xp){ const m=SEED.RANKS.map(x=>x.min).filter(z=>z>xp).sort((a,b)=>a-b); return m.length?m[0]:null; }

function persist(){
  const str=JSON.stringify(DATA);
  if(redis){ redis.set('gymquest:data', str).catch(e=>console.log('redis set err',e.message)); }
  else { try{ fs.writeFileSync(DATA_FILE,str,'utf8'); }catch(e){} }
  if(!redis) makeBackup();
}
function makeBackup(){ try{ if(!fs.existsSync(BACKUP_DIR))fs.mkdirSync(BACKUP_DIR,{recursive:true});
  const t=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  fs.writeFileSync(path.join(BACKUP_DIR,`bk-${t}.json.gz`), zlib.gzipSync(JSON.stringify(DATA)));
  fs.readdirSync(BACKUP_DIR).sort().reverse().slice(10).forEach(f=>fs.unlinkSync(path.join(BACKUP_DIR,f)));
}catch(e){} }

function ensureProfile(id){
  if(!DATA.profiles[id]) DATA.profiles[id]={
    id, xp:0, level:1, coins:0, streak:0, lastTrain:null,
    attributes:{str:1,res:1,agi:1,vit:1},
    sessions:[], weightLog:[], measures:{}, prs:{}, habits:{}, photos:[], waterLog:{},
    achievements:[], boss:{week:weekKey(),defeated:false,progress:0,goal:4,reward:100},
    onboarding:null, bought:[], settings:{name:'Atleta', goalWeight:null},
    pro:false, friends:[], challenges:[]
  };
  return DATA.profiles[id];
}

function trainLogic(p, s){
  const dur=Number(s.duration)||30; let xp=Math.round(dur*1.5), coins=Math.round(dur/5);
  const today=new Date().toISOString().slice(0,10);
  if(p.lastTrain!==today){ const yest=new Date(Date.now()-86400000).toISOString().slice(0,10);
    p.streak=(p.lastTrain===yest)?p.streak+1:1; if(p.streak>=2){xp+=10*(p.streak-1);coins+=2;} p.lastTrain=today; }
  p.xp+=xp; p.coins+=coins;
  while(p.xp>=p.level*100){ p.xp-=p.level*100; p.level++; }
  const t=(s.type||'fuerza').toLowerCase();
  if(t.includes('fuer'))p.attributes.str++; else if(t.includes('card')||t.includes('res'))p.attributes.res++;
  else if(t.includes('agi')||t.includes('mov'))p.attributes.agi++; else p.attributes.vit++;
  if(s.exercise&&s.weight){ const w=Number(s.weight); if(!p.prs[s.exercise]||w>p.prs[s.exercise]) p.prs[s.exercise]=round2(w); }
  const rec={id:newId(),date:today,type:s.type,duration:dur,focus:s.focus||'',exercise:s.exercise||'',weight:Number(s.weight)||0,notes:s.notes||'',xp,coins};
  p.sessions.push(rec);
  if(p.sessions.length>=1&&!has(p.achievements,'first'))p.achievements.push({id:'first',date:today});
  if(p.sessions.length>=10&&!has(p.achievements,'ten'))p.achievements.push({id:'ten',date:today});
  if(p.sessions.length>=50&&!has(p.achievements,'fifty'))p.achievements.push({id:'fifty',date:today});
  if(p.sessions.length>=100&&!has(p.achievements,'hundred'))p.achievements.push({id:'hundred',date:today});
  if(p.streak>=7&&!has(p.achievements,'streak7'))p.achievements.push({id:'streak7',date:today});
  if(p.boss.week!==weekKey())p.boss={week:weekKey(),defeated:false,progress:0,goal:4,reward:100};
  p.boss.progress++; if(p.boss.progress>=p.boss.goal&&!p.boss.defeated){p.boss.defeated=true;p.coins+=p.boss.reward;if(!has(p.achievements,'boss1'))p.achievements.push({id:'boss1',date:today});}
  (p.challenges||[]).forEach(c=>{ if(!c.done && c.type==='train'){ c.progress=(c.progress||0)+1; if(c.progress>=c.goal){c.done=true; p.coins+=c.reward||50;} } });
  return {xp,coins,rec};
}

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
function serveStatic(req,res){
  let u=req.url.split('?')[0]; if(u==='/')u='/index.html';
  const fp=path.join(PUBLIC_DIR,path.normalize(u));
  if(!fp.startsWith(PUBLIC_DIR)){res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(fp,(e,c)=>{ if(e){res.writeHead(404);res.end('Not found');return;} res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'}); res.end(c); });
}

function calc(b){
  const w=Number(b.weight),h=Number(b.height)/100,age=Number(b.age),sex=(b.sex||'m').toLowerCase();
  if(!w||!h)return{error:'falta peso/altura'};
  const imc=round2(w/(h*h));
  let tdee=(sex==='m')?10*w+6.25*(h*100)-5*age+5:10*w+6.25*(h*100)-5*age-161;
  const act={sedentario:1.2,ligero:1.375,moderado:1.55,intenso:1.725,atleta:1.9};
  tdee=Math.round(tdee*(act[b.activity]||1.2));
  const prot=(b.goal==='volumen'||b.goal==='definicion')?(b.goal==='definicion'?2.3:2.0):1.8;
  const protein=round2(prot*w),fat=round2(0.8*w),carbs=round2((tdee-protein*4-fat*9)/4);
  let body='mantenimiento'; if(imc<18.5)body='bajo peso'; else if(imc>=25)body='sobrepeso'; else if(imc>=30)body='obesidad';
  return{imc,imcLabel:body,tdee,protein,fat,carbs};
}

const server=https.createServer((req,res)=>{
  const url=req.url.split('?')[0]; const q=Object.fromEntries(new URL(req.url,'http://x').searchParams);
  if(req.method==='GET'&&url==='/api/info') return sendJSON(res,200,{ ranks:SEED.RANKS, missions:SEED.MISSIONS, achievements:SEED.ACHIEVEMENTS, shop:SEED.SHOP, quotes:SEED.QUOTES, influencers:SEED.INFLUENCERS, diets:SEED.DIETS, exercises:SEED.EXERCISES, cosmetics:SEED.COSMETICS, themes:SEED.THEMES, habits:SEED.HABITS, recipes:SEED.RECIPES, tips:SEED.TIPS, monetization:SEED.MONETIZATION });
  if(req.method==='GET'&&url==='/api/profiles') return sendJSON(res,200,{profiles:Object.values(DATA.profiles).map(p=>({id:p.id,level:p.level,coins:p.coins,xp:p.xp,streak:p.streak,name:p.settings.name,onboarded:!!p.onboarding})),current:DATA.current});
  if(req.method==='POST'&&url==='/api/profiles'){ (async()=>{ const b=await readBody(req); const id=b.id||newId(); ensureProfile(id); if(b.name)DATA.profiles[id].settings.name=String(b.name).slice(0,30); DATA.current=id; persist(); sendJSON(res,201,DATA.profiles[id]); })(); return; }
  if(req.method==='POST'&&url==='/api/profiles/switch'){ (async()=>{ const b=await readBody(req); if(DATA.profiles[b.id]){DATA.current=b.id;persist();sendJSON(res,200,{ok:true});} else sendJSON(res,404,{error:'no'}); })(); return; }
  if(req.method==='GET'&&url==='/api/me'){ if(!DATA.current||!DATA.profiles[DATA.current])return sendJSON(res,200,{none:true}); const p=DATA.profiles[DATA.current]; return sendJSON(res,200,{profile:p,rank:rankFor(p.xp),next:xpForNext(p.xp),boss:p.boss}); }
  if(req.method==='POST'&&url==='/api/onboard'){ (async()=>{ const b=await readBody(req); const p=ensureProfile(DATA.current||'default'); DATA.current=p.id; const w=Number(b.weight),h=Number(b.height),a=Number(b.age); p.onboarding={weight:isNaN(w)||w<=0?null:round2(w),height:isNaN(h)||h<=0?null:h,age:isNaN(a)||a<=0?null:a,sex:String(b.sex||'m'),goal:b.goal||'mantenimiento',activity:b.activity||'moderado'}; p.settings.goalWeight=(()=>{const g=Number(b.goalWeight);return isNaN(g)||g<=0?null:round2(g);})(); DATA.settings.onboarded=true; persist(); sendJSON(res,200,p.onboarding); })(); return; }
  if(req.method==='POST'&&url==='/api/train'){ (async()=>{ const b=await readBody(req); const p=ensureProfile(DATA.current||'default'); DATA.current=p.id; const r=trainLogic(p,b); persist(); sendJSON(res,201,{rank:rankFor(p.xp),next:xpForNext(p.xp),...r}); })(); return; }
  if(req.method==='POST'&&url==='/api/weight'){ (async()=>{ const b=await readBody(req); const p=ensureProfile(DATA.current||'default'); DATA.current=p.id; const w=round2(Number(b.weight)); if(!isNaN(w)){p.weightLog.push({date:new Date().toISOString().slice(0,10),weight:w});if(b.goalWeight)p.settings.goalWeight=round2(Number(b.goalWeight));} persist(); sendJSON(res,201,{weightLog:p.weightLog,goal:p.settings.goalWeight}); })(); return; }
  if(req.method==='GET'&&url==='/api/weight'){ const p=DATA.profiles[DATA.current||'default']; return sendJSON(res,200,{weightLog:p?p.weightLog:[],goal:p?p.settings.goalWeight:null}); }
  if(req.method==='POST'&&url==='/api/measure'){ (async()=>{ const b=await readBody(req); const p=ensureProfile(DATA.current||'default'); DATA.current=p.id; const part=String(b.part||'brazo'); p.measures[part]=p.measures[part]||[]; p.measures[part].push({date:new Date().toISOString().slice(0,10),value:round2(Number(b.value))}); persist(); sendJSON(res,201,p.measures); })(); return; }
  if(req.method==='GET'&&url==='/api/measure'){ const p=DATA.profiles[DATA.current||'default']; return sendJSON(res,200,{measures:p?p.measures:{}}); }
  if(req.method==='POST'&&url==='/api/pr'){ (async()=>{ const b=await readBody(req); const p=ensureProfile(DATA.current||'default'); DATA.current=p.id; const ex=String(b.exercise||''); if(ex&&b.value){ p.prs[ex]=round2(Number(b.value)); persist(); } sendJSON(res,201,p.prs); })(); return; }
  if(req.method==='GET'&&url==='/api/pr'){ const p=DATA.profiles[DATA.current||'default']; return sendJSON(res,200,{prs:p?p.prs:{}}); }
  if(req.method==='POST'&&url==='/api/photo'){ (async()=>{ const b=await readBody(req); const p=ensureProfile(DATA.current||'default'); DATA.current=p.id; if(b.data){ const thumb=String(b.data).slice(0,500000); p.photos.push({id:newId(),date:new Date().toISOString().slice(0,10),data:thumb,note:String(b.note||'')}); persist(); } sendJSON(res,201,{count:p.photos.length}); })(); return; }
  if(req.method==='GET'&&url==='/api/photo'){ const p=DATA.profiles[DATA.current||'default']; return sendJSON(res,200,{photos:(p?p.photos:[]).map(x=>({id:x.id,date:x.date,note:x.note}))}); }
  if(req.method==='POST'&&url==='/api/habit'){ (async()=>{ const b=await readBody(req); const p=ensureProfile(DATA.current||'default'); DATA.current=p.id; const today=new Date().toISOString().slice(0,10); p.habits[today]=p.habits[today]||{}; p.habits[today][b.id]=(b.done!==false); persist(); sendJSON(res,200,{habits:p.habits[today]}); })(); return; }
  if(req.method==='GET'&&url==='/api/habit'){ const p=DATA.profiles[DATA.current||'default']; const today=new Date().toISOString().slice(0,10); return sendJSON(res,200,{habits:(p&&p.habits[today])||{}}); }
  if(req.method==='POST'&&url==='/api/water'){ (async()=>{ const b=await readBody(req); const p=ensureProfile(DATA.current||'default'); DATA.current=p.id; const today=new Date().toISOString().slice(0,10); p.waterLog=p.waterLog||{}; p.waterLog[today]=(p.waterLog[today]||0)+(b.add||1); persist(); sendJSON(res,200,{water:p.waterLog[today],goal:DATA.settings.waterGoal}); })(); return; }
  if(req.method==='GET'&&url==='/api/achievements'){ const p=DATA.profiles[DATA.current||'default']; return sendJSON(res,200,{unlocked:(p?p.achievements:[]).map(a=>a.id),all:SEED.ACHIEVEMENTS}); }
  if(req.method==='POST'&&url==='/api/shop/buy'){ (async()=>{ const b=await readBody(req); const p=ensureProfile(DATA.current||'default'); DATA.current=p.id; const item=SEED.SHOP.find(s=>s.id===b.id)||SEED.COSMETICS.find(s=>s.id===b.id); if(!item)return sendJSON(res,404,{error:'no'}); if(p.coins<item.cost)return sendJSON(res,400,{error:'sinmonedas'}); p.coins-=item.cost; p.bought=p.bought||[]; p.bought.push(item.id); persist(); sendJSON(res,200,{coins:p.coins,bought:p.bought}); })(); return; }
  if(req.method==='POST'&&url==='/api/pro/activate'){ (async()=>{ const b=await readBody(req); const p=ensureProfile(DATA.current||'default'); DATA.current=p.id; if(String(b.code||'').toUpperCase()==='CARDINALPRO'){ p.pro=true; persist(); return sendJSON(res,200,{pro:true}); } sendJSON(res,400,{error:'codigo'}); })(); return; }
  if(req.method==='POST'&&url==='/api/challenge'){ (async()=>{ const b=await readBody(req); const p=ensureProfile(DATA.current||'default'); DATA.current=p.id; p.challenges=p.challenges||[]; const c={id:newId(),name:String(b.name||'Reto'),type:b.type||'train',goal:Number(b.goal)||5,progress:0,reward:Number(b.reward)||50,done:false,friend:b.friend||null}; p.challenges.push(c); persist(); sendJSON(res,201,p.challenges); })(); return; }
  if(req.method==='GET'&&url==='/api/challenge'){ const p=DATA.profiles[DATA.current||'default']; return sendJSON(res,200,{challenges:p?p.challenges:[]}); }
  if(req.method==='POST'&&url==='/api/calc'){ (async()=>{ const b=await readBody(req); sendJSON(res,200,calc(b)); })(); return; }
  if(req.method==='POST'&&url==='/api/settings'){ (async()=>{ const b=await readBody(req); if(b.theme)DATA.settings.theme=b.theme; if(b.waterGoal)DATA.settings.waterGoal=Number(b.waterGoal); if(b.reminderTime)DATA.settings.reminderTime=String(b.reminderTime); if(b.musicOn!==undefined)DATA.settings.musicOn=!!b.musicOn; if(b.name&&DATA.current)DATA.profiles[DATA.current].settings.name=String(b.name).slice(0,30); persist(); sendJSON(res,200,DATA.settings); })(); return; }
  if(req.method==='GET'&&url==='/api/settings'){ return sendJSON(res,200,DATA.settings); }
  if(req.method==='GET'&&url==='/api/stats'){ const p=DATA.profiles[DATA.current||'default']; if(!p)return sendJSON(res,200,{none:true}); const sess=p.sessions; const byType={}; sess.forEach(s=>byType[s.type]=(byType[s.type]||0)+1); const totalMin=sess.reduce((a,s)=>a+(s.duration||0),0); return sendJSON(res,200,{totalSessions:sess.length,totalMin,byType,streak:p.streak,level:p.level,coins:p.coins,weightLog:p.weightLog.slice(-20),photos:p.photos.length,challenges:(p.challenges||[]).filter(c=>!c.done).length}); }
  if(req.method==='GET'&&url==='/api/export'){ res.writeHead(200,{'Content-Type':'application/json','Content-Disposition':'attachment; filename="gymquest.json"'}); return res.end(JSON.stringify(DATA)); }
  if(req.method==='POST'&&url==='/api/import'){ (async()=>{ const b=await readBody(req); if(b.data){DATA=b.data;persist();sendJSON(res,200,{ok:true});} else sendJSON(res,400,{error:'no'}); })(); return; }
  if(req.method==='GET') return serveStatic(req,res);
  sendJSON(res,404,{error:'no'});
});

async function initStorage(){
  if(REDIS_URL){
    try{ const {createClient}=require('redis'); redis=createClient({url:REDIS_URL}); redis.on('error',e=>console.log('redis err',e.message)); await redis.connect(); const r=await redis.get('gymquest:data'); if(r){DATA=JSON.parse(r); console.log('Cargado desde Redis');} else {persist();} console.log('Redis OK'); }
    catch(e){ console.log('Redis fallo, usando archivo:',e.message); redis=null; loadFile(); }
  } else loadFile();
}
function loadFile(){ try{ DATA=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); }catch(e){ DATA=defaultData(); } }

(async()=>{
  await initStorage();
  server.listen(PORT,'0.0.0.0',()=>console.log(`GYMQUEST (Cardinal) en puerto ${PORT} ${REDIS_URL?'[Redis]':'[archivo]'}`));
})();
http.createServer((req,res)=>{ res.writeHead(301,{Location:`https://${req.headers.host.split(':')[0]}:${PORT}${req.url}`}); res.end(); }).listen(PORT_HTTP,'0.0.0.0',()=>console.log(`Redirect en :${PORT_HTTP}`));
