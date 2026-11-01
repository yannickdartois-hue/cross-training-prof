/* =====================================================================
   prof.js — Cross training · outil prof
   Classes (Pronote), QR de démarrage, réception (QR et fichiers), appel,
   fiche de chaque élève (toutes ses séances), grille de l'épreuve, export.
   Données gardées sur cet appareil (localStorage). Noms complets : jamais envoyés en ligne.
   ===================================================================== */
'use strict';
const CLE='ctp-v1';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const vide=()=>({classesL:{},rec:{},notes:{},noms:{},classe:'',tab:'classes',eleve:'',journal:[],ancien:[]});
let DB=(()=>{try{const o=JSON.parse(localStorage.getItem(CLE));return o?Object.assign(vide(),o):vide()}catch(e){return vide()}})();
function sauver(){try{localStorage.setItem(CLE,JSON.stringify(DB))}catch(e){alert('Mémoire pleine : exporte une sauvegarde puis archive l’année.')}}
function journal(t){DB.journal.unshift(new Date().toLocaleString('fr-FR')+' · '+t);DB.journal=DB.journal.slice(0,40)}
let toastT;function toast(t){clearTimeout(toastT);let d=$('.toast');if(!d){d=document.createElement('div');d.className='toast';d.setAttribute('role','status');document.body.appendChild(d)}d.textContent=t;toastT=setTimeout(()=>d.remove(),2600)}

/* ---------- Noms ---------- */
function partsNom(t){
  const w=String(t||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);
  const maj=x=>x===x.toUpperCase()&&/[A-ZÀ-Ý]/.test(x),part=x=>/^(de|du|des|d'|d’|le|la|van|von|der|den|di|da|del|dos)$/.test(x);
  const dans=w.map(maj);for(let i=w.length-2;i>=0;i--)if(!dans[i]&&part(w[i])&&dans[i+1])dans[i]=true;
  return {nom:w.filter((x,i)=>dans[i]).join(' '),pre:w.filter((x,i)=>!dans[i]).join(' ')};
}
function decouperNom(t){t=String(t||'').replace(/\s+/g,' ').trim();if(!t)return null;const {nom,pre}=partsNom(t);return nom&&pre?pre+' '+nom:t}
function cleTri(n){const {nom,pre}=partsNom(n);return nom&&pre?nom+' '+pre:String(n||'')}
const triNom=(a,b)=>cleTri(a).localeCompare(cleTri(b),'fr');
const cleEleve=(c,n)=>norm(c)+'|'+norm(n);
const nomDe=k=>DB.noms[k]||k.split('|')[1];
function classeReelle(c){return Object.keys(DB.classesL).find(x=>norm(x)===norm(c))||c}

/* ---------- Import Pronote ---------- */
function lireLignes(rows,classeDefaut){
  rows=rows.map(r=>(r||[]).map(c=>c==null?'':String(c).trim()));
  const hi=rows.findIndex(r=>r.some(c=>/^(é|e)l(è|e)ve|^nom\b|^nom$|pr(é|e)nom/i.test(c)));
  const H=hi>=0?rows[hi].map(c=>norm(c)):[];const col=re=>H.findIndex(h=>re.test(h));
  const iNom=col(/^nom( de famille)?$/),iPre=col(/^prenom/),iEl=col(/^eleve|^nom prenom|^nom et prenom|^identite/),iCl=col(/^classe/);
  const out={};
  rows.slice(hi+1).forEach(r=>{let n='';
    if(iNom>=0&&iPre>=0&&r[iNom])n=r[iPre]+' '+r[iNom].toUpperCase();else if(iEl>=0)n=decouperNom(r[iEl]);else if(hi<0)n=decouperNom(r[0]);
    if(!n||/^(total|effectif)/i.test(n))return;const c=(iCl>=0&&r[iCl])||classeDefaut;if(!c)return;(out[c]=out[c]||new Set()).add(n.trim())});
  return out;
}
function chargerScript(src,glob){return new Promise((ok,ko)=>{if(window[glob])return ok();const e=document.createElement('script');e.src=src;e.onload=()=>ok();e.onerror=()=>ko(new Error('Impossible de charger '+src));document.head.appendChild(e)})}
async function importerListe(files,texte,classeDefaut){
  let lots=[];
  if(files&&files.length)await chargerScript('xlsx.js','XLSX');
  for(const f of files||[]){const buf=await f.arrayBuffer();let wb;
    if(/\.(csv|txt)$/i.test(f.name)||/text|csv/.test(f.type)){let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch(e){t=new TextDecoder('windows-1252').decode(buf)}
      t=t.replace(/^﻿/,'');const l1=t.split(/\r?\n/)[0];const sep=(l1.match(/;/g)||[]).length>=(l1.match(/,/g)||[]).length?';':',';wb=XLSX.read(t,{type:'string',FS:sep})}
    else wb=XLSX.read(buf,{type:'array'});
    wb.SheetNames.forEach(sn=>lots.push(XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:false,defval:''})))}
  if(texte&&texte.trim())lots.push(texte.trim().split(/\r?\n/).map(l=>l.split(/\t|;/)));
  const tout={};lots.forEach(rows=>Object.entries(lireLignes(rows,classeDefaut)).forEach(([c,set])=>{(tout[c]=tout[c]||new Set());set.forEach(n=>tout[c].add(n))}));
  const C=Object.keys(tout);
  if(!C.length){alert(classeDefaut?'Aucun nom trouvé.':'Aucun élève trouvé. Il faut une colonne « Classe », ou écrire le nom de la classe avant d’importer.');return}
  C.forEach(c=>{const old=DB.classesL[c]||{lien:'',niv:/^t/i.test(c)?'t':'p',dem:'p'};DB.classesL[c]=Object.assign(old,{eleves:[...tout[c]].sort(triNom)})});
  journal('Listes importées : '+C.map(c=>c+' ('+tout[c].size+')').join(', '));DB.classe=C[0];sauver();rendre();
}
async function qrDemarrage(c){
  const L=DB.classesL[c];
  const txt=await TTQR.encoder({a:'CTE',v:1,t:'C',c,l:L.eleves,u:L.lien||'',n:L.niv||'p',m:L.dem||'p',s:L.s||'l'});
  let svg;try{svg=TTQR.svgQR(txt)}catch(e){svg='<p class="avert">Liste trop longue pour un seul QR.</p>'}
  const d=document.createElement('div');d.className='qr-plein';
  d.innerHTML=`<div><h2>Classe ${esc(c)} · cross training</h2><p>${esc(CTL.NOM_NIV[L.niv||'p'])} · démarche ${esc(CTL.NOM_DEM[L.dem||'p'])} · saisie ${L.s==='c'?'complète':'légère'}</p><p>Dans l’appli élève : « Scanner le QR de la classe »</p><div class="qrbox">${svg}</div><button class="bt noir" type="button">Fermer</button></div>`;
  d.querySelector('button').onclick=()=>d.remove();document.body.appendChild(d);
}

/* ---------- Réception ---------- */
function importerObjet(o,source){
  if(!o||o.app!=='cross-training-eleves'||!o.eleve||!o.seance)throw new Error('Ce fichier ne vient pas de l’appli élève cross training.');
  const c=classeReelle(o.classe||'Sans classe'),k=cleEleve(c,o.eleve),cle=k+'|'+o.seance;
  if(!DB.classesL[c])DB.classesL[c]={eleves:[],lien:'',niv:(o.parcours==='t'||o.parcours==='h')?'t':'p',dem:(o.parcours==='g'||o.parcours==='h')?'g':'p',s:o.saisie==='complete'?'c':'l'};
  if(!DB.classesL[c].eleves.some(n=>norm(n)===norm(o.eleve)))DB.classesL[c].eleves.push(o.eleve);
  DB.noms[k]=DB.noms[k]||o.eleve;
  const ts=o.ts||(o.exportedAt?Math.round(Date.parse(o.exportedAt)/1000):Math.round(Date.now()/1000));
  const old=DB.rec[cle];
  if(old&&old.ts>ts)return 'Déjà plus récent : '+o.eleve+' S'+o.seance;
  DB.rec[cle]=Object.assign({},o,{classe:c,ts,source:source||o.source||'fichier',recu:Date.now()});
  return (old?'Mis à jour : ':'Reçu : ')+o.eleve+' · séance '+o.seance;
}
async function importerFichiers(files){
  let n=0,err=[];
  const un=async(nom,txt)=>{try{const o=JSON.parse(txt);importerObjet(o,'fichier');n++}catch(e){err.push(nom)}};
  for(const f of files){
    if(/\.zip$/i.test(f.name)){try{await chargerScript('jszip.js','JSZip');const z=await JSZip.loadAsync(f);for(const x of Object.values(z.files).filter(x=>!x.dir&&/\.json$/i.test(x.name)))await un(x.name.split('/').pop(),await x.async('string'))}catch(e){err.push(f.name)}}
    else await un(f.name,await f.text())}
  journal(n+' fichier'+(n>1?'s':'')+' importé'+(n>1?'s':'')+(err.length?' · refusés : '+err.join(', '):''));sauver();rendre();
  toast(n+' séance'+(n>1?'s':'')+' importée'+(n>1?'s':'')+(err.length?' · '+err.length+' refusé'+(err.length>1?'s':''):''));
}
/* QR de l'ancienne appli « Cross Training Pompidou » : NOM;PRÉNOM;CLASSE;SCORE_WOD1|SCORE_WOD2…[;C:coach][;R:ressenti:commentaire]
   (format et décodage repris de son mode prof). Rangés à part : ils ne portent pas de numéro de séance. */
