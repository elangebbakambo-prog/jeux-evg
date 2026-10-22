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

## Multijoueur (Mafia ou pas mafia, Draft des anciens)

- `mafia-pas-mafia/multijoueur.html` : chacun vote sur son propre téléphone. Trois modes : Situations, Danseurs et Battle (tournoi : à chaque duel, chacun vote pour un danseur, puis l'hôte révèle les votes un par un).
- `draft-des-anciens/multijoueur.html` : chacun ouvre son booster, construit son deck et joue ses jokers sur son téléphone, en même temps. L'écran hôte anime la roulette des jokers de départ, la présentation de chaque tour, les votes, les roulettes bonus et malus, la révélation des équipes, les élections et le podium. Il réutilise `script.js` comme bibliothèque (`window.DRAFT_LIB = true`).
- `commun/salle.css` : le style des salles (code, QR code, liste des joueurs, pastille de connexion), partagé par le Draft.

- L'écran hôte (télé, ordi ou téléphone) crée une salle et affiche un code et un QR code.
- Les joueurs scannent le QR code ou tapent le code, puis votent en même temps.
- Les messages passent par **Supabase Realtime** (broadcast + presence) : aucune table à créer.
- La connexion est réglée dans `config.js` (URL du projet et clé **publishable**, jamais la clé secrète).
- Tous les joueurs doivent être dans la salle avant le lancement. Si un téléphone se recharge ou perd le réseau, il reprend là où il en était.
- Ça ne marche que sur le site hébergé ou en local avec Live Server, pas en ouvrant le fichier par double-clic.
