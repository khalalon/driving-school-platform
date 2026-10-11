# Driving School Platform

Plateforme de gestion d'auto-écoles : un élève demande à rejoindre une école, l'instructeur approuve, puis l'élève demande des leçons (`CODE`, `Manœuvre`, `Parc`) et des examens (théorie, pratique) que l'instructeur planifie, marque et encaisse.

- **Mobile** : Expo / React Native (`mobile-app/`) — le produit.
- **Backend** : une application Node 20 / TypeScript / Express (`services/api/`), PostgreSQL 15, Redis 7, Nginx en façade sur `:80`.
- **Web** : squelette Vite (`web-frontend/`), gelé pour la v1.

État : le backend implémente intégralement le contrat (`docs/API_CONTRACT.md`, 39 routes, tests de bout en bout bloquants en CI) ; le mobile est en cours de câblage sur ce contrat (Phase 6 de `docs/PLAN.md`). Le détail est dans `docs/`.

## Lancer en local

Prérequis : Docker Desktop, Node 20+, Expo Go sur un téléphone connecté au **même Wi-Fi** que la machine (ou l'émulateur Android).

```bash
# 1. Backend (Postgres, Redis, API, Nginx). Les migrations s'appliquent automatiquement à la
#    première création du volume Postgres ; ensuite : ./scripts/migrate.sh (= make migrate).
cp .env.example .env          # puis remplacer les valeurs "change-this-*" (JWT_ACCESS_SECRET et JWT_REFRESH_SECRET : openssl rand -hex 32) ; POSTGRES_PORT=5433 si 5432 est pris
docker compose up -d --build
docker compose ps             # attendre que tout soit "healthy"
curl http://localhost/health  # → healthy
curl http://localhost/api/schools

# 2. Mobile
cd mobile-app
npm install
cp .env.example .env         # puis EXPO_PUBLIC_API_BASE_URL=http://<IP de la machine>:80 (surcharge app.json)
npm start                     # scanner le QR code avec Expo Go (émulateur Android : app.json suffit)
```

Compte admin seedé par la migration initiale : `admin@drivingschool.com` / `admin123`.

Repartir d'une base vierge : `docker compose down -v && docker compose up -d`.

Toutes les autres commandes (API seule, typecheck, lint, tests, tests de bout en bout, migrations) sont dans `CLAUDE.md` et dans le `Makefile` (`make help`).

## Version installable (Android, notifications push)

**Expo Go ne reçoit plus les notifications push sur Android depuis le SDK 53.** Pour les
essayer, il faut une version installable de l'application — un *build de développement* EAS.
Expo Go reste utilisable pour tout le reste (D-46) ; iOS n'est pas prévu pour l'instant
(D-67 : un compte Apple Developer coûte 99 $ par an).

Le projet est prêt : `expo-dev-client` et `expo-notifications` sont installés, le plugin de
notifications est déclaré dans `app.json`, et `mobile-app/eas.json` porte un profil
`development` qui produit un **APK** à installer directement (`distribution: internal`).

`npx eas …` échoue (« could not determine executable to run ») : le paquet s'appelle `eas-cli`.
Sans droit d'installation globale, écrire `npx eas-cli login`, `npx eas-cli init`, etc.

Il reste trois commandes, à lancer **par un humain** : elles demandent un compte Expo (gratuit),
et `eas init` écrit `extra.eas.projectId` dans `app.json` — l'identifiant du projet chez Expo,
que personne d'autre ne peut créer à votre place.

```bash
cd mobile-app
npm install -g eas-cli                                 # une fois : l'outil s'appelle eas-cli, pas eas
eas login                                              # compte Expo (gratuit)
eas init                                               # écrit extra.eas.projectId dans app.json
eas build --profile development --platform android     # ~15 min sur les serveurs d'Expo
```

Le build terminé, Expo affiche un lien et un QR code : ouvrez-le sur le téléphone, installez
l'APK (autoriser « installer des applications inconnues » pour le navigateur), puis lancez
`npm start` comme d'habitude — l'application installée remplace Expo Go et se connecte au même
serveur Metro.

Notes :
- `extra.eas.projectId` doit être **commité** : sans lui, `eas build` ne sait pas à quel projet
  rattacher la version.
- L'icône de notification Android n'est pas fournie : Android réduit l'icône à une silhouette
  blanche, ce qui demande une image monochrome dédiée. En attendant, c'est l'icône de
  l'application qui sert, avec la couleur d'accent jaune (`expo-notifications` dans `app.json`).
- Un build de développement ne contient pas votre code JavaScript : il charge celui de Metro.
  Après un changement de dépendance native (nouveau module Expo), il faut **refaire le build**.

## Onboarding d'une école

Pas d'écran ni de route d'administration en v1 (D-17) : chaque école est créée par script, avec sa grille tarifaire, un code d'inscription **instructeur** et un code **gérant** à une seule utilisation (D-57) à lui transmettre. Un instructeur s'inscrit ensuite dans l'app avec son code (`schoolCode` de `POST /api/auth/register`) ; le code gérant crée un instructeur qui est aussi le gérant de l'école (D-54 : il donne des leçons et a en plus les droits de D-56).

```bash
./scripts/onboard-school.sh "Auto-École Nord" "5 av. Habib Bourguiba, Sfax" "+21674000000" "contact@nord.tn"
# → INST-AUTOECOL-7K2Q    instructeurs
#   MGR-AUTOECOL-P4XA     gérant (une utilisation)
```

Options par variables d'environnement : `PRICE_CODE`, `PRICE_MANOEUVRE`, `PRICE_PARC` (défaut 20 / 35 / 40), `DURATION_MINUTES` (60), `CURRENCY` (code ISO 4217, défaut `TND` — D-43), `CODE_MAX_USES` (quota du code instructeur, illimité par défaut), `CODE_EXPIRES_AT` (expiration des deux codes, jamais par défaut), ex. `CODE_MAX_USES=5 CODE_EXPIRES_AT=2026-12-31 ./scripts/onboard-school.sh …`. Relancer le script avec le même email ne crée ni doublon ni second code : il réaffiche les codes actifs ; une école qui a déjà un gérant n'obtient pas de nouveau code gérant.

**Écoles déjà inscrites** (écoles pilotes) : l'administrateur désigne le gérant parmi les instructeurs existants, ou lui retire ce rôle :

```bash
./scripts/set-manager.sh moniteur@nord.tn        # on par défaut
./scripts/set-manager.sh moniteur@nord.tn off
```

Le script refuse un compte inconnu, un compte qui n'est pas instructeur et un instructeur sans fiche d'école.

## Documentation

| Fichier | Contenu |
|---|---|
| `CLAUDE.md` | Commandes réelles, conventions, règles de travail. Chargé automatiquement par Claude Code. |
| `docs/PLAN.md` | Plan d'exécution ordonné, en cases à cocher. **C'est la seule liste de tâches.** |
| `docs/API_CONTRACT.md` | Contrat des endpoints écran par écran, avec statut EXISTE / MANQUE / DIVERGE. **Seule source de vérité des routes.** |
| `docs/DECISIONS.md` | Décisions prises et questions produit ouvertes. |
| `docs/ARCHITECTURE.md` | État réel : application, modules, schéma de données, routage Nginx, incohérences connues. |
| `CHANGELOG.md` | Journal des tâches livrées. |

## Arborescence

```
services/api/       l'application (src/modules/{auth,school,student,lesson,exam,payment},
                    routes → controllers → services → repositories)
migrations/         SQL numéroté, appliqué dans l'ordre, jamais modifié après commit
scripts/            migrate.sh (migrations en attente), onboard-school.sh (école + tarifs + codes),
                    set-manager.sh (désigner le gérant d'une école existante)
nginx/              passerelle (:80 → api:3000)
mobile-app/         Expo (src/screens, src/services/api, src/config/api.config.ts)
web-frontend/       gelé
tests/              tests de bout en bout (jest + supertest contre la passerelle)
```
