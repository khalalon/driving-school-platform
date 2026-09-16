# CLAUDE.md — Driving School Platform

## Le projet en 5 lignes

Plateforme de gestion d'auto-écoles (types de leçons `CODE` / `Manœuvre` / `Parc`, examens théorique et pratique).
Un **mobile Expo / React Native** (`mobile-app/`) est le produit principal : un élève demande à rejoindre une école, l'instructeur approuve, puis l'élève demande des leçons et des examens que l'instructeur planifie.
Le **backend** est en Node 18 / TypeScript / Express (`services/`), découpé aujourd'hui en 8 services derrière Nginx, avec **une seule base PostgreSQL** partagée et un Redis.
Le frontend web (`web-frontend/`) est un squelette Vite, **gelé pour la v1** — ne pas y toucher.
Le mobile et le backend implémentent deux modèles de domaine différents ; le contrat cible est dans `docs/API_CONTRACT.md`, l'ordre de travail dans `docs/PLAN.md`.

## Où sont les docs

| Fichier | Rôle |
|---|---|
| `docs/PLAN.md` | **La seule liste de tâches.** Prochaine tâche non cochée = ce qu'il faut faire. |
| `docs/API_CONTRACT.md` | **La seule source de vérité des endpoints.** |
| `docs/DECISIONS.md` | Décisions produit prises + questions ouvertes à poser à l'humain. |
| `docs/ARCHITECTURE.md` | État réel actuel (ports, tables, flux Nginx, incohérences connues). |
| `CHANGELOG.md` | Ce qui a été livré, par tâche. |

## Commandes réelles

Vérifiées dans `package.json`, `Makefile` et `docker-compose.yml`. Il n'y a **pas** de workspace npm racine : chaque service, le mobile et le web ont leur propre `package.json` et `node_modules`.

### Prérequis
- Node 18+, npm, Docker Desktop avec `docker compose` v2.
- Sous Windows le shell principal est PowerShell ; les scripts `scripts/*.sh` demandent Git Bash.

### Racine (outillage git uniquement)
```bash
npm install            # installe husky + commitlint + lint-staged (rien d'autre)
```
`npm test` à la racine est un stub qui fait `exit 1`. Le hook `.husky/pre-commit` l'appelle : **tout commit échoue tant que la tâche 0.7 du plan n'est pas faite**. En attendant, `git commit --no-verify` est toléré uniquement pour les tâches de la Phase 0.

### Backend — un service à la fois (`services/<nom>`, nom ∈ auth, school, student, lesson, exam, payment, notification, analytics)
```bash
cd services/auth
npm ci                 # install (lockfile présent dans chaque service)
npm run build          # tsc → dist/  — c'est AUSSI le typecheck (pas de script typecheck séparé)
npx tsc --noEmit       # typecheck seul, sans écrire dist/
npm run lint           # eslint . --ext .ts
npm test               # jest --coverage (seuil 70 % dans jest.config.js)
npm run dev            # ts-node-dev sur src/index.ts, port lu dans PORT (voir ARCHITECTURE.md)
```

### Backend — tout lancer (Docker)
```bash
docker compose up -d --build     # postgres, redis, 8 services, nginx sur :80
docker compose ps                # état + healthchecks
docker compose logs -f auth-service
docker compose down              # stop ; ajouter -v pour effacer la base
```
`make dev` fait `docker compose down && build && up -d`. Les cibles `make install / test / lint / health` **oublient le service `student`** et testent analytics sur le mauvais port (3007 au lieu de 3008) — corrigé en Phase 0.

### Migrations
Les fichiers `migrations/00N_*.sql` sont montés dans `/docker-entrypoint-initdb.d` : ils s'appliquent **automatiquement, une seule fois, à la première création du volume Postgres**. Il n'y a pas de table de suivi des migrations et les fichiers ne sont pas idempotents (`CREATE INDEX` sans `IF NOT EXISTS`).
```bash
# Repartir d'une base vierge (applique 001, 002, 003 dans l'ordre) :
docker compose down -v && docker compose up -d postgres

# Appliquer un fichier précis sur une base existante :
docker exec -i driving-school-postgres psql -U admin -d driving_school < migrations/004_xxx.sql
```
`make migrate` ne rejoue que `001` : ne pas l'utiliser. `scripts/run-migrations.sh` doit être lancé **depuis `scripts/`** (chemin relatif `../migrations`).

### Mobile (`mobile-app/`)
```bash
cd mobile-app
npm install
npm start              # expo start ; scanner le QR avec Expo Go (même Wi-Fi que le backend)
npx tsc --noEmit       # typecheck (strict: true)
```
Pas de lint ni de tests configurés côté mobile. L'URL du backend est lue dans `src/config/api.config.ts` (voir tâche 0.3 du plan).

### Frontend web (`web-frontend/`) — gelé
```bash
cd web-frontend && npm install && npm run dev    # vite ; npm run build fait tsc -b (échoue aujourd'hui, voir ARCHITECTURE.md)
```