const RW_ANC={'1':'Épuisé','2':'Très fatigué','3':'Moyen','4':'Léger','5':'Frais'},RS_ANC={'1':'Épuisé','2':'Très fatigué','3':'Moyen','4':'Légèrement fatigué','5':'Pas fatigué'};
function lireAncien(raw){
  const parts=String(raw||'').trim().split(';');if(parts.length<4)throw new Error('Format invalide (attendu NOM;PRÉNOM;CLASSE;SCORE).');
  const [nom,prenom,classe]=parts;let coach='',rs='',rc='';const sc=[];
  parts.slice(3).forEach(x=>{if(x.startsWith('C:'))coach=x.slice(2);else if(x.startsWith('R:')){const d=x.slice(2).split(':');rs=d[0]||'';rc=d.slice(1).join(':')}else sc.push(x)});
  const segs=sc.join(';').split('|').reduce((a,g)=>{if(/^(A:|F:|E\+:|E:|T:)/.test(g))a.push(g);else if(a.length)a[a.length-1]+='|'+g;return a},[]);
  if(!segs.length)throw new Error('Aucun score lu dans ce QR.');
  const wods=segs.map(seg=>{const tk=seg.split(';'),raw=tk[0];let exos=[],notes=[],niv='',duree='',rw='',rwc='';
    tk.slice(1).forEach(t=>{if(t.startsWith('EX:'))exos=t.slice(3).split(',').filter(Boolean);else if(t.startsWith('NE:'))notes=t.slice(3).split(',').map(n=>parseInt(n)||0);
      else if(t.startsWith('LV:'))niv=t.slice(3);else if(t.startsWith('D:'))duree=t.slice(2);else if(t.startsWith('RW:')){const d=t.slice(3).split(':');rw=d[0];rwc=d.slice(1).join(':')}});
    let mode='?',lab=raw;
    if(raw.startsWith('A:')){mode='AMRAP';const a=raw.match(/(\d+)t/),b=raw.match(/=(\d+)r/),c=raw.match(/N(\d)/);lab=(a?a[1]+' tours':'?')+(b?' · '+b[1]+' rép.':'')+(c?' · N'+c[1]:niv?' · N'+niv:'')}
    else if(raw.startsWith('F:')){mode='FOR TIME';const ok=raw.slice(2).startsWith('OK');lab=(ok?'✓ ':'✗ Cap ')+raw.slice(2).replace('OK-','').replace('CAP-','').split('|')[0]}
    else if(raw.startsWith('E+:')){mode='EMOM+1';lab=raw.slice(3).split('|')[0].replace('/',' / ')+' min validées'+(niv?' · N'+niv:'')}
    else if(raw.startsWith('E:')){mode='EMOM';lab=raw.slice(2).split('|')[0].replace('/',' / ')+' min validées'+(niv?' · N'+niv:'')}
    else if(raw.startsWith('T:')){mode='TABATA';const x=raw.slice(2).split('|')[0].split('-');lab='plancher '+x[0]+' rép.'+(x[1]?' · total '+x[1]:'')}
    return {mode,score:lab,brut:raw,exos,notes:exos.map((e,i)=>notes[i]||null),niveau:niv,duree,ressenti:rw?rw+' '+(RW_ANC[rw]||''):'',commentaire:rwc}});
  const o={nom:nom.trim(),prenom:prenom.trim(),classe:classeReelle(classe.trim()),coach,ressentiSeance:rs?rs+' '+(RS_ANC[rs]||''):'',commentaire:rc,wods,ts:Date.now(),date:new Date().toLocaleDateString('fr-FR')};
  DB.ancien=DB.ancien||[];const k=norm(o.nom+' '+o.prenom),sig=w=>w.map(x=>x.brut).join('|'),i=DB.ancien.findIndex(x=>norm(x.nom+' '+x.prenom)===k&&x.date===o.date&&sig(x.wods)===sig(o.wods));
  if(i>=0)DB.ancien[i]=o;else DB.ancien.push(o);
  return (i>=0?'Déjà reçu, remplacé (ancienne appli) : ':'Reçu (ancienne appli) : ')+o.prenom+' '+o.nom+' · '+wods.length+' WOD';
}
async function lireTexte(t){t=String(t||'').trim();
  if(/^CTE[01]:/.test(t)){const q=await TTQR.decoder(t);if(q.t==='C')throw new Error('C’est un QR de classe, pas une séance.');
    if(q.pt){// séance en plusieurs QR : on garde les parties jusqu'à la dernière
      DB.parts=DB.parts||{};const k=[q.c,q.e,q.s,q.ts].join('|'),L=(DB.parts[k]=DB.parts[k]||[]).filter(p=>p.pt[0]!==q.pt[0]);L.push(q);DB.parts[k]=L;
      const tout=CTL.recollerQR(L);if(!tout){const manque=[...Array(q.pt[1])].map((_,i)=>i+1).filter(i=>!L.some(p=>p.pt[0]===i));return 'Partie '+q.pt[0]+'/'+q.pt[1]+' reçue : '+q.e+' · séance '+q.s+' · il manque la partie '+manque.join(', ')}
      delete DB.parts[k];return importerObjet(CTL.depuisQR(tout),'qr')+' ('+q.pt[1]+' QR)'}
    return importerObjet(CTL.depuisQR(q),'qr')}
  if(/;/.test(t))return lireAncien(t);
  throw new Error('Ce QR code ne vient pas d’une appli cross training.')}
async function lirePhoto(f){
  const img=await createImageBitmap(f),c=document.createElement('canvas'),sc=Math.min(1,1600/Math.max(img.width,img.height));c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
  const x=c.getContext('2d');x.drawImage(img,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height);
  if(typeof jsQR!=='function')await chargerScript('jsqr.js','jsQR');
  const q=jsQR(d.data,d.width,d.height,{inversionAttempts:'attemptBoth'});if(!q)throw new Error('QR non reconnu sur la photo : reprends-la plus nette et bien cadrée.');
  return lireTexte(q.data)}
function scanner(){TTQR.scanner(async t=>{const m=await lireTexte(t);sauver();return m},
  {continu:true,titre:'Scanner les QR des élèves',aide:'Les QR s’enchaînent : présentez-les l’un après l’autre.',onClose:n=>{if(n)journal(n+' QR lus');sauver();rendre()}})}

/* ---------- Requêtes ---------- */
const classes=()=>Object.keys(DB.classesL).sort();
const C=()=>DB.classesL[DB.classe]||{eleves:[],niv:'p',dem:'p'};
function elevesClasse(){const s=new Map();C().eleves.forEach(n=>s.set(cleEleve(DB.classe,n),n));
  Object.values(DB.rec).filter(r=>norm(r.classe)===norm(DB.classe)).forEach(r=>{const k=cleEleve(DB.classe,r.eleve);if(!s.has(k))s.set(k,r.eleve)});
  s.forEach((n,k)=>{if(!DB.noms[k])DB.noms[k]=n});
  return [...s.entries()].sort((a,b)=>triNom(a[1],b[1]))}
const recDe=(k,n)=>DB.rec[k+'|'+n]||null;
const recsDe=k=>[1,2,3,4,5,6,7,8,9].map(n=>recDe(k,n));
function derniereInfo(k,champ){const L=recsDe(k).filter(Boolean).reverse();for(const r of L)if(r[champ])return r[champ];return null}
const mobileDe=k=>{const L=recsDe(k).filter(Boolean).reverse();for(const r of L){if(r.mobile)return r.mobile;if(r.tableau&&r.tableau.mobile)return r.tableau.mobile}return ''};

