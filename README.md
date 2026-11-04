# Jeux de l'EVG

Trois jeux de soirée à jouer sur un seul téléphone, en HTML, CSS et JavaScript, sans framework ni serveur.

| Dossier | Jeu |
| --- | --- |
| `draft-des-anciens/` | Boosters de cartes de danseurs, deck en 7 catégories, jokers, votes et podium |
| `qui-a-dit-ca/` | Deux modes : « Qui a dit ça ? » et « Qui est-ce ? » avec indices |
| `mafia-pas-mafia/` | Swipe façon Tinder (modes Situations et Danseurs), mode Battle en tournoi, 71 danseurs |

## Ouvrir et tester

1. Ouvre le dossier `jeux-evg` dans VS Code (Fichier > Ouvrir le dossier).
2. Installe l'extension **Live Server**, puis clic droit sur un `index.html` > « Open with Live Server ».
3. Le jeu s'ouvre dans le navigateur et se recharge à chaque sauvegarde.

Un double-clic sur `index.html` marche aussi, sans extension.

## Structure de chaque jeu

- `index.html` : la page, presque vide. Tout l'affichage est généré par le JavaScript dans `<main id="app">`.
- `style.css` : les couleurs (variables en haut du fichier), les cartes, les animations.
- `script.js` : toute la logique. Les réglages (noms, raretés, points…) sont regroupés en haut, dans le bloc « RÉGLAGES ».

## Bon à savoir

- Les parties et les questions saisies dans les jeux sont sauvegardées dans le `localStorage` du navigateur : elles restent sur l'appareil qui les a saisies.
- Les sons sont générés par la Web Audio API : coupe le mode silencieux sur iPhone.
- Pour mettre les jeux en ligne, n'importe quel hébergement statique suffit (Netlify, GitHub Pages).

## Listes de Mafia ou pas mafia

Toutes les listes (situations, danseurs, catégories du Battle) sont dans **`mafia-pas-mafia/donnees.js`**, et nulle part ailleurs : la version un téléphone et la version multijoueur lisent le même fichier.

- `dancers` : la liste complète du mode Danseurs. Tout danseur d'une catégorie doit aussi y être.
- `hiphop`, `popping`, `anciens` : les catégories du Battle. Un danseur peut être dans plusieurs.
- All style = Hip hop + Popping. All Style Bad = un tournoi Popping, un tournoi Hip hop, puis une grande finale.

## Multijoueur (Mafia ou pas mafia, Draft des anciens)

- `mafia-pas-mafia/multijoueur.html` : chacun vote sur son propre téléphone. Trois modes : Situations, Danseurs et Battle (tournoi : à chaque duel, chacun vote pour un danseur, puis l'hôte révèle les votes un par un). Le Battle en ligne a les mêmes catégories que sur un téléphone (dont Les anciens et All Style Bad) et la roulette de style quand on joue sans musique.
- `draft-des-anciens/multijoueur.html` : chacun ouvre son booster, construit son deck et joue ses jokers sur son téléphone, en même temps. L'écran hôte anime la roulette des jokers de départ, la présentation de chaque tour, les votes, les roulettes bonus et malus, la révélation des équipes, les élections et le podium. Il réutilise `script.js` comme bibliothèque (`window.DRAFT_LIB = true`).
- `commun/salle.css` : le style des salles (code, QR code, liste des joueurs, pastille de connexion), partagé par le Draft.

- L'écran hôte (télé, ordi ou téléphone) crée une salle et affiche un code et un QR code.
- Les joueurs scannent le QR code ou tapent le code, puis votent en même temps.
- Les messages passent par **Supabase Realtime** (broadcast + presence) : aucune table à créer.
- La connexion est réglée dans `config.js` (URL du projet et clé **publishable**, jamais la clé secrète).
- Tous les joueurs doivent être dans la salle avant le lancement. Si un téléphone se recharge ou perd le réseau, il reprend là où il en était.
- Ça ne marche que sur le site hébergé ou en local avec Live Server, pas en ouvrant le fichier par double-clic.

## Tests automatiques

À chaque push et à chaque pull request, GitHub lance les tests (onglet **Actions**, et ✅ ou ❌ en bas de chaque PR). Un ❌ veut dire qu'une modification a cassé quelque chose : ne pas fusionner avant de comprendre pourquoi. En cas d'échec, le rapport avec captures d'écran est téléchargeable dans l'onglet Actions (« rapport-tests »).

Ce qui est vérifié (`tests/`) :

- `mafia.spec.js` : de vraies parties de Mafia ou pas mafia (Situations, Danseurs, Battle dans chaque catégorie et chaque format, Les anciens, All Style Bad, roulette, annuler y compris entre deux tournois, rechargement de la page).
- `autres-jeux.spec.js` : un « joueur robot » touche les boutons des trois jeux pendant des centaines d'étapes et vérifie qu'aucune erreur n'apparaît.
- `multijoueur.spec.js` : les pages multijoueur s'ouvrent sans planter, et un Battle en ligne se joue sur l'écran hôte (All Style Bad complet avec roulette et annuler, Les anciens).
- `donnees.spec.js` : les listes ne sont écrites qu'une fois, sans doublon, et chaque danseur d'une catégorie est dans la liste complète.
- `securite.spec.js` : aucune erreur de syntaxe, aucune clé secrète Supabase dans le code, scripts des CDN verrouillés par une empreinte `integrity` (et empreintes vérifiées en ligne), versions anti-cache cohérentes.

Pour les lancer sur ton ordi : `npm install`, `npx playwright install chromium`, puis `npm test`.
