# Plan d'exécution

Règles de lecture (voir `CLAUDE.md`, règles d'or 3 et 5) :
- On travaille dans l'ordre, sur la première tâche non cochée. Une tâche = un commit (message Conventional Commits, scope = domaine ou `infra` / `mobile` / `docs` / `e2e`), poussé sur `origin/main` aussitôt. Les tâches d'une même phase s'enchaînent sans validation intermédiaire ; arrêt obligatoire en fin de phase, sur question ouverte non tranchée, sur échec de critère non réparable dans la tâche, ou sur choix produit non tranché (D-36, 18/09/2026).
- Une tâche est cochée **seulement** quand sa commande « Critère de validation » a été exécutée et que sa sortie a été montrée. Pas d'exception.
- Si une tâche indique « Dépend de : Q-xx » et que la question n'est pas tranchée dans `DECISIONS.md`, on **s'arrête** et on demande. Phases 0 à 12 : Q-17 à Q-24 → D-40 à D-51. **Au 26/09/2026, Q-25 à Q-53 sont ouvertes** (feuille de route v1.1, phases 14 à 23) : aucune tâche de ces phases ne commence avant la réponse de l'humain.
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

La recette finale (parcours D-15 sur un téléphone via Expo Go, backend en Docker) a été faite **par l'humain** le 26/09/2026 : aucun bug. Les fonctionnalités hors contrat (paiement en ligne, web, gestion des codes par écran) ne sont pas dans la v1.

---

# Feuille de route v1.1 (26/09/2026)

Demande de l'auteur après la recette : des améliorations **métier**, précédées d'une **rénovation complète de l'interface** pour que les nouvelles fonctionnalités se construisent sur la nouvelle base.

| Phase | Ce que ça apporte | Questions |
|---|---|---|
| 13 | Rénovation UI/UX (design, 3D) — **à rédiger avec l'auteur** | — |
| 14 | Gérant de l'école : des droits distincts de ceux des moniteurs | Q-25 à Q-27 |
| 15 | Agenda de l'instructeur, conflits d'horaire, créneaux libres pour l'élève | Q-28 à Q-30 |
| 16 | Dossier administratif de l'élève (pièces reçues / manquantes) | Q-31, Q-32 |
| 17 | Notifications push, rappels de leçon, centre de notifications | Q-33 à Q-37 |
| 18 | Paiements partiels, reçus, caisse de l'école | Q-38 à Q-40 |
| 19 | Forfaits (heures prépayées) | Q-41 à Q-44 |
| 20 | Progression pédagogique par compétence | Q-45 à Q-47 |
| 21 | Examens : numéro de tentative, repasse, grille de prix | Q-48, Q-49 |
| 22 | Tableau de bord du gérant | Q-50 |
| 23 | Flotte de véhicules et échéances | Q-51 à Q-53 |

Règles propres à cette feuille de route :
- **Avant la Phase 14, l'humain répond à Q-25 … Q-53** (`docs/DECISIONS.md`) ; les réponses deviennent D-52 et suivantes dans un commit `docs(docs)`. Les tâches sont écrites pour l'option **recommandée** ; si une autre option est retenue, on réécrit les tâches concernées **dans ce même commit**, avant de coder.
- Les migrations prennent le **prochain numéro libre** au moment de la tâche (`015` pour la première) : on ne réserve pas de numéro à l'avance.
- Toute nouvelle route entre au contrat dans le même commit, avec un identifiant qui suit la numérotation de sa section (L9, S10…) ou une nouvelle section pour un nouveau domaine. Tout nouveau code d'erreur est ajouté aux conventions transverses du contrat **et** traduit côté mobile (10.5).
- Côté mobile : composants et règles d'interface issus de la Phase 13, textes au catalogue FR / AR (D-47) vérifiés en RTL, chaque nouvelle méthode de service a son test (`mockApiClient`), aucun appel réseau hors `src/services/api/`.
- Le conteneur `api` tourne sur une image compilée : chaque critère e2e commence par `docker compose up -d --build --force-recreate api`.
- La dernière tâche de chaque phase relance **toute** la suite e2e : une phase ne se termine pas sur une régression.

---

## Phase 13 — Rénovation UI/UX (à rédiger)

Demande de l'auteur du 26/09/2026 : refonte complète de l'interface mobile (design propre, intégration d'éléments 3D) **avant** les phases 14 à 23. La direction artistique, les bibliothèques retenues, la liste des écrans et les critères de validation sont définis avec l'auteur dans une session dédiée ; les tâches remplacent alors ce paragraphe, et la décision correspondante entre dans `docs/DECISIONS.md`.

**Tant que cette phase ne contient aucune tâche, s'arrêter et demander.**

---

## Phase 14 — Gérant de l'école (Q-25, Q-26, Q-27)

Tous les instructeurs d'une école ont aujourd'hui les mêmes droits. Avant d'ajouter de l'argent (caisse, forfaits) et du pilotage (tableau de bord), il faut pouvoir réserver certaines actions au **gérant**. Tâches écrites pour Q-25 (b) : un drapeau sur l'instructeur, pas un nouveau rôle.

### - [ ] 14.1 — Drapeau gérant et code d'inscription gérant
**Objectif** : migration `0NN_school_manager.sql` (idempotente) : `instructors.is_manager BOOLEAN NOT NULL DEFAULT false` ; la contrainte `CHECK` de `school_codes.role` accepte `manager` (contrainte recréée dans la nouvelle migration, 002 n'est pas modifiée). A2 avec un code `manager` crée un instructeur (`users.role = 'instructor'`) avec `is_manager = true`, dans la même transaction que la consommation du code. A3 (`/me`) renvoie `isManager` pour un instructeur. Contrat §1 (A2, A3) mis à jour.
**Dépend de** : Q-25, Q-27.
**Fichiers** : `migrations/0NN_school_manager.sql`, `services/api/src/modules/auth/`, `services/api/src/modules/school/repositories/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
./scripts/migrate.sh && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c "\d instructors" | grep is_manager && cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern=auth && echo OK
```
**Hors périmètre** : garde sur les routes (14.3), écran de gestion des codes.

### - [ ] 14.2 — Scripts : code gérant à l'onboarding, désignation d'un gérant existant
**Objectif** : `scripts/onboard-school.sh` émet, en plus du code instructeur, un **code gérant** à une utilisation (`MGR-<SLUG>-<4 car.>`) ; sortie : les deux codes, un par ligne, étiquetés. Nouveau `scripts/set-manager.sh <email> [on|off]` : bascule `is_manager` d'un instructeur existant (écoles pilotes), refuse un compte qui n'est pas instructeur. README « Onboarding d'une école » mis à jour.
**Dépend de** : Q-27.
**Fichiers** : `scripts/onboard-school.sh`, `scripts/set-manager.sh` (nouveau), `README.md`.
**Critère de validation** :
```bash
./scripts/onboard-school.sh "Ecole Test Gerant" "1 rue X" "+21600000000" "gerant-test@example.tn" | grep -E '^MGR-' && ./scripts/set-manager.sh instructor@seed.io on && docker exec driving-school-postgres psql -U admin -d driving_school -tAc "SELECT i.is_manager FROM instructors i JOIN users u ON u.id = i.user_id WHERE u.email = 'instructor@seed.io'" | grep -x t && ./scripts/set-manager.sh instructor@seed.io off && echo OK
```
**Hors périmètre** : écran d'administration.

### - [ ] 14.3 — Garde « gérant » côté serveur
**Objectif** : `SchoolGuard.assertManager(user, schoolId)` dans `src/http/authz.ts` : instructeur de l'école **et** `is_manager`, sinon 403 `FORBIDDEN_MANAGER` ; l'admin passe. Appliquée aux routes existantes que Q-26 réserve au gérant (S7, S8, S9 si (a) est retenu). Les routes des phases suivantes l'utilisent dès leur création. Contrat : S7–S9 et nouveau code d'erreur.
**Dépend de** : Q-26.
**Fichiers** : `services/api/src/http/authz.ts`, `services/api/src/modules/school/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='authz|school' && echo OK
```
**Hors périmètre** : routes des phases suivantes.

### - [ ] 14.4 — Mobile : le moniteur ne voit plus les actions du gérant
**Objectif** : `isManager` dans le modèle `User` et l'`AuthContext` (lu depuis `/me`) ; « Mon école » en lecture seule pour un moniteur (boutons Modifier et tarifs masqués), `FORBIDDEN_MANAGER` traduit FR / AR. Un hook `useIsManager()` sert aux phases suivantes.
**Dépend de** : Q-26.
**Fichiers** : `mobile-app/src/models/User.ts`, `mobile-app/src/context/AuthContext.tsx`, `mobile-app/src/screens/instructor/MySchoolScreen.tsx`, `mobile-app/src/i18n/{fr,ar}.ts`, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : écrans des phases suivantes.

### - [ ] 14.5 — Bout en bout : gérant et moniteur
**Objectif** : e2e « gérant » : inscription avec un code gérant → `/me` renvoie `isManager: true` ; un moniteur reçoit 403 `FORBIDDEN_MANAGER` sur S7 ; le gérant modifie sa fiche (200) ; un gérant d'une autre école reçoit 403 `FORBIDDEN_SCHOOL`. Seed e2e : un code gérant `MGR-SEED`.
**Fichiers** : `tests/e2e/manager.e2e.test.ts` (nouveau), `tests/fixtures/seed.sql`.
**Critère de validation** :
```bash
test -f tests/e2e/manager.e2e.test.ts && docker compose up -d --build --force-recreate api && npm run test:e2e && echo OK
```
**Hors périmètre** : —

---

## Phase 15 — Agenda et conflits d'horaire (Q-28, Q-29, Q-30)

L'instructeur planifie aujourd'hui sans voir son planning, et rien n'empêche deux leçons à la même heure. Cette phase donne un agenda, contrôle les chevauchements, puis (Q-30 (b)) laisse l'élève choisir parmi de vrais créneaux libres.

### - [ ] 15.1 — Route agenda
**Objectif** : `GET /api/lessons/agenda?from=&to=&instructorId=` (instructeur de l'école / admin) : leçons `scheduled` et `completed` dont `scheduledDate` ∈ [`from`, `to`[ (plage ≤ 31 jours, 400 `VALIDATION_ERROR` sinon), triées par date, au format `Lesson`. Portée : toute l'école, `instructorId` filtre (Q-29 (b)). Contrat §4, ligne L9.
**Dépend de** : Q-29.
**Fichiers** : `services/api/src/modules/lesson/{routes,controllers,services,repositories,validators}`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern=lesson && echo OK
```
**Hors périmètre** : examens dans l'agenda (pas d'instructeur attitré, D-33).

### - [ ] 15.2 — Chevauchements refusés ou signalés à la planification
**Objectif** : L4 et L5 vérifient qu'aucune leçon `scheduled` **du même instructeur ou du même élève** ne chevauche [`scheduledDate`, `scheduledDate + durationMinutes`[. Conflit → 409 `SCHEDULE_CONFLICT` avec `conflict: { lessonId, scheduledDate, durationMinutes, instructorId, studentId }` dans le corps d'erreur ; `force: true` dans le payload passe outre (Q-28 (b)). Vérification et écriture dans la **même transaction**, sous verrou (`pg_advisory_xact_lock` sur l'instructeur) pour que deux approbations simultanées ne passent pas toutes les deux. Un `ScheduleConflictChecker` injecté, réutilisé en 23.3 pour les véhicules. Contrat L4, L5, code d'erreur.
**Dépend de** : Q-28.
**Fichiers** : `services/api/src/modules/lesson/services/`, `services/api/src/modules/lesson/repositories/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern=lesson && echo OK
```
**Hors périmètre** : véhicules (23.3).

### - [ ] 15.3 — Écran Agenda
**Objectif** : écran « Agenda » instructeur : semaine en cours, semaine précédente / suivante / aujourd'hui, un bloc par leçon (heure, durée, type, élève), tap → fiche élève, filtre par instructeur. Accès depuis la navigation définie en Phase 13. `LessonService.getAgenda(from, to, instructorId?)` + test.
**Dépend de** : Q-29.
**Fichiers** : `mobile-app/src/screens/instructor/AgendaScreen.tsx` (nouveau), `mobile-app/src/services/api/LessonService.ts`, `mobile-app/src/config/api.config.ts`, navigation, `mobile-app/src/i18n/{fr,ar}.ts`, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : glisser-déposer pour déplacer une leçon.

### - [ ] 15.4 — Conflit affiché au moment de planifier
**Objectif** : l'approbation (`LessonRequestsScreen`) et la réservation directe (`BookForStudentScreen`) affichent le conflit renvoyé (heure et élève de la leçon en conflit) et proposent « Planifier quand même » (renvoi avec `force: true`) ; `SCHEDULE_CONFLICT` traduit FR / AR.
**Dépend de** : Q-28.
**Fichiers** : `mobile-app/src/screens/instructor/{LessonRequestsScreen,BookForStudentScreen}.tsx`, `mobile-app/src/services/api/`, `mobile-app/src/i18n/{fr,ar}.ts`, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : suggestion automatique d'un autre horaire.

### - [ ] 15.5 — Bout en bout : agenda et conflit
**Objectif** : e2e « agenda » : deux leçons qui se chevauchent pour le même instructeur → 409 `SCHEDULE_CONFLICT`, puis 200 avec `force: true` ; même contrôle pour un même élève ; L9 renvoie les leçons de la semaine ; un instructeur d'une autre école → 403 `FORBIDDEN_SCHOOL`.
**Fichiers** : `tests/e2e/agenda.e2e.test.ts` (nouveau).
**Critère de validation** :
```bash
test -f tests/e2e/agenda.e2e.test.ts && docker compose up -d --build --force-recreate api && npm run test:e2e && echo OK
```
**Hors périmètre** : —

### - [ ] 15.6 — Disponibilités des instructeurs
**Objectif** : migration `0NN_instructor_availability.sql` : `instructor_availability (id, instructor_id → instructors, weekday 0–6, start_time TIME, end_time TIME, CHECK (end_time > start_time))`. Routes `GET /api/instructors/me/availability` et `PUT /api/instructors/me/availability` (l'instructeur remplace **sa semaine type** en une fois ; plages d'un même jour sans chevauchement, 400 sinon). Nouvelle section du contrat.
**Dépend de** : Q-30.
**Fichiers** : `migrations/0NN_instructor_availability.sql`, `services/api/src/modules/lesson/` (ou module `schedule` si la tâche le juge plus clair), tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
./scripts/migrate.sh && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c "\d instructor_availability" | grep weekday && cd services/api && npx tsc --noEmit && npm run lint && npm test && echo OK
```
**Hors périmètre** : congés et absences ponctuelles de l'instructeur (tâche future si demandée).

### - [ ] 15.7 — Créneaux libres pour l'élève
**Objectif** : `GET /api/lessons/free-slots?type=&from=&to=` (élève avec inscription `approved`, école résolue par D-22 ; 403 `NOT_ENROLLED` sinon) : créneaux de la durée du tarif du type (S4 `duration`, 60 min à défaut), tirés des disponibilités des instructeurs de l'école, moins les leçons `scheduled` qui les chevauchent, uniquement dans le futur, plage ≤ 14 jours. Chaque créneau : `{ start, end, instructorId, instructorFirstName, instructorLastName }`. **L2 ne change pas** : l'élève envoie `requestedDate = start` et `preferredInstructorId = instructorId`, la demande reste `pending` (D-01). Contrat §4, ligne L10.
**Dépend de** : Q-30.
**Fichiers** : `services/api/src/modules/lesson/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern=lesson && echo OK
```
**Hors périmètre** : réservation sans approbation (Q-30 (c) non retenue).

### - [ ] 15.8 — Écran « Mes disponibilités »
**Objectif** : l'instructeur saisit sa semaine type (plages par jour, ajout / retrait), enregistrée d'un bloc (PUT). Service + test.
**Dépend de** : Q-30.
**Fichiers** : `mobile-app/src/screens/instructor/MyAvailabilityScreen.tsx` (nouveau), service, `api.config.ts`, navigation, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 15.9 — L'élève choisit un créneau libre
**Objectif** : `BookLessonScreen` propose, après le choix du type, les créneaux libres groupés par jour (instructeur affiché) ; en choisir un pré-remplit la demande. Repli « Proposer une autre date » (saisie libre actuelle) si aucun créneau ou si l'école n'a publié aucune disponibilité.
**Dépend de** : Q-30.
**Fichiers** : `mobile-app/src/screens/student/BookLessonScreen.tsx`, `mobile-app/src/services/api/LessonService.ts`, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 15.10 — Bout en bout : créneaux libres
**Objectif** : e2e « créneaux libres » : un instructeur publie une plage, l'élève voit les créneaux, une leçon planifiée sur l'un d'eux le fait disparaître, un élève non inscrit reçoit 403 `NOT_ENROLLED`.
**Fichiers** : `tests/e2e/free-slots.e2e.test.ts` (nouveau).
**Critère de validation** :
```bash
test -f tests/e2e/free-slots.e2e.test.ts && docker compose up -d --build --force-recreate api && npm run test:e2e && echo OK
```
**Hors périmètre** : —

---

## Phase 16 — Dossier administratif de l'élève (Q-31, Q-32)

Pour présenter un élève à l'examen, l'école doit réunir des pièces (CIN, photos, certificat médical…). Aujourd'hui elle ne peut que répondre « File not ready » (D-42). Ici : une liste de pièces par école, cochée par l'instructeur à la réception au bureau, visible par l'élève. Pas d'envoi de fichier (D-49).

### - [ ] 16.1 — Tables des pièces et du dossier
**Objectif** : migration `0NN_student_documents.sql` : `document_types (id, school_id, label, position, active)` initialisée avec la liste par défaut de Q-31 pour **chaque école existante** ; `student_documents (id, student_id → students, document_type_id, received_at, received_by → users, note, UNIQUE (student_id, document_type_id))`. La création d'une école (route admin, script d'onboarding) insère la liste par défaut.
**Dépend de** : Q-31.
**Fichiers** : `migrations/0NN_student_documents.sql`, `services/api/src/modules/school/repositories/`, `scripts/onboard-school.sh`, tests.
**Critère de validation** :
```bash
./scripts/migrate.sh && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -tAc "SELECT count(*) > 0 FROM document_types" | grep -x t && cd services/api && npx tsc --noEmit && npm run lint && npm test && echo OK
```
**Hors périmètre** : date d'expiration d'une pièce.

### - [ ] 16.2 — Routes du dossier
**Objectif** : liste des pièces de l'école : lecture (instructeur de l'école), ajout / renommage / désactivation (gérant, `assertManager`). Dossier d'un élève : lecture (instructeur de l'école, et l'élève pour le sien), « reçue » / « pas reçue » sur une pièce (instructeur de l'école). Réponse `StudentFile` : `{ complete, documents: [{ documentTypeId, label, received, receivedAt?, note? }] }`. Nouvelle section du contrat.
**Dépend de** : Q-26, Q-31.
**Fichiers** : `services/api/src/modules/student/` (ou module `document`), tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test && echo OK
```
**Hors périmètre** : —

### - [ ] 16.3 — Dossier visible au moment de l'examen
**Objectif** : l'objet `Exam` (X1) et la fiche élève (P1, P8) portent `fileComplete` et `missingDocuments: string[]`. Q-32 (a) : purement informatif, X2 inchangé. Contrat X1, P1, P8.
**Dépend de** : Q-32.
**Fichiers** : `services/api/src/modules/exam/`, `services/api/src/modules/student/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='exam|profile' && echo OK
```
**Hors périmètre** : blocage de la demande d'examen (Q-32 (b) / (c) non retenues).

### - [ ] 16.4 — Mobile : dossier côté instructeur
**Objectif** : onglet « Dossier » de la fiche élève (cocher une pièce reçue, note facultative) ; gestion de la liste des pièces dans « Mon école » (gérant seulement) ; badge « dossier incomplet » sur les demandes d'examen (`ExamRequestsScreen`).
**Dépend de** : Q-26, Q-31.
**Fichiers** : `mobile-app/src/screens/instructor/student-profile/tabs/StudentFileTab.tsx` (nouveau), `MySchoolScreen.tsx`, `ExamRequestsScreen.tsx`, service, `src/models/`, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 16.5 — Mobile : « Mon dossier » côté élève
**Objectif** : carte « Mon dossier » sur l'accueil élève : pièces manquantes à apporter au bureau, ou « Dossier complet » ; détail depuis « Mon profil ».
**Dépend de** : Q-31.
**Fichiers** : `mobile-app/src/screens/student/StudentDashboard.tsx`, `mobile-app/src/screens/student/my-profile/`, service, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : envoi de photo d'une pièce (D-49).

### - [ ] 16.6 — Bout en bout : dossier
**Objectif** : e2e « dossier » : une école a sa liste par défaut ; l'instructeur coche toutes les pièces → `complete: true` ; l'élève lit son dossier ; un moniteur ne peut pas modifier la liste (403 `FORBIDDEN_MANAGER`) ; X1 renvoie `fileComplete`.
**Fichiers** : `tests/e2e/student-file.e2e.test.ts` (nouveau).
**Critère de validation** :
```bash
test -f tests/e2e/student-file.e2e.test.ts && docker compose up -d --build --force-recreate api && npm run test:e2e && echo OK
```
**Hors périmètre** : —

---

## Phase 17 — Notifications (Q-33 à Q-37)

D-35 avait écarté les notifications de la v1 : l'élève doit ouvrir l'app pour savoir si sa leçon est acceptée. Cette phase les ajoute. **Expo Go ne reçoit plus les push sur Android depuis le SDK 53** : il faut une version installable (build de développement EAS), qui demande une action de l'humain.

### - [ ] 17.1 — Build de développement Android (EAS)
**Objectif** : `expo-dev-client` et `expo-notifications` installés (`npx expo install`), plugin déclaré dans `app.json`, `eas.json` avec un profil `development` (APK interne Android). **Action humaine** : `npx eas login`, `npx eas init` (écrit `extra.eas.projectId`), puis `npx eas build --profile development --platform android` et installation de l'APK sur le téléphone. Le README gagne une section « Version installable ». Expo Go reste utilisable pour tout ce qui n'est pas une notification.
**Dépend de** : Q-37.
**Fichiers** : `mobile-app/package.json`, `mobile-app/app.json`, `mobile-app/eas.json` (nouveau), `README.md`.
**Critère de validation** :
```bash
cd mobile-app && npx expo-doctor && npx expo config --json | grep -q '"projectId"' && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : iOS (Q-37 (b) non retenue), publication sur le Play Store.

### - [ ] 17.2 — Jetons push côté serveur
**Objectif** : migration `0NN_push_tokens.sql` : `push_tokens (id, user_id → users, token UNIQUE, platform, language ∈ fr|ar, updated_at)`. Routes `PUT /api/notifications/push-token` (`{ token, platform, language }`, upsert, tout utilisateur connecté) et `DELETE /api/notifications/push-token` (`{ token }`, au logout). La langue suit le choix fait dans l'app (D-47). Contrat §7 réécrit ; D-35 est remplacée par la décision issue de Q-33.
**Dépend de** : Q-33.
**Fichiers** : `migrations/0NN_push_tokens.sql`, `services/api/src/modules/notification/` (nouveau module, `buildNotification()`), `services/api/src/app.ts`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
./scripts/migrate.sh && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c "\d push_tokens" | grep language && cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern=notification && echo OK
```
**Hors périmètre** : envoi (17.3).

### - [ ] 17.3 — Envoi par l'API push d'Expo
**Objectif** : interface `IPushSender` ; `ExpoPushSender` (HTTP vers l'API push d'Expo, envois groupés par 100, jeton `DeviceNotRegistered` supprimé de `push_tokens`) ; `LogPushSender` pour le dev et l'e2e (`NOTIFICATIONS_DRIVER=log|expo` dans `loadEnv`, `log` par défaut). Catalogue des messages FR / AR **côté serveur** (titre, corps, `data: { screen, id }` pour ouvrir le bon écran). Chaque notification est aussi écrite dans la table `notifications` (001) pour l'historique (Q-36 (b)).
**Dépend de** : Q-33, Q-36.
**Fichiers** : `services/api/src/modules/notification/`, `services/api/src/config/env.ts`, `.env.example`, tests.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern=notification && echo OK
```
**Hors périmètre** : e-mail, SMS.

### - [ ] 17.4 — Événements branchés
**Objectif** : un `Notifier` injecté dans les services `enrollment`, `lesson`, `exam` envoie les événements retenus en Q-33 aux destinataires de Q-34 (demande neuve : l'instructeur préféré s'il existe, sinon tous les instructeurs de l'école). L'envoi est fait **après** la réussite de l'action et **n'échoue jamais la requête** (erreur journalisée). Tests : chaque événement produit le bon message au bon destinataire, et un envoi en échec laisse la requête en 200.
**Dépend de** : Q-33, Q-34.
**Fichiers** : `services/api/src/modules/{student,lesson,exam}/services/`, `services/api/src/modules/*/index.ts`, tests.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test && echo OK
```
**Hors périmètre** : préférences de notification par utilisateur.

### - [ ] 17.5 — Rappel de leçon
**Objectif** : migration : `lessons.reminder_sent_at TIMESTAMP`. Tâche planifiée dans l'API (toutes les 15 min, verrou Redis pour qu'une seule instance l'exécute) : la veille à 18 h (heure de Tunis), rappel à l'élève de chaque leçon `scheduled` du lendemain, puis `reminder_sent_at` renseigné (jamais deux rappels). Q-35 (a).
**Dépend de** : Q-35.
**Fichiers** : `migrations/0NN_lesson_reminder.sql`, `services/api/src/modules/notification/jobs/`, `services/api/src/index.ts`, tests (horloge injectée).
**Critère de validation** :
```bash
./scripts/migrate.sh && cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='notification|reminder' && echo OK
```
**Hors périmètre** : rappel d'examen.

### - [ ] 17.6 — Centre de notifications (routes)
**Objectif** : `GET /api/notifications?unread=` (celles de l'appelant, 50 dernières), `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`. Contrat §7.
**Dépend de** : Q-36.
**Fichiers** : `services/api/src/modules/notification/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern=notification && echo OK
```
**Hors périmètre** : suppression de notifications.

### - [ ] 17.7 — Mobile : permission, jeton, ouverture du bon écran, historique
**Objectif** : la permission est demandée **après** la connexion (jamais au premier lancement), le jeton est envoyé avec la langue courante (et renvoyé quand la langue change), supprimé au logout ; toucher une notification ouvre l'écran de `data.screen` ; écran « Notifications » (liste, lu / non lu, tout marquer lu) et badge du nombre de non-lues. `NotificationService` + tests.
**Dépend de** : Q-36, Q-37.
**Fichiers** : `mobile-app/src/services/api/NotificationService.ts` (nouveau), `mobile-app/src/services/push.ts` (nouveau), `mobile-app/src/screens/common/NotificationsScreen.tsx` (nouveau), `AuthContext`, navigation, i18n, `jest.setup.js` (mock `expo-notifications`), tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && npx expo-doctor && echo OK
```
**Hors périmètre** : —

### - [ ] 17.8 — Bout en bout : notifications
**Objectif** : e2e « notifications » (`NOTIFICATIONS_DRIVER=log`) : enregistrement d'un jeton ; une approbation de leçon crée une notification pour l'élève (lue par la route de 17.6) ; une nouvelle demande notifie l'école ; marquer lu. La recette réelle sur téléphone (APK de 17.1) est faite par l'humain.
**Fichiers** : `tests/e2e/notifications.e2e.test.ts` (nouveau), `docker-compose.yml` si la variable doit être passée.
**Critère de validation** :
```bash
test -f tests/e2e/notifications.e2e.test.ts && docker compose up -d --build --force-recreate api && npm run test:e2e && echo OK
```
**Hors périmètre** : recette sur téléphone (humain).

---

## Phase 18 — Paiements partiels et reçus (Q-38, Q-39, Q-40)

Aujourd'hui une leçon est payée ou non, d'un bloc. En réalité l'élève verse des acomptes. Tâches écrites pour Q-38 (b) : un **compte élève**, où chaque versement est imputé sur le dû le plus ancien et où l'excédent devient de l'avoir (D-40).

### - [ ] 18.1 — Versements et imputations
**Objectif** : migration `0NN_student_payments.sql` : `student_payments (id, student_id → students, school_id, amount > 0, payment_method ∈ cash|card|bank_transfer, receipt_number, received_by → users, received_at, note, cancelled_at, cancelled_by, cancel_reason, UNIQUE (school_id, receipt_number))` et `payment_allocations (id, payment_id, lesson_id?, exam_id?, amount > 0, CHECK exactement une cible)`. **Reprise de l'existant** : chaque leçon ou examen déjà `paid` reçoit un versement et une imputation de son `amount` (numéros de reçu attribués par école dans l'ordre des `payment_date`). Numéro de reçu : séquence par école, sans trou, attribuée sous verrou.
**Dépend de** : Q-38.
**Fichiers** : `migrations/0NN_student_payments.sql`, tests de migration (compte avant / après).
**Critère de validation** :
```bash
./scripts/migrate.sh && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -tAc "SELECT (SELECT count(*) FROM lessons WHERE paid) + (SELECT count(*) FROM exams WHERE paid) = (SELECT count(*) FROM payment_allocations)" | grep -x t && echo OK
```
**Hors périmètre** : routes (18.2).

### - [ ] 18.2 — Encaisser un versement
**Objectif** : `POST /api/profiles/:studentId/payments` `{ amount, paymentMethod, note? }` (instructeur de l'école, ou gérant seulement si Q-26 (h)) : imputé dans une transaction sur le dû **du plus ancien au plus récent** (leçons `scheduled` et `completed` présentes, examens avec un prix) ; reste → `students.credit`. Chaque ligne expose `amountPaid` et `remaining` ; `paid` devient `remaining = 0`. P6 / P7 deviennent « solder cette ligne » (un versement du reste de la ligne). P2–P4, P9–P11 exposent les nouveaux champs ; D-40 et D-41 restent vrais (absence hors dû, avoir imputé). Contrat §6.
**Dépend de** : Q-26, Q-38.
**Fichiers** : `services/api/src/modules/student/` (services et repositories financiers), tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='profile|payment|financial' && echo OK
```
**Hors périmètre** : paiement en ligne (module `payment`, D-31).

### - [ ] 18.3 — Historique et annulation d'un versement
**Objectif** : `GET /api/profiles/:studentId/payments` (instructeur de l'école) et `GET /api/student-profiles/me/payments` (l'élève) : versements avec leurs imputations. `POST /api/payments/:id/cancel` `{ reason }` (10–500 car.) : gérant, sans limite de temps (Q-40 (c)) ; le versement est marqué annulé (jamais supprimé), ses imputations sont retirées, le dû recalculé, et l'avoir repris si le versement l'avait alimenté. Contrat.
**Dépend de** : Q-40.
**Fichiers** : `services/api/src/modules/student/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='payment' && echo OK
```
**Hors périmètre** : —

### - [ ] 18.4 — Caisse de l'école
**Objectif** : `GET /api/schools/:id/cash?from=&to=` (gérant) : total encaissé, total par mode de paiement, total par jour, liste des versements (non annulés) avec élève et moniteur qui a encaissé. Contrat §2.
**Dépend de** : Q-26.
**Fichiers** : `services/api/src/modules/school/` (ou `student`), tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='cash' && echo OK
```
**Hors périmètre** : dépenses de l'école (carburant, salaires).

### - [ ] 18.5 — Mobile : encaisser et historique
**Objectif** : bouton « Encaisser » sur la fiche élève (montant libre, mode de paiement, note) avec aperçu de l'imputation avant validation ; historique des versements ; annulation (gérant, motif obligatoire). Reste à payer affiché sur chaque ligne. Côté élève : historique de ses versements.
**Dépend de** : Q-38, Q-40.
**Fichiers** : `mobile-app/src/screens/instructor/student-profile/`, `mobile-app/src/screens/student/my-profile/`, `mobile-app/src/services/api/`, `src/models/`, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 18.6 — Reçu
**Objectif** : écran « Reçu » (école, numéro, date, élève, montant, mode, lignes réglées, avoir restant) ouvert depuis l'historique (élève et instructeur) ; « Partager en PDF » génère le PDF sur le téléphone (`expo-print` + `expo-sharing`, installés par `npx expo install`), en FR ou AR selon la langue.
**Dépend de** : Q-39.
**Fichiers** : `mobile-app/src/screens/common/ReceiptScreen.tsx` (nouveau), `mobile-app/src/utils/receipt.ts` (nouveau, gabarit HTML du PDF), `package.json`, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && npx expo-doctor && echo OK
```
**Hors périmètre** : envoi automatique du reçu par e-mail.

### - [ ] 18.7 — Mobile : écran Caisse du gérant
**Objectif** : écran « Caisse » (gérant) : aujourd'hui / cette semaine / ce mois, total et répartition par mode, liste des versements, tap → reçu.
**Dépend de** : Q-26.
**Fichiers** : `mobile-app/src/screens/instructor/CashScreen.tsx` (nouveau), service, navigation, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : export comptable.

### - [ ] 18.8 — Bout en bout : paiements partiels
**Objectif** : e2e « paiements partiels » : deux leçons à 40 ; versement de 50 → première soldée, seconde avec 30 restants ; versement de 50 → seconde soldée, avoir de 20 ; annulation du second versement par le gérant → retour à l'état précédent ; un moniteur ne peut pas annuler (403) ; la caisse du jour affiche 50.
**Fichiers** : `tests/e2e/partial-payments.e2e.test.ts` (nouveau).
**Critère de validation** :
```bash
test -f tests/e2e/partial-payments.e2e.test.ts && docker compose up -d --build --force-recreate api && npm run test:e2e && echo OK
```
**Hors périmètre** : —

---

## Phase 19 — Forfaits (Q-41 à Q-44)

Les écoles vendent des packs d'heures (« 20 h de conduite ») plutôt que des leçons à l'unité. Tâches écrites pour : heures par type (Q-41 (a)), attribution au comptoir (Q-42 (a)), absence non décomptée (Q-43 (a)), tarif normal au-delà et pas d'expiration (Q-44 (a)).

### - [ ] 19.1 — Catalogue et forfaits d'élève
**Objectif** : migration `0NN_packs.sql` : `pack_templates (id, school_id, name, price, active)` + `pack_template_items (template_id, lesson_type, hours)` ; `student_packs (id, student_id → students, name, price, sold_at, sold_by)` + `student_pack_items (student_pack_id, lesson_type, minutes_total)` (copie figée du modèle à la vente, comme D-30 pour les prix) ; `lessons.student_pack_id` nullable ; `payment_allocations.student_pack_id` (troisième cible possible d'une imputation, CHECK mis à jour).
**Dépend de** : Q-41, Q-44.
**Fichiers** : `migrations/0NN_packs.sql`, tests.
**Critère de validation** :
```bash
./scripts/migrate.sh && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c "\d student_pack_items" | grep minutes_total && echo OK
```
**Hors périmètre** : —

### - [ ] 19.2 — Catalogue de l'école (routes)
**Objectif** : `GET /api/schools/:id/packs` (public, forfaits actifs) ; création, modification et désactivation par le gérant (`assertManager`). Contrat §2.
**Dépend de** : Q-26, Q-41.
**Fichiers** : `services/api/src/modules/school/` (ou module `pack`), tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern=pack && echo OK
```
**Hors périmètre** : —

### - [ ] 19.3 — Attribuer un forfait à un élève
**Objectif** : `POST /api/profiles/:studentId/packs` `{ templateId }` (instructeur de l'école) : crée le forfait de l'élève ; son prix entre dans le dû (imputable par les versements de 18.2). `GET` des forfaits d'un élève (instructeur et l'élève pour lui-même) avec, par type, minutes totales / consommées / réservées / restantes. Contrat §6.
**Dépend de** : Q-38, Q-42.
**Fichiers** : `services/api/src/modules/student/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern=pack && echo OK
```
**Hors périmètre** : demande de forfait par l'élève (Q-42 (b) non retenue).

### - [ ] 19.4 — Consommation des heures
**Objectif** : à la planification (L4, L5), si l'élève a un forfait avec assez de minutes restantes pour ce type, la leçon y est rattachée (`student_pack_id`, **prix 0**, hors dû) : ses minutes sont **réservées** ; présence (L7 `attended = true`) → **consommées** ; annulation (L3) ou absence (L7 `attended = false`, Q-43 (a)) → libérées. Sans assez de minutes : tarif normal (Q-44 (a)). Tests sur chaque transition, forfaits multiples (le plus ancien d'abord). Contrat L3, L4, L5, L7 (`studentPackId` dans `Lesson`).
**Dépend de** : Q-43, Q-44.
**Fichiers** : `services/api/src/modules/lesson/services/`, `services/api/src/modules/student/repositories/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='lesson|pack' && echo OK
```
**Hors périmètre** : —

### - [ ] 19.5 — Mobile : catalogue
**Objectif** : « Mon école » : gestion des forfaits (gérant) ; fiche école publique (`SchoolDetailScreen`) : les forfaits à côté des tarifs.
**Dépend de** : Q-26.
**Fichiers** : `MySchoolScreen.tsx`, `SchoolDetailScreen.tsx`, `mobile-app/src/services/api/SchoolService.ts`, `src/models/`, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 19.6 — Mobile : forfait de l'élève côté instructeur
**Objectif** : fiche élève : « Attribuer un forfait » (choix dans le catalogue), heures restantes par type ; à l'approbation d'une leçon, mention « Couverte par le forfait » ou « Hors forfait, tarif normal ».
**Dépend de** : Q-42.
**Fichiers** : `mobile-app/src/screens/instructor/student-profile/`, `LessonRequestsScreen.tsx`, `BookForStudentScreen.tsx`, service, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 19.7 — Mobile : « Mon forfait » côté élève
**Objectif** : carte « Mon forfait » sur l'accueil : heures restantes par type (barre de progression), mention quand il reste 2 h ou moins sur un type.
**Dépend de** : Q-41.
**Fichiers** : `mobile-app/src/screens/student/StudentDashboard.tsx`, service, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : notification de forfait presque épuisé (possible via 17.4 si l'auteur le demande).

### - [ ] 19.8 — Bout en bout : forfait
**Objectif** : e2e « forfait » : le gérant crée « 2 h Manœuvre » ; attribué à l'élève (prix dans le dû) ; deux leçons d'1 h couvertes (prix 0), une troisième au tarif normal ; une absence libère l'heure ; un versement solde le forfait.
**Fichiers** : `tests/e2e/packs.e2e.test.ts` (nouveau).
**Critère de validation** :
```bash
test -f tests/e2e/packs.e2e.test.ts && docker compose up -d --build --force-recreate api && npm run test:e2e && echo OK
```
**Hors périmètre** : —

---

## Phase 20 — Progression pédagogique (Q-45, Q-46, Q-47)

L'accueil « My journey » montre des nombres de leçons, pas ce que l'élève sait faire. Ici, l'instructeur note à la fin de la leçon les compétences travaillées, et l'élève voit où il en est.

### - [ ] 20.1 — Référentiel et niveaux
**Objectif** : migration `0NN_skills.sql` : `skills (code PRIMARY KEY, lesson_type, position)` initialisée avec la liste de Q-45 (libellés au catalogue mobile FR / AR par `code`, pas en base) ; `student_skills (student_id → students, skill_code, level ∈ not_started|in_progress|acquired, updated_at, updated_by, PRIMARY KEY (student_id, skill_code))` ; `lesson_skill_updates (lesson_id, skill_code, level)` pour l'historique. Q-46 (a).
**Dépend de** : Q-45, Q-46.
**Fichiers** : `migrations/0NN_skills.sql`, tests.
**Critère de validation** :
```bash
./scripts/migrate.sh && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -tAc "SELECT count(*) > 0 FROM skills" | grep -x t && echo OK
```
**Hors périmètre** : liste par école (Q-45 (b) non retenue).

### - [ ] 20.2 — Compétences à la présence, progression lisible
**Objectif** : L7 accepte `skills?: [{ code, level }]` (codes du type de la leçon, 400 sinon), écrit l'historique et met à jour les niveaux, dans la transaction de la présence. `GET /api/skills` (référentiel), progression d'un élève pour l'instructeur (famille P) et pour l'élève (famille P « me ») : par type, chaque compétence avec son niveau et la date de dernière évaluation. Contrat L7 et §6.
**Dépend de** : Q-46.
**Fichiers** : `services/api/src/modules/lesson/`, `services/api/src/modules/student/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='lesson|skill' && echo OK
```
**Hors périmètre** : —

### - [ ] 20.3 — Mobile : évaluer à la fin de la leçon
**Objectif** : la saisie de présence (`TodayLessonsScreen`) propose les compétences du type de la leçon, niveau actuel pré-rempli, en trois boutons ; facultatif, jamais bloquant.
**Dépend de** : Q-45, Q-46.
**Fichiers** : `mobile-app/src/screens/instructor/TodayLessonsScreen.tsx`, `mobile-app/src/models/Skill.ts` (nouveau), service, i18n (libellés par code), tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 20.4 — Mobile : progression visible
**Objectif** : onglet « Progression » de la fiche élève (instructeur) ; côté élève, chaque étape de « My journey » s'ouvre sur ses compétences et, si Q-47 (a), le commentaire des dernières leçons (`feedback` exposé à l'élève par P9 ; la note privée P5 reste privée). Contrat P9 si le `feedback` y change de visibilité.
**Dépend de** : Q-47.
**Fichiers** : `mobile-app/src/screens/instructor/student-profile/tabs/`, `mobile-app/src/screens/student/`, service, i18n, tests ; `services/api` et contrat si P9 change.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && cd ../services/api && npx tsc --noEmit && npm test && echo OK
```
**Hors périmètre** : —

### - [ ] 20.5 — Bout en bout : progression
**Objectif** : e2e « progression » : présence avec deux compétences évaluées → niveaux lus par l'instructeur et par l'élève ; un code d'un autre type de leçon → 400.
**Fichiers** : `tests/e2e/skills.e2e.test.ts` (nouveau).
**Critère de validation** :
```bash
test -f tests/e2e/skills.e2e.test.ts && docker compose up -d --build --force-recreate api && npm run test:e2e && echo OK
```
**Hors périmètre** : —

---

## Phase 21 — Examens : repasses et prix (Q-48, Q-49)

Un échec est aujourd'hui un résultat sans suite, et un examen n'a pas de prix avant d'être payé. Ici : numéro de tentative, repasse programmée en un geste, grille de prix d'examen.

### - [ ] 21.1 — Numéro de tentative
**Objectif** : `Exam` (X1, P3, P10) porte `attemptNumber` (rang de l'examen parmi ceux du même type de l'élève, hors `rejected` / `cancelled`) et `previousResults` (résultats des tentatives précédentes). Calculé en lecture, sans colonne. Contrat.
**Fichiers** : `services/api/src/modules/exam/repositories/`, `services/api/src/modules/student/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='exam' && echo OK
```
**Hors périmètre** : délai minimal entre deux tentatives (règle de l'ATTT, pas de l'app).

### - [ ] 21.2 — Repasse programmée par l'instructeur
**Objectif** : `POST /api/exams/book-for-student` `{ studentId, examType, dateTime, location }` (instructeur de l'école) : crée un examen `scheduled` directement, comme L4 pour les leçons ; l'élève garde la possibilité de redemander (X2). Contrat §5, ligne X6.
**Dépend de** : Q-48.
**Fichiers** : `services/api/src/modules/exam/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='exam' && echo OK
```
**Hors périmètre** : —

### - [ ] 21.3 — Grille de prix des examens
**Objectif** : migration `0NN_exam_pricing.sql` : `exam_pricing (id, school_id, exam_type ∈ theory|practical, price > 0, UNIQUE (school_id, exam_type))` ; routes de lecture (publique) et d'upsert / suppression (gérant) ; X3 et X6 copient le prix sur l'examen (`exams.price`), qui entre dans le dû (imputable, Phase 18). Sans tarif, le prix est saisi à la planification (même règle que D-30, 400 `PRICE_REQUIRED` sinon). Contrat §2 et §5.
**Dépend de** : Q-26, Q-49.
**Fichiers** : `migrations/0NN_exam_pricing.sql`, `services/api/src/modules/{school,exam}/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
./scripts/migrate.sh && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c "\d exam_pricing" | grep exam_type && cd services/api && npx tsc --noEmit && npm run lint && npm test && echo OK
```
**Hors périmètre** : —

### - [ ] 21.4 — Mobile : tentatives et repasse
**Objectif** : badge « Tentative n » sur les examens (instructeur et élève) ; après un résultat `failed`, bouton « Programmer une repasse » (instructeur, pré-rempli) et « Redemander l'examen » (élève). Libellés par type conservés (D-42).
**Dépend de** : Q-48.
**Fichiers** : `mobile-app/src/screens/instructor/{TodayExamsScreen,ExamRequestsScreen}.tsx`, `mobile-app/src/screens/student/MyExamsScreen.tsx`, service, `src/models/Exam.ts`, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 21.5 — Mobile : prix des examens
**Objectif** : « Mon école » : tarifs d'examen (gérant) ; fiche école publique : prix des examens ; planification : prix affiché, saisi s'il n'y a pas de tarif.
**Dépend de** : Q-49.
**Fichiers** : `MySchoolScreen.tsx`, `SchoolDetailScreen.tsx`, `ExamRequestsScreen.tsx`, services, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 21.6 — Bout en bout : repasse
**Objectif** : e2e « repasse » : examen pratique échoué → repasse programmée par l'instructeur, `attemptNumber = 2`, prix copié de la grille, dans le dû de l'élève.
**Fichiers** : `tests/e2e/exam-retake.e2e.test.ts` (nouveau).
**Critère de validation** :
```bash
test -f tests/e2e/exam-retake.e2e.test.ts && docker compose up -d --build --force-recreate api && npm run test:e2e && echo OK
```
**Hors périmètre** : —

---

## Phase 22 — Tableau de bord du gérant (Q-50)

Le gérant n'a aujourd'hui aucune vue d'ensemble. Cette phase agrège ce que les phases précédentes enregistrent.

### - [ ] 22.1 — Indicateurs de l'école
**Objectif** : `GET /api/schools/:id/dashboard?month=YYYY-MM` (gérant) : les indicateurs retenus en Q-50, pour le mois demandé et le précédent — encaissé et répartition par mode, reste à encaisser, heures par instructeur, taux de réussite théorie / pratique (première tentative et global), taux d'absence, demandes en attente. Requêtes d'agrégat dans un repository dédié, testées sur `Pool` factice. Contrat §2.
**Dépend de** : Q-26, Q-50.
**Fichiers** : `services/api/src/modules/school/` (ou module `dashboard`), tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern=dashboard && echo OK
```
**Hors périmètre** : export CSV.

### - [ ] 22.2 — Élèves inactifs
**Objectif** : `GET /api/schools/:id/inactive-students?days=14` (gérant) : élèves autorisés sans leçon `scheduled` ni `completed` depuis `days` jours, avec la date de leur dernière leçon et leur téléphone. Contrat §2.
**Dépend de** : Q-50.
**Fichiers** : `services/api/src/modules/school/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='dashboard|inactive' && echo OK
```
**Hors périmètre** : relance automatique.

### - [ ] 22.3 — Mobile : écran Tableau de bord
**Objectif** : écran « Tableau de bord » (gérant) : tuiles d'indicateurs avec évolution par rapport au mois précédent, graphiques simples (bibliothèque et style définis en Phase 13), liste des élèves inactifs avec appel en un geste (`tel:`).
**Dépend de** : Q-50.
**Fichiers** : `mobile-app/src/screens/instructor/DashboardScreen.tsx` (nouveau), service, navigation, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 22.4 — Bout en bout : tableau de bord
**Objectif** : e2e « tableau de bord » : sur des données connues (leçons, versements, examens créés par le test), les indicateurs valent ce qui est attendu ; un moniteur reçoit 403 `FORBIDDEN_MANAGER`.
**Fichiers** : `tests/e2e/dashboard.e2e.test.ts` (nouveau).
**Critère de validation** :
```bash
test -f tests/e2e/dashboard.e2e.test.ts && docker compose up -d --build --force-recreate api && npm run test:e2e && echo OK
```
**Hors périmètre** : —

---

## Phase 23 — Flotte de véhicules (Q-51, Q-52, Q-53)

Les leçons de Manœuvre et de Parc mobilisent une voiture : rien n'empêche de la réserver deux fois, et personne n'est prévenu avant la fin de l'assurance ou de la visite technique.

### - [ ] 23.1 — Véhicules
**Objectif** : migration `0NN_vehicles.sql` : `vehicles (id, school_id, plate, model, transmission ∈ manual|automatic, active, insurance_until, inspection_until, vignette_until, UNIQUE (school_id, plate))` ; `lessons.vehicle_id` nullable.
**Dépend de** : Q-53.
**Fichiers** : `migrations/0NN_vehicles.sql`, tests.
**Critère de validation** :
```bash
./scripts/migrate.sh && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c "\d vehicles" | grep inspection_until && echo OK
```
**Hors périmètre** : kilométrage et vidange (Q-53 (b) non retenue).

### - [ ] 23.2 — Routes de la flotte
**Objectif** : lecture des véhicules de l'école (instructeur de l'école) ; création, modification, désactivation (gérant). Nouvelle section du contrat.
**Dépend de** : Q-26.
**Fichiers** : `services/api/src/modules/vehicle/` (nouveau module, `buildVehicle()`), `services/api/src/app.ts`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern=vehicle && echo OK
```
**Hors périmètre** : —

### - [ ] 23.3 — Véhicule à la planification
**Objectif** : L4 et L5 acceptent `vehicleId?` (facultatif, Q-51 (a) ; véhicule actif de l'école, 400 sinon) ; le `ScheduleConflictChecker` de 15.2 contrôle aussi le véhicule — toujours bloquant, `force` sans effet (Q-52 (b)) ; `Lesson` et l'agenda (L9) exposent le véhicule. Contrat L4, L5, L9.
**Dépend de** : Q-51, Q-52.
**Fichiers** : `services/api/src/modules/lesson/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='lesson|vehicle' && echo OK
```
**Hors périmètre** : —

### - [ ] 23.4 — Échéances
**Objectif** : le tableau de bord (22.1) gagne les échéances à moins de 30 jours (véhicule, type, date) ; la tâche planifiée de 17.5 notifie le gérant à J-30 et J-7 (une fois par échéance et par seuil, colonne ou table de suivi dans une migration).
**Dépend de** : Q-53.
**Fichiers** : `migrations/0NN_vehicle_alerts.sql`, `services/api/src/modules/{vehicle,notification,school}/`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
./scripts/migrate.sh && cd services/api && npx tsc --noEmit && npm run lint && npm test -- --testPathPattern='vehicle|dashboard|notification' && echo OK
```
**Hors périmètre** : —