/* ---------- Grille de l'épreuve (référentiel du lycée) ---------- */
const DEG=[0,.25,.5,.75,1];
function noteVide(){return {p:Array(7).fill(null),a:Array(5).fill(null),c:Array(4).fill(null),r:Array(3).fill(null),rep:''}}
function noteDe(k){return DB.notes[k]||(DB.notes[k]=noteVide())}
function repartition(k){const N=noteDe(k);if(N.rep)return N.rep;const j=derniereInfo(k,'jourJ');return j&&j.repartition||'4/4'}
function totalNote(k){
  const N=noteDe(k),[m2,m3]=repartition(k).split('/').map(Number);
  const p=N.p.reduce((a,x)=>a+(x||0),0),a=N.a.reduce((s,x)=>s+(x||0),0);
  const c=N.c.reduce((s,x)=>s+(x?x*m2/4:0),0);
  const rr=N.r.filter(x=>x!=null),r=rr.length?rr.reduce((s,x)=>s+x,0)/3/11*m3:0;
  const complet=N.p.every(x=>x!=null)&&N.a.every(x=>x!=null)&&N.c.every(x=>x!=null)&&N.r.every(x=>x!=null);
  return {p,a,c,r,tot:p+a+c+r,complet,m2,m3};
}
// Indices tirés des séances reçues : ils aident à noter, ils ne notent pas.
function indices(k){
  const R=recsDe(k),ev=R[8]||R[7],mob=mobileDe(k),I={p:[],a:[],c:[],r:[]};
  const W=ev?(ev.wods||[]).filter(w=>w.fait):[];
  const j=derniereInfo(k,'jourJ')||{},ech=(j.echauffement||[]).filter(x=>String(x).trim()).length;
  const fcok=W.filter(w=>CTL.fcDans(w.fc,mob)===0).length,nr=W.reduce((a,w)=>a+(w.noRep||0),0);
  const req=mob==='elev'?3:2;
  // critères et notes observés par le coach : jour J, sinon tout le cycle
  const WC=(W.some(w=>(w.exercices||[]).some(e=>e.criteres||e.noteExecution))?W:R.filter(Boolean).flatMap(r=>(r.wods||[]).filter(w=>w.fait)));
  const NE=WC.flatMap(w=>(w.exercices||[]).map(e=>e.noteExecution?note4(e.noteExecution,w):null).filter(Boolean)),ne=NE.length?(NE.reduce((x,y)=>x+y,0)/NE.length).toFixed(1).replace('.',','):null,bas=NE.filter(x=>x<=2).length;
  const exec=ne?`note d’exécution moyenne ${ne}/4 (${NE.length} exercices, ${bas} à 1-2${WC===W?'':', sur le cycle'})`:'pas de note d’exécution';
  const cr=k3=>{const L=WC.flatMap(w=>(w.exercices||[]).map(e=>e.criteres&&e.criteres[k3]).filter(x=>x===0||x===1));return L.length?`${k3} réussi : ${L.filter(x=>x).length}/${L.length} observations (${Math.round(100*L.filter(x=>x).length/L.length)} %)${WC===W?'':' sur le cycle'}`:'pas de critère observé'};
  I.p=[`échauffement écrit : ${ech}/4 étapes`,`FC dans la fourchette (${mob?MOBILES[mob].fc:'mobile ?'}) : ${fcok}/${W.length} WOD`,cr('placement')+` · ${exec} · no rep : ${nr}`,cr('amplitude'),cr('respiration'),ev&&ev.etirements?'étirements cochés':'étirements non cochés',`${W.length} WOD réalisés sur ${req} attendus${mob==='mod'?' (modéré : le degré 4 exige 3 cycles, impossible)':''}`];
  const TW=R.filter(Boolean).flatMap(r=>(r.wods||[]).filter(w=>w.fait)),dec=TW.filter(w=>w.regulation),coh=dec.filter(w=>{const d=CTL.fcDans(w.fc,mob),e=w.echelleRessenti===10?w.ressenti:null;return w.regulation==='baisse'?(d===1||e>=8):w.regulation==='monte'?(d===-1||(e&&e<=4)):w.regulation==='garde'?(d===0||d==null):true}).length;
  I.a=[`${W.length} WOD avec données`,`FC notée : ${W.filter(w=>w.fc).length}/${W.length} · effort perçu : ${W.filter(w=>w.ressenti).length}/${W.length} · commentaire : ${W.filter(w=>w.commentaire).length}/${W.length}`,ev&&ev.tableau&&ev.tableau.pourquoi?'justification du mobile écrite':'pas de justification du mobile',ev&&ev.bilan?'bilan écrit':'pas de bilan',(ev&&ev.suite?'suite écrite':'pas de « prochaine fois »')+` · décisions de régulation : ${dec.length}/${TW.length} WOD, ${coh} cohérentes avec FC / effort${(()=>{const S=TW.filter(w=>w.suiviDecision&&w.suiviDecision.resultat);return S.length?`, ${S.filter(w=>w.suiviDecision.resultat==='oui').length}/${S.length} appliquées au WOD suivant`:''})()}`];
  const T=derniereInfo(k,'tableau')||{},tp=[T.age,T.fcRepos,T.mobile,T.pourquoi].filter(Boolean).length;
  const avecW=R.filter(r=>r&&(r.wods||[]).length).length,avecB=R.filter(r=>r&&r.bilan&&r.suite).length,recus=R.filter(Boolean).length;
  I.c=[`tableau personnel : ${tp}/4 rubriques`,`WOD préparés : ${R.filter(r=>r&&(r.wods||[]).some(w=>!w.fait)).length} séances`,`séances avec WOD : ${avecW}/${recus}`,`bilan + suite : ${avecB}/${recus}`];
  const nb=x=>R.filter(r=>r&&r.roles&&r.roles[x]).length;
  const P=R.filter(r=>r&&r.preuvesRoles),pw=P.reduce((a,r)=>a+(r.preuvesRoles.wods||0),0),pc=P.reduce((a,r)=>a+(r.preuvesRoles.conseils||[]).length,0);
  // Degrés proposés (1 à 4, null = pas assez de données) : une base à valider, jamais une note automatique
  const pct=x=>x==null||isNaN(x)?null:x<.4?1:x<.6?2:x<.85?3:4,ratio=(a,b)=>b?a/b:null;
  const crp=k3=>{const L=WC.flatMap(w=>(w.exercices||[]).map(e=>e.criteres&&e.criteres[k3]).filter(x=>x===0||x===1));return L.length?pct(L.filter(x=>x).length/L.length):null};
  const suiv=TW.filter(w=>w.suiviDecision&&w.suiviDecision.resultat),app=suiv.filter(w=>w.suiviDecision.resultat==='oui').length;
  I.pd=[derniereInfo(k,'jourJ')?[1,2,2,3,4][ech]:null,W.length?pct(fcok/W.length):null,crp('placement')||(NE.length?Math.max(1,Math.min(4,Math.round(NE.reduce((x,y)=>x+y,0)/NE.length))):null),crp('amplitude'),crp('respiration'),ev?(ev.etirements?4:1):null,ev?(W.length>=3?4:W.length>=req?3:W.length?2:1):null];
  I.ad=[ev?pct(ratio(W.filter(w=>w.fc&&w.ressenti).length,W.length)||0):null,W.length?pct(W.filter(w=>w.fc&&w.ressenti&&w.commentaire).length/W.length):null,ev?(ev.tableau&&ev.tableau.pourquoi?3:1):null,ev?(ev.bilan&&ev.suite?3:ev.bilan||ev.suite?2:1):null,dec.length?pct((coh+app)/(dec.length+suiv.length)):null];
  I.cd=[[1,2,2,3,4][tp],recus?[1,2,2,3,3,4][Math.min(5,R.filter(r=>r&&(r.wods||[]).some(w=>!w.fait)).length)]:null,recus?pct(avecW/recus):null,recus?pct(avecB/recus):null];
  I.rd=recus?[Math.round(11*nb('supporter')/recus),Math.min(11,Math.round(11*Math.max(P.length,nb('assistant')*.5)/recus)),Math.min(11,Math.round(11*Math.min(1,pc/recus)))]:[null,null,null];
  I.r=[`coché « supporter » ${nb('supporter')}/${recus} séances`,`a tenu la tablette (compté, validé) : ${pw} WOD sur ${P.length} séances · coché « assistant » ${nb('assistant')}/${recus}`,`conseils écrits : ${pc}${pc?' (dernier : « '+((P[P.length-1].preuvesRoles.conseils||[]).slice(-1)[0]||'')+' »)':''} · coché « coach » ${nb('coach')}/${recus}`];
  return I;
}

