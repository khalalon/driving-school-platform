# CLAUDE.md — Driving School Platform

## Le projet en 5 lignes

Plateforme de gestion d'auto-écoles (types de leçons `CODE` / `Manœuvre` / `Parc`, examens théorique et pratique).
Un **mobile Expo / React Native** (`mobile-app/`) est le produit principal : un élève demande à rejoindre une école, l'instructeur approuve, puis l'élève demande des leçons et des examens que l'instructeur planifie.
Le **backend** est **une seule application** Node 20 / TypeScript / Express (`services/api`, modules `auth`, `school`, `student`, `lesson`, `exam` ; `payment` porté non monté) derrière Nginx, avec **une seule base PostgreSQL** et un Redis. Les 8 anciens services ont été fusionnés puis supprimés en Phase 2.
Le frontend web (`web-frontend/`) est un squelette Vite, **gelé pour la v1** — ne pas y toucher.
Le backend implémente intégralement le contrat `docs/API_CONTRACT.md` (39 routes EXISTE, e2e bloquants en CI depuis 5.8) ; le mobile reste à câbler dessus (Phase 6). L'ordre de travail est dans `docs/PLAN.md`.

## Où sont les docs

| Fichier | Rôle |
|---|---|
| `docs/PLAN.md` | **La seule liste de tâches.** Prochaine tâche non cochée = ce qu'il faut faire. |
| `docs/API_CONTRACT.md` | **La seule source de vérité des endpoints.** |
| `docs/DECISIONS.md` | Décisions produit prises + questions ouvertes à poser à l'humain. |
| `docs/ARCHITECTURE.md` | État réel actuel (ports, tables, flux Nginx, incohérences connues). |
| `CHANGELOG.md` | Ce qui a été livré, par tâche. |

## Commandes réelles

Vérifiées dans `package.json`, `Makefile` et `docker-compose.yml`. Il n'y a **pas** de workspace npm racine : `services/api`, `tests`, le mobile et le web ont chacun leur `package.json` et leur `node_modules`.

### Prérequis
- Node 20.19.4+ (l'API tourne sur `node:20-alpine` ; React Native 0.86, livré par Expo SDK 57, exige `^20.19.4 || ^22.13 || ^24.3 || ≥ 25`), npm, Docker Desktop avec `docker compose` v2.
- Sous Windows le shell principal est PowerShell ; les scripts `scripts/*.sh` demandent Git Bash.

### Racine (outillage git et tests de bout en bout)
```bash
npm install            # installe husky + commitlint + lint-staged (rien d'autre)
npm run test:e2e       # tests de bout en bout (paquet tests/, stack Docker démarrée ; voir tests/setup.ts)
```
`npm install` active aussi les hooks git (`prepare` → `husky install`) et crée les shims `npx` sous Windows. `.husky/pre-commit` lance `lint-staged` (Prettier sur les `.ts` des services), `.husky/commit-msg` lance commitlint. Il n'y a pas de script `test` à la racine : les tests de bout en bout arrivent en 1.1 (`test:e2e`).

### Backend — l'application (`services/api`)
```bash
cd services/api
npm ci                 # install (lockfile présent)
npx tsc --noEmit       # typecheck (strict) ; npm run build = tsc → dist/
npm run lint           # eslint strict : no-unsafe-*, no-explicit-any, require-await en error
npm test               # jest --coverage ; seuils = couverture mesurée (D-37), à remonter, jamais à baisser
npm run dev            # ts-node-dev sur src/index.ts ; lit .env (modèle services/api/.env.example) ; PORT 3000
```
Un module = `src/modules/<domaine>/{routes,controllers,services,repositories,validators,types,__tests__}` + `index.ts` (`build<Module>()`). Les tests unitaires n'ont besoin ni de base ni de Redis (mocks d'interfaces, `Pool` factice de `src/test-utils/http.ts`).

