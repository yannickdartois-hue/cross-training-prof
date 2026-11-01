/* Tests de l'outil prof. Lancer : node cross-training-prof/tests/prof.test.js (Node + Playwright). */
const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');
const RACINE=path.resolve(__dirname,'..');
let ok=0,ko=0;const verif=(c,t)=>{if(c){ok++;console.log('  ✓ '+t)}else{ko++;console.log('  ✗ '+t)}};
(async()=>{
 const srv=spawn('python3',['-m','http.server','8783'],{cwd:RACINE,stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
 const b=await chromium.launch();const errs=[];
 try{
 const p=await b.newPage({viewport:{width:1024,height:900}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8783/index.html');await p.waitForTimeout(300);
 console.log('Démonstration et onglets');
 await p.click('[data-act=tab][data-v=classes]');await p.click('[data-act=demo]');await p.waitForTimeout(200);
 for(const t of ['appel','eleves','epreuve','surveiller','export']){await p.click(`[data-act=tab][data-v=${t}]`);await p.waitForTimeout(100)}
 verif(!errs.length,'tous les onglets s’ouvrent sans erreur');
 console.log('Degrés proposés');
 await p.click('[data-act=tab][data-v=epreuve]');
 const nP=await p.$$eval('.propose',x=>x.length);verif(nP>=8,'degrés proposés affichés ('+nP+')');
 await p.click('[data-act=proposer]');await p.waitForTimeout(150);
 verif(/repris/.test(await p.textContent('.toast')),'bouton « reprendre les degrés proposés »');
 const [vides,tot]=await p.$$eval('.grille select',x=>[x.filter(s=>s.value==='').length,x.length]);verif(vides===tot-nP,'chaque degré proposé repris ('+vides+' cases restées vides : pas de données du jour J dans la démo)');
 await p.selectOption('.grille select >> nth=0','1');await p.waitForTimeout(100);
 verif(await p.$$eval('.grille select',x=>x[0].value)==='1','une note modifiée à la main est gardée');
 console.log('Chrono classe');
 await p.goto('http://localhost:8783/collectif.html');await p.clock.install();await p.waitForTimeout(200);
 const pl=await p.evaluate(()=>CTC.plan().map(x=>x.typ+x.d));verif(pl.length===16&&pl[1]==='effort20'&&pl[2]==='repos10','Tabata 20/10 × 8 : 8 efforts, 7 repos');
 await p.click('[data-a=go]');await p.clock.runFor(11000);verif(/Effort/i.test(await p.textContent('#ecran .haut')),'passage à l’effort après le décompte');
 await p.clock.runFor(21000);verif(/Repos/i.test(await p.textContent('#ecran .haut')),'repos après 20 s');
 await p.clock.runFor(300000);verif(/Terminé/.test(await p.textContent('#ecran .haut')),'fin du WOD');
 await p.click('[data-a=stop]');verif(await p.$eval('#ecran',e=>e.hidden),'écran fermé');
 await p.click('[data-a=go]');await p.clock.runFor(15000);await p.click('[data-a=stop]');await p.clock.runFor(500);verif(!await p.$eval('#ecran',e=>e.hidden)&&/Sûr/.test(await p.textContent('[data-a=stop]')),'« Arrêter » pendant le WOD demande confirmation (et le bouton n’est pas redessiné entre-temps)');
 await p.click('[data-a=stop]');verif(await p.$eval('#ecran',e=>e.hidden),'2e appui : arrêté');
 await p.click('[data-a=f][data-v=emom]');const pe=await p.evaluate(()=>CTC.plan().length);verif(pe===9,'EMOM 8 min : 8 minutes après le décompte');
 }catch(e){ko++;console.log('ERREUR '+e.message.split('\n')[0])}
 verif(!errs.length,'aucune erreur JavaScript'+(errs.length?' : '+errs.join(' | '):''));
 await b.close();srv.kill();console.log(`\n${ok} réussis, ${ko} échoués`);process.exit(ko?1:0)})();
