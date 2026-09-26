# Plan d'exécution

Règles de lecture (voir `CLAUDE.md`, règles d'or 3 et 5) :
- On travaille dans l'ordre, sur la première tâche non cochée. Une tâche = un commit (message Conventional Commits, scope = domaine ou `infra` / `mobile` / `docs` / `e2e`), poussé sur `origin/main` aussitôt. Les tâches d'une même phase s'enchaînent sans validation intermédiaire ; arrêt obligatoire en fin de phase, sur question ouverte non tranchée, sur échec de critère non réparable dans la tâche, ou sur choix produit non tranché (D-36, 18/09/2026).
- Une tâche est cochée **seulement** quand sa commande « Critère de validation » a été exécutée et que sa sortie a été montrée. Pas d'exception.
- Si une tâche indique « Dépend de : Q-xx » et que la question n'est pas tranchée dans `DECISIONS.md`, on **s'arrête** et on demande. Au 23/09/2026 aucune question n'est ouverte : Q-17 à Q-21 → D-40 à D-44 (Phase 7 ; D-44 = statu quo de D-42, sans tâche) ; la Phase 8 applique D-45 (accueils « wow »), la Phase 9 D-46 (Expo SDK 57), la Phase 10 D-47 (français et arabe), la Phase 11 D-48 (design system et thèmes).
- Chaque tâche livrée ajoute une ligne dans `CHANGELOG.md` et, si elle touche une route, met à jour `docs/API_CONTRACT.md` dans le même commit.
- Les commandes sont écrites pour Git Bash (Windows) ou un shell POSIX, depuis la racine du dépôt sauf `cd` explicite.

Le frontend web (`web-frontend/`) n'apparaît dans aucune phase (D-05).

---

## Phase 0 — Hygiène

### - [x] 0.1 — Réparer l'outillage avant tout : migrations, `make`, `npm test`, hooks
**Objectif** : tant que cette tâche n'est pas faite, aucune commande de validation du plan ne prouve quoi que ce soit. (1) Un lanceur `scripts/migrate.sh` applique dans l'ordre **toutes** les migrations non encore appliquées, via une table `schema_migrations` créée par `migrations/004_schema_migrations.sql` (qui y inscrit 001–003 comme appliquées) ; idempotent ; `make migrate` l'appelle. (2) Les cibles `make install / test / lint / health` incluent `student` et interrogent `analytics` sur 3008. (3) `npm test` racine ne sort plus en 1 (pointe vers `tests/`, créé en 1.1, ou est retiré) ; `.husky/pre-commit` ne l'appelle plus. (4) `.commitlintrc.json` accepte les scopes `student`, `analytics`, `mobile`, `docs`, `infra`, `e2e`. Les fichiers 001–003 ne sont **pas** modifiés.
**Fichiers** : `migrations/004_schema_migrations.sql`, `scripts/migrate.sh` (nouveau), suppression de `scripts/run-migrations.sh`, `Makefile`, `package.json` racine, `.husky/pre-commit`, `.commitlintrc.json`.
**Critère de validation** :
```bash
docker compose down -v && docker compose up -d postgres && sleep 12 && ./scripts/migrate.sh && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -tAc "SELECT count(*) FROM schema_migrations" | grep -x 4 && test "$(grep -c 'services/student' Makefile)" -ge 4 && grep -q 'localhost:3008/health' Makefile && echo "chore(student): verify hooks" | npx commitlint && git commit --allow-empty -m "chore(infra): verify hooks" && git reset --soft HEAD~1 && echo OK
```
**Hors périmètre** : aucun changement de schéma métier ; ne pas réécrire le Makefile pour l'app unique (2.7).

### - [x] 0.2 — `.gitignore` racine et sortie de `node_modules` de l'index
**Objectif** : que `git ls-files` ne contienne plus aucun fichier de dépendances ni d'artefact de build.
**Fichiers** : `.gitignore` (nouveau, racine : `node_modules/`, `dist/`, `coverage/`, `.env`, `.env.*.local`, `.DS_Store`, `*.log`, `.expo/`), index git (`git rm -r --cached node_modules services/student/node_modules`).
**Critère de validation** :
```bash
test "$(git ls-files | grep -c 'node_modules/')" -eq 0 && test "$(git ls-files | wc -l)" -lt 600 && echo "OK: $(git ls-files | wc -l) fichiers suivis"
```
**Hors périmètre** : ne pas supprimer les dossiers `node_modules` du disque.

### - [x] 0.3 — Sortie des `.env` de l'index, `.env.example` partout
**Objectif** : aucun secret suivi ; chaque emplacement qui lit un `.env` a un `.env.example` à jour.
**Fichiers** : index git (`git rm --cached .env mobile-app/.env web-frontend/.env`), `mobile-app/.env.example` (nouveau), `web-frontend/.env.example` (nouveau), `.env.example` racine (couvre toutes les variables lues par `docker-compose.yml`).
**Critère de validation** :
```bash
test "$(git ls-files | grep -cE '(^|/)\.env$')" -eq 0 && ls .env.example mobile-app/.env.example web-frontend/.env.example && echo OK
```
**Hors périmètre** : ne pas changer les valeurs ; ne pas purger l'historique git.

### - [x] 0.4 — Une seule source pour l'URL du backend côté mobile
**Objectif** : l'URL de base est lue depuis `app.json` → `expo.extra.API_BASE_URL` (surchargeable par `EXPO_PUBLIC_API_BASE_URL`), plus aucune IP codée en dur, et le `.env` racine ne porte plus de variable mobile.
**Fichiers** : `mobile-app/src/config/api.config.ts`, `mobile-app/app.json`, `mobile-app/.env.example`, `.env.example` racine, `mobile-app/src/types/env.d.ts`.
**Critère de validation** :
```bash
! grep -nE '192\.168|http://' mobile-app/src/config/api.config.ts && ! grep -q API_BASE_URL .env.example && grep -q '"API_BASE_URL"' mobile-app/app.json && echo OK
```
**Hors périmètre** : ne pas modifier les chemins d'endpoints (6.1).

### - [x] 0.5 — Suppression du fallback qui masque les erreurs TypeScript dans `services/auth/Dockerfile`
**Objectif** : une erreur `tsc` fait échouer le build de l'image. Le fallback masquait 3 erreurs de type réelles dans `auth` (`expiresIn` typé `string` dans `token.service.ts`, générique `RedisClientType` dans `redis.config.ts`) : corrigées ici, type-only, pour que le critère puisse passer (décision du 17/09, plutôt que d'inverser 0.5 et 0.6).
**Fichiers** : `services/auth/Dockerfile`, `services/auth/src/services/token.service.ts`, `services/auth/src/config/redis.config.ts`.
**Critère de validation** :
```bash
! grep -q 'mkdir -p dist' services/auth/Dockerfile && docker compose build auth-service && echo OK
```
**Hors périmètre** : les autres Dockerfiles (déjà corrects).

### - [x] 0.6 — Typecheck vert sur les 8 services, en local
**Objectif** : `npx tsc --noEmit` passe dans chaque service ; corrections de types uniquement, sans changement de comportement.
**Fichiers** : `services/*/src/**`, `services/*/tsconfig.json` si nécessaire, `services/analytics/package.json` (retrait du script `prepare` qui, à chaque `npm ci` dans analytics, pointait `core.hooksPath` vers `services/analytics/.husky`, vide : hooks racine désactivés — constaté en exécutant le critère, 17/09).
**Critère de validation** :
```bash
for s in auth school student lesson exam payment notification analytics; do (cd services/$s && npm ci --silent && npx tsc --noEmit) || { echo "FAIL $s"; exit 1; }; done; echo "OK 8/8"
```
**Hors périmètre** : bugs fonctionnels découverts au passage (les ajouter au plan).

### - [x] 0.7 — Le CI échoue sur erreur de typecheck et couvre les 8 services
**Objectif** : chaque job exécute `npx tsc --noEmit` avant `npm test` ; `student` et `analytics` ont leur job ; `detect-changes` connaît les 8 dossiers.
**Fichiers** : `.github/workflows/ci-cd.yml`, `.github/workflows/pr-check.yml`.
**Critère de validation** :
```bash
test "$(grep -c 'tsc --noEmit' .github/workflows/ci-cd.yml)" -ge 8 && grep -q 'services/student' .github/workflows/ci-cd.yml && grep -q 'services/analytics' .github/workflows/ci-cd.yml && echo OK
```
**Hors périmètre** : job mobile (6.1) ; jobs deploy.