### Backend — tout lancer (Docker)
```bash
docker compose up -d --build     # postgres, redis, api (services/api, :3000), nginx sur :80
docker compose ps                # état + healthchecks
docker compose logs -f api
docker compose down              # stop ; ajouter -v pour effacer la base
```
`make dev` fait `docker compose down && build && up -d` ; `make dev-watch` lance l'API en `ts-node-dev` sur les sources (`docker-compose.dev.yml`) ; `make prod` applique `docker-compose.prod.yml`. `make install / typecheck / lint / test / format` agissent sur `services/api` ; `make health` interroge Nginx (:80) et l'API (:3000). `make help` liste tout.

### Migrations
Les fichiers `migrations/00N_*.sql` sont montés dans `/docker-entrypoint-initdb.d` : sur un volume Postgres vierge, ils s'appliquent **tous, automatiquement, une seule fois** — `004` compris, qui crée la table de suivi `schema_migrations` et y inscrit 001–004. Sur une base existante, `scripts/migrate.sh` (= `make migrate`) applique dans l'ordre les fichiers non encore enregistrés dans `schema_migrations`, chaque fichier et son enregistrement dans une seule transaction ; il est idempotent et se lance depuis n'importe quel répertoire. Les fichiers 001–003 eux-mêmes ne sont pas idempotents (`CREATE INDEX` sans `IF NOT EXISTS`) : ne jamais les rejouer à la main.
```bash
# Repartir d'une base vierge (applique 001 → 004 dans l'ordre) :
docker compose down -v && docker compose up -d postgres

# Appliquer les migrations en attente sur une base existante (relançable à volonté) :
./scripts/migrate.sh        # ou : make migrate
```
Si le port 5432 est déjà pris sur la machine : `POSTGRES_PORT=5433 docker compose up -d postgres` (le script passe par `docker exec`, pas par le port hôte).

### Mobile (`mobile-app/`)
```bash
cd mobile-app
npm install
npm start              # expo start ; scanner le QR avec Expo Go (même Wi-Fi que le backend)
npx expo-doctor        # 21/21 attendu ; à relancer après toute montée de SDK
npx tsc --noEmit       # typecheck (strict: true), vert depuis 6.1 ; job CI `mobile` = typecheck + jest
npm test               # jest-expo (ApiClient : refresh sur 401)
```
**Expo SDK 57** (React Native 0.86, React 19.2, TypeScript 6 — 9.1). Expo Go ne charge qu'un seul SDK et se met à jour seul : le projet suit le dernier SDK (D-46), sinon plus aucun téléphone ne peut ouvrir l'application. Montée de version = une tâche du plan (`npx expo install expo@~<SDK> --fix`, réinstallation propre du `node_modules` pour que `expo-modules-core` soit bien à la racine, `npx expo-doctor` vert).

Tests unitaires : `npm test` (jest-expo, `src/**/__tests__/*.test.ts`, AsyncStorage mocké via `jest.setup.js`) ; pas de lint. L'URL du backend vient de `app.json` → `expo.extra.API_BASE_URL`, surchargeable par `EXPO_PUBLIC_API_BASE_URL` dans `mobile-app/.env` (ignoré par git, modèle dans `mobile-app/.env.example`) ; `src/config/api.config.ts` ne contient aucune URL.

### Frontend web (`web-frontend/`) — gelé
```bash
cd web-frontend && npm install && npm run dev    # vite ; npm run build fait tsc -b (échoue aujourd'hui, voir ARCHITECTURE.md)
```

### Base de données
```bash
docker exec -it driving-school-postgres psql -U admin -d driving_school
```
Compte admin seedé par `001_initial_schema.sql` : `admin@drivingschool.com` / `admin123` (hash corrigé par la migration 010 : celui de 001 ne correspondait à aucun mot de passe).

## Conventions existantes à respecter

