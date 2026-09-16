# Driving School Platform

Plateforme de gestion d'auto-écoles : un élève demande à rejoindre une école, l'instructeur approuve, puis l'élève demande des leçons (`CODE`, `Manœuvre`, `Parc`) et des examens (théorie, pratique) que l'instructeur planifie, marque et encaisse.

- **Mobile** : Expo / React Native (`mobile-app/`) — le produit.
- **Backend** : Node 18 / TypeScript / Express (`services/`), PostgreSQL 15, Redis 7, Nginx en façade sur `:80`.
- **Web** : squelette Vite (`web-frontend/`), gelé pour la v1.

État : le mobile et le backend implémentent deux modèles de domaine différents ; le backend est en cours d'alignement sur le mobile. Le détail est dans `docs/`.

## Lancer en local

Prérequis : Docker Desktop, Node 18+, Expo Go sur un téléphone connecté au **même Wi-Fi** que la machine.

```bash
# 1. Backend complet (Postgres, Redis, services, Nginx). Les migrations s'appliquent
#    automatiquement à la première création du volume Postgres.
cp .env.example .env          # puis remplacer les valeurs "change-this-*"
docker compose up -d --build
docker compose ps             # attendre que tout soit "healthy"
curl http://localhost/health  # → healthy
curl http://localhost/api/schools

# 2. Mobile
cd mobile-app
npm install
# Renseigner l'IP de la machine dans app.json → expo.extra.API_BASE_URL (ex. http://192.168.1.20:80)
npm start                     # scanner le QR code avec Expo Go
```

Compte admin seedé par la migration initiale : `admin@drivingschool.com` / `admin123`.

Repartir d'une base vierge : `docker compose down -v && docker compose up -d`.

Toutes les autres commandes (un service à la fois, typecheck, lint, tests, migrations manuelles) sont dans `CLAUDE.md`.

## Documentation

| Fichier | Contenu |
|---|---|
| `CLAUDE.md` | Commandes réelles, conventions, règles de travail. Chargé automatiquement par Claude Code. |
| `docs/PLAN.md` | Plan d'exécution ordonné, en cases à cocher. **C'est la seule liste de tâches.** |
| `docs/API_CONTRACT.md` | Contrat des endpoints écran par écran, avec statut EXISTE / MANQUE / DIVERGE. **Seule source de vérité des routes.** |
| `docs/DECISIONS.md` | Décisions prises et questions produit ouvertes. |
| `docs/ARCHITECTURE.md` | État réel : services et ports, schéma de données, routage Nginx, incohérences connues. |
| `CHANGELOG.md` | Journal des tâches livrées. |

## Arborescence

```
services/<nom>/     un service Express par domaine (auth, school, student, lesson, exam,
                    payment, notification, analytics) — fusion prévue en Phase 2 du plan
migrations/         SQL numéroté, appliqué dans l'ordre, jamais modifié après commit
nginx/              gateway
mobile-app/         Expo (src/screens, src/services/api, src/config/api.config.ts)
web-frontend/       gelé
tests/              tests de bout en bout (harnais à créer, Phase 1)
scripts/            helpers Docker
```