### - [x] 0.8 — Suppression des fichiers morts : scripts racine, copie égarée, écrans morts
**Objectif** : la racine ne contient plus que la config du dépôt, les compose, le Makefile, les docs et les dossiers de code ; le mobile ne contient plus le serveur Express égaré ni les écrans injoignables (D-13) ; `app.json` → `expo.extra.API_BASE_URL` prend la valeur neutre `http://10.0.2.2:80` (hôte vu de l'émulateur Android, D-38) à la place de l'IP LAN de l'auteur.
**Fichiers** : supprimer `full-workflow-test.ps1`, `run-tests.ps1`, `test-all-services.ps1`, `test-comprehensive.ps1`, `test-login.html`, `setup-fresh-mobile.sh`, `start-expo-tunnel.bat`, `diagnose-network.ps1`, `scripts/test-api.sh` ; `mobile-app/src/app.ts` ; `mobile-app/src/screens/student/{StudentDashboardScreen,RequestLessonScreen,ExamsListScreen}.tsx` ; `mobile-app/MOBILE_APP_COMPLETE.md` ; `services/student/src/repositories/profile.service.ts` (vide) ; `mobile-app/app.json`.
**Critère de validation** :
```bash
test "$(ls *.ps1 *.bat *.html 2>/dev/null | wc -l)" -eq 0 && ! grep -q '192.168' mobile-app/app.json && ! test -e mobile-app/src/app.ts && ! test -e mobile-app/src/screens/student/StudentDashboardScreen.tsx && ! test -e services/student/src/repositories/profile.service.ts && (cd mobile-app && npm ci --silent && npx tsc --noEmit 2>&1 | tail -5; echo "erreurs tsc restantes (attendu : uniquement dans src/services/api, corrigées en 6.1)")
```
**Hors périmètre** : `scripts/docker-*.{sh,ps1}` ; les erreurs de type des `*Service.ts` (6.1).

### - [x] 0.9 — Tests unitaires : suites obsolètes supprimées, seuils de couverture réalistes (D-37, D-39)
**Objectif** : `npm test` passe dans les 8 services. Les suites de `school`, `student`, `lesson`, `exam`, `payment`, `notification` ne compilaient plus (elles testaient l'ancien modèle de domaine : `findByName`, `getAllLessons`, `sendPush`…) : **supprimées** (D-39), `passWithNoTests: true` dans leur `jest.config.js`, réécrites module par module en Phase 2. `auth` (12/12) et `analytics` (9/10, le test « cached data » désactivé par `it.skip` avec référence à D-31) gardent leurs suites ; leur `coverageThreshold.global` = couverture mesurée, arrondie à l'entier inférieur (auth 16/21/17/16, analytics 34/28/30/35), commentée « à remonter avec les tests des phases 2–5 ».
**Fichiers** : `services/*/jest.config.js`, suppression de `services/{school,student,lesson,exam,payment,notification}/src/services/__tests__/*.test.ts`, `services/analytics/src/services/__tests__/analytics.service.test.ts`.
**Critère de validation** :
```bash
for s in auth school student lesson exam payment notification analytics; do (cd services/$s && npm test --silent >/dev/null 2>&1) || { echo "FAIL $s"; exit 1; }; done; echo "OK 8/8"
```
**Hors périmètre** : écrire de nouveaux tests (Phase 2, par module).

### - [x] 0.10 — Lint vert sur les 8 services, fins de ligne normalisées
**Objectif** : `npm run lint` passe dans chaque service. (1) `.gitattributes` racine (`* text=auto eol=lf`, binaires exclus) : copie de travail en LF partout, les `prettier/prettier: Delete ␍` disparaissent sous Windows. (2) Dans les 6 services à règles typées, `.eslintrc.json` : `no-misused-promises` avec `checksVoidReturn.arguments: false` (handlers Express `async`), `no-unsafe-*`, `no-explicit-any`, `require-await`, `no-unsafe-enum-comparison` passés en `warn` (les `any` viennent de `req.body` et des lignes `pg` ; ces services sont réécrits en Phase 2 — **`services/api` repart strict en 2.1**), `no-unused-vars` avec `ignoreRestSiblings`, `ignorePatterns` pour les fichiers de test hors `tsconfig`. (3) Corrections de code sans effet : paramètres inutilisés préfixés `_`, import mort retiré. (4) `.prettierrc.json` ajouté à `student` et `analytics` (seuls services sans), sources reformatées.
**Fichiers** : `.gitattributes` (nouveau), `services/*/.eslintrc.json`, `services/{student,analytics}/.prettierrc.json` (nouveaux), `services/payment/src/services/payment-gateway.service.ts`, `services/notification/src/validators/notification.validator.ts`, `services/analytics/src/index.ts`, `services/student/src/**` (formatage).
**Critère de validation** :
```bash
for s in auth school student lesson exam payment notification analytics; do (cd services/$s && npm run lint --silent >/dev/null 2>&1) || { echo "FAIL $s"; exit 1; }; done; echo "OK 8/8"
```
**Hors périmètre** : le lint du mobile (6.1) ; le web (D-05).

---

## Phase 1 — Filet de sécurité

### - [x] 1.1 — Harnais de test de bout en bout exécutable
**Objectif** : `tests/` devient un paquet npm autonome (jest + ts-jest + supertest) ciblant `GATEWAY_URL` (défaut `http://localhost`), avec `tests/fixtures/seed.sql` (une école `Seed Driving School`, un instructeur `instructor@seed.io` / `Seed1234!` inséré par SQL direct dans `users` + `instructors`, une grille `pricing` pour les 3 types, un `school_codes` `INST-SEED` pour l'instructeur) appliqué par le harnais. Les deux fichiers de tests existants, non exécutables, sont supprimés.
**Fichiers** : `tests/package.json`, `tests/jest.config.js`, `tests/tsconfig.json`, `tests/fixtures/seed.sql`, `tests/setup.ts`, `tests/helpers/api.ts`, `package.json` racine (`"test:e2e"`), suppression de `tests/e2e/complete-workflow.e2e.test.ts` et `tests/integration/api-integration.test.ts`.
**Critère de validation** :
```bash
cd tests && npm ci --silent && npx jest --listTests && cd .. && test "$(git ls-files tests | grep -c 'complete-workflow\|api-integration')" -eq 0 && echo OK
```
**Hors périmètre** : aucun test métier (1.2).
**Note** : le hash bcrypt du mot de passe seed est généré une fois (`node -e "console.log(require('bcryptjs').hashSync('Seed1234!', 12))"`) et collé dans `seed.sql`. Admin = celui de la migration 001.

### - [x] 1.2 — Test du chemin critique (D-15), qui échoue aujourd'hui
**Objectif** : `tests/e2e/critical-path.e2e.test.ts` enchaîne, **sur les routes cibles du contrat** : A2 register élève `{ email, password, firstName, lastName }` → E2 demande d'inscription → A1 login instructeur → E4 liste (contient la demande, `studentEmail`) → E5 approbation → E1 `canBook: true` → L2 demande de leçon `{ type: 'Parc', requestedDate, preferredInstructorId }` → L1 (contient la leçon `pending`) → L5 approbation `{ scheduledDate, durationMinutes }` (réponse avec `price` = tarif `Parc` du seed) → L7 présence `{ attended: true }`. Chaque étape est un `test()` nommé, `--bail`. Il **doit échouer** aujourd'hui, à une étape métier.
**Fichiers** : `tests/e2e/critical-path.e2e.test.ts`, `tests/helpers/api.ts`.
**Critère de validation** :
```bash
docker compose up -d --build && sleep 30 && (cd tests && npx jest e2e/critical-path --bail --verbose); echo "exit=$?"
```
Sortie attendue : `exit=1`, échec à `register élève` (le backend actuel exige `role`) ou plus loin. Noter l'étape dans le commit.
**Hors périmètre** : ne rien corriger côté backend.

### - [x] 1.3 — Le CI exécute le test de bout en bout (en mode informatif)
**Objectif** : `.github/workflows/e2e.yml` monte la stack, applique le seed, lance `npm run test:e2e`, publie le rapport ; `continue-on-error: true` jusqu'à 5.8 (`TODO(5.8)` dans le YAML).
**Fichiers** : `.github/workflows/e2e.yml`.
**Critère de validation** :
```bash
grep -q 'test:e2e' .github/workflows/e2e.yml && grep -q 'continue-on-error: true' .github/workflows/e2e.yml && grep -q 'TODO(5.8)' .github/workflows/e2e.yml && echo OK
```
**Hors périmètre** : rendre le job bloquant.

---

## Phase 2 — Consolidation en une application

### - [x] 2.1 — Squelette de `services/api`, helper d'erreurs, module `auth`
**Objectif** : une seule application Express (`services/api`, port **3000**) : `src/index.ts` (validation des variables d'env au démarrage), `src/app.ts`, `src/config/{database,redis}.ts`, `src/http/errors.ts` (`sendError(res, status, code, message)` → `{ error, message }`, D-27), `src/modules/auth/` copié depuis `services/auth` et converti au helper d'erreurs. `/health` et `/api/auth/*` répondent.
**Fichiers** : `services/api/{package.json,tsconfig.json,jest.config.js,.eslintrc.json,.prettierrc.json,Dockerfile,.dockerignore,.env.example}`, `services/api/src/**`, `docker-compose.yml` (ajoute `api`, garde les anciens). Le `.eslintrc.json` de `services/api` est **strict** : `recommended-requiring-type-checking` avec `no-unsafe-*`, `no-explicit-any`, `require-await` en `error` (les assouplissements de 0.10 ne concernent que les 8 anciens services).
**Critère de validation** :
```bash
cd services/api && npm ci --silent && npx tsc --noEmit && npm test -- --silent && cd ../.. && docker compose up -d --build api && sleep 15 && curl -sf localhost:3000/health && curl -s -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"nobody@x.io","password":"x"}' | grep -q '"message"' && echo OK
```
**Hors périmètre** : autres modules ; Nginx.

### - [x] 2.2 — Middleware d'auth unique, vérification locale du JWT
**Objectif** : `src/middleware/auth.middleware.ts` vérifie le token avec le secret, pose `req.user = { userId, email, role }`, expose `authenticate` et `authorize(...roles)` ; testé (valide, expiré, absent, mauvais rôle). Plus aucun appel HTTP vers `/api/auth/me` dans le code de l'app.
**Fichiers** : `services/api/src/middleware/auth.middleware.ts` + `__tests__`, suppression de la copie dans `modules/auth`.
**Critère de validation** :
```bash
cd services/api && npx jest middleware --silent && test "$(grep -rl 'api/auth/me' src --include=*.ts | grep -v __tests__ | grep -vc 'auth.routes\|auth.controller')" -eq 0 && test "$(grep -rc axios src/middleware | grep -v ':0' | wc -l)" -eq 0 && echo OK
```
**Hors périmètre** : claim `type`, secrets séparés (4.4).

### - [x] 2.3 — Migration des modules `school` et `student`
**Objectif** : `modules/school` et `modules/student` tournent dans `services/api` avec le middleware de 2.2 et le helper d'erreurs. Preuve que le bug `userId` est corrigé : une demande d'inscription est rattachée à l'élève.
**Fichiers** : `services/api/src/modules/{school,student}/**`, `app.ts`, tests unitaires des deux modules (les suites d'origine ont été supprimées en 0.9, D-39 : à écrire contre le code porté).
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm test -- --silent && cd ../.. && docker compose up -d --build api && sleep 15 && SID=$(curl -s localhost:3000/api/schools | node -pe 'JSON.parse(require("fs").readFileSync(0))[0].id') && TOK=$(curl -s -X POST localhost:3000/api/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"e2e-$RANDOM@t.io\",\"password\":\"Passw0rd!\",\"role\":\"student\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken') && curl -s -X POST localhost:3000/api/enrollment/schools/$SID/request -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"message":"test"}' >/dev/null && curl -s localhost:3000/api/enrollment/my-requests -H "Authorization: Bearer $TOK" | grep -q '"studentId":"[0-9a-f-]\{36\}"' && echo OK
```
**Hors périmètre** : `students.name` (3.1), identifiants des fiches (5.0).

### - [x] 2.4 — Migration des modules `lesson` et `exam` (tels quels)
**Objectif** : les deux modules tournent dans `services/api` **sans** changer leurs routes.
**Fichiers** : `services/api/src/modules/{lesson,exam}/**`, `app.ts`, tests unitaires des deux modules (D-39).
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm test -- --silent && cd ../.. && docker compose up -d --build api && sleep 15 && curl -sf localhost:3000/api/lessons >/dev/null && curl -sf localhost:3000/api/exams >/dev/null && echo OK
```
**Hors périmètre** : adaptation au modèle D-01.

### - [x] 2.5 — `payment` porté non monté ; `notification` et `analytics` non portés
**Objectif** : `modules/payment` est copié avec ses tests mais **n'est pas monté** dans `app.ts` (D-31) ; `services/notification` et `services/analytics` ne sont **pas portés** (D-31, D-35) — leur code reste dans l'historique git.
**Fichiers** : `services/api/src/modules/payment/**`, `app.ts`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm test -- --silent && ! test -d src/modules/analytics && ! test -d src/modules/notification && cd ../.. && docker compose up -d --build api && sleep 15 && test "$(curl -s -o /dev/null -w '%{http_code}' localhost:3000/api/payments)" = 404 && test "$(curl -s -o /dev/null -w '%{http_code}' localhost:3000/api/notifications)" = 404 && test "$(curl -s -o /dev/null -w '%{http_code}' localhost:3000/api/analytics/dashboard)" = 404 && echo OK
```
**Hors périmètre** : —

### - [x] 2.6 — Nginx et compose sur un seul upstream
**Objectif** : `nginx/nginx.conf` proxifie `/api/` vers `api:3000` (un `location`, `include proxy_params.conf`), **n'expose pas** `/api/verification`, n'écoute plus 443 ; les trois compose ne déclarent plus que `postgres`, `redis`, `api`, `nginx`. `/api/profiles` et `/api/student-profiles` deviennent joignables.
**Fichiers** : `nginx/nginx.conf`, `nginx/proxy_params.conf`, `docker-compose{,.dev,.prod}.yml`, `.env.example`.
**Critère de validation** :
```bash
docker compose down && docker compose up -d --build && sleep 30 && test "$(docker compose config --services | sort | tr '\n' ' ')" = "api nginx postgres redis " && test "$(curl -s -o /dev/null -w '%{http_code}' localhost/api/profiles/x/schools/y/complete)" = 401 && test "$(curl -s -o /dev/null -w '%{http_code}' localhost/api/verification/verify-enrollment)" = 404 && echo OK
```
**Hors périmètre** : TLS.

### - [x] 2.7 — Suppression des 8 anciens services, Makefile et CI mis à jour
**Objectif** : `services/` ne contient plus que `api` ; Makefile, workflows, `README.md`, `ARCHITECTURE.md` reflètent l'app unique. Le test de bout en bout échoue **au même endroit ou plus loin** qu'en 1.2.
**Fichiers** : suppression de `services/{auth,school,student,lesson,exam,payment,notification,analytics}`, `Makefile`, `.github/workflows/*.yml`, `README.md`, `docs/ARCHITECTURE.md`.
**Critère de validation** :
```bash
test "$(ls services)" = "api" && test "$(grep -c 'services/auth' Makefile .github/workflows/ci-cd.yml | grep -v ':0' | wc -l)" -eq 0 && (cd tests && npx jest e2e/critical-path --bail 2>&1 | tail -30); echo "vérifier que l'étape en échec est ≥ celle notée en 1.2"
```
**Hors périmètre** : rien de fonctionnel.

---

## Phase 3 — Blocages données

### - [x] 3.0 — Purge des demandes d'inscription orphelines, `student_id NOT NULL`
**Objectif** : migration `005_enrollment_student_not_null.sql` : supprime les `enrollment_requests` dont `student_id IS NULL` (créées par le bug `userId`, aucune ne peut être rattachée puisque l'identité est perdue), puis `ALTER COLUMN student_id SET NOT NULL`. Sans la contrainte le bug reviendrait par un autre chemin d'écriture.
**Fichiers** : `migrations/005_enrollment_student_not_null.sql`.
**Critère de validation** :
```bash
./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -tAc "SELECT is_nullable FROM information_schema.columns WHERE table_name='enrollment_requests' AND column_name='student_id'" | grep -x NO && echo OK
```
**Hors périmètre** : —

### - [x] 3.1 — Noms sur `users` ; `students.name` et `instructors.name` nullables
**Objectif** : migration `006_user_names.sql` : `users.first_name`, `users.last_name` (`NOT NULL DEFAULT ''` puis contrainte levée en fin de migration pour les lignes existantes, ou nullable + backfill `''`), `students.name` et `instructors.name` passent en **nullable** (D-16 ; suppression dans une migration ultérieure). `register` accepte et exige `firstName`/`lastName` ; `approveRequest` n'écrit plus `name` ; A3, S3, E4 et P1 exposent `firstName`/`lastName` par jointure.
**Fichiers** : `migrations/006_user_names.sql`, `modules/auth/{validators,repositories,controllers}`, `modules/student/{services,repositories}`, `modules/school/repositories/instructor.repository.ts`, tests, `docs/API_CONTRACT.md` (A2, A3, S3, E4, P1).
**Critère de validation** :
```bash
./scripts/migrate.sh && (cd tests && npx jest e2e/critical-path --bail -t 'approbation' --verbose) && docker exec driving-school-postgres psql -U admin -d driving_school -tAc "SELECT count(*) FROM users WHERE first_name IS NULL" | grep -x 0 && echo OK
```
**Hors périmètre** : `schoolCode` (4.2).

### - [x] 3.2 — Approbation en transaction
**Objectif** : `approveRequest` fait `UPDATE enrollment_requests` + `INSERT students` dans une transaction ; si l'INSERT échoue, la demande reste `pending`. Test unitaire avec un client pg mocké dont le second appel rejette.
**Fichiers** : `modules/student/services/enrollment.service.ts`, `modules/student/repositories/*.ts`, `__tests__/enrollment.service.test.ts`.
**Critère de validation** :
```bash
cd services/api && npx jest enrollment --verbose 2>&1 | grep -E 'rollback|reste pending|✓|✕' && npx jest enrollment --silent && echo OK
```
**Hors périmètre** : autres opérations multi-tables.

### - [x] 3.3 — Schéma des leçons pour D-21
**Objectif** : migration `007_lessons_requests.sql` : `lessons.status` ∈ `pending | scheduled | completed | cancelled | rejected` (défaut `pending`), `date_time` renommée **`scheduled_date`** (nullable), nouvelle **`requested_date`** (nullable), `student_id → students.id` (**NOT NULL** : une leçon = un élève, D-34), **`instructor_id` nullable** (renseigné à l'approbation, D-32), nouvelle **`preferred_instructor_id`** (nullable), `notes`, `admin_notes`, `rejection_reason`, `attended`, `feedback`, `rating`, `paid`, `amount`, `payment_date`, `payment_method` (copiés depuis `lesson_bookings` pour l'individuel) ; `capacity` / `current_bookings` conservés avec **`CHECK (capacity = 1)`** (D-34, levé plus tard sans migration de données). Types TS et validators du module `lesson` alignés, **sans** nouvelle route.
**Fichiers** : `migrations/007_*.sql`, `modules/lesson/{types,validators,repositories}/**`.
**Critère de validation** :
```bash
docker compose down -v && docker compose up -d postgres && sleep 12 && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c '\d lessons' | grep -E 'requested_date|scheduled_date|student_id|rejection_reason' && cd services/api && npx tsc --noEmit && npm test -- --silent && echo OK
```
**Hors périmètre** : endpoints (5.2–5.4).

### - [x] 3.4 — Schéma des examens pour D-01
**Objectif** : migration `008_exam_requests.sql` : l'examen devient une demande d'élève — `exams.student_id → students.id`, `preferred_date`, `message`, `status` ∈ `pending | scheduled | completed | cancelled | rejected` (D-33), `location`, `rejection_reason`, `result` ∈ `pending | passed | failed`, `score`, `notes`, `paid`, `amount`, `payment_date`, `payment_method` ; `exam_registrations` abandonnée (données copiées si présentes). Suppression de `checkEligibility` et des constantes `REQUIRED_LESSONS_*` (D-26). Types et validators alignés, pas de nouvelle route.
**Fichiers** : `migrations/008_*.sql`, `modules/exam/{types,validators,repositories,services}/**`.
**Critère de validation** :
```bash
./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c '\d exams' | grep -E 'student_id|preferred_date|location|rejection_reason|result' && ! grep -rq 'REQUIRED_LESSONS' services/api/src && cd services/api && npx tsc --noEmit && npm test -- --silent && echo OK
```
**Hors périmètre** : endpoints (5.5, 5.6).

### - [x] 3.5 — Une seule inscription active par élève (D-22)
**Objectif** : migration `009_one_active_enrollment.sql` : `UNIQUE (students.user_id)` et index unique partiel `enrollment_requests(student_id) WHERE status IN ('pending','approved')`. `createEnrollmentRequest` refuse (409 `CONFLICT`) si une inscription ou une demande active existe dans **n'importe quelle** école.
**Fichiers** : `migrations/009_*.sql`, `modules/student/services/enrollment.service.ts`, `modules/student/repositories/*.ts`, tests, `docs/API_CONTRACT.md` (E2).
**Critère de validation** :
```bash
./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -tAc "SELECT count(*) FROM pg_indexes WHERE tablename IN ('students','enrollment_requests') AND indexdef LIKE 'CREATE UNIQUE%'" | grep -xE '[2-9]' && (cd services/api && npx jest enrollment --silent) && echo OK
```
**Hors périmètre** : —

---

## Phase 4 — Auth

### - [x] 4.1 — `POST /api/auth/register` sans `role` : toujours `student`
**Objectif** : le champ `role` n'est plus accepté (400 `VALIDATION_ERROR` s'il est présent) ; sans `schoolCode`, le compte est `student`. `firstName` / `lastName` exigés (3.1).
**Fichiers** : `modules/auth/validators/auth.validator.ts`, `modules/auth/{controllers,services}/auth.*`, tests, `docs/API_CONTRACT.md` (A2), `tests/helpers/api.ts`.
**Critère de validation** :
```bash
test "$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/auth/register -H 'Content-Type: application/json' -d '{"email":"x@t.io","password":"Passw0rd!","firstName":"A","lastName":"B","role":"admin"}')" = 400 && test "$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"s$RANDOM@t.io\",\"password\":\"Passw0rd!\",\"firstName\":\"A\",\"lastName\":\"B\"}")" = 201 && echo OK
```
**Hors périmètre** : `schoolCode` (4.2).

### - [x] 4.2 — `register` avec `schoolCode` : instructeur (ou admin) rattaché à une école
**Objectif** : avec `schoolCode` (D-17) : le code doit être `is_active`, non expiré, `uses_count < max_uses` (ou `max_uses NULL`) → sinon 400 `INVALID_SCHOOL_CODE` ; `phone` et `licenseNumber` requis si `role = instructor` ; dans une transaction : `users` (rôle du code), `instructors` (si instructeur), `uses_count + 1`. Réponse identique à un register simple.
**Fichiers** : `modules/auth/**`, `modules/school/repositories/school-code.repository.ts` (nouveau), validators, tests, `docs/API_CONTRACT.md` (A2, S5 supprimée).
**Critère de validation** :
```bash
R1=$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"i$RANDOM@t.io\",\"password\":\"Passw0rd!\",\"firstName\":\"I\",\"lastName\":\"N\",\"schoolCode\":\"INST-SEED\",\"phone\":\"+21600000000\",\"licenseNumber\":\"LIC-1\"}") && R2=$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"i$RANDOM@t.io\",\"password\":\"Passw0rd!\",\"firstName\":\"I\",\"lastName\":\"N\",\"schoolCode\":\"NOPE\",\"phone\":\"+21600000000\",\"licenseNumber\":\"LIC-2\"}") && echo "code valide → $R1 (attendu 201), code inconnu → $R2 (attendu 400)" && test "$R1" = 201 && test "$R2" = 400 && (cd services/api && npx jest school-code --silent) && echo OK
```
**Hors périmètre** : création des codes par route (aucune en v1).

### - [x] 4.3 — Script d'onboarding d'une école (codes inclus)
**Objectif** : `scripts/onboard-school.sh <nom> <adresse> <tél> <email>` insère l'école, sa grille `pricing` (3 types, montants passés en option) et un code instructeur `INST-<SLUG>-<4 car.>` (`max_uses`, `expires_at` en option), et affiche le code. Idempotent sur l'email de l'école.
**Fichiers** : `scripts/onboard-school.sh`, `README.md` (section « Onboarding d'une école »).
**Critère de validation** :
```bash
./scripts/onboard-school.sh "École Test" "1 rue X, Tunis" "+21600000001" "test-$RANDOM@ecole.tn" | grep -E '^INST-' && echo OK
```
**Hors périmètre** : écran ou route de gestion des codes.

### - [x] 4.4 — Claim `type`, secrets distincts, durées 1 h / 30 j
**Objectif** : `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` (plus de `JWT_SECRET` ni de fallback ; refus de démarrer sans), claim `type`, le middleware rejette un refresh token, `/refresh` rejette un access token, `JWT_ACCESS_EXPIRES_IN=1h`, `JWT_REFRESH_EXPIRES_IN=30d` (D-23).
**Fichiers** : `modules/auth/services/token.service.ts`, `middleware/auth.middleware.ts`, `src/index.ts`, `.env.example`, `docker-compose*.yml`, tests, `docs/API_CONTRACT.md` (A1, A4).
**Critère de validation** :
```bash
R=$(curl -s -X POST localhost/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@drivingschool.com","password":"admin123"}') && AT=$(echo "$R" | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken') && RT=$(echo "$R" | node -pe 'JSON.parse(require("fs").readFileSync(0)).refreshToken') && test "$(curl -s -o /dev/null -w '%{http_code}' localhost/api/auth/me -H "Authorization: Bearer $RT")" = 401 && test "$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/auth/refresh -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$AT\"}")" = 401 && ! grep -rq 'fallback-secret\|JWT_SECRET' services/api/src && echo OK
```
**Hors périmètre** : rotation et révocation (4.6).

### - [x] 4.5 — Refresh token réellement utilisé par le mobile
**Objectif** : `AuthContext` stocke `refreshToken` ; `ApiClient` intercepte un 401, appelle `/api/auth/refresh` une seule fois, stocke la nouvelle paire, rejoue la requête, et déconnecte si le refresh échoue. `jest-expo` installé avec un test de l'interceptor (axios et AsyncStorage mockés).
**Fichiers** : `mobile-app/package.json`, `mobile-app/jest.config.js`, `mobile-app/src/services/api/ApiClient.ts`, `mobile-app/src/context/AuthContext.tsx`, `mobile-app/src/services/api/__tests__/ApiClient.test.ts`.
**Critère de validation** :
```bash
cd mobile-app && npm ci --silent && npx jest src/services/api --verbose 2>&1 | grep -E '✓|✕|Tests:' && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : typecheck global (6.1).

### - [x] 4.6 — Rotation et révocation des refresh tokens
**Objectif** : chaque refresh token émis est enregistré (hash) en Redis avec TTL ; `/refresh` invalide l'ancien et émet une nouvelle paire (rotation, D-12) ; un refresh token réutilisé après rotation → 401 et révocation de toute la famille ; `/logout` révoque le token courant.
**Fichiers** : `modules/auth/services/{auth,cache,token}.service.ts`, tests, `docs/API_CONTRACT.md` (A4, A5).
**Critère de validation** :
```bash
R=$(curl -s -X POST localhost/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@drivingschool.com","password":"admin123"}') && RT=$(echo "$R" | node -pe 'JSON.parse(require("fs").readFileSync(0)).refreshToken') && R2=$(curl -s -X POST localhost/api/auth/refresh -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$RT\"}") && echo "$R2" | grep -q accessToken && test "$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/auth/refresh -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$RT\"}")" = 401 && echo OK
```
**Hors périmètre** : révocation des access tokens en cours (fenêtre 1 h acceptée).

---

## Phase 5 — Endpoints manquants, dans l'ordre du contrat

Chaque tâche met à jour `docs/API_CONTRACT.md` (statut → EXISTE, ou SUPPRIMÉE) **dans le même commit**. Le cloisonnement par école (D-20) est implémenté une fois en 5.1 (`assertSameSchool`) et réutilisé partout.

### - [x] 5.0 — Profils (P1–P11) : `users.id` en entrée, chemins `mark-paid` renommés
**Objectif** : toutes les routes `/api/profiles/*` et `/api/student-profiles/*` prennent `users.id` et joignent `students` sur `user_id` + `school_id` (D-28) ; `getMyProfile` fonctionne ; `mark-paid` devient `/lessons/:lessonId/mark-paid` et `/exams/:examId/mark-paid` (P6, P7) ; réponses avec `firstName`/`lastName`.
**Fichiers** : `modules/student/{controllers,services,repositories,routes}/profile.*`, tests, `tests/e2e/profiles.e2e.test.ts` (nouveau : élève approuvé → P8 → 200 avec `totalLessons`), `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
(cd tests && npx jest e2e/profiles --verbose) && test "$(grep -cE '^\| P[0-9]+ .*\*\*DIVERGE\*\*' docs/API_CONTRACT.md)" -eq 0 && echo OK
```
**Hors périmètre** : onglets mobile (6.6).

### - [x] 5.1 — `/me` avec école, liste des élèves, cloisonnement
**Objectif** : A3 renvoie `schoolId` et `instructorId` pour un instructeur (D-19) ; S6 `GET /api/schools/:id/students` (D-25) ; helper `assertSameSchool(req.user, schoolId)` → 403 `FORBIDDEN_SCHOOL`, appliqué à E4, E5, E6, P1–P7 (D-20).
**Fichiers** : `modules/auth/**`, `modules/school/**`, `modules/student/**`, `src/http/authz.ts`, tests, `docs/API_CONTRACT.md` (A3, S6, E4).
**Critère de validation** :
```bash
ITOK=$(curl -s -X POST localhost/api/auth/login -H 'Content-Type: application/json' -d '{"email":"instructor@seed.io","password":"Seed1234!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken') && SID=$(curl -s localhost/api/auth/me -H "Authorization: Bearer $ITOK" | node -pe 'JSON.parse(require("fs").readFileSync(0)).schoolId') && test "${#SID}" = 36 && curl -s localhost/api/schools/$SID/students -H "Authorization: Bearer $ITOK" | grep -q '^\[' && test "$(curl -s -o /dev/null -w '%{http_code}' localhost/api/enrollment/schools/00000000-0000-0000-0000-000000000000/requests -H "Authorization: Bearer $ITOK")" = 403 && echo OK
```
**Hors périmètre** : écran mobile (6.2).

### - [x] 5.2 — Leçons : demande (L2) et liste de l'appelant (L1)
**Objectif** : `POST /api/lessons` (`student` autorisé) crée une leçon `pending` `{ type, requestedDate, preferredInstructorId?, notes? }` avec `instructor_id = NULL` (D-32), **403 `NOT_ENROLLED`** sans inscription `approved`, école résolue depuis cette inscription, instructeur préféré vérifié de cette école s'il est fourni ; `GET /api/lessons` scoped (élève : les siennes avec `paid`/`amount` ; instructeur : les `pending` de son école + les leçons dont il est `instructor_id`) au format `Lesson` du contrat. Anciennes routes de créneaux retirées.
**Fichiers** : `modules/lesson/**`, tests, `docs/API_CONTRACT.md` (L1, L2, §8).
**Critère de validation** :
```bash
(cd tests && npx jest e2e/critical-path --bail -t 'demande de leçon|liste des leçons' --verbose) && echo OK
```
**Hors périmètre** : approbation (5.3).

### - [x] 5.3 — Leçons : approbation, refus, annulation (L5, L6, L3)
**Objectif** : `PUT /:id/approve { scheduledDate, durationMinutes, price?, adminNotes? }` par **tout instructeur de l'école**, qui devient `instructor_id` (D-32) → `scheduled`, `price` copié de `pricing` ou pris du payload (D-30, 400 `PRICE_REQUIRED` si aucun) ; `PUT /:id/reject { reason }` → `rejected` ; `POST /:id/cancel` avec la règle 24 h (`LESSON_CANCEL_HOURS`, D-24).
**Fichiers** : `modules/lesson/**`, `src/config/env.ts`, tests, `docs/API_CONTRACT.md` (L3, L5, L6).
**Critère de validation** :
```bash
(cd tests && npx jest e2e/critical-path --bail -t 'approbation de la leçon' --verbose) && (cd services/api && npx jest lesson --verbose 2>&1 | grep -E 'PRICE_REQUIRED|CANCEL_WINDOW|NOT_ENROLLED|✓|✕') && (cd services/api && npx jest lesson --silent) && echo OK
```
**Hors périmètre** : présence (5.4).
**Dépend de** : Q-17 — la tâche couvre l'annulation des leçons **non payées** ; le cas « leçon déjà payée » n'est pas implémenté (ni accepté, ni refusé, ni inventé) tant que Q-17 n'est pas tranchée : le dire dans le commit et laisser la ligne L3 du contrat marquée « Q-17 ».

### - [x] 5.4 — Leçons : présence (L7) et réservation directe (L4)
**Objectif** : `PUT /:id/attendance` par identifiant de leçon, **réservé à `instructor_id` de la leçon** → `completed`, `student_lesson_stats.completed_lessons` incrémenté **seulement si `attended = true`** (D-33) ; `POST /api/lessons/book-for-student { studentId, type, scheduledDate, durationMinutes, price?, notes? }` → `scheduled`, `instructor_id` = appelant, prix de la grille ou du payload. Traitement financier d'une absence : Q-18.
**Fichiers** : `modules/lesson/**`, `modules/student/**` (stats), tests, `docs/API_CONTRACT.md` (L4, L7).
**Critère de validation** :
```bash
(cd tests && npx jest e2e/critical-path --verbose); echo "exit=$? (attendu 0 : chemin critique complet)"
```
**Hors périmètre** : examens.
**Dépend de** : Q-18 (une absence entre-t-elle dans `totalDue` ? — implémenter la présence sans attendre, la règle financière est appliquée en 5.0/P4 quand Q-18 est tranchée).

### - [x] 5.5 — Examens : demande (X2) et liste de l'appelant (X1)
**Objectif** : `POST /api/exams/request { examType, preferredDate, message? }` (élève autorisé, école résolue) → `pending`, **sans** règle d'éligibilité (D-26) ; `GET /api/exams/my-exams` scoped. Anciennes routes de sessions retirées.
**Fichiers** : `modules/exam/**`, tests, `tests/e2e/exams.e2e.test.ts` (nouveau), `docs/API_CONTRACT.md` (X1, X2, §8).
**Critère de validation** :
```bash
(cd tests && npx jest e2e/exams --bail -t 'demande|liste' --verbose) && echo OK
```
**Hors périmètre** : planification.

### - [x] 5.6 — Examens : planification, refus, résultat (X3, X4, X5)
**Objectif** : `PUT /:id/schedule { dateTime, location }` → `scheduled` ; `PUT /:id/reject { reason }` → **`rejected`** (D-33) ; `PUT /:id/result { result, score?, notes? }` (score facultatif) → `completed`, par l'**instructeur** de l'école (D-20).
**Fichiers** : `modules/exam/**`, tests, `tests/e2e/exams.e2e.test.ts`, `docs/API_CONTRACT.md` (X3–X5).
**Critère de validation** :
```bash
(cd tests && npx jest e2e/exams --verbose); echo "exit=$? (attendu 0)"
```
**Hors périmètre** : —

### - [x] 5.7 — Routes hors contrat retirées ou verrouillées
**Objectif** : toute route absente des §1–7 du contrat est supprimée ou listée en §8 derrière `admin` ; `/api/verification/*` supprimé.
**Fichiers** : `modules/*/routes/*.ts`, `docs/API_CONTRACT.md` (§8).
**Critère de validation** :
```bash
test "$(curl -s -o /dev/null -w '%{http_code}' localhost/api/verification/verify-enrollment)" = 404 && test "$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/lessons/00000000-0000-0000-0000-000000000000/book)" = 404 && test "$(curl -s -o /dev/null -w '%{http_code}' localhost/api/exams)" = 404 && echo OK
```
**Hors périmètre** : —

### - [x] 5.8 — Contrat entièrement EXISTE, e2e bloquant en CI
**Objectif** : plus aucune ligne MANQUE ou DIVERGE dans les tableaux du contrat ; le job e2e devient bloquant.
**Fichiers** : `docs/API_CONTRACT.md` (§10), `.github/workflows/e2e.yml`.
**Critère de validation** :
```bash
test "$(grep -cE '^\| [A-Z]+[0-9]+ .*\*\*(MANQUE|DIVERGE)\*\*' docs/API_CONTRACT.md)" -eq 0 && ! grep -q 'continue-on-error' .github/workflows/e2e.yml && (cd tests && npx jest --silent) && echo OK
```
**Hors périmètre** : —

---

## Phase 6 — Câblage des écrans mobile

### - [x] 6.1 — Hygiène mobile : services homogènes, erreurs, vocabulaire, §9, typecheck, CI
**Objectif** : tous les `*Service.ts` renvoient `response.data` ; les `catch` affichent `error.response?.data?.message ?? error.response?.data?.error` (D-27) ; enums `LessonType` = `CODE | Manœuvre | Parc`, `ExamType` = `theory | practical`, `ExamResult` = `passed | failed` (D-18), avec libellés d'affichage ; `BookLessonScreen` ajoute la date souhaitée (`requestedDate`, D-21), un sélecteur à 3 types, et rend l'instructeur **facultatif** (préférence, D-32) ; `MyLessonsScreen` et `MyExamsScreen` affichent l'état de paiement (`paid`, `amount`) ; suppression de `SchoolCodeService.ts`, des chemins du §9 et du plugin Babel `react-native-dotenv` (plus aucun import `@env` depuis 0.4) ; `npx tsc --noEmit` passe ; job CI mobile (typecheck + jest).
**Fichiers** : `mobile-app/src/services/api/*.ts`, `src/config/api.config.ts`, `src/models/*.ts`, `src/screens/student/BookLessonScreen.tsx`, `src/context/AuthContext.tsx` et les écrans encore en erreur `tsc` après 0.8 (`TodayExamsScreen`, `ExamRequestsScreen`, `SchoolDetailScreen`, `MyEnrollmentRequestsScreen` — 9 erreurs hors `services/api` au 18/09), `.github/workflows/ci-cd.yml`.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && test "$(grep -rc 'return await apiClient' src/services/api | grep -v ':0' | wc -l)" -eq 0 && ! test -e src/services/api/SchoolCodeService.ts && ! grep -rq "'PRACTICAL'\|'THEORY'\|'PASS'\|'FAIL'" src && grep -q 'mobile-app' ../.github/workflows/ci-cd.yml && npx jest --silent && echo OK
```
**Hors périmètre** : nouveaux appels.

### - [x] 6.2 — Auth mobile : `/me` après login, école de l'instructeur, inscription en une étape, logout
**Objectif** : `AuthContext.login` appelle A3 et stocke `{ id, firstName, lastName, role, schoolId?, instructorId? }` ; `InstructorRegistrationScreen` devient un seul formulaire (nom, email, mot de passe, téléphone, n° de licence, code école) → A2 ; `InstructorDashboard` passe `schoolId` à `EnrollmentRequests` ; `EnrollmentRequestsScreen` valide le motif ≥ 10 caractères (D-29) ; `logout` appelle A5. Tests jest des méthodes de service (URL + payload).
**Fichiers** : `src/context/AuthContext.tsx`, `src/screens/auth/InstructorRegistrationScreen.tsx`, `src/screens/instructor/{InstructorDashboard,EnrollmentRequestsScreen}.tsx`, `src/services/api/{AuthService,EnrollmentService}.ts` + `__tests__`.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest src/services/api --silent && grep -q "navigate('EnrollmentRequests', { schoolId" src/screens/instructor/InstructorDashboard.tsx && ! grep -q 'setStep(2)' src/screens/auth/InstructorRegistrationScreen.tsx && echo OK
```
**Hors périmètre** : leçons/examens.

### - [x] 6.3 — Instructeur : demandes de leçons et présence
**Objectif** : `LessonRequestsScreen` liste les `pending` de l'école (file partagée, D-32, avec l'instructeur préféré affiché s'il y en a un), appelle `approveLesson { scheduledDate, durationMinutes, price?, adminNotes? }` (champ prix affiché seulement si l'école n'a pas de tarif pour ce type) / `rejectLesson { reason }` (plus de stub, motif ≥ 10 car.) ; `TodayLessonsScreen` liste **ses** leçons `scheduled` du jour (celles dont il est `instructorId`) et appelle `markAttendance` par identifiant de leçon. Tests jest.
**Fichiers** : `src/screens/instructor/{LessonRequestsScreen,TodayLessonsScreen}.tsx`, `src/services/api/LessonService.ts` + tests.
**Critère de validation** :
```bash
cd mobile-app && test "$(grep -c 'API call to' src/screens/instructor/LessonRequestsScreen.tsx src/screens/instructor/TodayLessonsScreen.tsx | grep -v ':0' | wc -l)" -eq 0 && npx tsc --noEmit && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : réservation directe (6.4).

### - [x] 6.4 — Instructeur : réservation directe pour un élève
**Objectif** : `BookForStudentScreen` charge S6 et propose une liste d'élèves ; payload L4 `{ studentId, type, scheduledDate, durationMinutes, notes? }`.
**Fichiers** : `src/screens/instructor/BookForStudentScreen.tsx`, `src/services/api/{LessonService,SchoolService}.ts` + tests.
**Critère de validation** :
```bash
cd mobile-app && ! grep -q 'studentEmail' src/screens/instructor/BookForStudentScreen.tsx && grep -q 'getSchoolStudents' src/screens/instructor/BookForStudentScreen.tsx && npx tsc --noEmit && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : —

### - [x] 6.5 — Instructeur et élève : examens
**Objectif** : `ExamRequestsScreen` appelle `scheduleExam` / `rejectExamRequest` (plus de stub) ; `TodayExamsScreen` appelle `recordExamResult { result: passed|failed, score, notes? }` ; `RequestExamScreen` envoie `examType: theory|practical`. Tests jest.
**Fichiers** : `src/screens/instructor/{ExamRequestsScreen,TodayExamsScreen}.tsx`, `src/screens/student/{RequestExamScreen,MyExamsScreen}.tsx`, `src/services/api/ExamService.ts` + tests.
**Critère de validation** :
```bash
cd mobile-app && test "$(grep -c 'API call to' src/screens/instructor/ExamRequestsScreen.tsx src/screens/instructor/TodayExamsScreen.tsx | grep -v ':0' | wc -l)" -eq 0 && npx tsc --noEmit && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : —
**Dépend de** : Q-19 (libellés « Planifier / Refuser » vs « Enregistrer la convocation / Dossier pas prêt » sur `ExamRequestsScreen` et `MyExamsScreen` ; le câblage des appels peut se faire avant, les libellés sont posés une fois Q-19 tranchée). *Livré le 19/09 : appels câblés, libellés « Schedule » / « Reject » d'origine conservés — à poser quand Q-19 sera tranchée.*

### - [x] 6.6 — Fiches élève joignables, annulation élève
**Objectif** : `EnrollmentRequestsScreen` (demandes approuvées) et `BookForStudentScreen` (liste S6) naviguent vers `StudentProfile` avec `{ studentId (users.id), schoolId, studentName }` ; `StudentDashboard` navigue vers `MyProfile` avec le `schoolId` de l'inscription active (E3) ; `MyLessonsScreen` n'affiche « Annuler » que si `pending` ou `scheduledDate − now ≥ 24 h` (D-24) et gère 403 `CANCEL_WINDOW_CLOSED`.
**Fichiers** : `src/screens/instructor/{EnrollmentRequestsScreen,BookForStudentScreen}.tsx`, `src/screens/student/{StudentDashboard,MyLessonsScreen}.tsx`, `src/navigation/{AppNavigator,types}.tsx`.
**Critère de validation** :
```bash
cd mobile-app && grep -rq "navigate('StudentProfile'" src/screens/instructor && grep -q "navigate('MyProfile'" src/screens/student/StudentDashboard.tsx && grep -q 'CANCEL_WINDOW_CLOSED' src/screens/student/MyLessonsScreen.tsx && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —
**Dépend de** : Q-17 (bouton « Annuler » sur une leçon payée : masqué ou non, selon la réponse). *Livré le 19/09 sans trancher Q-17 : une leçon payée garde le bouton comme les autres (comportement actuel du serveur, `canStudentCancel` dans `src/models/Lesson.ts`) — à ajuster en une ligne quand Q-17 sera tranchée.*

### - [x] 6.7 — Approbation multiple des demandes de code (ergonomie, D-34)
**Objectif** : sur `LessonRequestsScreen`, l'instructeur coche plusieurs demandes `pending` de type `CODE` et les approuve d'un coup pour un même créneau (« approuver ces 12 demandes pour mardi 9 h ») : un seul formulaire (date, heure, durée, prix si nécessaire), puis **un appel L5 par demande**, en séquence, avec récapitulatif des succès/échecs. Aucun changement de modèle de données ni de route.
**Fichiers** : `src/screens/instructor/LessonRequestsScreen.tsx`, `src/services/api/LessonService.ts` (`approveLessons(ids, data)` = boucle sur `approveLesson`) + test.
**Critère de validation** :
```bash
cd mobile-app && grep -q 'approveLessons' src/screens/instructor/LessonRequestsScreen.tsx && npx tsc --noEmit && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : séances collectives (`capacity > 1`), hors v1.

---

## Phase 7 — Application des décisions du 19/09/2026 (D-40 à D-43)

Les quatre questions ouvertes sont tranchées (`DECISIONS.md`). Chaque décision = une tâche = un commit. Les critères qui touchent la base supposent la stack démarrée (`docker compose up -d --build`) ; `scripts/migrate.sh` applique les migrations 012 / 013 sur une base existante.

### - [x] 7.1 — Devise par école (D-43)
**Objectif** : migration `012_school_currency.sql` (`schools.currency CHAR(3) NOT NULL DEFAULT 'TND'`, `CHECK` ISO 4217, idempotente) ; `School` expose `currency` (S1, S2), accepté par les routes admin (`POST /`, `PUT /:id`) et par `scripts/onboard-school.sh` (`CURRENCY=`) ; le mobile lit la devise de l'école (S2, cache par école) et n'a plus aucun symbole codé en dur : `formatAmount(amount, currency)` partout où un montant s'affiche.
**Fichiers** : `migrations/012_school_currency.sql`, `services/api/src/modules/school/{types,repositories,validators}`, `scripts/onboard-school.sh`, `tests/fixtures/seed.sql`, `tests/e2e/harness.e2e.test.ts`, `mobile-app/src/models/School.ts`, `mobile-app/src/utils/format.ts`, `mobile-app/src/hooks/useSchoolCurrency.ts` (nouveau), les écrans qui affichent un montant, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
./scripts/migrate.sh && docker compose up -d --build api && (cd services/api && npx tsc --noEmit && npm run lint && npm test -- --silent) && (cd tests && npx jest e2e/harness -t 'devise') && ! grep -rq 'CURRENCY_SYMBOL' mobile-app/src && (cd mobile-app && npx tsc --noEmit && npx jest --silent) && echo OK
```
**Hors périmètre** : conversion entre devises.

### - [x] 7.2 — Avoir sur une leçon payée annulée (D-40)
**Objectif** : migration `013_student_credit.sql` (`students.credit NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (credit >= 0)`, `lessons.credit_applied NUMERIC(10,2) NOT NULL DEFAULT 0`, idempotente) ; L3 en transaction : une leçon annulée `paid` ou avec `credit_applied > 0` crédite l'élève de `amount + credit_applied` ; L5 et L4 en transaction : le crédit disponible est imputé sur la leçon planifiée (couverture totale → `paid`, `payment_method = 'credit'`, `amount = 0` ; partielle → `credit_applied`, `amount = reste`) ; `Lesson` et `LessonHistory` exposent `creditApplied` (+ `paymentMethod` sur `Lesson`) ; `FinancialSummary` expose `credit` et son encaissé ne compte que les espèces (`amount`) ; le mobile affiche le crédit (fiche élève, « My Profile ») et l'origine du paiement sur les leçons.
**Fichiers** : `migrations/013_student_credit.sql`, `services/api/src/modules/lesson/{types,repositories,services}`, `services/api/src/modules/student/{types,repositories}` (`StudentRepository` = seul accès à `students.credit`), `services/api/src/index.ts`, `tests/e2e/credits.e2e.test.ts` (nouveau), `mobile-app/src/models/{Lesson,Profile}.ts` et les écrans concernés, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
./scripts/migrate.sh && docker compose up -d --build api && (cd services/api && npx tsc --noEmit && npm run lint && npm test -- --silent) && (cd tests && npx jest e2e/credits -t 'avoir') && (cd mobile-app && npx tsc --noEmit && npx jest --silent) && echo OK
```
**Hors périmètre** : remboursement en espèces, crédit sur les examens.

### - [x] 7.3 — Absence non facturée (D-41)
**Objectif** : P4 / P11 : une leçon `completed` avec `attended = false` sort du dû ; P6 la refuse (409 `CONFLICT`) ; L7 : si elle était payée ou avait consommé du crédit, le montant devient un crédit (mécanisme 7.2) ; le mobile masque « Mark as Paid » et affiche « Absent — not billed ».
**Fichiers** : `services/api/src/modules/student/{repositories,services}`, `services/api/src/modules/lesson/services`, `tests/e2e/credits.e2e.test.ts`, `mobile-app/src/screens/instructor/student-profile/tabs/StudentLessonsTab.tsx`, `mobile-app/src/screens/student/{MyLessonsScreen,my-profile/tabs/MyLessonsPaymentTab}.tsx`, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
docker compose up -d --build api && (cd services/api && npx tsc --noEmit && npm run lint && npm test -- --silent) && (cd tests && npx jest e2e/credits -t 'absence') && (cd mobile-app && npx tsc --noEmit && npx jest --silent) && echo OK
```
**Hors périmètre** : pénalité d'absence.

### - [x] 7.4 — Libellés d'examen selon le type (D-42)
**Objectif** : `EXAM_PROCEDURES` dans `mobile-app/src/models/Exam.ts` (théorie : « Schedule » / « Reject », date et lieu choisis par l'école ; pratique : « Record convocation » / « File not ready », date de session et centre ATTT) ; `ExamRequestsScreen` et `MyExamsScreen` en tirent leurs actions, statuts et textes ; §5 du contrat réécrit, X3 / X4 plus suspendus.
**Fichiers** : `mobile-app/src/models/Exam.ts`, `mobile-app/src/screens/instructor/ExamRequestsScreen.tsx`, `mobile-app/src/screens/student/MyExamsScreen.tsx`, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
grep -q 'EXAM_PROCEDURES' mobile-app/src/models/Exam.ts && grep -q 'Record convocation' mobile-app/src/models/Exam.ts && grep -q 'EXAM_PROCEDURES' mobile-app/src/screens/instructor/ExamRequestsScreen.tsx && grep -q 'EXAM_PROCEDURES' mobile-app/src/screens/student/MyExamsScreen.tsx && ! grep -q 'Suspendu à Q-19' docs/API_CONTRACT.md && (cd mobile-app && npx tsc --noEmit && npx jest --silent) && echo OK
```
**Hors périmètre** : aucun changement de payload ni de statut.

---

## Phase 8 — Accueil « wow » (proposition de design du 20/09/2026, D-45)

Les deux tableaux de bord (grilles de menus) deviennent des accueils qui racontent le parcours : élève « My journey », instructeur « Today », puis une barre d'onglets par rôle. Aucune route nouvelle ; une seule extension de réponse (8.1). Le parcours affiché est informatif (D-26 : aucun seuil, aucun blocage) — règles d'affichage dans D-45.

### - [x] 8.1 — Compteurs de leçons par type dans P1 / P8 (D-45)
**Objectif** : `StudentProfile` / `MyProfile` exposent `completedLessonsByType: { CODE, Manœuvre, Parc }` = leçons `completed` **avec présence** (`attended = true`, D-33) par type, comptées dans `lessons` (même base que `completedLessons`) ; contrat §6 (P1, P8) mis à jour dans le même commit ; test de repository (SQL) et e2e (P8 à zéro par type ; P1 après L7 compte la leçon `Parc` du chemin critique).
**Fichiers** : `services/api/src/modules/student/{types,repositories}`, `services/api/src/modules/student/repositories/__tests__/student.repositories.test.ts`, `tests/e2e/profiles.e2e.test.ts`, `tests/e2e/critical-path.e2e.test.ts`, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
docker compose up -d --build api && (cd services/api && npx tsc --noEmit && npm run lint && npm test -- --silent) && (cd tests && npx jest e2e/profiles e2e/critical-path -t 'par type') && grep -q 'completedLessonsByType' docs/API_CONTRACT.md && echo OK
```
**Hors périmètre** : objectif de leçons par type (D-26), migration (aucune : `lessons` suffit).

### - [x] 8.2 — Accueil élève « My journey »
**Objectif** : `StudentDashboard` réécrit : (1) **prochaine leçon** (L1 `status=scheduled`, la première à venir) avec compte à rebours, instructeur, type, et « Cancel » si `canStudentCancel` (L3, motif facultatif) ; (2) **parcours** Code → examen théorique → Manœuvre → Parc → examen pratique, construit par une fonction pure `buildJourney(profile, exams, lessons)` (`src/models/Journey.ts`, testée) à partir de P8 (`completedLessonsByType`), X1 (statut / résultat des examens) et L1, selon D-45 (nombre de leçons effectuées par étape, examen demandé / planifié / réussi / ajourné, étape courante = dernière étape non conclue avec une activité) ; (3) **dû** et **avoir** (P11, devise de l'école) ; (4) actions « Request a lesson » (L2) et « Request an exam » (X2) ; (5) accès conservés : My lessons, My exams, My profile, Enrollment status, Browse schools. Sans inscription approuvée (E3) : accueil réduit à « Browse schools » et « Enrollment status ». Rafraîchi à chaque retour sur l'écran (`useFocusEffect`).
**Fichiers** : `mobile-app/src/models/Journey.ts` (nouveau) + `mobile-app/src/models/__tests__/Journey.test.ts` (nouveau), `mobile-app/src/models/Profile.ts`, `mobile-app/src/screens/student/StudentDashboard.tsx`, `mobile-app/src/utils/format.ts` (compte à rebours), `docs/ARCHITECTURE.md`.
**Critère de validation** :
```bash
grep -q 'completedLessonsByType' mobile-app/src/models/Profile.ts && grep -q 'buildJourney' mobile-app/src/screens/student/StudentDashboard.tsx && ! grep -q 'menuItems' mobile-app/src/screens/student/StudentDashboard.tsx && (cd mobile-app && npx tsc --noEmit && npx jest --silent && npx jest models/__tests__/Journey -t 'parcours') && echo OK
```
**Hors périmètre** : itinéraire / carte (aucune adresse sur une leçon), objectifs de leçons, notifications.

### - [x] 8.3 — Accueil instructeur « Today »
**Objectif** : `InstructorDashboard` réécrit : (1) **bandeau des demandes** : leçons `pending` de l'école (L1 `scope=school`, avec le nombre de demandes de code regroupables, D-34), examens `pending` (X1), inscriptions `pending` (E4) — chaque compteur ouvre l'écran correspondant ; (2) **timeline du jour** : L1 `scope=mine`, `status=scheduled,completed`, `date=` aujourd'hui, une carte par leçon (heure, élève, type, durée), la leçon **en cours** (D-45 : `scheduledDate ≤ now < scheduledDate + durationMinutes`, sinon la prochaine du jour) mise en avant avec « Present » / « Absent » directement sur la carte (L7, même modale que `TodayLessonsScreen` pour note et commentaire), les leçons passées marquées faites / absent, les autres à venir ; (3) **examens du jour** (X1 `status=scheduled`, jour local) avec « Result » → `TodayExams` ; (4) **cette semaine** : leçons `scheduled` de l'instructeur réparties sur les 7 prochains jours ; (5) accès conservés : Book for a student, Enrollment requests, Today's lessons / exams. Rafraîchi à chaque retour sur l'écran.
**Fichiers** : `mobile-app/src/screens/instructor/InstructorDashboard.tsx`, `mobile-app/src/models/Lesson.ts` (`isLessonInProgress`, testée), `mobile-app/src/models/__tests__/Lesson.test.ts`, `docs/ARCHITECTURE.md`.
**Critère de validation** :
```bash
grep -q 'markAttendance' mobile-app/src/screens/instructor/InstructorDashboard.tsx && grep -q "scope: 'school'" mobile-app/src/screens/instructor/InstructorDashboard.tsx && ! grep -q 'sections' mobile-app/src/screens/instructor/InstructorDashboard.tsx && (cd mobile-app && npx tsc --noEmit && npx jest --silent && npx jest models/__tests__/Lesson -t 'en cours') && echo OK
```
**Hors périmètre** : agenda multi-jours, réaffectation d'une leçon.

### - [x] 8.4 — Barre d'onglets par rôle
**Objectif** : `AppNavigator` : une pile par rôle dont la racine est un `createBottomTabNavigator` (`@react-navigation/bottom-tabs`, déjà installé) — élève : Home (`StudentDashboard`), Lessons (`MyLessons`), Exams (`MyExams`), Profile (`MyProfile`, qui résout lui-même l'école de l'inscription approuvée par E3 quand il est ouvert sans paramètre) ; instructeur : Today (`InstructorDashboard`), Requests (`LessonRequests`), Exams (`ExamRequests`), Students (`BookForStudent`). Les autres écrans restent dans la pile au-dessus des onglets ; les boutons « retour » codés en dur des écrans racines disparaissent ; `navigation/types.ts` typé en conséquence (`NavigatorScreenParams`).
**Fichiers** : `mobile-app/src/navigation/{AppNavigator.tsx,types.ts}`, `mobile-app/src/screens/student/my-profile/MyProfileScreen.tsx`, les écrans devenus onglets (en-tête sans bouton retour), `docs/ARCHITECTURE.md`.
**Critère de validation** :
```bash
grep -q 'createBottomTabNavigator' mobile-app/src/navigation/AppNavigator.tsx && grep -q 'NavigatorScreenParams' mobile-app/src/navigation/types.ts && (cd mobile-app && npx tsc --noEmit && npx jest --silent) && echo OK
```
**Hors périmètre** : deep links, mode sombre.

---

## Phase 9 — Expo SDK 57 (D-46)

Expo Go ne supporte qu'un seul SDK à la fois : le magasin l'a mis à jour en SDK 57 sur le téléphone de recette, le projet est en SDK 54 — l'application ne se charge plus (« Project is incompatible with this version of Expo Go »). Cette phase remet le mobile au niveau du dernier SDK. Aucun changement de contrat, aucune migration.

### - [x] 9.1 — Montée du mobile en Expo SDK 57
**Objectif** : `mobile-app` passe en **Expo SDK 57** (`expo@~57`, React Native et React aux versions du SDK, toutes les dépendances Expo alignées par `npx expo install --fix`, `jest-expo` et `babel-preset-expo` de la même génération) ; `npx expo-doctor` ne signale plus de version incompatible ; le `splash` de `app.json` (qui pointait vers un fichier absent, `assets/splash.png` — avertissement à chaque bundle) est remplacé par la configuration du SDK en vigueur sur `assets/splash-icon.png` ; le code applicatif n'est modifié **que** si le SDK le casse (aucune fonctionnalité ajoutée) ; `npx tsc --noEmit` et `npx jest` restent verts ; le bundle Android se charge dans Expo Go 57 (vérifié sur l'émulateur, écran de connexion atteint).
**Fichiers** : `mobile-app/package.json`, `mobile-app/package-lock.json`, `mobile-app/app.json`, au besoin `mobile-app/jest.config.js`, `mobile-app/tsconfig.json` et les fichiers cassés par la montée de version ; `docs/ARCHITECTURE.md`, `CLAUDE.md` (version du SDK).
**Critère de validation** :
```bash
cd mobile-app && node -e "const v=require('./package.json').dependencies.expo; if(!/^[~^]?57\./.test(v)) { console.error('expo='+v); process.exit(1) }" && npx expo-doctor && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : nouvelle architecture activée explicitement, EAS Build, passage à `expo-router`, mise à jour des écrans.

---

## Phase 10 — Français et arabe (D-47)

L'interface est en anglais alors que les élèves visés lisent le français ou l'arabe, et les messages du serveur sont en français (D-27) : l'app parle deux langues, au choix, l'arabe en RTL. Aucune route, aucun payload, aucune valeur en base ne change (D-18) : seul l'affichage.

### - [x] 10.1 — Infrastructure i18n et sélecteur de langue
**Objectif** : `expo-localization` installé ; `mobile-app/src/i18n/` = `fr.ts`, `ar.ts` (mêmes clés), `index.ts` (`t(key, params?)`, `useI18n()`, `setLanguage()`, `currentLanguage()`), contexte `LanguageProvider` monté au-dessus du navigateur ; au premier lancement la langue suit celle du téléphone (`ar*` → arabe, tout le reste → français, D-47), le choix est mémorisé sur l'appareil (`StorageService`) ; passer en arabe applique le RTL (`I18nManager.forceRTL(true)`) et redémarre l'app (`expo-updates`), repasser en français le retire ; sélecteur de langue sur l'écran de connexion **et** dans « My Profile ». Un test garantit que `fr` et `ar` ont exactement les mêmes clés et qu'aucune valeur n'est vide.
**Fichiers** : `mobile-app/src/i18n/{index.ts,fr.ts,ar.ts}` (nouveaux), `mobile-app/src/i18n/__tests__/i18n.test.ts` (nouveau), `mobile-app/src/context/LanguageContext.tsx` (nouveau), `mobile-app/src/components/LanguagePicker.tsx` (nouveau), `mobile-app/App.tsx`, `mobile-app/src/screens/auth/LoginScreen.tsx`, `mobile-app/src/screens/student/my-profile/MyProfileScreen.tsx`, `mobile-app/package.json`, `docs/ARCHITECTURE.md`.
**Critère de validation** :
```bash
cd mobile-app && node -e "const p=require('./package.json').dependencies; if(!p['expo-localization']||!p['expo-updates']) process.exit(1)" && npx tsc --noEmit && npx jest i18n --silent && npx jest --silent && echo OK
```
**Hors périmètre** : traduction des écrans (10.3, 10.4), préférence de langue stockée côté serveur (aucune route, hors contrat).

### - [x] 10.2 — Vocabulaire métier et formats traduits
**Objectif** : les libellés des modèles ne sont plus des constantes anglaises mais des clés traduites — `LESSON_TYPE_LABELS`, `LESSON_STATUS_LABELS`, `EXAM_TYPE_LABELS`, `EXAM_STATUS_LABELS`, `EXAM_RESULT_LABELS`, `EXAM_PROCEDURES` (D-42), `PAYMENT_METHOD_LABELS`, textes du parcours (`models/Journey.ts`, D-45) ; `utils/format.ts` formate dates, heures et montants selon la langue courante (`fr-FR` / `ar`). Les **valeurs** échangées avec le backend restent celles du contrat (D-18) : seuls les mots affichés changent. Les termes arabes du métier sont regroupés dans `ar.ts` et **restent à valider par une école** (D-47).
**Fichiers** : `mobile-app/src/models/{Lesson,Exam,Profile,Journey}.ts`, `mobile-app/src/utils/format.ts`, `mobile-app/src/i18n/{fr,ar}.ts`, les tests des modèles et de `format`.
**Critère de validation** :
```bash
cd mobile-app && npx jest models utils -t 'arabe' --silent && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : traduction des écrans.

### - [x] 10.3 — Écrans élève traduits
**Objectif** : plus une seule chaîne visible en dur dans les écrans d'authentification et d'élève : `Login`, `Register`, `InstructorRegistration`, `StudentDashboard`, `SchoolsList`, `SchoolDetail`, `BookLesson`, `MyLessons`, `RequestExam`, `MyExams`, `MyEnrollmentRequests`, `MyProfile` et ses trois onglets. Chaque écran lit ses textes par `t(...)` (titres, boutons, états vides, alertes, textes d'aide).
**Fichiers** : `mobile-app/src/screens/auth/*`, `mobile-app/src/screens/student/**`, `mobile-app/src/i18n/{fr,ar}.ts`.
**Critère de validation** :
```bash
cd mobile-app && test -z "$(grep -rL "useI18n\|from '../../i18n'\|from '../../../i18n'" src/screens/auth src/screens/student --include='*.tsx')" && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : écrans instructeur (10.4).

### - [x] 10.4 — Écrans instructeur traduits
**Objectif** : même chose pour `InstructorDashboard`, `TodayLessons`, `LessonRequests`, `BookForStudent`, `TodayExams`, `ExamRequests`, `EnrollmentRequests`, `StudentProfile` et ses trois onglets, et `components/AttendanceModal`.
**Fichiers** : `mobile-app/src/screens/instructor/**`, `mobile-app/src/i18n/{fr,ar}.ts`.
**Critère de validation** :
```bash
cd mobile-app && test -z "$(grep -rL "useI18n\|from '../../i18n'\|from '../../../i18n'\|from '../../../../i18n'" src/screens/instructor --include='*.tsx')" && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : messages d'erreur du serveur (10.5).

### - [x] 10.5 — Messages d'erreur du serveur traduits par code
**Objectif** : `getApiErrorMessage` traduit l'erreur à partir du **code stable** renvoyé par le backend (`error`, D-27) — `VALIDATION_ERROR`, `NOT_ENROLLED`, `CANCEL_WINDOW_CLOSED`, `FORBIDDEN_SCHOOL`, `FORBIDDEN`, `CONFLICT`, `NOT_FOUND`, `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `SCHOOL_CODE_INVALID`… — et ne retombe sur le texte français du serveur que si le code est inconnu ; l'élève en arabe ne voit plus de phrase française. Les codes traduits sont ceux du contrat : un code absent du contrat n'est pas inventé.
**Fichiers** : `mobile-app/src/services/api/ApiError.ts`, `mobile-app/src/services/api/__tests__/ApiError.test.ts` (nouveau), `mobile-app/src/i18n/{fr,ar}.ts`, `docs/API_CONTRACT.md` (note transverse : le mobile traduit par code).
**Critère de validation** :
```bash
cd mobile-app && npx jest ApiError -t 'code' --silent && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : traduction des messages côté backend (ils restent français, D-27).

### - [x] 10.6 — RTL vérifié en arabe
**Objectif** : l'app en arabe est utilisable : mises en page en miroir (barre d'onglets, cartes, timeline du parcours, en-têtes), icônes directionnelles retournées (chevrons, flèche retour), `textAlign` cohérent, aucune mise en page cassée. Les écarts trouvés sont corrigés (`I18nManager.isRTL` plutôt que des valeurs codées en dur ; `start`/`end` au lieu de `left`/`right`).
**Fichiers** : les écrans et composants concernés, `mobile-app/src/i18n/index.ts`.
**Critère de validation** :
```bash
cd mobile-app && test -z "$(grep -rn "marginLeft\|marginRight\|paddingLeft\|paddingRight" src/screens src/components --include='*.tsx' | grep -v 'Start\|End')" && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : traduction de nouveaux écrans, polices arabes personnalisées.

---

## Phase 11 — Front dédié : design system, thèmes clair et sombre (D-48)

Les écrans marchent mais se ressemblent tous : chacun redéclare ses couleurs et ses styles, les retours d'action passent par des fenêtres système, les chargements par un rond qui tourne. Cette phase donne à l'application un **système** (jetons, composants, états) et deux thèmes, sans changer une seule route ni une seule règle métier.

### - [x] 11.1 — Jetons de couleur, typographie et thèmes clair / sombre
**Objectif** : `src/theme` devient un jeu de **jetons sémantiques** (`surface`, `surfaceRaised`, `surfaceMuted`, `border`, `textPrimary`, `textSecondary`, `textMuted`, `textOnAccent`, `accent`, `accentSoft`, `success`, `warning`, `danger`, `overlay`, `skeleton`) déclinés en **clair** et **sombre**, plus une échelle typographique (tailles, graisses, interlignes), des rayons et des ombres ; palette retravaillée (le bleu par défaut de React Native laisse place à une identité propre, nom de l'app inchangé — D-48). `ThemeProvider` + `useTheme()` suivent le réglage du téléphone (`useColorScheme`). Deux tests : parité des jetons entre les thèmes (aucun jeton absent d'un côté) et **contraste** ≥ 4,5:1 pour les paires texte/fond de chaque thème.
**Fichiers** : `mobile-app/src/theme/{tokens.ts,light.ts,dark.ts,index.ts}`, `mobile-app/src/theme/__tests__/theme.test.ts` (nouveaux), `mobile-app/src/context/ThemeContext.tsx` (nouveau), `mobile-app/App.tsx`, `docs/ARCHITECTURE.md`.
**Critère de validation** :
```bash
cd mobile-app && npx jest theme -t 'contraste' && npx jest theme && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : refonte des écrans (11.3, 11.4), sélecteur manuel de thème (le réglage du téléphone fait foi, D-48).

### - [x] 11.2 — Bibliothèque de composants partagés
**Objectif** : `src/components/ui/` fournit ce que les écrans réécrivent aujourd'hui à la main : `Screen` (fond, marges, zone sûre), `AppBar` (titre, retour, action), `Button` (`primary` / `secondary` / `ghost` / `danger`, état chargement, désactivé), `Card`, `Chip`, `Badge`, `Field` (libellé, saisie, erreur), `SectionHeader`, `ListRow`, `EmptyState` (icône, titre, texte, action), `Skeleton`, `Toast`. Tous lisent le thème, aucun ne code une couleur en dur. Chaque composant a un test de rendu (clair et sombre).
**Fichiers** : `mobile-app/src/components/ui/*` et `mobile-app/src/components/ui/__tests__/*` (nouveaux).
**Critère de validation** :
```bash
cd mobile-app && npx jest components && test -z "$(grep -rn "#[0-9a-fA-F]\{6\}" src/components --include='*.tsx')" && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : remplacement dans les écrans (11.3, 11.4).

### - [x] 11.3 — Écrans élève refondus sur le système
**Objectif** : authentification, accueil « Mon parcours », écoles, fiche école, demandes de leçon et d'examen, mes leçons, mes examens, suivi d'inscription, « Mon profil » et ses onglets passent par les composants de 11.2 et les jetons de 11.1 : plus aucune couleur codée en dur, plus de `StyleSheet` dupliqué pour les cartes, les boutons ou les en-têtes ; hiérarchie visuelle retravaillée (titres, densité, respiration).
**Fichiers** : `mobile-app/src/screens/auth/*`, `mobile-app/src/screens/student/**`.
**Critère de validation** :
```bash
cd mobile-app && test -z "$(grep -rnE "(^|[^.a-zA-Z])colors\." src/screens/auth src/screens/student --include='*.tsx')" && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : écrans instructeur (11.4).
**Note sur le critère** : le `grep` d'origine (`"colors\."`) interdisait aussi `theme.colors.`, c'est-à-dire l'écriture visée par 11.1 ; il cherche désormais un `colors.` **non précédé d'un point**, soit l'ancienne constante seule.

### - [x] 11.4 — Écrans instructeur refondus sur le système
**Objectif** : même travail pour l'accueil « Aujourd'hui », les leçons du jour, les demandes de leçon et d'examen, les examens du jour, la réservation pour un élève, les demandes d'inscription, la fiche élève et ses onglets, et la modale de présence.
**Fichiers** : `mobile-app/src/screens/instructor/**`.
**Critère de validation** :
```bash
cd mobile-app && test -z "$(grep -rnE "(^|[^.a-zA-Z])colors\." src/screens/instructor --include='*.tsx')" && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : retours et animations (11.5).

### - [x] 11.5 — Retours d'action, chargements et états vides
**Objectif** : une action réussie ne bloque plus l'écran avec une fenêtre système — un **toast** l'annonce (`Toast` de 11.2) ; les `Alert` ne restent que pour ce qui demande une vraie confirmation (annuler une leçon, refuser une demande) et pour les erreurs bloquantes. Les chargements affichent des **squelettes** à la forme du contenu au lieu d'un rond centré ; chaque liste vide a un `EmptyState` avec une action ; les pressions ont un retour visuel (`Pressable`, opacité et échelle).
**Fichiers** : `mobile-app/src/components/ui/Toast.tsx`, `mobile-app/src/context/ToastContext.tsx` (nouveau), les écrans concernés.
**Critère de validation** :
```bash
cd mobile-app && test -z "$(grep -rn "Alert.alert(t('common.success')" src/screens --include='*.tsx')" && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : notifications système (hors v1, D-35).

### - [x] 11.6 — Thème sombre et accessibilité vérifiés écran par écran
**Objectif** : chaque écran est vu dans les deux thèmes sur l'émulateur (captures) ; les écarts sont corrigés ; les cibles tactiles font au moins 44 px, les actions principales portent `accessibilityRole` et `accessibilityLabel`, et aucun texte ne passe sous le seuil de contraste. L'icône et l'écran de démarrage suivent la nouvelle palette.
**Fichiers** : les écrans concernés, `mobile-app/app.json`, `mobile-app/assets/*`.
**Critère de validation** :
```bash
cd mobile-app && npx jest theme -t 'contraste' && test -z "$(grep -rn "accessibilityRole=\"button\"" src/components/ui --include='*.tsx' | wc -l | grep '^0$')" && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : refonte des illustrations, mode sombre du site web (gelé, D-05).

---


## Phase 12 — Inscription enrichie et fiche école (D-49, D-50, D-51)

Un élève ne donne aujourd'hui que son e-mail, son mot de passe et son nom ; les colonnes qui portent ses coordonnées existent en base mais **rien ne les écrit**. Une école, elle, ne peut être corrigée que par l'administrateur. Cette phase comble les deux : des détails facultatifs saisis à l'inscription (D-50, pas de photo — D-49) et une fiche école modifiable par son instructeur (D-51).

### - [x] 12.1 — Colonnes de coordonnées sur le compte et A2 étendu
**Objectif** : migration `014_user_contact_details.sql` (nullable, idempotente) : `users.phone`, `users.date_of_birth`, `users.address`, `users.emergency_contact`, `users.emergency_phone`. A2 accepte ces champs, **tous facultatifs**, pour une inscription **élève** (sans `schoolCode`) ; ils sont enregistrés sur le compte. Joi : `phone` ≤ 50, `address` ≤ 500, `emergencyContact` ≤ 255, `emergencyPhone` ≤ 50, `dateOfBirth` = date ISO **dans le passé**. Le contrat §1 (A2) est mis à jour dans le même commit.
**Fichiers** : `migrations/014_user_contact_details.sql`, `services/api/src/modules/auth/{validators,services,repositories,types}`, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm test -- --testPathPattern=auth && cd ../.. && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c "\d users" | grep -E "date_of_birth|emergency_contact" && echo OK
```
**Hors périmètre** : photo (D-49), rattrapage des comptes existants.

### - [x] 12.2 — L'approbation recopie les détails dans la fiche élève
**Objectif** : E5 (`approve`) remplit la ligne `students` créée avec les coordonnées du compte (`phone`, `date_of_birth`, `address`, `emergency_contact`, `emergency_phone`), dans la **même transaction**. Une valeur absente reste nulle ; la fiche instructeur (P1) et « Mon profil » (P8) les affichent sans changement de payload.
**Fichiers** : `services/api/src/modules/student/repositories/student.repository.ts` (la recopie se fait dans l'`INSERT`), tests.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm test -- --testPathPattern='student|enrollment' && echo OK
```
**Hors périmètre** : modification de ces champs après coup (12.5 ne couvre que l'école).

### - [x] 12.3 — Écran d'inscription élève : les détails facultatifs
**Objectif** : `RegisterScreen` gagne une section « Pour votre auto-école (facultatif) » : téléphone, date de naissance (sélecteur, jamais dans le futur), adresse, contact d'urgence (nom + téléphone). Champs vides = non envoyés. Textes au catalogue FR/AR (D-47), composants de 11.2, aucun champ obligatoire ajouté.
**Fichiers** : `mobile-app/src/screens/auth/RegisterScreen.tsx`, `mobile-app/src/services/api/AuthService.ts`, `mobile-app/src/models/User.ts`, `mobile-app/src/i18n/{fr,ar}.ts`.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : édition ultérieure de ces champs par l'élève.

### - [x] 12.4 — Fiche école modifiable par son instructeur (contrat)
**Objectif** : `PUT /api/schools/:id`, `POST /api/schools/:schoolId/pricing` et `DELETE /api/schools/pricing/:id` passent d'`admin` à « admin **ou** instructeur de cette école » (`SchoolGuard.assertSameSchool`, D-20 ; 403 `FORBIDDEN_SCHOOL` sinon). Champs modifiables : `name`, `address`, `phone`, `email`, `currency`. Le contrat §2 gagne les lignes S7, S8 et S9 et le §8 perd ces trois routes, **dans le même commit**.
**Fichiers** : `services/api/src/modules/school/`, `docs/API_CONTRACT.md`, tests.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm test -- --testPathPattern=school && echo OK
```
**Hors périmètre** : création ou suppression d'une école depuis l'app (reste `admin`, D-51).

### - [x] 12.5 — Écran « Mon école » côté instructeur
**Objectif** : nouvel écran (onglet « Élèves » → en-tête, ou raccourci de l'accueil) : fiche de l'école en lecture, bouton « Modifier » (nom, adresse, téléphone, e-mail, devise) et gestion de la grille tarifaire (ajouter un tarif type + prix + durée, retirer un tarif). Composants de 11.2, toasts de 11.5, textes au catalogue.
**Fichiers** : `mobile-app/src/screens/instructor/MySchoolScreen.tsx` (nouveau), `mobile-app/src/services/api/SchoolService.ts`, `mobile-app/src/navigation/AppNavigator.tsx`, `mobile-app/src/i18n/{fr,ar}.ts`.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && test -z "$(grep -rnE "(^|[^.a-zA-Z])colors\." src/screens/instructor --include='*.tsx')" && echo OK
```
**Hors périmètre** : gestion des instructeurs de l'école, codes d'inscription.

### - [x] 12.6 — Bout en bout : inscription détaillée jusqu'à la fiche élève
**Objectif** : un test e2e qui inscrit un élève **avec** ses coordonnées, le fait approuver par l'école, et vérifie que P1 les renvoie ; un second qui vérifie qu'un instructeur modifie sa propre école et **ne peut pas** modifier une autre école (403 `FORBIDDEN_SCHOOL`).
**Fichiers** : `tests/e2e/registration-details.e2e.test.ts` (nouveau).
**Critère de validation** :
```bash
npm run test:e2e -- -t 'inscription détaillée' && echo OK
```
**Hors périmètre** : recette manuelle sur téléphone (faite par l'humain).

---

## Après la Phase 12

La recette finale (parcours D-15 sur un téléphone via Expo Go, backend en Docker) est faite **par l'humain**, hors de cette liste. Les fonctionnalités hors contrat (paiement en ligne, web, gestion des codes par écran) ne sont pas dans la v1.
