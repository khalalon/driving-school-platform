# Driving School Platform

Plateforme de gestion d'auto-écoles : un élève demande à rejoindre une école, l'instructeur approuve, puis l'élève demande des leçons (`CODE`, `Manœuvre`, `Parc`) et des examens (théorie, pratique) que l'instructeur planifie, marque et encaisse.

- **Mobile** : Expo / React Native (`mobile-app/`) — le produit.
- **Backend** : une application Node 20 / TypeScript / Express (`services/api/`), PostgreSQL 15, Redis 7, Nginx en façade sur `:80`.
- **Web** : squelette Vite (`web-frontend/`), gelé pour la v1.

État : le mobile et le backend implémentent encore deux modèles de domaine différents ; le backend est en cours d'alignement sur le mobile (Phases 3 à 5 de `docs/PLAN.md`). Le détail est dans `docs/`.

## Lancer en local

Prérequis : Docker Desktop, Node 20+, Expo Go sur un téléphone connecté au **même Wi-Fi** que la machine (ou l'émulateur Android).

```bash
# 1. Backend (Postgres, Redis, API, Nginx). Les migrations s'appliquent automatiquement à la
#    première création du volume Postgres ; ensuite : ./scripts/migrate.sh (= make migrate).
cp .env.example .env          # puis remplacer les valeurs "change-this-*" ; POSTGRES_PORT=5433 si 5432 est pris
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

## Onboarding d'une école

Pas d'écran ni de route d'administration en v1 (D-17) : chaque école est créée par script, avec sa grille tarifaire et un code d'inscription instructeur à lui transmettre. Un instructeur s'inscrit ensuite dans l'app avec ce code (`schoolCode` de `POST /api/auth/register`).

```bash
./scripts/onboard-school.sh "Auto-École Nord" "5 av. Habib Bourguiba, Sfax" "+21674000000" "contact@nord.tn"
# → affiche le code, ex. INST-AUTOECOL-7K2Q
```

Options par variables d'environnement : `PRICE_CODE`, `PRICE_MANOEUVRE`, `PRICE_PARC` (défaut 20 / 35 / 40), `DURATION_MINUTES` (60), `CODE_MAX_USES` (illimité), `CODE_EXPIRES_AT` (jamais), ex. `CODE_MAX_USES=5 CODE_EXPIRES_AT=2026-12-31 ./scripts/onboard-school.sh …`. Relancer le script avec le même email ne crée ni doublon ni second code : il réaffiche le code actif.

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
scripts/            migrate.sh (migrations en attente), onboard-school.sh (école + tarifs + code)
nginx/              passerelle (:80 → api:3000)
mobile-app/         Expo (src/screens, src/services/api, src/config/api.config.ts)
web-frontend/       gelé
tests/              tests de bout en bout (jest + supertest contre la passerelle)
```
