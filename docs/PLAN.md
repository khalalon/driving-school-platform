# Plan d'exécution

Règles de lecture (voir `CLAUDE.md`, règles d'or 3 et 5) :
- On travaille dans l'ordre, sur la première tâche non cochée. Une tâche = un commit (message Conventional Commits, scope = domaine ou `infra` / `mobile` / `docs` / `e2e`), poussé sur `origin/main` aussitôt. Les tâches d'une même phase s'enchaînent sans validation intermédiaire ; arrêt obligatoire en fin de phase, sur question ouverte non tranchée, sur échec de critère non réparable dans la tâche, ou sur choix produit non tranché (D-36, 18/09/2026).
- Une tâche est cochée **seulement** quand sa commande « Critère de validation » a été exécutée et que sa sortie a été montrée. Pas d'exception.
- Si une tâche indique « Dépend de : Q-xx » et que la question n'est pas tranchée dans `DECISIONS.md`, on **s'arrête** et on demande. Au 17/09/2026 il reste **Q-17** (leçon payée annulée), **Q-18** (absence facturée) et **Q-19** (procédure d'examen ATTT).
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

### - [ ] 6.4 — Instructeur : réservation directe pour un élève
**Objectif** : `BookForStudentScreen` charge S6 et propose une liste d'élèves ; payload L4 `{ studentId, type, scheduledDate, durationMinutes, notes? }`.
**Fichiers** : `src/screens/instructor/BookForStudentScreen.tsx`, `src/services/api/{LessonService,SchoolService}.ts` + tests.
**Critère de validation** :
```bash
cd mobile-app && ! grep -q 'studentEmail' src/screens/instructor/BookForStudentScreen.tsx && grep -q 'getSchoolStudents' src/screens/instructor/BookForStudentScreen.tsx && npx tsc --noEmit && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : —

### - [ ] 6.5 — Instructeur et élève : examens
**Objectif** : `ExamRequestsScreen` appelle `scheduleExam` / `rejectExamRequest` (plus de stub) ; `TodayExamsScreen` appelle `recordExamResult { result: passed|failed, score, notes? }` ; `RequestExamScreen` envoie `examType: theory|practical`. Tests jest.
**Fichiers** : `src/screens/instructor/{ExamRequestsScreen,TodayExamsScreen}.tsx`, `src/screens/student/{RequestExamScreen,MyExamsScreen}.tsx`, `src/services/api/ExamService.ts` + tests.
**Critère de validation** :
```bash
cd mobile-app && test "$(grep -c 'API call to' src/screens/instructor/ExamRequestsScreen.tsx src/screens/instructor/TodayExamsScreen.tsx | grep -v ':0' | wc -l)" -eq 0 && npx tsc --noEmit && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : —
**Dépend de** : Q-19 (libellés « Planifier / Refuser » vs « Enregistrer la convocation / Dossier pas prêt » sur `ExamRequestsScreen` et `MyExamsScreen` ; le câblage des appels peut se faire avant, les libellés sont posés une fois Q-19 tranchée).

### - [ ] 6.6 — Fiches élève joignables, annulation élève
**Objectif** : `EnrollmentRequestsScreen` (demandes approuvées) et `BookForStudentScreen` (liste S6) naviguent vers `StudentProfile` avec `{ studentId (users.id), schoolId, studentName }` ; `StudentDashboard` navigue vers `MyProfile` avec le `schoolId` de l'inscription active (E3) ; `MyLessonsScreen` n'affiche « Annuler » que si `pending` ou `scheduledDate − now ≥ 24 h` (D-24) et gère 403 `CANCEL_WINDOW_CLOSED`.
**Fichiers** : `src/screens/instructor/{EnrollmentRequestsScreen,BookForStudentScreen}.tsx`, `src/screens/student/{StudentDashboard,MyLessonsScreen}.tsx`, `src/navigation/{AppNavigator,types}.tsx`.
**Critère de validation** :
```bash
cd mobile-app && grep -rq "navigate('StudentProfile'" src/screens/instructor && grep -q "navigate('MyProfile'" src/screens/student/StudentDashboard.tsx && grep -q 'CANCEL_WINDOW_CLOSED' src/screens/student/MyLessonsScreen.tsx && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —
**Dépend de** : Q-17 (bouton « Annuler » sur une leçon payée : masqué ou non, selon la réponse).

### - [ ] 6.7 — Approbation multiple des demandes de code (ergonomie, D-34)
**Objectif** : sur `LessonRequestsScreen`, l'instructeur coche plusieurs demandes `pending` de type `CODE` et les approuve d'un coup pour un même créneau (« approuver ces 12 demandes pour mardi 9 h ») : un seul formulaire (date, heure, durée, prix si nécessaire), puis **un appel L5 par demande**, en séquence, avec récapitulatif des succès/échecs. Aucun changement de modèle de données ni de route.
**Fichiers** : `src/screens/instructor/LessonRequestsScreen.tsx`, `src/services/api/LessonService.ts` (`approveLessons(ids, data)` = boucle sur `approveLesson`) + test.
**Critère de validation** :
```bash
cd mobile-app && grep -q 'approveLessons' src/screens/instructor/LessonRequestsScreen.tsx && npx tsc --noEmit && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : séances collectives (`capacity > 1`), hors v1.

---

## Après la Phase 6

La recette finale (parcours D-15 sur un téléphone via Expo Go, backend en Docker) est faite **par l'humain**, hors de cette liste. Les fonctionnalités hors contrat (paiement en ligne, web, gestion des codes par écran) ne sont pas dans la v1.
