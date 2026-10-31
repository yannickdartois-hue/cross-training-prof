# Cross training · Prof

Outil prof du cycle de cross training (lycée Georges Pompidou), à utiliser avec l'appli élève **cross-training-eleves**.

- **Classes** : import Pronote (xlsx, xls, csv ou liste collée), niveau (Première, Terminale), démarche (progressive, GAREEPS), lien de dépôt du Nuage (facultatif), **QR de démarrage**.
- **Recevoir** : QR des élèves scannés à la suite, ou fichiers .json / .zip du Nuage. Toutes les séances de chaque élève sont gardées ; un envoi plus récent remplace le précédent pour la même séance.
- **Appel** : séances reçues par élève (S1 à S9), dispensés.
- **Élèves** : fiche complète (WOD, résultats, FC par rapport au mobile, ressentis, régulations, bilans, étoiles, jour J contrôlé).
- **Épreuve** : grille du référentiel (AFL1 produire /7 et analyser /5, AFL2 et AFL3 selon la répartition 6/2, 4/4, 2/6), avec un indice tiré du carnet à côté de chaque élément.
- **Exporter** : notes et séances en CSV (Excel), sauvegarde, archivage de l'année.

Données gardées sur l'appareil du prof (localStorage). Bibliothèques : SheetJS (Apache 2.0), JSZip (MIT), qrcode-generator et jsQR (MIT).
