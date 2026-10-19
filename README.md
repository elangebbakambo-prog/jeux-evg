# Jeux de l'EVG

Trois jeux de soirée à jouer sur un seul téléphone, en HTML, CSS et JavaScript, sans framework ni serveur.

| Dossier | Jeu |
| --- | --- |
| `draft-des-anciens/` | Boosters de cartes de danseurs, deck en 7 catégories, jokers, votes et podium |
| `qui-a-dit-ca/` | Deux modes : « Qui a dit ça ? » et « Qui est-ce ? » avec indices |
| `mafia-pas-mafia/` | Swipe façon Tinder, modes Situations et Danseurs, titres de fin |

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