/* ---------- Vues ---------- */
function rendre(){
  if(!DB.classe||!DB.classesL[DB.classe])DB.classe=classes()[0]||'';
  const T=[['classes','Classes'],['recevoir','Recevoir'],['appel','Appel'],['surveiller','À surveiller'],['eleves','Élèves'],['epreuve','Épreuve'],['export','Exporter']];
  $('#onglets').innerHTML=T.map(t=>`<button type="button" class="${DB.tab===t[0]?'ici':''}" data-act="tab" data-v="${t[0]}">${t[1]}</button>`).join('');
  $('#classe').innerHTML=classes().length?`<label for="selcl" class="small">Classe</label><select id="selcl">${classes().map(c=>`<option${c===DB.classe?' selected':''}>${esc(c)}</option>`).join('')}</select><span class="small muted">${DB.classe?esc(CTL.NOM_NIV[C().niv||'p'])+' · '+esc(CTL.NOM_DEM[C().dem||'p']):''}</span>`:'';
  const V={classes:vClasses,recevoir:vRecevoir,appel:vAppel,surveiller:vSurveiller,eleves:vEleves,epreuve:vEpreuve,export:vExport};
  $('#main').innerHTML=(V[DB.tab]||vClasses)();
}
function vClasses(){
  const L=classes();
  return `<h2>Classes</h2>
  <section class="carte"><h3>Importer une liste Pronote</h3>
    <p class="small muted">Pronote : liste des élèves → Exporter (xlsx, xls ou csv). Une colonne « Classe » permet d’importer plusieurs classes d’un coup. Ou colle la liste (« NOM Prénom », un élève par ligne).</p>
    <div class="grille2"><div><label class="ch" for="cl-nom">Classe (si le fichier ne la donne pas)</label><input id="cl-nom" type="text" placeholder="1G3"></div>
    <div><label class="ch">Fichier</label><label class="bt noir" for="cl-fic">Choisir le fichier Pronote</label><input id="cl-fic" type="file" accept=".xlsx,.xls,.csv,.ods,.txt" hidden multiple></div></div>
    <label class="ch" for="cl-txt">Ou coller la liste</label><textarea id="cl-txt" rows="3" placeholder="DUPONT Marie&#10;MARTIN Léo"></textarea>
    <div class="rangee" style="margin-top:8px"><button class="bt mini" type="button" data-act="clcoller">Importer la liste collée</button></div></section>
  ${L.includes('DEMO')?'':`<section class="carte"><h3>Démonstration</h3><p class="small muted">Pour découvrir l’outil sans vraie classe : une classe « DEMO » de 6 élèves fictifs, avec 3 séances déjà reçues. À retirer ensuite (« Retirer la classe »).</p><button class="bt mini" type="button" data-act="demo">Créer la classe de démonstration</button></section>`}
  ${L.map(c=>{const X=DB.classesL[c];return `<section class="carte"><h3>${esc(c)} <span class="small muted">· ${X.eleves.length} élèves</span></h3>
    <div class="grille2"><div><label class="ch">Niveau</label><div class="rangee">${['p','t'].map(n=>`<button type="button" class="bt mini ${X.niv===n?'noir':''}" data-act="clniv" data-c="${esc(c)}" data-v="${n}">${CTL.NOM_NIV[n]}</button>`).join('')}</div></div>
    <div><label class="ch">Démarche du cycle</label><div class="rangee">${['p','g'].map(n=>`<button type="button" class="bt mini ${X.dem===n?'noir':''}" data-act="cldem" data-c="${esc(c)}" data-v="${n}">${n==='p'?'Progressive':'GAREEPS'}</button>`).join('')}</div></div></div>
    <label class="ch">Saisie des élèves</label><div class="rangee">${[['l','Légère'],['c','Complète']].map(([x,l])=>`<button type="button" class="bt mini ${(X.s||'l')===x?'noir':''}" data-act="clsai" data-c="${esc(c)}" data-v="${x}">${l}</button>`).join('')}</div>
    <p class="small muted">${(X.s||'l')==='c'?'Complète : critères demandés après chaque exercice pendant le WOD, effort + muscles / souffle / tête, commentaire et conseil du coach obligatoires, ressenti de séance.':'Légère : critères d’exécution et effort perçu en fin de WOD seulement, décision de régulation ; commentaire et conseil facultatifs. Pour commencer le cycle.'}</p>
    <label class="ch">Lien d’envoi en ligne (Nuage, « Demande de fichier ») — facultatif, jamais visible par les élèves</label>
    <input type="url" class="cl-lien" data-c="${esc(c)}" value="${esc(X.lien)}" placeholder="vide = les élèves montrent leur QR code">
    <div class="rangee" style="margin-top:10px"><button class="bt orange" type="button" data-act="qrdem" data-v="${esc(c)}">QR de démarrage</button>
      <details><summary class="small">Voir la liste</summary><ol class="small">${X.eleves.map(n=>`<li>${esc(n)}</li>`).join('')}</ol></details>
      <button class="bt mini danger" type="button" data-act="clsuppr" data-v="${esc(c)}">Retirer la classe</button></div>
    <p class="small muted">Niveau, démarche et lien partent dans le QR : si tu les changes, chaque tablette rescanne le QR (Mon binôme → Nouvelle liste de classe).</p></section>`}).join('')||'<p class="muted">Aucune classe pour l’instant.</p>'}`;
}
function vRecevoir(){
  return `<h2>Recevoir les séances</h2>
  <section class="carte"><h3>QR codes</h3><p class="small muted">En fin de séance, chaque binôme montre un QR par élève (onglet Envoyer).</p><button class="bt orange" type="button" data-act="scan">Scanner les QR des élèves</button></section>
  <section class="carte"><h3>Photo ou texte du QR</h3><p class="small muted">Si la caméra ne lit pas en direct : prends le QR en photo, ou colle le texte du QR (QR de l’appli élève ou de l’ancienne appli Cross Training Pompidou).</p>
    <div class="rangee"><label class="bt" for="photoqr">📷 Lire une photo de QR</label><input id="photoqr" type="file" accept="image/*" capture="environment" hidden></div>
    <label class="ch" for="qrtxt">Texte du QR</label><textarea id="qrtxt" rows="2" placeholder="CTE1:… ou NOM;PRÉNOM;CLASSE;…"></textarea><div class="rangee" style="margin-top:8px"><button class="bt mini" type="button" data-act="qrtxt">Analyser et ajouter</button></div></section>
  ${vAncien()}
  <section class="carte"><h3>Fichiers</h3><p class="small muted">Fichiers .json déposés dans le Nuage (tu peux télécharger tout le dossier en .zip).</p><label class="bt noir" for="fic">Choisir les fichiers (.json ou .zip)</label><input id="fic" type="file" accept=".json,.zip,application/json,application/zip" multiple hidden></section>
  <section class="carte"><h3>Journal</h3><ul class="small">${DB.journal.slice(0,12).map(x=>`<li>${esc(x)}</li>`).join('')||'<li class="muted">rien pour l’instant</li>'}</ul></section>`;
}
function vAncien(){if(!(DB.ancien||[]).length)return '';
  const f=norm(DB.filtreAnc||''),L=(DB.ancien||[]).map((o,i)=>[o,i]).filter(([o])=>!f||norm(o.nom+' '+o.prenom+' '+o.classe).includes(f)).sort((a,b)=>(a[0].nom+a[0].prenom).localeCompare(b[0].nom+b[0].prenom,'fr'));
  return `<section class="carte"><h3>Ancienne appli Cross Training Pompidou <span class="small muted">· ${DB.ancien.length} élève${DB.ancien.length>1?'s':''}</span></h3>
    <input type="search" id="filtreAnc" placeholder="🔍 Rechercher un élève…" value="${esc(DB.filtreAnc||'')}" aria-label="Rechercher">
    <div class="defile"><table class="tab"><tr><th>Élève</th><th>WOD</th><th>Exercices (note /4)</th><th>Ressentis</th><th></th></tr>${L.map(([o,i])=>`<tr><th>${esc(o.prenom)} ${esc(o.nom.toUpperCase())}<br><small>${esc(o.classe)}${o.coach?' · coach '+esc(o.coach):''} · ${esc(o.date)}</small></th>
      <td>${o.wods.map(w=>`<b>${esc(w.mode)}</b> ${esc(w.score)}${w.duree?' · '+esc(w.duree)+' min':''}`).join('<br>')}</td>
      <td class="small">${o.wods.map(w=>w.exos.map((e,j)=>esc(e)+(w.notes[j]?' '+w.notes[j]+'/4 '+esc(CTL.NOTE4[w.notes[j]]||''):'')).join(' · ')||'—').join('<br>')}</td>
      <td class="small">${o.wods.map(w=>esc(w.ressenti)+(w.commentaire?' « '+esc(w.commentaire)+' »':'')).join('<br>')}${o.ressentiSeance?'<br><b>Séance :</b> '+esc(o.ressentiSeance)+(o.commentaire?' « '+esc(o.commentaire)+' »':''):''}</td>
      <td><button class="bt mini danger" type="button" data-act="ancsuppr" data-v="${i}" aria-label="Supprimer">✕</button></td></tr>`).join('')}</table></div>
    <div class="rangee"><button class="bt mini" type="button" data-act="anccsv">⬇ CSV</button><button class="bt mini" type="button" data-act="ancjson">{ } JSON</button></div></section>`}