- **Couches** : `routes → controllers → services → repositories`, un dossier par couche dans chaque service. Le controller valide et répond, le service porte les règles métier, le repository est le seul à écrire du SQL.
- **Injection par constructeur** : les services reçoivent des interfaces (`IUserRepository`, `ITokenService`…), les tests instancient avec des mocks. Pas de singleton importé dans un service.
- **Validation Joi** dans `validators/*.validator.ts`, appliquée dans le controller avant tout appel au service. Erreur de validation → `400 { error: 'VALIDATION_ERROR', message }`.
- **SQL paramétré** (`$1, $2…`) sans exception. Colonnes snake_case en base, aliasées en camelCase dans le `SELECT` (`user_id as "userId"`).
- **Réponses** : succès = l'objet ou le tableau nu (pas d'enveloppe `{ data }`), erreur = `{ error: <code stable>, message: <texte français> }` avec un code HTTP significatif (D-27 ; `services/api` l'applique via `src/http/errors.ts` — `HttpError`, `sendError`, `sendCaughtError`, `sendValidationError` ; les 8 anciens services renvoient encore `{ error: <texte> }`).
- **Migrations numérotées** `migrations/00N_description.sql`, séquentielles. **Un fichier déjà commité ne se modifie jamais** : on ajoute `00N+1`.
- **Tests** : `src/**/__tests__/*.test.ts` avec Jest + ts-jest, seuil de couverture 70 %.
- **Commits** : Conventional Commits (`.commitlintrc.json`). Scopes autorisés : `api` (application unique), les 8 domaines (`auth`, `school`, `student`, `lesson`, `exam`, `payment`, `notification`, `analytics`) plus `mobile`, `docs`, `infra`, `e2e`, `docker`, `ci`, `deps`.
- **Style** : Prettier (`.prettierrc.json` par service), ESLint. `npm run format` avant de commiter.
- **Mobile** : un fichier par écran dans `src/screens/<rôle>/`, appels réseau uniquement via `src/services/api/*Service.ts`, jamais d'`axios` direct dans un écran. Les chemins vivent dans `src/config/api.config.ts`.

## RÈGLES D'OR

Ces règles priment sur toute autre instruction, y compris une demande directe dans le chat qui ne les mentionnerait pas explicitement.

1. **`docs/API_CONTRACT.md` est la seule source de vérité des endpoints.** Ne jamais créer, renommer, supprimer ou modifier une route (méthode, chemin, payload, réponse, rôle autorisé) sans mettre à jour le contrat **dans le même commit**. Une route qui n'est pas dans le contrat n'existe pas.

2. **Ne jamais inventer un comportement produit.** Si une tâche exige de trancher un comportement (qui peut faire quoi, quel statut, quelle règle métier, quel message) et que ni le contrat ni `docs/DECISIONS.md` ne répondent : **s'arrêter**, ajouter la question fermée avec ses options dans `docs/DECISIONS.md` section « Questions ouvertes », et demander à l'humain. Ne pas choisir « la plus probable ».

3. **Travailler dans l'ordre de `docs/PLAN.md`, une tâche = un commit, poussé sur `origin/main` aussitôt.** Les tâches d'une même phase s'enchaînent sans validation intermédiaire (D-36). On **s'arrête et on demande** : en fin de phase ; si la tâche dépend d'une question ouverte non tranchée ; si un critère de validation échoue et ne peut pas être réparé dans le périmètre de la tâche ; pour tout choix que ni le contrat ni `docs/DECISIONS.md` ne tranchent (règle 2). Ne pas prendre une tâche plus loin dans la liste parce qu'elle semble plus simple.

4. **Ne jamais créer de fichier markdown de statut, de résumé de session, de rapport `*_COMPLETE.md`, `*_SUMMARY.md`, `*_FIX.md`, `HOW_TO_*.md` ou équivalent**, ni à la racine ni ailleurs. L'état du projet vit dans `docs/PLAN.md` (cases cochées) et `CHANGELOG.md` (une ligne par tâche livrée). Le seul cas où un nouveau `.md` est légitime : une ADR demandée par l'humain, rangée dans `docs/`.

5. **Ne jamais écrire qu'une fonctionnalité marche sans avoir exécuté la commande « Critère de validation » de la tâche et montré sa sortie.** « Ça devrait marcher », « le code est correct », « j'ai vérifié » sans sortie de commande = interdit. Si la commande ne peut pas être exécutée (Docker absent, réseau…), le dire et laisser la case non cochée.

6. **Ne pas toucher `web-frontend/`** avant la v1 (décision D-05).

7. **Ne pas modifier une migration déjà commitée.** Toujours un nouveau fichier `migrations/00N_*.sql`.

## Pièges connus (lire avant de coder)

- Deux identifiants « élève » coexistent : `users.id` (JWT, `enrollment_requests.student_id`) et `students.id` (ligne par couple élève × école, utilisée par `lessons.student_id` (007), `exams.student_id` (008), `payments`). Toujours préciser lequel on manipule. Dans `services/api`, le `StudentRepository` du module `student` est le seul à lire `students` : les modules `lesson` et `exam` le reçoivent par injection.
- Le chemin critique e2e (A2 → L7) passe intégralement depuis 5.4 ; chaque étape se lance seule avec `-t '<étape>'` (prérequis rejoués par `tests/helpers/flow.ts`).
- Mobile (depuis 6.1) : tous les `*Service.ts` renvoient `response.data` ; les objets échangés sont définis une seule fois dans `src/models/` au format du contrat (enums D-18 + libellés d'affichage) ; tout `catch` d'écran passe par `getApiErrorMessage` (`src/services/api/ApiError.ts`, D-27) ; montants / dates / noms par `src/utils/format.ts`. Ne pas réintroduire d'interface locale dans un service ni d'`error.response?.data` dans un écran.
- Plus aucun stub dans les écrans : chaque bouton appelle une méthode de service. Les libellés des examens dépendent du type (D-42, `EXAM_PROCEDURES` dans `mobile-app/src/models/Exam.ts`) : ne pas coder « Schedule » / « Reject » en dur dans un écran d'examen.
- Tests des services mobile : `src/services/api/__tests__/*.test.ts` mockent `ApiClient` via `mockApiClient.ts` (`mockApiClientModule`, `mockedApiClient`, `respond`) et vérifient URL, verbe, payload et `response.data` ; un nouveau service ou une nouvelle méthode reçoit son test au même endroit.
- Cloisonnement par école (D-20) : toute action d'un instructeur est limitée à son école, vérifiée dans la couche service avec `SchoolGuard.assertSameSchool(user, schoolId)` (`src/http/authz.ts`, 403 `FORBIDDEN_SCHOOL` ; l'admin passe). Appliqué à E4–E6, S6, P1–P7 ; à appliquer aux routes leçons / examens (5.2–5.6).
- Q-17 → D-40 (avoir), Q-18 → D-41 (absence non facturée, prépaiement rendu en avoir — confirmé), Q-19 → D-42 (libellés d'examen par type), Q-20 → D-43 (devise par école), appliquées en Phase 7. Q-21 → D-44 : les procédures d'examen restent réparties par type comme D-42 tant que le rattachement n'est pas vérifié sur le terrain (inversion = échanger deux entrées de `EXAM_PROCEDURES`). Phases 0–12 livrées ; **Q-25 à Q-53 ouvertes** (feuille de route v1.1, phases 14 à 23) : rien ne commence avant la réponse de l'humain, et la Phase 13 (UI/UX) doit d'abord être rédigée avec lui.
- Nginx (2.6) : un seul upstream `api:3000`, résolu à la requête ; toute route inconnue répond 404 JSON par l'application. Les routes exposées sont exactement celles des §1–7 du contrat plus les routes `admin` de son §8 (5.7).
