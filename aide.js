/* aide.js — mode d'emploi de l'outil prof cross training (lu par eps-aide.js) */
window.EPS_AIDE={appli:'Cross training · Prof',bouton:false,publics:[
{id:'prof',titre:'Professeur',chapitres:[
{t:'Rentrée',html:`<ol><li><b>Classes</b> : importe l’export Pronote (xlsx, xls, csv) ou colle la liste.</li>
<li>Pour chaque classe : <b>niveau</b> (Première ou Terminale), <b>démarche</b> (progressive ou GAREEPS), lien de dépôt du Nuage (facultatif).</li>
<li>Premier cours : <span class="bouton">QR de démarrage</span> affiché ; chaque tablette de binôme le scanne.</li></ol>`},
{t:'Après chaque séance',html:`<ul><li><b>Recevoir</b> : scanne les QR des élèves à la suite, ou importe les fichiers .json (ou le .zip du dossier du Nuage).</li>
<li>Toutes les séances sont gardées. Une séance reçue deux fois : la plus récente remplace l’autre.</li>
<li><b>Appel</b> : qui a envoyé quoi, séance par séance.</li></ul>`},
{t:'Démonstration',html:`<p><b>Classes → Créer la classe de démonstration</b> : 6 élèves fictifs avec 3 séances reçues, pour voir l’appel, les fiches, la grille et les exports. À retirer ensuite (« Retirer la classe »).</p>`},
{t:'Photo, texte collé, ancienne appli',html:`<ul><li>Une séance très chargée arrive en <b>plusieurs QR</b> (« partie 1/2 »…) : scanne-les dans n’importe quel ordre, la séance est enregistrée à la dernière partie.</li><li>Si la caméra ne lit pas le QR en direct : <b>Recevoir → Lire une photo de QR</b>, ou colle le texte du QR.</li>
<li>Les QR de l’ancienne appli <b>Cross Training Pompidou</b> (format NOM;PRÉNOM;CLASSE;…) sont aussi lus : ils sont rangés à part (ils n’ont pas de numéro de séance), avec recherche, suppression et export CSV / JSON.</li>
<li><b>Appel</b> : case de recherche pour retrouver un élève. <b>Exporter</b> : impression / PDF de la classe et séances en JSON.</li>
<li>Note d’exécution sur 4 (échelle de l’ancienne appli) ; les séances notées avant sur 5 restent affichées sur 5, et l’indice de la grille les ramène sur 4.</li></ul>`},
{t:'Saisie légère ou complète',html:`<p><b>Classes → Saisie des élèves</b>. <b>Légère</b> (par défaut) : FC, les 3 critères (placement, respiration, amplitude) en fin de WOD, effort perçu 1 à 10 et décision de régulation. <b>Complète</b> : critères après chaque exercice, ressenti par zone (muscles, souffle, tête), conseil du coach et commentaires obligatoires, étoile et fatigue de séance. Le réglage part avec le <b>QR de démarrage</b> : les tablettes déjà inscrites doivent le scanner de nouveau.</p>`},
{t:'À surveiller',html:`<p>Onglet <b>À surveiller</b>, classe et séance choisies : la liste des élèves à aller voir en priorité. Séance non reçue, aucun WOD (en signalant s’il a été coach), FC absente ou hors fourchette deux séances de suite, exécution à 1-2/4, placement raté (risque de blessure), effort 9-10/10, aucune décision de régulation. Touche un nom pour ouvrir sa fiche.</p>`},
{t:'Chrono classe (vidéoprojecteur)',html:`<p>Bouton <b>⏱ Chrono classe</b> en haut : un TABATA, un EMOM, un AMRAP ou un FOR TIME pour toute la classe, en grand sur le vidéoprojecteur (vert à l’effort, rouge au repos, exercice en cours et suivant, bips). Les élèves comptent leurs répétitions. Idéal aux séances 1 et 2. Barre d’espace = pause.</p>`},
{t:'Noter',html:`<ul><li><b>Élèves</b> : toutes les séances d’un élève (WOD, résultats, FC, effort, critères, décision, coach et conseil, régulations, bilans).</li>
<li><b>Épreuve</b> : la grille du référentiel. À côté de chaque élément, un indice tiré du carnet et un <b>degré proposé</b> (en rouge s’il diffère de ta note). « Reprendre les degrés proposés » remplit seulement les cases vides ; c’est toi qui valides.</li>
<li><b>Exporter</b> : notes en CSV (Excel), toutes les séances en CSV, sauvegarde.</li></ul>`},
{t:'Données',html:`<p>Tout reste sur cet appareil. Pense à télécharger une sauvegarde de temps en temps. Fin d’année : Exporter → « Archiver l’année ».</p>`}]}]};