/* Fin de cours : ce qui demande une attention, élève par élève (dernière séance reçue de la classe) */
function vSurveiller(){
  if(!DB.classe)return '<p class="muted">Importe d’abord une classe.</p>';
  const E=elevesClasse(),der=Math.max(0,...E.flatMap(([k])=>recsDe(k).map((r,i)=>r?i+1:0)));
  if(!der)return `<h2>À surveiller · ${esc(DB.classe)}</h2><p class="muted">Aucune séance reçue pour l’instant.</p>`;
  const lignes=[];
  E.forEach(([k,n])=>{const R=recsDe(k),r=R[der-1],mob=mobileDe(k),A=[];
    if(!r){A.push(['manque','séance '+der+' non reçue'])}
    else{const W=(r.wods||[]).filter(w=>w.fait);
      if(!r.dispense&&!W.length)A.push(['manque','aucun WOD fait'+(r.preuvesRoles?' (a été coach : '+r.preuvesRoles.wods+' WOD)':'')]);
      if(W.some(w=>!w.fc))A.push(['fc','FC non notée ('+W.filter(w=>!w.fc).length+' WOD)']);
      const T=R.filter(Boolean).flatMap(x=>(x.wods||[]).filter(w=>w.fait&&w.fc)),d=T.slice(-2).map(w=>CTL.fcDans(w.fc,mob));
      if(mob&&d.length===2&&d[0]&&d[0]===d[1])A.push(['fc','FC '+(d[0]>0?'au-dessus':'en dessous')+' de la fourchette 2 WOD de suite → '+(d[0]>0?'baisser':'monter')]);
      if(!mob)A.push(['fc','mobile pas choisi']);
      const bas=W.flatMap(w=>(w.exercices||[]).filter(e=>e.noteExecution&&note4(e.noteExecution,w)<=2).map(e=>(MOUV.find(m=>m.id===e.id)||{nom:e.id}).nom));
      if(bas.length)A.push(['exec','exécution à revoir (1-2/4) : '+[...new Set(bas)].join(', ')]);
      const am=W.flatMap(w=>(w.exercices||[]).filter(e=>e.criteres&&e.criteres.placement===0).map(e=>(MOUV.find(m=>m.id===e.id)||{nom:e.id}).nom));
      if(am.length)A.push(['exec','placement raté : '+[...new Set(am)].join(', ')+' (risque de blessure)']);
      const dur=W.filter(w=>(w.echelleRessenti===10&&w.ressenti>=9)||(w.echelleRessenti===5&&w.ressenti===1));
      if(dur.length)A.push(['effort','effort maximal / épuisé sur '+dur.length+' WOD']);
      if(W.length&&!W.some(w=>w.regulation)&&W.some(w=>w.echelleRessenti===10))A.push(['analyse','aucune décision de régulation']);
      const na=W.filter(w=>w.suiviDecision&&w.suiviDecision.resultat==='non');if(na.length)A.push(['analyse','décision pas appliquée sur '+na.length+' WOD']);}
    if(A.length)lignes.push([n,k,A])});
  const cls={manque:'#b91c1c',fc:'#c2410c',exec:'#7c3aed',effort:'#0e7490',analyse:'#334155'};
  return `<h2>À surveiller · ${esc(DB.classe)} · séance ${der}</h2><p class="small muted">${E.length-lignes.length} élève${E.length-lignes.length>1?'s':''} sans alerte. Touche un nom pour sa fiche.</p>
  ${lignes.length?`<div class="defile"><table class="tab"><tr><th>Élève</th><th>Ce qu’il faut regarder</th></tr>${lignes.map(([n,k,A])=>`<tr><th><button class="lien" type="button" data-act="fiche" data-v="${esc(k)}">${esc(n)}</button></th><td>${A.map(([c,t])=>`<span class="alerte-pt" style="border-color:${cls[c]};color:${cls[c]}">${esc(t)}</span>`).join(' ')}</td></tr>`).join('')}</table></div>`:'<p>✓ Rien à signaler pour cette séance.</p>'}`;
}
function vAppel(){
  if(!DB.classe)return '<p class="muted">Importe d’abord une classe.</p>';
  const E=elevesClasse();
  const tot=n=>E.filter(([k])=>recDe(k,n)).length;
  const f=norm(DB.filtre||'');const EF=f?E.filter(([k,n])=>norm(n).includes(f)):E;
  return `<h2>Appel · ${esc(DB.classe)}</h2><p class="small muted">✓ séance reçue (nombre de WOD faits) · D dispensé · vide : rien reçu. Touche un nom pour sa fiche.</p>
  <input type="search" id="filtre" placeholder="🔍 Rechercher un élève…" value="${esc(DB.filtre||'')}" aria-label="Rechercher un élève">
  <div class="defile"><table class="tab"><tr><th>Élève</th>${[...Array(9)].map((_,i)=>`<th>S${i+1}</th>`).join('')}</tr>
  ${EF.map(([k,n])=>`<tr><th><button class="lien" type="button" data-act="fiche" data-v="${esc(k)}">${esc(n)}</button></th>${[...Array(9)].map((_,i)=>{const r=recDe(k,i+1);if(!r)return '<td></td>';const f=(r.wods||[]).filter(w=>w.fait).length;return `<td class="${r.dispense?'d':'ok'}">${r.dispense?'D':'✓'+(f?' '+f:'')}</td>`}).join('')}</tr>`).join('')}
  <tr class="total"><th>Reçus</th>${[...Array(9)].map((_,i)=>`<td>${tot(i+1)}/${E.length}</td>`).join('')}</tr></table></div>`;
}
// note d'exécution : sur 4 (échelle de l'appli d'origine) ; les séances enregistrées avant étaient sur 5
const noteTxt=(n,w)=>w&&w.echelleNote===5?n+'/5':n+'/4 '+(CTL.NOTE4[n]||'');
const note4=(n,w)=>w&&w.echelleNote===5?n*4/5:n;
const pastFC=(fc,mob)=>{const d=CTL.fcDans(fc,mob);return fc?`<span class="fc ${d==null?'':d===0?'dans':d<0?'sous':'dessus'}">${fc}</span>`:'—'};
function vEleves(){
  if(!DB.classe)return '<p class="muted">Importe d’abord une classe.</p>';
  const E=elevesClasse();if(!DB.eleve||!E.some(([k])=>k===DB.eleve))DB.eleve=E.length?E[0][0]:'';
  const k=DB.eleve;
  return `<h2>Élèves · ${esc(DB.classe)}</h2><select id="selel" aria-label="Élève">${E.map(([kk,n])=>`<option value="${esc(kk)}"${kk===k?' selected':''}>${esc(n)}</option>`).join('')}</select>${k?fiche(k):''}`;
}
function fiche(k){
  const R=recsDe(k),mob=mobileDe(k),T=derniereInfo(k,'tableau')||{},J=derniereInfo(k,'jourJ');
  const lig=R.map((r,i)=>{if(!r)return `<tr class="vide"><th>S${i+1}</th><td colspan="5" class="muted">rien reçu</td></tr>`;
    const W=r.wods||[];
    return `<tr><th>S${i+1}<br><small>${esc(r.date||'')}</small>${r.dispense?'<br><b>D</b>':''}</th><td>${W.map(w=>{const D=CTL.decrireWod(w,MOUV);return `${w.fait?'':'<i>prévu</i> '}<b>${esc(D.titre)}</b>${w.special?' · spécial':''}<br><small>${(()=>{const du=D.duree?CTL.mmss(D.duree):'sans limite',f=D.format&&D.format!==D.titre?D.format:'';return esc(f&&f.includes(du)?f:(f?f+' · ':'')+(D.titre.includes(du)&&!f?'':du))})()}${w.ordre==='h'?' · horizontal':''}${w.res&&w.res.arrete?' · arrêté à '+esc(CTL.mmss(w.res.arrete)):''}</small><ul class="exl">${D.ex.map(e=>`<li>${esc(e.nom)} <small>${esc(e.zone)} N${e.niveau||'?'}${e.reps?' · '+e.reps+' rép.':''}${e.version?(e.version<0?' · version −':' · version +'):''}${e.charge?' · '+e.charge+' kg':''}${e.note?' · <b>exéc. '+esc(noteTxt(e.note,w))+'</b>':''}${e.criteres?' · '+CTL.CRIT3.map(c=>(e.criteres[c]===1?'✓':e.criteres[c]===0?'✗':'?')+c.slice(0,4)+'.').join(' '):''}</small></li>`).join('')}</ul>`}).join('<hr>')||'—'}</td>
      <td>${W.filter(w=>w.fait).map(w=>esc(w.score||CTL.score({f:w.format,p:w.p,res:w.res,exercices:w.exercices||[]})||'')).join('<hr>')}</td><td>${W.filter(w=>w.fait).map(w=>pastFC(w.fc,r.mobile||mob)).join('<hr>')}</td>
      <td>${W.filter(w=>w.fait).map(w=>esc(CTL.ressentiTxt(w.ressenti,w.echelleRessenti||4))+(w.dimensions?'<br><small>muscles '+(w.dimensions.mu||'—')+' · souffle '+(w.dimensions.so||'—')+' · tête '+(w.dimensions.te||'—')+'</small>':'')+(w.suiviDecision&&w.suiviDecision.resultat?'<br><small>décision d’avant « '+esc(CTL.REGLE[w.suiviDecision.decision]||w.suiviDecision.decision)+' » : '+(w.suiviDecision.resultat==='oui'?'✓ appliquée':'✗ pas appliquée')+'</small>':'')+(w.regulation?'<br><small>décision : <b>'+esc(CTL.REGLE[w.regulation]||w.regulation)+'</b></small>':'')+(w.coach?'<br><small>coach '+esc(w.coach)+(w.conseil?' : « '+esc(w.conseil)+' »':'')+'</small>':'')+(w.commentaire?'<br><small>« '+esc(w.commentaire)+' »</small>':'')+(w.regulations?' · '+w.regulations+' rég.':'')+(w.noRep?' · '+w.noRep+' NR':'')).join('<hr>')}</td>
      <td class="small">${r.preuvesRoles?'<b>Coach de</b> '+esc((r.preuvesRoles.pour||[]).join(', ')||'son partenaire')+' : '+r.preuvesRoles.wods+' WOD'+((r.preuvesRoles.conseils||[]).length?', conseils : « '+r.preuvesRoles.conseils.map(esc).join(' » « ')+' »':'')+'<br>':''}${r.ressentiSeance?'<b>Séance :</b> '+(r.ressentiSeance.etoiles?'★'.repeat(r.ressentiSeance.etoiles)+' ':'')+(r.ressentiSeance.fatigue?'fatigue '+esc(CTL.FATIGUE[r.ressentiSeance.fatigue]):'')+'<br>':''}${r.bilan?'<b>Bilan :</b> '+esc(r.bilan):''}${r.suite?'<br><b>Suite :</b> '+esc(r.suite):''}${r.etoile?`<br><b>Étoile :</b> C${r.etoile.conception} P${r.etoile.production} A${r.etoile.analyse}${r.axePrioritaire?' · axe '+esc((GAREEPS.axes.find(a=>a.id===r.axePrioritaire)||{nom:r.axePrioritaire}).nom):''}`:''}</td></tr>`}).join('');
  const r9=R[8];const ctrl=r9?CTL.controleEpreuve((r9.wods||[]).map(w=>({f:w.format,special:w.special,reps:Math.min(...(w.exercices||[]).map(e=>e.reps||7)),ex:(w.exercices||[]).map(e=>({m:e.id}))})),mob,MOUV):[];
  return `<section class="carte"><h3>${esc(nomDe(k))}</h3><p class="small">Mobile : <b>${mob?esc(MOBILES[mob].nom)+' ('+MOBILES[mob].fc+')':'—'}</b> · âge ${esc(T.age||'—')} · FC de repos ${esc(T.fcRepos||'—')} · charge ${esc(T.charges||'—')} kg${T.pourquoi?'<br>Pourquoi : '+esc(T.pourquoi):''}</p>
    ${J?`<p class="small">Jour J : répartition <b>${esc(J.repartition||'—')}</b> · échauffement : ${esc((J.echauffement||[]).filter(Boolean).join(' / ')||'—')}</p>`:''}
    ${ctrl.length?`<ul class="ctrl small">${ctrl.map(c=>`<li class="${c[0]?'ok':'ko'}">${c[0]?'✓':'✗'} ${esc(c[1])}</li>`).join('')}</ul>`:''}</section>
  <div class="defile"><table class="tab"><tr><th></th><th>WOD</th><th>Résultat</th><th>FC</th><th>Ressenti</th><th>Carnet</th></tr>${lig}</table></div>
  <div class="rangee"><button class="bt" type="button" data-act="versgrille" data-v="${esc(k)}">Noter l’épreuve</button></div>`;
}
function vEpreuve(){
  if(!DB.classe)return '<p class="muted">Importe d’abord une classe.</p>';
  const E=elevesClasse();if(!DB.eleve||!E.some(([k])=>k===DB.eleve))DB.eleve=E.length?E[0][0]:'';
  const k=DB.eleve;if(!k)return '<p class="muted">Aucun élève.</p>';
  const N=noteDe(k),I=indices(k),t=totalNote(k);
  const sel=(grp,i,val)=>`<select data-n="${grp}" data-i="${i}"><option value="">—</option>${[0,1,2,3,4].map(d=>`<option value="${d}"${val!=null&&DEG.indexOf(val)===d?' selected':''}>${d?'Degré '+d+' · '+DEG[d]:'0'}</option>`).join('')}</select>`;
  const prop=(d,val,deg)=>d==null?'':`<small class="propose${val!=null&&(deg?DEG.indexOf(val):val)!==d?' ecart':''}">proposé : ${deg?'degré '+d:d+' (degré '+(Math.floor(d/3)+1)+')'}</small>`;
  const blocDeg=(A,grp,ind,pd)=>`<table class="tab grille"><tr><th>Élément</th><th>Note</th><th>Indice tiré du carnet</th></tr>${A.items.map((it,i)=>`<tr><td>${esc(it)}</td><td>${sel(grp,i,N[grp][i])}${prop(pd[i],N[grp][i],true)}</td><td class="small muted">${esc(ind[i]||'')}</td></tr>`).join('')}</table>`;
  return `<h2>Épreuve · ${esc(DB.classe)}</h2><select id="selel" aria-label="Élève">${E.map(([kk,n])=>`<option value="${esc(kk)}"${kk===k?' selected':''}>${esc(n)}${totalNote(kk).complet?' ✓':''}</option>`).join('')}</select>
  <section class="carte total-note"><b>${esc(nomDe(k))}</b> · <span class="gros-chiffre">${t.tot.toFixed(1).replace('.',',')}</span> / 20 ${t.complet?'':'<span class="small muted">(incomplet)</span>'}<br><span class="small">AFL1 produire ${t.p.toFixed(2)}/7 · analyser ${t.a.toFixed(2)}/5 · AFL2 ${t.c.toFixed(2)}/${t.m2} · AFL3 ${t.r.toFixed(2)}/${t.m3}</span></section>
  <section class="carte"><p class="small">Sous chaque note, un <b>degré proposé</b> d’après les indices du carnet. Il ne remplace pas ton observation : vérifie-le, puis valide.</p><button class="bt mini" type="button" data-act="proposer">Reprendre les degrés proposés (cases vides seulement)</button></section>
  <section class="carte"><h3>Répartition AFL2 / AFL3</h3><div class="rangee">${['6/2','4/4','2/6'].map(x=>`<button type="button" class="bt mini ${repartition(k)===x?'noir':''}" data-act="rep" data-v="${x}">${x}</button>`).join('')}<span class="small muted">${N.rep?'choisie ici':'choix de l’élève (Jour J) ou 4/4 par défaut'}</span></div></section>
  <section class="carte"><h3>${esc(REF.afl1a.titre)}</h3>${blocDeg(REF.afl1a,'p',I.p,I.pd)}</section>
  <section class="carte"><h3>${esc(REF.afl1b.titre)}</h3>${blocDeg(REF.afl1b,'a',I.a,I.ad)}</section>
  <section class="carte"><h3>AFL2 · Le carnet (${t.m2} points, ${(t.m2/4).toString().replace('.',',')} par élément)</h3>${blocDeg(REF.afl2,'c',I.c,I.cd)}</section>
  <section class="carte"><h3>AFL3 · Rôles (${t.m3} points)</h3><table class="tab grille"><tr><th>Rôle</th><th>Niveau 0 à 11</th><th>Indice</th></tr>${REF.afl3.items.map((it,i)=>`<tr><td>${esc(it)}</td><td><select data-n="r" data-i="${i}"><option value="">—</option>${[...Array(12)].map((_,v)=>`<option value="${v}"${N.r[i]===v?' selected':''}>${v} · degré ${Math.floor(v/3)+1}</option>`).join('')}</select>${prop(I.rd[i],N.r[i],false)}</td><td class="small muted">${esc(I.r[i])}</td></tr>`).join('')}</table>
    <p class="small muted">${esc(REF.afl3.note)} 0-2 = degré 1, 3-5 = degré 2, 6-8 = degré 3, 9-11 = degré 4.</p></section>
  <div class="rangee"><button class="bt" type="button" data-act="elprec">← Élève précédent</button><button class="bt noir" type="button" data-act="elsuiv">Élève suivant →</button></div>
  <details class="carte"><summary>Degrés du référentiel</summary>${[REF.afl1a,REF.afl1b].map(A=>`<p><b>${esc(A.titre)}</b></p><ol class="small">${A.degres.map(d=>`<li>${esc(d[0])} <b>${esc(d[1])}</b></li>`).join('')}</ol>`).join('')}<p><b>${esc(REF.afl2.titre)}</b></p><ol class="small">${REF.afl2.degres.map(d=>`<li>${esc(d)}</li>`).join('')}</ol><p><b>${esc(REF.afl3.titre)}</b></p><ol class="small">${REF.afl3.degres.map(d=>`<li>${esc(d)}</li>`).join('')}</ol></details>`;
}
function vExport(){
  const E=DB.classe?elevesClasse():[];
  return `<h2>Exporter</h2>
  ${DB.classe?`<section class="carte"><h3>Notes de ${esc(DB.classe)}</h3><div class="defile"><table class="tab"><tr><th>Élève</th><th>Produire /7</th><th>Analyser /5</th><th>AFL2</th><th>AFL3</th><th>Répartition</th><th>Total /20</th></tr>
    ${E.map(([k,n])=>{const t=totalNote(k);return `<tr><td>${esc(n)}</td><td>${t.p.toFixed(2)}</td><td>${t.a.toFixed(2)}</td><td>${t.c.toFixed(2)}</td><td>${t.r.toFixed(2)}</td><td>${repartition(k)}</td><td><b>${t.tot.toFixed(1)}</b>${t.complet?'':' <small class="muted">incomplet</small>'}</td></tr>`}).join('')}</table></div>
    <div class="rangee"><button class="bt orange" type="button" data-act="csvnotes">Notes (CSV)</button><button class="bt" type="button" data-act="csvseances">Toutes les séances (CSV)</button><button class="bt" type="button" data-act="pdf">🖨 Imprimer / PDF</button><button class="bt" type="button" data-act="json">{ } Séances (JSON)</button></div></section>`:''}
  <section class="carte"><h3>Sauvegarde</h3><div class="rangee"><button class="bt" type="button" data-act="sauvegarde">Télécharger une sauvegarde</button><label class="bt" for="restaure">Restaurer une sauvegarde</label><input id="restaure" type="file" accept=".json" hidden></div></section>
  <section class="carte"><h3>Fin d’année</h3><p class="small muted">Télécharge une sauvegarde complète, puis vide l’outil pour la rentrée.</p><button class="bt danger" type="button" data-act="archiver">Archiver l’année et repartir à zéro</button></section>`;
}

