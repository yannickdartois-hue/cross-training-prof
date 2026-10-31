/* collectif.js — chrono de classe pour le vidéoprojecteur (Tabata, EMOM, AMRAP, For Time).
   Tout le monde travaille en même temps ; les élèves comptent leurs répétitions sur leur tablette ou leur carnet.
   Aucune donnée d'élève ici : seuls les réglages sont gardés sur l'appareil. */
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CLE='ct-collectif';
const mv=id=>MOUV.find(m=>m.id===id)||{nom:id};
const mmss=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
let C={f:'tabata',e:20,r:10,n:8,ordre:'v',min:8,cap:10,prep:10,ex:[{m:'squat',reps:10},{m:'pompe-genoux',reps:8},{m:'mountain-climber',reps:10},{m:'planche',reps:0}]};
try{const o=JSON.parse(localStorage.getItem(CLE)||'null');if(o&&o.ex)C=Object.assign(C,o)}catch(e){}
const garder=()=>{try{localStorage.setItem(CLE,JSON.stringify(C))}catch(e){}};
const FORMATS=[['tabata','TABATA'],['emom','EMOM'],['amrap','AMRAP'],['fortime','FOR TIME']];

function reglage(){
  const ex=C.ex.slice(0,5);
  $('#reglage').innerHTML=`<h2>Un WOD pour toute la classe</h2>
  <p class="small muted">Lance le chrono sur le vidéoprojecteur : tout le monde travaille en même temps. Les élèves comptent leurs répétitions (tablette ou carnet). Idéal aux séances 1 et 2 pour apprendre les formats.</p>
  <section class="carte"><h3>Format</h3><div class="rangee choix">${FORMATS.map(([k,l])=>`<button type="button" class="${C.f===k?'on':''}" data-a="f" data-v="${k}">${l}</button>`).join('')}</div>
  ${C.f==='tabata'?`<div class="rangee choix"><span class="small">Effort / repos</span>${CTL.TABATA_REGLAGES.map(([e,r])=>`<button type="button" class="${C.e===e&&C.r===r?'on':''}" data-a="er" data-v="${e}/${r}">${e}/${r}</button>`).join('')}</div>
    <div class="rangee"><label class="small" for="n">Rounds</label><input id="n" class="num" type="number" min="1" max="40" value="${C.n}" data-c="n">
    <span class="choix"><button type="button" class="${C.ordre!=='h'?'on':''}" data-a="ordre" data-v="v">Vertical 1-2-3-4-1…</button> <button type="button" class="${C.ordre==='h'?'on':''}" data-a="ordre" data-v="h">Horizontal 1-1-2-2…</button></span></div>`:''}
  ${C.f==='emom'||C.f==='amrap'?`<div class="rangee"><label class="small" for="min">Durée (min)</label><input id="min" class="num" type="number" min="1" max="60" value="${C.min}" data-c="min"></div>`:''}
  ${C.f==='fortime'?`<div class="rangee"><label class="small" for="cap">Temps limite (min)</label><input id="cap" class="num" type="number" min="1" max="60" value="${C.cap}" data-c="cap"></div>`:''}
  <div class="rangee"><label class="small" for="prep">Compte à rebours de départ (s)</label><input id="prep" class="num" type="number" min="3" max="60" value="${C.prep}" data-c="prep"></div></section>
  <section class="carte"><h3>Exercices (1 à 5)</h3>${ex.map((e,k)=>`<div class="ex"><select data-k="${k}" aria-label="Exercice ${k+1}">${MOUV.map(m=>`<option value="${m.id}"${m.id===e.m?' selected':''}>${esc(m.nom)} · ${m.z} N${m.n}</option>`).join('')}</select>${C.f==='tabata'?'':`<input class="num" type="number" min="0" max="99" value="${e.reps||''}" data-r="${k}" aria-label="Répétitions" placeholder="rép.">`}</div>`).join('')}
    <div class="rangee"><button class="bt mini" type="button" data-a="plus" ${ex.length>=5?'disabled':''}>+ Exercice</button><button class="bt mini" type="button" data-a="moins" ${ex.length<=1?'disabled':''}>− Exercice</button></div></section>
  <p class="small muted">Durée totale : <b>${mmss(duree())}</b> (sans le compte à rebours).</p>
  <div class="rangee"><button class="bt orange" type="button" data-a="go">▶ Lancer sur l’écran</button></div>`;
}
function duree(){return C.f==='tabata'?C.n*C.e+(C.n-1)*C.r:C.f==='fortime'?C.cap*60:C.min*60}
function exoRound(i){const k=C.ex.length;if(C.ordre==='h'){const par=Math.max(1,Math.round(C.n/k));return Math.min(k-1,Math.floor(i/par))}return i%k}
function plan(){const P=[['prep',C.prep]];
  if(C.f==='tabata')for(let i=0;i<C.n;i++){P.push(['effort',C.e,i]);if(i<C.n-1)P.push(['repos',C.r,i])}
  else if(C.f==='emom')for(let m=0;m<C.min;m++)P.push(['min',60,m]);
  else P.push([C.f,duree(),0]);
  let t=0;return P.map(p=>{const o={typ:p[0],d:p[1],i:p[2],t0:t};t+=p[1];return o})}