### - [ ] 23.5 — Mobile : flotte
**Objectif** : écran « Flotte » (gérant : ajout, modification, désactivation, dates d'échéance en évidence) ; sélecteur de véhicule à l'approbation et à la réservation directe ; conflit de véhicule affiché ; véhicule visible dans l'agenda, filtre par véhicule.
**Dépend de** : Q-51, Q-52.
**Fichiers** : `mobile-app/src/screens/instructor/FleetScreen.tsx` (nouveau), `LessonRequestsScreen.tsx`, `BookForStudentScreen.tsx`, `AgendaScreen.tsx`, service, i18n, tests.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 23.6 — Bout en bout : flotte
**Objectif** : e2e « flotte » : le gérant crée un véhicule ; deux leçons sur ce véhicule à la même heure → 409 `SCHEDULE_CONFLICT` même avec `force: true` ; une assurance qui expire dans 10 jours apparaît au tableau de bord.
**Fichiers** : `tests/e2e/fleet.e2e.test.ts` (nouveau).
**Critère de validation** :
```bash
test -f tests/e2e/fleet.e2e.test.ts && docker compose up -d --build --force-recreate api && npm run test:e2e && echo OK
```
**Hors périmètre** : —

---

## Après la Phase 23

Recette sur téléphone par l'humain (APK de 17.1), puis, s'il le demande : mise en ligne pilote (hébergement du backend, build de production EAS, Play Store).