/* ---------- Exports ---------- */
function telecharger(nom,texte,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([texte],{type:type||'text/csv;charset=utf-8'}));a.download=nom;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
const csv=L=>'﻿'+L.map(r=>r.map(x=>{const s=String(x==null?'':x);return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(';')).join('\r\n');
const virg=x=>String(Math.round(x*100)/100).replace('.',',');
function csvNotes(){const L=[['Classe','Élève','AFL1 produire /7','AFL1 analyser /5','AFL2','AFL3','Répartition','Total /20','Complet']];
  elevesClasse().forEach(([k,n])=>{const t=totalNote(k);L.push([DB.classe,n,virg(t.p),virg(t.a),virg(t.c),virg(t.r),repartition(k),virg(t.tot),t.complet?'oui':'non'])});
  telecharger('CT_notes_'+CTL.slug(DB.classe)+'_'+today()+'.csv',csv(L))}
function csvSeances(){const L=[['Classe','Élève','Séance','Date','Mobile','Dispensé','WOD','Format de l’épreuve','Durée','Fait','Exercices (zone, niveau, répétitions, version)','Résultat','FC','Effort / ressenti (commentaire)','Décision de régulation','Coach et conseil','Régulations','No rep','Bilan','Suite','Séance (étoiles)','Séance (fatigue)']];
  elevesClasse().forEach(([k,n])=>recsDe(k).forEach((r,i)=>{if(!r)return;const W=r.wods&&r.wods.length?r.wods:[null];
    W.forEach(w=>{const D=w?CTL.decrireWod(w,MOUV):null;L.push([DB.classe,n,i+1,r.date,r.mobile,r.dispense?'oui':'',D?D.titre:'',D?D.format:'',D?(D.duree?CTL.mmss(D.duree):"sans limite"):'',w&&w.fait?'oui':'',D?D.ex.map(e=>e.nom+' ('+e.zone+' N'+(e.niveau||'?')+(e.reps?', '+e.reps+' rép.':'')+(e.version?(e.version<0?', −':', +'):'')+(e.charge?', '+e.charge+' kg':'')+(e.note?', exéc. '+noteTxt(e.note,w):'')+(e.criteres?', '+CTL.CRIT3.map(c=>c+' '+(e.criteres[c]===1?'✓':e.criteres[c]===0?'✗':'?')).join(' '):'')+')').join(' ; '):'',w?w.score||CTL.score({f:w.format,p:w.p,res:w.res,exercices:w.exercices||[]})||'':'',w?w.fc||'':'',w&&w.ressenti?CTL.ressentiTxt(w.ressenti,w.echelleRessenti||4)+(w.commentaire?' « '+w.commentaire+' »':''):'',w&&w.regulation?CTL.REGLE[w.regulation]||w.regulation:'',w&&w.coach?w.coach+(w.conseil?' : '+w.conseil:''):'',w?w.regulations||0:'',w?w.noRep||0:'',r.bilan,r.suite,(r.ressentiSeance||{}).etoiles||'',(r.ressentiSeance||{}).fatigue?CTL.FATIGUE[r.ressentiSeance.fatigue]:''])})}));
  telecharger('CT_seances_'+CTL.slug(DB.classe)+'_'+today()+'.csv',csv(L))}

function imprimer(){const E=elevesClasse();let a=$('#print-area');if(!a){a=document.createElement('div');a.id='print-area';document.body.appendChild(a)}
  a.innerHTML=`<h2>Cross training · ${esc(DB.classe)} · ${new Date().toLocaleDateString('fr-FR')}</h2><table><tr><th>Élève</th><th>Séances reçues</th><th>Dernier WOD</th><th>Produire /7</th><th>Analyser /5</th><th>AFL2</th><th>AFL3</th><th>Total /20</th></tr>${E.map(([k,n])=>{const t=totalNote(k),R=recsDe(k).filter(Boolean),d=R[R.length-1],w=d&&(d.wods||[]).filter(x=>x.fait).pop();
    return `<tr><td>${esc(n)}</td><td>${R.length}</td><td>${w?esc(CTL.decrireWod(w,MOUV).titre+' · '+(w.score||CTL.score({f:w.format,p:w.p,res:w.res,exercices:w.exercices||[]})||'')):'—'}</td><td>${virg(t.p)}</td><td>${virg(t.a)}</td><td>${virg(t.c)}</td><td>${virg(t.r)}</td><td><b>${virg(t.tot)}</b></td></tr>`}).join('')}</table>`;
  window.print()}
function jsonClasse(){const E=elevesClasse(),o=E.map(([k,n])=>({eleve:n,seances:recsDe(k).filter(Boolean)}));telecharger('CT_seances_'+CTL.slug(DB.classe)+'_'+today()+'.json',JSON.stringify(o,null,1),'application/json')}
function csvAncien(){const L=[['Nom','Prénom','Classe','Coach','WOD n°','Mode','Durée (min)','Score','Niveau','Exercices et notes /4','Ressenti WOD','Commentaire WOD','Ressenti séance','Commentaire séance','Date']];
  (DB.ancien||[]).forEach(o=>o.wods.forEach((w,i)=>L.push([o.nom,o.prenom,o.classe,o.coach,i+1,w.mode,w.duree,w.score,w.niveau,w.exos.map((e,j)=>e+(w.notes[j]?' '+w.notes[j]+'/4':'')).join(' | '),w.ressenti,w.commentaire,i===o.wods.length-1?o.ressentiSeance:'',i===o.wods.length-1?o.commentaire:'',o.date])));
  telecharger('CT_ancienne_appli_'+today()+'.csv',csv(L))}

// Classe de démonstration : élèves fictifs, séances inventées (même forme que les fichiers de l'appli élève)
function creerDemo(){
  const noms=['Alice DÉMO','Bruno DÉMO','Chloé DÉMO','David DÉMO','Emma DÉMO','Farid DÉMO'],c='DEMO';
  DB.classesL[c]={eleves:noms.slice(),lien:'',niv:'p',dem:'p',s:'c'};
  const ex=(L,reps,note)=>L.map((id,i)=>{const m=MOUV.find(x=>x.id===id)||{},c=[(i+note)%3?1:0,(i+note)%2,(i+note)%4?1:0];return {id,nom:m.nom||id,zone:m.z||'',niveau:m.n||null,version:0,reps,charge:id==='goblet-squat'?12:null,noteExecution:note?1+c[0]+c[1]+c[2]:null,criteres:note?{placement:c[0],respiration:c[1],amplitude:c[2]}:null}});
  noms.forEach((n,k)=>{[1,2,3].forEach(s=>{const mob=k%2?'elev':'mod',fc=mob==='mod'?138+k*3+s:158+k*3+s;
    const w1={format:'tabata',p:mob==='mod'?{e:30,r:30,n:8}:{e:20,r:20,n:8},ordre:'v',preset:mob==='mod'?'tm1':'te1',exercices:ex(['squat','pompe-genoux','planche','jumping-jack'],0,k+s),fait:true,
      res:{rounds:[9,8,8,7,8,7,6,7].map(x=>x+(k%3)-1)},fc,ressenti:4+((k+s)%6),echelleRessenti:10,echelleNote:4,commentaire:'Démo : séance '+s,regulation:['garde','baisse','monte'][(k+s)%3],coach:noms[k%2?k-1:k+1],conseil:'Garde le dos droit'};
    const w2={format:'amrap',p:{min:6},preset:'am6',exercices:ex(['goblet-squat','mountain-climber','crunch'],8,k+s+1),fait:s>1,res:s>1?{tours:3+k%3,amIdx:1,tourT:[70,145,225]}:null,fc:s>1?fc+6:null,ressenti:s>1?6+k%4:null,echelleRessenti:10,echelleNote:4,commentaire:s>1?'AMRAP difficile au 3e tour':''};
    importerObjet({app:'cross-training-eleves',version:1,classe:c,eleve:n,seance:s,date:'2026-10-'+String(10+s*2).padStart(2,'0'),ts:1790000000+s*1000+k,parcours:'p',mobile:mob,dispense:false,
      wods:[w1,w2],ressentiSeance:{etoiles:3+(k%3),fatigue:2+(s%3)},bilan:'Bilan démo de '+n.split(' ')[0],suite:'Monter d’un niveau',etirements:s>1,roles:{supporter:true,assistant:s>1,coach:s>2},
      tableau:{age:16,fcRepos:62+k,mobile:mob,pourquoi:'Démo',charges:12},groupe:[n]},'démo')})});
  DB.classe=c;journal('Classe de démonstration créée (6 élèves fictifs, 3 séances).');
}

/* ---------- Évènements ---------- */
let IDX=0;
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,v=b.dataset.v;
  switch(a){
    case 'tab':DB.tab=v;break;
    case 'clcoller':await importerListe(null,$('#cl-txt').value,$('#cl-nom').value.trim());return;
    case 'clniv':DB.classesL[b.dataset.c].niv=v;toast('Niveau changé : affiche le nouveau QR de démarrage.');break;
    case 'clsai':DB.classesL[b.dataset.c].s=v;toast('Saisie changée : affiche le nouveau QR de démarrage.');break;
    case 'cldem':DB.classesL[b.dataset.c].dem=v;toast('Démarche changée : affiche le nouveau QR de démarrage.');break;
    case 'qrdem':await qrDemarrage(v);return;
    case 'clsuppr':if(!confirm('Retirer la classe '+v+' ? Les séances reçues restent dans la sauvegarde.'))return;delete DB.classesL[v];DB.classe='';break;
    case 'demo':creerDemo();toast('Classe DEMO créée : regarde Appel, Élèves, Épreuve.');break;
    case 'proposer':{const I=indices(DB.eleve),N=noteDe(DB.eleve);let n=0;
      [['p',I.pd],['a',I.ad],['c',I.cd]].forEach(([g,L])=>L.forEach((d,i)=>{if(N[g][i]==null&&d!=null){N[g][i]=DEG[d];n++}}));
      I.rd.forEach((d,i)=>{if(N.r[i]==null&&d!=null){N.r[i]=d;n++}});
      toast(n?n+' degré'+(n>1?'s':'')+' repris : vérifie-les.':'Rien à reprendre (cases déjà remplies ou pas de données).');break}
    case 'scan':scanner();return;
    case 'qrtxt':{try{const m=await lireTexte($('#qrtxt').value);journal(m);toast(m)}catch(e){toast(e.message);return}break}
    case 'ancsuppr':if(!confirm('Supprimer cet élève de la liste de l’ancienne appli ?'))return;DB.ancien.splice(+v,1);break;
    case 'anccsv':csvAncien();return;
    case 'ancjson':telecharger('CT_ancienne_appli_'+today()+'.json',JSON.stringify(DB.ancien,null,1),'application/json');return;
    case 'pdf':imprimer();return;
    case 'json':jsonClasse();return;
    case 'fiche':DB.eleve=v;DB.tab='eleves';break;
    case 'versgrille':DB.eleve=v;DB.tab='epreuve';break;
    case 'rep':noteDe(DB.eleve).rep=v;break;
    case 'elprec':case 'elsuiv':{const E=elevesClasse(),i=E.findIndex(([k])=>k===DB.eleve);const j=Math.max(0,Math.min(E.length-1,i+(a==='elsuiv'?1:-1)));DB.eleve=E[j][0];window.scrollTo(0,0);break}
    case 'csvnotes':csvNotes();return;
    case 'csvseances':csvSeances();return;
    case 'sauvegarde':telecharger('CT_prof_sauvegarde_'+today()+'.json',JSON.stringify(DB),'application/json');return;
    case 'archiver':if(!confirm('Télécharger la sauvegarde puis vider l’outil ?'))return;telecharger('CT_prof_archive_'+today()+'.json',JSON.stringify(DB),'application/json');DB=vide();break;
    default:return;
  }
  sauver();rendre();
});
document.addEventListener('change',async ev=>{
  const t=ev.target;
  if(t.id==='cl-fic'&&t.files.length){await importerListe([...t.files],'',$('#cl-nom').value.trim());return}
  if(t.id==='fic'&&t.files.length){await importerFichiers([...t.files]);return}
  if(t.id==='photoqr'&&t.files[0]){try{const m=await lirePhoto(t.files[0]);journal(m);sauver();rendre();toast(m)}catch(e){toast(e.message)}t.value='';return}
  if(t.id==='restaure'&&t.files[0]){try{const o=JSON.parse(await t.files[0].text());if(!o.classesL||!o.rec)throw 0;DB=Object.assign(vide(),o);sauver();rendre();toast('Sauvegarde restaurée.')}catch(e){toast('Ce fichier n’est pas une sauvegarde de l’outil prof.')}return}
  if(t.id==='selcl'){DB.classe=t.value;DB.eleve='';sauver();rendre();return}
  if(t.id==='selel'){DB.eleve=t.value;sauver();rendre();return}
  if(t.classList.contains('cl-lien')){DB.classesL[t.dataset.c].lien=t.value.trim();sauver();toast('Lien enregistré : affiche le nouveau QR de démarrage.');return}
  if(t.dataset.n){const N=noteDe(DB.eleve),g=t.dataset.n,i=+t.dataset.i;
    N[g][i]=t.value===''?null:g==='r'?+t.value:DEG[+t.value];sauver();rendre();return}
});
// recherche dans l'appel et dans la liste de l'ancienne appli
document.addEventListener('input',ev=>{const t=ev.target;if(t.id!=='filtre'&&t.id!=='filtreAnc')return;DB[t.id]=t.value;const pos=t.selectionStart;rendre();const n=$('#'+t.id);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}});
rendre();