/* ----- Son et écran allumé ----- */
let AC=null,son=true,verrou=null;
function bip(f,d){if(!son)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;o.connect(g);g.connect(AC.destination);g.gain.setValueAtTime(.3,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);o.start();o.stop(AC.currentTime+d)}catch(e){}}
async function eveille(){try{if('wakeLock' in navigator)verrou=await navigator.wakeLock.request('screen')}catch(e){}}

/* ----- Déroulé ----- */
let P=null,debut=0,pause=0,enPause=false,tick=null,dern=-1,dernS=-1;
function lancer(){C.ex=C.ex.slice(0,5);garder();P=plan();debut=performance.now();pause=0;enPause=false;dern=-1;dernS=-1;
  $('#ecran').hidden=false;document.body.style.overflow='hidden';eveille();
  try{if(document.documentElement.requestFullscreen&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}
  clearInterval(tick);tick=setInterval(peindre,100);peindre()}
function arreter(){clearInterval(tick);tick=null;$('#ecran').hidden=true;$('#ecran').className='';document.body.style.overflow='';try{verrou&&verrou.release()}catch(e){}
  try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}}
const ecoule=()=>((enPause?pause:performance.now())-debut)/1000;
function peindre(){
  const t=ecoule(),tot=P[P.length-1].t0+P[P.length-1].d,k=P.findIndex(p=>t<p.t0+p.d),fini=k<0;
  const ph=fini?P[P.length-1]:P[k],reste=ph.t0+ph.d-t,s=Math.ceil(reste);
  if(!fini&&k!==dern){if(dern>=0)bip(ph.typ==='repos'?440:880,ph.typ==='repos'?.4:.6);dern=k}
  if(!fini&&s<=3&&s>=1&&s!==dernS&&ph.typ!=='amrap'&&ph.typ!=='fortime'){bip(660,.12);dernS=s}
  if(!fini&&(ph.typ==='amrap'||ph.typ==='fortime')&&s<=3&&s>=1&&s!==dernS){bip(660,.12);dernS=s}
  if(fini){clearInterval(tick);tick=null;bip(988,.9);setTimeout(()=>bip(1319,1.2),350)}
  const E=$('#ecran');E.className=fini?'':ph.typ==='effort'?'effort':ph.typ==='repos'?'repos':'';
  const liste=()=>`<div class="liste">${C.ex.map(e=>esc(mv(e.m).nom)+(e.reps?' × '+e.reps:'')).join('<br>')}</div>`;
  const image=e=>{const m=mv(e.m);return m.img?`<img src="../cross-training-eleves/img/mv/${esc(m.img)}.webp" alt="" onerror="this.remove()">`:''};
  let haut='',temps='',milieu='',apres='';
  if(fini){haut=`<span>Terminé !</span><span></span>`;temps='0:00';milieu=`<div class="nom">Bravo ! Notez votre score et votre FC.</div>`}
  else if(ph.typ==='prep'){haut=`<span>Préparez-vous</span><span>${esc(FORMATS.find(f=>f[0]===C.f)[1])}</span>`;temps=String(s);const e0=C.f==='tabata'?C.ex[exoRound(0)]:null;milieu=e0?`${image(e0)}<div class="nom">${esc(mv(e0.m).nom)}</div>`:liste()}
  else if(ph.typ==='effort'||ph.typ==='repos'){const e=C.ex[exoRound(ph.i)],nx=ph.i+1<C.n?C.ex[exoRound(ph.i+1)]:null;
    haut=`<span>${ph.typ==='effort'?'Effort':'Repos'}</span><span>Round ${ph.i+1} / ${C.n}</span>`;temps=String(s);
    const vu=ph.typ==='effort'?e:nx;milieu=vu?`${image(vu)}<div class="nom">${ph.typ==='repos'?'<span class="reps">À venir</span>':''}${esc(mv(vu.m).nom)}</div>`:'';
    apres=ph.typ==='effort'&&nx?'Ensuite : '+esc(mv(nx.m).nom):''}
  else if(ph.typ==='min'){haut=`<span>EMOM</span><span>Minute ${ph.i+1} / ${C.min}</span>`;temps=String(s);milieu=liste();apres=s<=10?'Prochaine minute : on repart !':'Tout faire, puis récupérer le reste de la minute'}
  else if(ph.typ==='amrap'){haut=`<span>AMRAP ${C.min} min</span><span>Le plus de tours possible</span>`;temps=mmss(reste);milieu=liste()}
  else if(ph.typ==='fortime'){haut=`<span>For Time</span><span>Limite ${C.cap} min</span>`;temps=mmss(t-ph.t0);milieu=liste();apres='Notez votre temps à l’arrivée'}
  E.innerHTML=`<div class="haut">${haut}</div><div class="temps" aria-live="off">${temps}</div><div class="exo">${milieu}</div><div class="apres">${apres}</div>
   <div class="bas">${fini?'':`<button class="bt" type="button" data-a="pause">${enPause?'▶ Reprendre':'⏸ Pause'}</button>`}<button class="bt" type="button" data-a="son">${son?'🔊 Son':'🔇 Muet'}</button><button class="bt" type="button" data-a="stop">${fini?'Fermer':'■ Arrêter'}</button></div>`;
}

