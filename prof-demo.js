/* =====================================================================
   prof-demo.js — vrai mode démo de l'outil prof cross training (20/11/2026)
   Avant : « Créer la classe de démonstration » ajoutait une vraie classe DEMO, enregistrée sur l'appareil.
   Maintenant : la classe fictive (6 élèves, 3 séances, mêmes données qu'avant : creerDemo de prof.js)
   vit seulement en mémoire. Les vraies données sont mises de côté et reviennent telles quelles en quittant.
   Rien n'est enregistré pendant la démo. Barre violette commune : eps-demo.js.
   Ouverture : bouton « Découvrir avec une classe fictive » ou adresse …/?demo
   Nettoyage : une ancienne classe « DEMO » (élèves « … DÉMO ») restée sur l'appareil est retirée au chargement.
   ===================================================================== */
let DEMO=false,DB_REEL=null;
(function(){
  /* 1. pendant la démo, rien n'est écrit sur l'appareil */
  const sauverReel=sauver;
  sauver=function(){if(DEMO)return;return sauverReel.apply(this,arguments)};

  /* 2. le bouton de démonstration ouvre la démo en mémoire (même contenu fictif qu'avant) */
  const creerReel=creerDemo;
  creerDemo=function(){
    if(DEMO)return;
    DB_REEL=DB;
    DB=vide();
    if(DB_REEL.oubli)DB.oubli=DB_REEL.oubli; /* mêmes clés que l'outil réel, pour des QR lisibles */
    DEMO=true;
    creerReel();
    DB.tab='appel';
  };

  /* 3. ancienne classe DEMO enregistrée (versions précédentes) : on la retire, elle ne contient que du fictif */
  try{
    const L=DB.classesL&&DB.classesL.DEMO;
    if(L&&Array.isArray(L.eleves)&&L.eleves.length&&L.eleves.every(n=>/DÉMO$/.test(n))){
      delete DB.classesL.DEMO;
      Object.keys(DB.rec||{}).forEach(k=>{if(k.indexOf('demo|')===0)delete DB.rec[k]});
      Object.keys(DB.noms||{}).forEach(k=>{if(k.indexOf('demo|')===0)delete DB.noms[k]});
      Object.keys(DB.notes||{}).forEach(k=>{if(k.indexOf('demo|')===0)delete DB.notes[k]});
      if(DB.classe==='DEMO'){DB.classe='';DB.eleve=''}
      sauverReel();
    }
  }catch(e){}

  /* 4. ouverture par l'adresse …/?demo */
  if(/[?&]demo\b/.test(location.search)){creerDemo();rendre();}
})();
function quitterDemo(){
  if(!DEMO)return;
  DB=DB_REEL||DB;DB_REEL=null;DEMO=false;
  try{if(/[?&]demo\b/.test(location.search))history.replaceState(null,'',location.pathname)}catch(e){}
  rendre();scrollTo(0,0);
}
