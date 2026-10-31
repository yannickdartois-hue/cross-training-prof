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
const vide=()=>({classesL:{},rec:{},notes:{},noms:{},classe:'',tab:'classes',eleve:'',journal:[]});
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
  const txt=await TTQR.encoder({a:'CTE',v:1,t:'C',c,l:L.eleves,u:L.lien||'',n:L.niv||'p',m:L.dem||'p'});
  let svg;try{svg=TTQR.svgQR(txt)}catch(e){svg='<p class="avert">Liste trop longue pour un seul QR.</p>'}
  const d=document.createElement('div');d.className='qr-plein';
  d.innerHTML=`<div><h2>Classe ${esc(c)} · cross training</h2><p>${esc(CTL.NOM_NIV[L.niv||'p'])} · démarche ${esc(CTL.NOM_DEM[L.dem||'p'])}</p><p>Dans l’appli élève : « Scanner le QR de la classe »</p><div class="qrbox">${svg}</div><button class="bt noir" type="button">Fermer</button></div>`;
  d.querySelector('button').onclick=()=>d.remove();document.body.appendChild(d);
}

/* ---------- Réception ---------- */
function importerObjet(o,source){
  if(!o||o.app!=='cross-training-eleves'||!o.eleve||!o.seance)throw new Error('Ce fichier ne vient pas de l’appli élève cross training.');
  const c=classeReelle(o.classe||'Sans classe'),k=cleEleve(c,o.eleve),cle=k+'|'+o.seance;
  if(!DB.classesL[c])DB.classesL[c]={eleves:[],lien:'',niv:(o.parcours==='t'||o.parcours==='h')?'t':'p',dem:(o.parcours==='g'||o.parcours==='h')?'g':'p'};
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
function scanner(){TTQR.scanner(async t=>{const q=await TTQR.decoder(t);if(q.t==='C')throw new Error('C’est un QR de classe, pas une séance.');const m=importerObjet(CTL.depuisQR(q),'qr');sauver();return m},
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
  I.p=[`échauffement écrit : ${ech}/4 étapes`,`FC dans la fourchette (${mob?MOBILES[mob].fc:'mobile ?'}) : ${fcok}/${W.length} WOD`,`no rep : ${nr}`,`no rep : ${nr}`,'à observer',ev&&ev.etirements?'étirements cochés':'étirements non cochés',`${W.length} WOD réalisés sur ${req} attendus${mob==='mod'?' (modéré : le degré 4 exige 3 cycles, impossible)':''}`];
  I.a=[`${W.length} WOD avec données`,`FC notée : ${W.filter(w=>w.fc).length}/${W.length} · ressenti : ${W.filter(w=>w.ressenti).length}/${W.length}`,ev&&ev.tableau&&ev.tableau.pourquoi?'justification du mobile écrite':'pas de justification du mobile',ev&&ev.bilan?'bilan écrit':'pas de bilan',ev&&ev.suite?'suite écrite':'pas de « prochaine fois »'];
  const T=derniereInfo(k,'tableau')||{},tp=[T.age,T.fcRepos,T.mobile,T.pourquoi].filter(Boolean).length;
  const avecW=R.filter(r=>r&&(r.wods||[]).length).length,avecB=R.filter(r=>r&&r.bilan&&r.suite).length,recus=R.filter(Boolean).length;
  I.c=[`tableau personnel : ${tp}/4 rubriques`,`WOD préparés : ${R.filter(r=>r&&(r.wods||[]).some(w=>!w.fait)).length} séances`,`séances avec WOD : ${avecW}/${recus}`,`bilan + suite : ${avecB}/${recus}`];
  const nb=x=>R.filter(r=>r&&r.roles&&r.roles[x]).length;
  I.r=[`coché « supporter » ${nb('supporter')}/${recus} séances`,`coché « assistant » ${nb('assistant')}/${recus}`,`coché « coach » ${nb('coach')}/${recus}`];
  return I;
}

/* ---------- Vues ---------- */
function rendre(){
  if(!DB.classe||!DB.classesL[DB.classe])DB.classe=classes()[0]||'';
  const T=[['classes','Classes'],['recevoir','Recevoir'],['appel','Appel'],['eleves','Élèves'],['epreuve','Épreuve'],['export','Exporter']];
  $('#onglets').innerHTML=T.map(t=>`<button type="button" class="${DB.tab===t[0]?'ici':''}" data-act="tab" data-v="${t[0]}">${t[1]}</button>`).join('');
  $('#classe').innerHTML=classes().length?`<label for="selcl" class="small">Classe</label><select id="selcl">${classes().map(c=>`<option${c===DB.classe?' selected':''}>${esc(c)}</option>`).join('')}</select><span class="small muted">${DB.classe?esc(CTL.NOM_NIV[C().niv||'p'])+' · '+esc(CTL.NOM_DEM[C().dem||'p']):''}</span>`:'';
  const V={classes:vClasses,recevoir:vRecevoir,appel:vAppel,eleves:vEleves,epreuve:vEpreuve,export:vExport};
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
  ${L.map(c=>{const X=DB.classesL[c];return `<section class="carte"><h3>${esc(c)} <span class="small muted">· ${X.eleves.length} élèves</span></h3>
    <div class="grille2"><div><label class="ch">Niveau</label><div class="rangee">${['p','t'].map(n=>`<button type="button" class="bt mini ${X.niv===n?'noir':''}" data-act="clniv" data-c="${esc(c)}" data-v="${n}">${CTL.NOM_NIV[n]}</button>`).join('')}</div></div>
    <div><label class="ch">Démarche du cycle</label><div class="rangee">${['p','g'].map(n=>`<button type="button" class="bt mini ${X.dem===n?'noir':''}" data-act="cldem" data-c="${esc(c)}" data-v="${n}">${n==='p'?'Progressive':'GAREEPS'}</button>`).join('')}</div></div></div>
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
  <section class="carte"><h3>Fichiers</h3><p class="small muted">Fichiers .json déposés dans le Nuage (tu peux télécharger tout le dossier en .zip).</p><label class="bt noir" for="fic">Choisir les fichiers (.json ou .zip)</label><input id="fic" type="file" accept=".json,.zip,application/json,application/zip" multiple hidden></section>
  <section class="carte"><h3>Journal</h3><ul class="small">${DB.journal.slice(0,12).map(x=>`<li>${esc(x)}</li>`).join('')||'<li class="muted">rien pour l’instant</li>'}</ul></section>`;
}
function vAppel(){
  if(!DB.classe)return '<p class="muted">Importe d’abord une classe.</p>';
  const E=elevesClasse();
  const tot=n=>E.filter(([k])=>recDe(k,n)).length;
  return `<h2>Appel · ${esc(DB.classe)}</h2><p class="small muted">✓ séance reçue (nombre de WOD faits) · D dispensé · vide : rien reçu. Touche un nom pour sa fiche.</p>
  <div class="defile"><table class="tab"><tr><th>Élève</th>${[...Array(9)].map((_,i)=>`<th>S${i+1}</th>`).join('')}</tr>
  ${E.map(([k,n])=>`<tr><th><button class="lien" type="button" data-act="fiche" data-v="${esc(k)}">${esc(n)}</button></th>${[...Array(9)].map((_,i)=>{const r=recDe(k,i+1);if(!r)return '<td></td>';const f=(r.wods||[]).filter(w=>w.fait).length;return `<td class="${r.dispense?'d':'ok'}">${r.dispense?'D':'✓'+(f?' '+f:'')}</td>`}).join('')}</tr>`).join('')}
  <tr class="total"><th>Reçus</th>${[...Array(9)].map((_,i)=>`<td>${tot(i+1)}/${E.length}</td>`).join('')}</tr></table></div>`;
}
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
    return `<tr><th>S${i+1}<br><small>${esc(r.date||'')}</small>${r.dispense?'<br><b>D</b>':''}</th><td>${W.map(w=>{const D=CTL.decrireWod(w,MOUV);return `${w.fait?'':'<i>prévu</i> '}<b>${esc(D.titre)}</b>${w.special?' · spécial':''}<br><small>${D.format?esc(D.format)+' · ':''}${esc(CTL.mmss(D.duree))}${w.ordre==='h'?' · horizontal':''}${w.res&&w.res.arrete?' · arrêté à '+esc(CTL.mmss(w.res.arrete)):''}</small><ul class="exl">${D.ex.map(e=>`<li>${esc(e.nom)} <small>${esc(e.zone)} N${e.niveau||'?'}${e.reps?' · '+e.reps+' rép.':''}${e.version?(e.version<0?' · version −':' · version +'):''}</small></li>`).join('')}</ul>`}).join('<hr>')||'—'}</td>
      <td>${W.filter(w=>w.fait).map(w=>esc(w.score||CTL.score({f:w.format,p:w.p,res:w.res})||'')).join('<hr>')}</td><td>${W.filter(w=>w.fait).map(w=>pastFC(w.fc,r.mobile||mob)).join('<hr>')}</td>
      <td>${W.filter(w=>w.fait).map(w=>(w.ressenti||'—')+'/4'+(w.regulations?' · '+w.regulations+' rég.':'')+(w.noRep?' · '+w.noRep+' NR':'')).join('<hr>')}</td>
      <td class="small">${r.bilan?'<b>Bilan :</b> '+esc(r.bilan):''}${r.suite?'<br><b>Suite :</b> '+esc(r.suite):''}${r.etoile?`<br><b>Étoile :</b> C${r.etoile.conception} P${r.etoile.production} A${r.etoile.analyse}${r.axePrioritaire?' · axe '+esc((GAREEPS.axes.find(a=>a.id===r.axePrioritaire)||{nom:r.axePrioritaire}).nom):''}`:''}</td></tr>`}).join('');
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
  const blocDeg=(A,grp,ind)=>`<table class="tab grille"><tr><th>Élément</th><th>Note</th><th>Indice tiré du carnet</th></tr>${A.items.map((it,i)=>`<tr><td>${esc(it)}</td><td>${sel(grp,i,N[grp][i])}</td><td class="small muted">${esc(ind[i]||'')}</td></tr>`).join('')}</table>`;
  return `<h2>Épreuve · ${esc(DB.classe)}</h2><select id="selel" aria-label="Élève">${E.map(([kk,n])=>`<option value="${esc(kk)}"${kk===k?' selected':''}>${esc(n)}${totalNote(kk).complet?' ✓':''}</option>`).join('')}</select>
  <section class="carte total-note"><b>${esc(nomDe(k))}</b> · <span class="gros-chiffre">${t.tot.toFixed(1).replace('.',',')}</span> / 20 ${t.complet?'':'<span class="small muted">(incomplet)</span>'}<br><span class="small">AFL1 produire ${t.p.toFixed(2)}/7 · analyser ${t.a.toFixed(2)}/5 · AFL2 ${t.c.toFixed(2)}/${t.m2} · AFL3 ${t.r.toFixed(2)}/${t.m3}</span></section>
  <section class="carte"><h3>Répartition AFL2 / AFL3</h3><div class="rangee">${['6/2','4/4','2/6'].map(x=>`<button type="button" class="bt mini ${repartition(k)===x?'noir':''}" data-act="rep" data-v="${x}">${x}</button>`).join('')}<span class="small muted">${N.rep?'choisie ici':'choix de l’élève (Jour J) ou 4/4 par défaut'}</span></div></section>
  <section class="carte"><h3>${esc(REF.afl1a.titre)}</h3>${blocDeg(REF.afl1a,'p',I.p)}</section>
  <section class="carte"><h3>${esc(REF.afl1b.titre)}</h3>${blocDeg(REF.afl1b,'a',I.a)}</section>
  <section class="carte"><h3>AFL2 · Le carnet (${t.m2} points, ${(t.m2/4).toString().replace('.',',')} par élément)</h3>${blocDeg(REF.afl2,'c',I.c)}</section>
  <section class="carte"><h3>AFL3 · Rôles (${t.m3} points)</h3><table class="tab grille"><tr><th>Rôle</th><th>Niveau 0 à 11</th><th>Indice</th></tr>${REF.afl3.items.map((it,i)=>`<tr><td>${esc(it)}</td><td><select data-n="r" data-i="${i}"><option value="">—</option>${[...Array(12)].map((_,v)=>`<option value="${v}"${N.r[i]===v?' selected':''}>${v} · degré ${Math.floor(v/3)+1}</option>`).join('')}</select></td><td class="small muted">${esc(I.r[i])}</td></tr>`).join('')}</table>
    <p class="small muted">${esc(REF.afl3.note)} 0-2 = degré 1, 3-5 = degré 2, 6-8 = degré 3, 9-11 = degré 4.</p></section>
  <div class="rangee"><button class="bt" type="button" data-act="elprec">← Élève précédent</button><button class="bt noir" type="button" data-act="elsuiv">Élève suivant →</button></div>
  <details class="carte"><summary>Degrés du référentiel</summary>${[REF.afl1a,REF.afl1b].map(A=>`<p><b>${esc(A.titre)}</b></p><ol class="small">${A.degres.map(d=>`<li>${esc(d[0])} <b>${esc(d[1])}</b></li>`).join('')}</ol>`).join('')}<p><b>${esc(REF.afl2.titre)}</b></p><ol class="small">${REF.afl2.degres.map(d=>`<li>${esc(d)}</li>`).join('')}</ol><p><b>${esc(REF.afl3.titre)}</b></p><ol class="small">${REF.afl3.degres.map(d=>`<li>${esc(d)}</li>`).join('')}</ol></details>`;
}
function vExport(){
  const E=DB.classe?elevesClasse():[];
  return `<h2>Exporter</h2>
  ${DB.classe?`<section class="carte"><h3>Notes de ${esc(DB.classe)}</h3><div class="defile"><table class="tab"><tr><th>Élève</th><th>Produire /7</th><th>Analyser /5</th><th>AFL2</th><th>AFL3</th><th>Répartition</th><th>Total /20</th></tr>
    ${E.map(([k,n])=>{const t=totalNote(k);return `<tr><td>${esc(n)}</td><td>${t.p.toFixed(2)}</td><td>${t.a.toFixed(2)}</td><td>${t.c.toFixed(2)}</td><td>${t.r.toFixed(2)}</td><td>${repartition(k)}</td><td><b>${t.tot.toFixed(1)}</b>${t.complet?'':' <small class="muted">incomplet</small>'}</td></tr>`}).join('')}</table></div>
    <div class="rangee"><button class="bt orange" type="button" data-act="csvnotes">Notes (CSV)</button><button class="bt" type="button" data-act="csvseances">Toutes les séances (CSV)</button></div></section>`:''}
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
function csvSeances(){const L=[['Classe','Élève','Séance','Date','Mobile','Dispensé','WOD','Format de l’épreuve','Durée','Fait','Exercices (zone, niveau, répétitions, version)','Résultat','FC','Ressenti','Régulations','No rep','Bilan','Suite']];
  elevesClasse().forEach(([k,n])=>recsDe(k).forEach((r,i)=>{if(!r)return;const W=r.wods&&r.wods.length?r.wods:[null];
    W.forEach(w=>{const D=w?CTL.decrireWod(w,MOUV):null;L.push([DB.classe,n,i+1,r.date,r.mobile,r.dispense?'oui':'',D?D.titre:'',D?D.format:'',D?CTL.mmss(D.duree):'',w&&w.fait?'oui':'',D?D.ex.map(e=>e.nom+' ('+e.zone+' N'+(e.niveau||'?')+(e.reps?', '+e.reps+' rép.':'')+(e.version?(e.version<0?', −':', +'):'')+')').join(' ; '):'',w?w.score||'':'',w?w.fc||'':'',w?w.ressenti||'':'',w?w.regulations||0:'',w?w.noRep||0:'',r.bilan,r.suite])})}));
  telecharger('CT_seances_'+CTL.slug(DB.classe)+'_'+today()+'.csv',csv(L))}

/* ---------- Évènements ---------- */
let IDX=0;
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,v=b.dataset.v;
  switch(a){
    case 'tab':DB.tab=v;break;
    case 'clcoller':await importerListe(null,$('#cl-txt').value,$('#cl-nom').value.trim());return;
    case 'clniv':DB.classesL[b.dataset.c].niv=v;toast('Niveau changé : affiche le nouveau QR de démarrage.');break;
    case 'cldem':DB.classesL[b.dataset.c].dem=v;toast('Démarche changée : affiche le nouveau QR de démarrage.');break;
    case 'qrdem':await qrDemarrage(v);return;
    case 'clsuppr':if(!confirm('Retirer la classe '+v+' ? Les séances reçues restent dans la sauvegarde.'))return;delete DB.classesL[v];DB.classe='';break;
    case 'scan':scanner();return;
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
  if(t.id==='restaure'&&t.files[0]){try{const o=JSON.parse(await t.files[0].text());if(!o.classesL||!o.rec)throw 0;DB=Object.assign(vide(),o);sauver();rendre();toast('Sauvegarde restaurée.')}catch(e){toast('Ce fichier n’est pas une sauvegarde de l’outil prof.')}return}
  if(t.id==='selcl'){DB.classe=t.value;DB.eleve='';sauver();rendre();return}
  if(t.id==='selel'){DB.eleve=t.value;sauver();rendre();return}
  if(t.classList.contains('cl-lien')){DB.classesL[t.dataset.c].lien=t.value.trim();sauver();toast('Lien enregistré : affiche le nouveau QR de démarrage.');return}
  if(t.dataset.n){const N=noteDe(DB.eleve),g=t.dataset.n,i=+t.dataset.i;
    N[g][i]=t.value===''?null:g==='r'?+t.value:DEG[+t.value];sauver();rendre();return}
});
rendre();