document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,v=b.dataset.v;
  if(a==='f'){C.f=v;C.ex=C.ex.slice(0,5);if(v!=='tabata'&&C.ex.some(x=>!x.reps))C.ex.forEach(x=>{if(!x.reps)x.reps=10})}
  else if(a==='er'){const [x,y]=v.split('/').map(Number);C.e=x;C.r=y}
  else if(a==='ordre')C.ordre=v;
  else if(a==='plus'){const pris=new Set(C.ex.map(x=>x.m)),m=MOUV.find(x=>!pris.has(x.id));C.ex.push({m:m.id,reps:10})}
  else if(a==='moins')C.ex.pop();
  else if(a==='go'){lancer();return}
  else if(a==='pause'){if(enPause){debut+=performance.now()-pause;enPause=false}else{pause=performance.now();enPause=true}peindre();return}
  else if(a==='son'){son=!son;peindre();return}
  else if(a==='stop'){if(tick&&!b.classList.contains('confirme')){b.classList.add('confirme');b.textContent='Sûr ? Toucher encore';setTimeout(()=>b.classList&&b.classList.remove('confirme'),3000);return}arreter();return}
  else return;
  garder();reglage()});
document.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.c){const v=Math.max(+t.min||1,Math.min(+t.max||60,Math.round(+t.value||0)));C[t.dataset.c]=v}
  else if(t.dataset.k!=null)C.ex[+t.dataset.k].m=t.value;
  else if(t.dataset.r!=null)C.ex[+t.dataset.r].reps=Math.max(0,+t.value||0);
  else return;garder();reglage()});
document.addEventListener('keydown',e=>{if($('#ecran').hidden)return;if(e.key===' '){e.preventDefault();const b=document.querySelector('[data-a=pause]');b&&b.click()}if(e.key==='Escape'&&!tick)arreter()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&tick)eveille()});
const th=$('#theme');const majT=()=>th.textContent=document.documentElement.dataset.theme==='dark'?'☀️':'🌙';
th.addEventListener('click',()=>{const d=document.documentElement.dataset.theme==='dark';if(d)delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme='dark';try{localStorage.setItem('eps_theme',d?'light':'dark')}catch(e){}majT()});majT();
reglage();
window.CTC={plan,C:()=>C};
})();
