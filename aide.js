/* aide.js — mode d'emploi de l'outil prof cross training (lu par eps-aide.js) */
window.EPS_AIDE={appli:'Cross training · Prof',bouton:false,publics:[
{id:'prof',titre:'Professeur',chapitres:[
{t:'Rentrée',html:`<ol><li><b>Classes</b> : importe l’export Pronote (xlsx, xls, csv) ou colle la liste.</li>
<li>Pour chaque classe : <b>niveau</b> (Première ou Terminale), <b>démarche</b> (progressive ou GAREEPS), lien de dépôt du Nuage (facultatif).</li>
<li>Premier cours : <span class="bouton">QR de démarrage</span> affiché ; chaque tablette de binôme le scanne.</li></ol>`},
{t:'Après chaque séance',html:`<ul><li><b>Recevoir</b> : scanne les QR des élèves à la suite, ou importe les fichiers .json (ou le .zip du dossier du Nuage).</li>
<li>Toutes les séances sont gardées. Une séance reçue deux fois : la plus récente remplace l’autre.</li>
<li><b>Appel</b> : qui a envoyé quoi, séance par séance.</li></ul>`},
{t:'Photo, texte collé, ancienne appli',html:`<ul><li>Si la caméra ne lit pas le QR en direct : <b>Recevoir → Lire une photo de QR</b>, ou colle le texte du QR.</li>
<li>Les QR de l’ancienne appli <b>Cross Training Pompidou</b> (format NOM;PRÉNOM;CLASSE;…) sont aussi lus : ils sont rangés à part (ils n’ont pas de numéro de séance), avec recherche, suppression et export CSV / JSON.</li>
<li><b>Appel</b> : case de recherche pour retrouver un élève. <b>Exporter</b> : impression / PDF de la classe et séances en JSON.</li>
<li>Note d’exécution sur 4 (échelle de l’ancienne appli) ; les séances notées avant sur 5 restent affichées sur 5, et l’indice de la grille les ramène sur 4.</li></ul>`},
{t:'Noter',html:`<ul><li><b>Élèves</b> : toutes les séances d’un élève (WOD, résultats, FC, ressentis, régulations, bilans).</li>
<li><b>Épreuve</b> : la grille du référentiel. À côté de chaque élément, un indice tiré du carnet ; c’est toi qui notes.</li>
<li><b>Exporter</b> : notes en CSV (Excel), toutes les séances en CSV, sauvegarde.</li></ul>`},
{t:'Données',html:`<p>Tout reste sur cet appareil. Pense à télécharger une sauvegarde de temps en temps. Fin d’année : Exporter → « Archiver l’année ».</p>`}]}]};