### Base de données
```bash
docker exec -it driving-school-postgres psql -U admin -d driving_school
```
Compte admin seedé par `001_initial_schema.sql` : `admin@drivingschool.com` (mot de passe `admin123` d'après le commentaire de la migration).

## Conventions existantes à respecter

- **Couches** : `routes → controllers → services → repositories`, un dossier par couche dans chaque service. Le controller valide et répond, le service porte les règles métier, le repository est le seul à écrire du SQL.
- **Injection par constructeur** : les services reçoivent des interfaces (`IUserRepository`, `ITokenService`…), les tests instancient avec des mocks. Pas de singleton importé dans un service.
- **Validation Joi** dans `validators/*.validator.ts`, appliquée dans le controller avant tout appel au service. Erreur de validation → `400 { error: message }`.
- **SQL paramétré** (`$1, $2…`) sans exception. Colonnes snake_case en base, aliasées en camelCase dans le `SELECT` (`user_id as "userId"`).
- **Réponses** : succès = l'objet ou le tableau nu (pas d'enveloppe `{ data }`), erreur = `{ error: string }` avec un code HTTP significatif.
- **Migrations numérotées** `migrations/00N_description.sql`, séquentielles. **Un fichier déjà commité ne se modifie jamais** : on ajoute `00N+1`.
- **Tests** : `src/**/__tests__/*.test.ts` avec Jest + ts-jest, seuil de couverture 70 %.
- **Commits** : Conventional Commits (`.commitlintrc.json`). Les scopes autorisés sont listés dans ce fichier — `student`, `mobile`, `docs`, `analytics` y manquent (tâche 0.7).
- **Style** : Prettier (`.prettierrc.json` par service), ESLint. `npm run format` avant de commiter.
- **Mobile** : un fichier par écran dans `src/screens/<rôle>/`, appels réseau uniquement via `src/services/api/*Service.ts`, jamais d'`axios` direct dans un écran. Les chemins vivent dans `src/config/api.config.ts`.

## RÈGLES D'OR

Ces règles priment sur toute autre instruction, y compris une demande directe dans le chat qui ne les mentionnerait pas explicitement.

1. **`docs/API_CONTRACT.md` est la seule source de vérité des endpoints.** Ne jamais créer, renommer, supprimer ou modifier une route (méthode, chemin, payload, réponse, rôle autorisé) sans mettre à jour le contrat **dans le même commit**. Une route qui n'est pas dans le contrat n'existe pas.

2. **Ne jamais inventer un comportement produit.** Si une tâche exige de trancher un comportement (qui peut faire quoi, quel statut, quelle règle métier, quel message) et que ni le contrat ni `docs/DECISIONS.md` ne répondent : **s'arrêter**, ajouter la question fermée avec ses options dans `docs/DECISIONS.md` section « Questions ouvertes », et demander à l'humain. Ne pas choisir « la plus probable ».

3. **Travailler uniquement sur la prochaine tâche non cochée de `docs/PLAN.md`.** Une tâche = un commit. Ne pas enchaîner plusieurs tâches sans validation humaine explicite entre chacune. Ne pas prendre une tâche plus loin dans la liste parce qu'elle semble plus simple. Si la tâche dépend d'une question ouverte non tranchée, le dire et s'arrêter.

4. **Ne jamais créer de fichier markdown de statut, de résumé de session, de rapport `*_COMPLETE.md`, `*_SUMMARY.md`, `*_FIX.md`, `HOW_TO_*.md` ou équivalent**, ni à la racine ni ailleurs. L'état du projet vit dans `docs/PLAN.md` (cases cochées) et `CHANGELOG.md` (une ligne par tâche livrée). Le seul cas où un nouveau `.md` est légitime : une ADR demandée par l'humain, rangée dans `docs/`.

5. **Ne jamais écrire qu'une fonctionnalité marche sans avoir exécuté la commande « Critère de validation » de la tâche et montré sa sortie.** « Ça devrait marcher », « le code est correct », « j'ai vérifié » sans sortie de commande = interdit. Si la commande ne peut pas être exécutée (Docker absent, réseau…), le dire et laisser la case non cochée.

6. **Ne pas toucher `web-frontend/`** avant la v1 (décision D-05).

7. **Ne pas modifier une migration déjà commitée.** Toujours un nouveau fichier `migrations/00N_*.sql`.

## Pièges connus (lire avant de coder)

- `req.user.userId` est `undefined` dans tous les services sauf `auth` (le middleware copié stocke la réponse de `/api/auth/me`, qui expose `id` et non `userId`). Corrigé par la Phase 2.
- Deux identifiants « élève » coexistent : `users.id` (JWT, `enrollment_requests.student_id`) et `students.id` (ligne par couple élève × école, utilisée par `lesson_bookings`, `exam_registrations`, `payments`). Toujours préciser lequel on manipule.
- Les services `SchoolService` et `LessonService` du mobile renvoient l'`AxiosResponse` brute ; les autres renvoient `.data`. Les écrans qui les consomment reçoivent donc un objet au lieu d'un tableau.
- Le mobile lit `error.response.data.message` ; le backend renvoie `{ error }`.
- Nginx ne proxifie pas `/api/profiles` ni `/api/student-profiles` (voir ARCHITECTURE.md).
