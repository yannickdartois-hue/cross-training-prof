/* Hors ligne : l'appli est gardée sur l'appareil après la 1re ouverture.
   Après une modification, augmenter VERSION. */
const VERSION='cross-training-prof-v8';
// Toutes les applis partagent le même stockage (même adresse github.io) : on n'efface QUE les anciennes versions de CETTE appli.
const MES_CACHES=/^cross\-training\-prof\-v\d+$/;
// Wi-Fi faible au gymnase : si le réseau ne répond pas en 3 s, on ouvre la copie gardée sur l'appareil.
const sous3s=p=>{p.catch(()=>{});return Promise.race([p,new Promise((_,non)=>setTimeout(()=>non(new Error('réseau lent')),3000))])};
const FICHIERS=["./", "index.html", "aide.js", "eps-aide.js", "eps-charte-v1.css", "prof.js", "logique.js", "donnees.js", "qrcode.js", "jsqr.js", "scan.js", "xlsx.js", "jszip.js", "manifest.webmanifest", "icon-32.png", "icon-180.png", "icon-192.png", "icon-512.png", "polices/archivo.woff2", "polices/atkinson-400.woff2", "polices/atkinson-700.woff2"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>Promise.all(FICHIERS.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>MES_CACHES.test(k)&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  const net=fetch(e.request).then(r=>{const c=r.clone();caches.open(VERSION).then(x=>x.put(e.request,c));return r});
  e.respondWith(sous3s(net).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(h=>h||net)));
});
