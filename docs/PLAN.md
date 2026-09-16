# Plan d'exécution

Règles de lecture (voir `CLAUDE.md`, règles d'or 3 et 5) :
- On travaille **uniquement** sur la première tâche non cochée, dans l'ordre. Une tâche = un commit (message Conventional Commits, scope = domaine ou `infra` / `mobile` / `docs`).
- Une tâche est cochée **seulement** quand sa commande « Critère de validation » a été exécutée et que sa sortie a été montrée. Pas d'exception.
- Si une tâche indique « Dépend de : Q-xx » et que la question n'est pas tranchée dans `DECISIONS.md` (section « Décisions prises »), on **s'arrête** et on demande.
- Chaque tâche livrée ajoute une ligne dans `CHANGELOG.md` (section Unreleased) et, si elle touche une route, met à jour `docs/API_CONTRACT.md` dans le même commit.
- Les commandes sont écrites pour Git Bash (Windows) ou un shell POSIX, depuis la racine du dépôt sauf `cd` explicite.

Le frontend web (`web-frontend/`) n'apparaît dans aucune phase (D-05).

---

## Phase 0 — Hygiène

### - [ ] 0.1 — `.gitignore` racine et sortie de `node_modules` de l'index
**Objectif** : que `git ls-files` ne contienne plus aucun fichier de dépendances ni d'artefact de build.
**Fichiers** : `.gitignore` (nouveau, racine : `node_modules/`, `dist/`, `coverage/`, `.env`, `.env.*.local`, `.DS_Store`, `*.log`, `.expo/`), index git (`git rm -r --cached node_modules services/student/node_modules`).
**Critère de validation** :
```bash
test "$(git ls-files | grep -c 'node_modules/')" -eq 0 && test "$(git ls-files | wc -l)" -lt 600 && echo "OK: $(git ls-files | wc -l) fichiers suivis"
```
**Hors périmètre** : ne pas supprimer les dossiers `node_modules` du disque ; ne pas toucher aux `.gitignore` des sous-dossiers.

### - [ ] 0.2 — Sortie des `.env` et `.DS_Store` de l'index, `.env.example` partout
**Objectif** : aucun secret ni fichier système suivi ; chaque emplacement qui lit un `.env` a un `.env.example` à jour.
**Fichiers** : index git (`git rm --cached .env mobile-app/.env web-frontend/.env`, `.DS_Store`), `mobile-app/.env.example` (nouveau), `web-frontend/.env.example` (nouveau), `.env.example` racine (vérifier qu'il couvre toutes les variables lues par `docker-compose.yml`).
**Critère de validation** :
```bash
test "$(git ls-files | grep -cE '(^|/)\.env$|DS_Store')" -eq 0 && ls .env.example mobile-app/.env.example web-frontend/.env.example && echo OK
```
**Hors périmètre** : ne pas changer les valeurs des variables ; ne pas purger l'historique git.

### - [ ] 0.3 — Une seule source pour l'URL du backend côté mobile
**Objectif** : l'URL de base est lue depuis la config Expo (`app.json` → `expo.extra.API_BASE_URL`, surchargeable par `EXPO_PUBLIC_API_BASE_URL`), plus aucune IP codée en dur, et le `.env` racine ne porte plus de variable mobile.
**Fichiers** : `mobile-app/src/config/api.config.ts`, `mobile-app/app.json`, `mobile-app/.env.example`, `.env.example` racine, `mobile-app/src/types/env.d.ts`.
**Critère de validation** :
```bash
! grep -nE '192\.168|http://' mobile-app/src/config/api.config.ts && ! grep -q API_BASE_URL .env.example && grep -q '"API_BASE_URL"' mobile-app/app.json && echo OK
```
**Hors périmètre** : ne pas modifier les chemins d'endpoints (`ENDPOINTS`) ; ne pas toucher aux écrans.

### - [ ] 0.4 — Suppression du fallback qui masque les erreurs TypeScript dans `services/auth/Dockerfile`
**Objectif** : une erreur `tsc` fait échouer le build de l'image.
**Fichiers** : `services/auth/Dockerfile` (ligne `RUN npm run build 2>&1 || (mkdir -p dist && cp -r src/* dist)` → `RUN npm run build`).
**Critère de validation** :
```bash
! grep -q 'mkdir -p dist' services/auth/Dockerfile && docker compose build auth-service && echo OK
```
**Hors périmètre** : ne pas homogénéiser les autres Dockerfiles (ils sont déjà corrects).

### - [ ] 0.5 — Typecheck vert sur les 8 services, en local
**Objectif** : `npx tsc --noEmit` passe dans chaque service ; les erreurs de type éventuelles sont corrigées **sans changer de comportement**.
**Fichiers** : `services/*/src/**` (corrections de types uniquement), `services/*/tsconfig.json` si nécessaire.
**Critère de validation** :
```bash
for s in auth school student lesson exam payment notification analytics; do (cd services/$s && npm ci --silent && npx tsc --noEmit) || { echo "FAIL $s"; exit 1; }; done; echo "OK 8/8"
```
**Hors périmètre** : ne pas corriger de bug fonctionnel découvert au passage (l'ajouter au plan ou à `DECISIONS.md`).

### - [ ] 0.6 — Le CI échoue sur erreur de typecheck et couvre les 8 services
**Objectif** : chaque job de service exécute `npx tsc --noEmit` avant `npm test` ; `student` et `analytics` ont leur job ; `detect-changes` connaît les 8 dossiers.
**Fichiers** : `.github/workflows/ci-cd.yml`, `.github/workflows/pr-check.yml`.
**Critère de validation** :
```bash
test "$(grep -c 'tsc --noEmit' .github/workflows/ci-cd.yml)" -ge 8 && grep -q 'services/student' .github/workflows/ci-cd.yml && grep -q 'services/analytics' .github/workflows/ci-cd.yml && echo OK
```
**Hors périmètre** : ne pas ajouter de job mobile (tâche 6.1) ; ne pas toucher aux jobs deploy.

### - [ ] 0.7 — Hooks git et Makefile utilisables
**Objectif** : `git commit` passe sans `--no-verify` ; commitlint accepte les scopes réels ; `make install/test/lint/health` couvrent `student` et interrogent `analytics` sur 3008.
**Fichiers** : `.husky/pre-commit` (retirer `npm test` racine, garder `lint-staged`), `.commitlintrc.json` (scopes : ajouter `student`, `analytics`, `mobile`, `docs`, `infra`, `e2e`), `package.json` racine (`"test"` → retirer le stub ou pointer vers `tests/`), `Makefile`.
**Critère de validation** :
```bash
echo "chore(student): verify hooks" | npx commitlint && test "$(grep -c 'services/student' Makefile)" -ge 4 && grep -q 'localhost:3008/health' Makefile && git commit --allow-empty -m "chore(infra): verify hooks" && git reset --soft HEAD~1 && echo OK
```
**Hors périmètre** : ne pas réécrire le Makefile pour l'app unique (tâche 2.7).

### - [ ] 0.8 — Application des migrations reproductible
**Objectif** : un script applique dans l'ordre les fichiers `migrations/*.sql` non encore appliqués, en s'appuyant sur une table `schema_migrations` ; il est idempotent ; `make migrate` l'appelle. Les fichiers 001–003 ne sont **pas** modifiés.
**Fichiers** : `migrations/004_schema_migrations.sql` (crée la table et y insère 001, 002, 003 comme appliquées), `scripts/migrate.sh` (nouveau, remplace `run-migrations.sh`), `Makefile` (cible `migrate`), `docker-compose.yml` (garder le montage `initdb.d` pour la première init).
**Critère de validation** :
```bash
docker compose down -v && docker compose up -d postgres && sleep 12 && ./scripts/migrate.sh && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -tAc "SELECT count(*) FROM schema_migrations" | grep -x 4 && echo OK
```
**Hors périmètre** : aucun changement de schéma métier.

### - [ ] 0.9 — Suppression des scripts de test manuels et fichiers morts à la racine
**Objectif** : la racine ne contient plus que la config du dépôt, les compose, le Makefile, les docs et les dossiers de code.
**Fichiers** : supprimer `full-workflow-test.ps1`, `run-tests.ps1`, `test-all-services.ps1`, `test-comprehensive.ps1`, `test-login.html`, `setup-fresh-mobile.sh`, `start-expo-tunnel.bat`, `diagnose-network.ps1`, `scripts/run-migrations.sh` (remplacé en 0.8), `scripts/test-api.sh` si redondant avec `tests/` ; supprimer `mobile-app/src/app.ts` (copie égarée d'un serveur Express), `mobile-app/MOBILE_APP_COMPLETE.md`, `services/student/src/repositories/profile.service.ts` (vide).
**Critère de validation** :
```bash
test "$(ls *.ps1 *.bat *.html 2>/dev/null | wc -l)" -eq 0 && ! test -e mobile-app/src/app.ts && ! test -e services/student/src/repositories/profile.service.ts && echo OK
```
**Hors périmètre** : ne pas supprimer les écrans mobiles morts (tâche 6.1) ; ne pas toucher aux `scripts/docker-*.{sh,ps1}`.

---

## Phase 1 — Filet de sécurité

### - [ ] 1.1 — Harnais de test de bout en bout exécutable
**Objectif** : `tests/` devient un paquet npm autonome (jest + ts-jest + supertest) qui cible la gateway (`GATEWAY_URL`, défaut `http://localhost`), avec un `seed.sql` de fixtures (une école, un compte instructeur rattaché, un compte admin) appliqué par le harnais. Les deux fichiers de tests existants, non exécutables, sont supprimés.
**Fichiers** : `tests/package.json`, `tests/jest.config.js`, `tests/tsconfig.json`, `tests/fixtures/seed.sql`, `tests/setup.ts` (applique le seed via `docker exec … psql`), `package.json` racine (`"test:e2e": "npm --prefix tests run e2e"`), suppression de `tests/e2e/complete-workflow.e2e.test.ts` et `tests/integration/api-integration.test.ts`.
**Critère de validation** :
```bash
cd tests && npm ci --silent && npx jest --listTests && cd .. && test "$(git ls-files tests | grep -c 'complete-workflow\|api-integration')" -eq 0 && echo OK
```
**Hors périmètre** : aucun test métier encore (1.2).
**Note** : le seed crée l'instructeur par SQL direct (`users` + `instructors`) pour ne pas dépendre de Q-02. Identifiants fixés pour tout le plan : école `Seed Driving School`, instructeur `instructor@seed.io` / `Seed1234!`, admin = celui de la migration 001 (`admin@drivingschool.com` / `admin123`). Le hash bcrypt du mot de passe seed est généré une fois (`node -e "console.log(require('bcryptjs').hashSync('Seed1234!', 12))"`) et collé dans `seed.sql`.

### - [ ] 1.2 — Test du chemin critique (D-15), qui échoue aujourd'hui
**Objectif** : un test `tests/e2e/critical-path.e2e.test.ts` enchaîne, **sur les routes cibles du contrat** : `register` élève (A2) → `POST /api/enrollment/schools/:id/request` (E2) → login instructeur (A1) → `GET …/requests` (E4, contient la demande avec l'email de l'élève) → `PUT …/approve` (E5) → `GET …/status` (E1, `canBook: true`) → `POST /api/lessons` en tant qu'élève (L2, contrat) → `GET /api/lessons` élève (L1, contient la leçon `pending`) → `PUT /api/lessons/:id/approve` instructeur (L5) → `PUT /api/lessons/:id/attendance` (L7). Chaque étape est un `test()` nommé, dans l'ordre, qui s'arrête au premier échec (`--bail`). Il **doit échouer** aujourd'hui, à une étape métier, pas sur une erreur de harnais.
**Fichiers** : `tests/e2e/critical-path.e2e.test.ts`, `tests/helpers/api.ts` (client supertest + helpers login/register).
**Critère de validation** :
```bash
docker compose up -d --build && sleep 30 && (cd tests && npx jest e2e/critical-path --bail --verbose); echo "exit=$?"
```
Sortie attendue aujourd'hui : `exit=1`, les étapes `register élève`, `demande d'inscription`, `login instructeur` passent, et l'échec est sur `liste des demandes de l'école` (la demande a `student_id = NULL`, voir `ARCHITECTURE.md` §3) ou `approbation`. Noter dans le commit à quelle étape ça casse.
**Hors périmètre** : ne rien corriger côté backend, même trivial.

### - [ ] 1.3 — Le CI exécute le test de bout en bout (en mode informatif)
**Objectif** : `.github/workflows/e2e.yml` monte la stack via compose, applique le seed, lance `npm run test:e2e`, publie le rapport ; le job est `continue-on-error: true` jusqu'à la fin de la Phase 5 (marqué par un `TODO(5.8)` dans le YAML).
**Fichiers** : `.github/workflows/e2e.yml`.
**Critère de validation** :
```bash
grep -q 'test:e2e' .github/workflows/e2e.yml && grep -q 'continue-on-error: true' .github/workflows/e2e.yml && grep -q 'TODO(5.8)' .github/workflows/e2e.yml && echo OK
```
**Hors périmètre** : ne pas rendre le job bloquant.

---

## Phase 2 — Consolidation en une application

### - [ ] 2.1 — Squelette de `services/api` et migration du module `auth`
**Objectif** : une seule application Express (`services/api`, port **3000**) avec `src/index.ts`, `src/app.ts`, `src/config/{database,redis}.ts`, et le module `src/modules/auth/` (routes, controllers, services, repositories, validators, tests) copié depuis `services/auth` **sans changement de comportement**. `/health` et `/api/auth/*` répondent.
**Fichiers** : `services/api/{package.json,tsconfig.json,jest.config.js,.eslintrc.json,.prettierrc.json,Dockerfile,.dockerignore,.env.example}`, `services/api/src/**`, `docker-compose.yml` (ajouter le service `api`, sans retirer les anciens pour l'instant).
**Critère de validation** :
```bash
cd services/api && npm ci --silent && npx tsc --noEmit && npm test -- --silent && cd ../.. && docker compose up -d --build api && sleep 15 && curl -sf localhost:3000/health && curl -s -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@drivingschool.com","password":"admin123"}' | grep -q accessToken && echo OK
```
**Hors périmètre** : aucun autre module ; pas de changement Nginx.
**Dépend de** : Q-16 (pour savoir si `payment`/`notification`/`analytics` seront montés, afin de prévoir la structure `modules/` — la décision n'empêche pas de commencer).

### - [ ] 2.2 — Middleware d'auth unique, vérification locale du JWT
**Objectif** : `services/api/src/middleware/auth.middleware.ts` vérifie le token avec `JWT_SECRET`, pose `req.user = { userId, email, role }`, expose `authenticate` et `authorize(...roles)` ; testé unitairement (token valide, expiré, absent, mauvais rôle). Plus aucun appel HTTP vers `/api/auth/me` dans le code de l'app.
**Fichiers** : `services/api/src/middleware/auth.middleware.ts`, `services/api/src/middleware/__tests__/auth.middleware.test.ts`, suppression de la copie dans `modules/auth`.
**Critère de validation** :
```bash
cd services/api && npx jest middleware --silent && test "$(grep -rl 'api/auth/me' src --include=*.ts | grep -v __tests__ | grep -vc 'auth.routes\|auth.controller')" -eq 0 && test "$(grep -rc axios src/middleware | grep -v ':0' | wc -l)" -eq 0 && echo OK
```
**Hors périmètre** : pas de claim `type`, pas de secrets séparés (Phase 4).

### - [ ] 2.3 — Migration des modules `school` et `student`
**Objectif** : `modules/school` et `modules/student` (enrollment, verification, profiles, student-profiles) tournent dans `services/api` avec le middleware de 2.2. Preuve que le bug `userId` est corrigé : une demande d'inscription est bien rattachée à l'élève.
**Fichiers** : `services/api/src/modules/{school,student}/**`, `services/api/src/app.ts` (montage), tests déplacés.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm test -- --silent && cd ../.. && docker compose up -d --build api && sleep 15 && SID=$(curl -s localhost:3000/api/schools | node -pe 'JSON.parse(require("fs").readFileSync(0))[0].id') && TOK=$(curl -s -X POST localhost:3000/api/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"e2e-$RANDOM@t.io\",\"password\":\"Passw0rd!\",\"role\":\"student\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken') && curl -s -X POST localhost:3000/api/enrollment/schools/$SID/request -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"message":"test"}' >/dev/null && curl -s localhost:3000/api/enrollment/my-requests -H "Authorization: Bearer $TOK" | grep -q '"studentId":"[0-9a-f-]\{36\}"' && echo OK
```
**Hors périmètre** : ne pas corriger `students.name` (3.1) ni les identifiants des fiches (5.0).

### - [ ] 2.4 — Migration des modules `lesson` et `exam` (tels quels)
**Objectif** : les deux modules tournent dans `services/api`, avec leurs tests, **sans** changer leurs routes (les DIVERGE/MANQUE du contrat restent).
**Fichiers** : `services/api/src/modules/{lesson,exam}/**`, `app.ts`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm test -- --silent && cd ../.. && docker compose up -d --build api && sleep 15 && curl -sf localhost:3000/api/lessons >/dev/null && curl -sf localhost:3000/api/exams >/dev/null && echo OK
```
**Hors périmètre** : aucune adaptation au modèle D-01.

### - [ ] 2.5 — Migration des modules `payment`, `notification`, `analytics` selon Q-16
**Objectif** : les trois modules sont portés (code + tests) ; ils sont montés, montés derrière `admin`, ou non montés selon la réponse à Q-16. Le middleware pass-through d'analytics est remplacé par celui de 2.2.
**Fichiers** : `services/api/src/modules/{payment,notification,analytics}/**`, `app.ts`.
**Critère de validation** :
```bash
cd services/api && npx tsc --noEmit && npm test -- --silent && cd ../.. && docker compose up -d --build api && sleep 15 && code=$(curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer garbage' localhost:3000/api/analytics/dashboard) && echo "analytics sans token valide → $code (attendu 401 ou 404, jamais 200)" && test "$code" != 200 && echo OK
```
**Hors périmètre** : pas de tables `push_tokens`/`notification_preferences` (3.3).
**Dépend de** : Q-16.

### - [ ] 2.6 — Nginx et compose sur un seul upstream
**Objectif** : `nginx/nginx.conf` proxifie `/api/` vers `api:3000` (un seul `location`, `include proxy_params.conf`), **n'expose pas** `/api/verification`, n'écoute plus 443 ; `docker-compose.yml`, `.dev.yml`, `.prod.yml` ne déclarent plus que `postgres`, `redis`, `api`, `nginx`. Les routes `/api/profiles` et `/api/student-profiles` deviennent joignables.
**Fichiers** : `nginx/nginx.conf`, `nginx/proxy_params.conf`, `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.prod.yml`, `.env.example`.
**Critère de validation** :
```bash
docker compose down && docker compose up -d --build && sleep 30 && test "$(docker compose config --services | sort | tr '\n' ' ')" = "api nginx postgres redis " && test "$(curl -s -o /dev/null -w '%{http_code}' localhost/api/profiles/x/schools/y/complete)" = 401 && test "$(curl -s -o /dev/null -w '%{http_code}' localhost/api/verification/verify-enrollment)" = 404 && echo OK
```
**Hors périmètre** : TLS.

### - [ ] 2.7 — Suppression des 8 anciens services, Makefile et CI mis à jour
**Objectif** : `services/` ne contient plus que `api` ; Makefile, `ci-cd.yml`, `pr-check.yml`, `README.md`, `ARCHITECTURE.md` reflètent l'app unique. Le test de bout en bout échoue **au même endroit ou plus loin** qu'en 1.2, jamais plus tôt.
**Fichiers** : suppression de `services/{auth,school,student,lesson,exam,payment,notification,analytics}`, `Makefile`, `.github/workflows/*.yml`, `README.md`, `docs/ARCHITECTURE.md`.
**Critère de validation** :
```bash
test "$(ls services)" = "api" && test "$(grep -c 'services/auth' Makefile .github/workflows/ci-cd.yml | grep -v ':0' | wc -l)" -eq 0 && (cd tests && npx jest e2e/critical-path --bail 2>&1 | tail -30); echo "vérifier que l'étape en échec est ≥ 'approbation'"
```
**Hors périmètre** : rien de fonctionnel.

---

## Phase 3 — Blocages données

### - [ ] 3.1 — `students.name` : stockage du nom et création à l'approbation
**Objectif** : l'approbation d'une inscription crée une ligne `students` valide. Selon Q-01 : migration `005_user_names.sql` (ajout `first_name`/`last_name` sur `users` et/ou nullable sur `students.name`), `register` accepte les champs, `approveRequest` renseigne `name`.
**Fichiers** : `migrations/005_*.sql`, `modules/auth/validators`, `modules/auth/repositories/user.repository.ts`, `modules/student/services/enrollment.service.ts`, `modules/student/repositories/student.repository.ts`, tests, `docs/API_CONTRACT.md` (A2, E5).
**Critère de validation** :
```bash
(cd tests && npx jest e2e/critical-path --bail -t 'approbation' --verbose) && docker exec driving-school-postgres psql -U admin -d driving_school -tAc "SELECT count(*) FROM students WHERE name IS NULL OR name = ''" | grep -x 0 && echo OK
```
**Hors périmètre** : ne pas toucher aux instructeurs (4.2).
**Dépend de** : Q-01.

### - [ ] 3.2 — Approbation en transaction
**Objectif** : `approveRequest` fait `UPDATE enrollment_requests` + `INSERT students` dans une transaction ; si l'INSERT échoue, la demande reste `pending`. Test unitaire avec un client pg mocké dont le second appel rejette.
**Fichiers** : `modules/student/services/enrollment.service.ts`, `modules/student/repositories/*.ts` (méthode acceptant un `PoolClient`), `__tests__/enrollment.service.test.ts`.
**Critère de validation** :
```bash
cd services/api && npx jest enrollment --verbose 2>&1 | grep -E 'rollback|reste pending|✓|✕' && npx jest enrollment --silent && echo OK
```
**Hors périmètre** : autres opérations multi-tables.

### - [ ] 3.3 — Tables `push_tokens` et `notification_preferences`
**Objectif** : migration `006_notifications.sql` crée les deux tables avec exactement les colonnes lues/écrites par `push-token.repository.ts` et `preference.repository.ts`.
**Fichiers** : `migrations/006_notifications.sql`.
**Critère de validation** :
```bash
./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c '\d push_tokens' -c '\d notification_preferences' | grep -cE 'user_id|token|email_enabled|push_enabled' && echo OK
```
**Hors périmètre** : aucun endpoint.
**Dépend de** : Q-16 (si réponse (c), tâche annulée : la cocher avec la mention « annulée par Q-16 »).

### - [ ] 3.4 — Schéma des leçons pour le modèle D-01
**Objectif** : migration `007_lessons_requests.sql` selon Q-06 : statuts `pending | scheduled | completed | cancelled | rejected`, `date_time` nullable tant que `pending`, `student_id → students.id`, `notes`, `rejection_reason`, `end_time` ou `duration_minutes`, et vocabulaire des types selon Q-03. Les types TypeScript et validators du module `lesson` sont alignés, **sans** nouvelle route.
**Fichiers** : `migrations/007_*.sql`, `modules/lesson/types/index.ts`, `modules/lesson/validators/lesson.validator.ts`, `modules/lesson/repositories/lesson.repository.ts`.
**Critère de validation** :
```bash
docker compose down -v && docker compose up -d postgres && sleep 12 && ./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c '\d lessons' | grep -E 'student_id|rejection_reason|notes' && cd services/api && npx tsc --noEmit && npm test -- --silent && echo OK
```
**Hors périmètre** : endpoints (5.2, 5.3).
**Dépend de** : Q-03, Q-06, Q-07.

### - [ ] 3.5 — Schéma des examens pour le modèle D-01
**Objectif** : migration `008_exam_requests.sql` : l'examen devient une demande d'élève (`student_id → students.id`, `preferred_date`, `message`, `status pending | scheduled | completed | cancelled`, `location`, `rejection_reason`, `result` et `score` sur l'examen) ; sort de `exam_registrations` ou la conserve selon Q-06 (cohérence avec les leçons). Types et validators alignés, pas de nouvelle route.
**Fichiers** : `migrations/008_*.sql`, `modules/exam/{types,validators,repositories}/**`.
**Critère de validation** :
```bash
./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c '\d exams' | grep -E 'student_id|preferred_date|location|rejection_reason' && cd services/api && npx tsc --noEmit && npm test -- --silent && echo OK
```
**Hors périmètre** : endpoints (5.5, 5.6).
**Dépend de** : Q-03, Q-06, Q-07.

### - [ ] 3.6 — Contrainte « une école par élève » (si Q-07 = a)
**Objectif** : migration `009_one_school_per_student.sql` : `UNIQUE (students.user_id)` et `UNIQUE (enrollment_requests.student_id) WHERE status IN ('pending','approved')`.
**Fichiers** : `migrations/009_*.sql`.
**Critère de validation** :
```bash
./scripts/migrate.sh && docker exec driving-school-postgres psql -U admin -d driving_school -c '\d students' | grep -q 'user_id.*UNIQUE\|students_user_id_key' && echo OK
```
**Hors périmètre** : —
**Dépend de** : Q-07 (si (b), cocher avec « annulée par Q-07 »).

---

## Phase 4 — Auth

### - [ ] 4.1 — `POST /api/auth/register` public limité au rôle `student`
**Objectif** : le champ `role` n'est plus accepté (ou doit valoir `student`) ; les champs de nom de Q-01 sont exigés ; un utilisateur `admin` ne peut naître que par seed ou par le code d'école (4.2).
**Fichiers** : `modules/auth/validators/auth.validator.ts`, `modules/auth/controllers/auth.controller.ts`, tests, `docs/API_CONTRACT.md` (A2), `tests/helpers/api.ts`.
**Critère de validation** :
```bash
test "$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/auth/register -H 'Content-Type: application/json' -d '{"email":"x@t.io","password":"Passw0rd!","role":"admin"}')" = 400 && test "$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"s$RANDOM@t.io\",\"password\":\"Passw0rd!\",\"firstName\":\"A\",\"lastName\":\"B\"}")" = 201 && echo OK
```
**Hors périmètre** : instructeurs (4.2).
**Dépend de** : Q-01.

### - [ ] 4.2 — Rattachement instructeur par code d'école
**Objectif** : selon Q-02, un endpoint consomme un `school_codes.code` valide (actif, non expiré, `uses_count < max_uses`), promeut l'utilisateur au rôle du code, crée la ligne `instructors` (avec `name`, `phone`, `license_number`) dans une transaction, incrémente `uses_count`, renvoie `{ schoolId, schoolName, role }`.
**Fichiers** : `modules/school/` ou `modules/auth/` (routes, controller, service, repository `school-code.repository.ts`), validators, tests, `docs/API_CONTRACT.md` (S5 → EXISTE avec le chemin retenu).
**Critère de validation** :
```bash
SID=$(curl -s localhost/api/schools | node -pe 'JSON.parse(require("fs").readFileSync(0))[0].id') && docker exec driving-school-postgres psql -U admin -d driving_school -c "INSERT INTO school_codes (school_id, code, role, max_uses) VALUES ('$SID','INST-TEST1','instructor',1) ON CONFLICT (code) DO NOTHING" && echo "→ exécuter la séquence documentée dans le commit (register → redeem INST-TEST1 → 201 {schoolId,schoolName,role:'instructor'} → second redeem → 400)" && (cd services/api && npx jest school-code --silent) && echo OK
```
**Hors périmètre** : création des codes par un admin (4.3).
**Dépend de** : Q-01, Q-02.

### - [ ] 4.3 — Création des codes d'école par un admin
**Objectif** : `POST /api/schools/:id/codes` (admin) crée un code `{ role, maxUses?, expiresAt? }` ; `GET /api/schools/:id/codes` (admin) les liste.
**Fichiers** : `modules/school/**`, tests, `docs/API_CONTRACT.md` (§8 → nouvelles lignes).
**Critère de validation** :
```bash
ATOK=$(curl -s -X POST localhost/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@drivingschool.com","password":"admin123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken') && SID=$(curl -s localhost/api/schools | node -pe 'JSON.parse(require("fs").readFileSync(0))[0].id') && curl -s -X POST localhost/api/schools/$SID/codes -H "Authorization: Bearer $ATOK" -H 'Content-Type: application/json' -d '{"role":"instructor","maxUses":5}' | grep -q '"code"' && echo OK
```
**Hors périmètre** : écran admin mobile (aucun en v1).
**Dépend de** : Q-02 (sous-question).

### - [ ] 4.4 — Claim `type` et secrets distincts pour access / refresh
**Objectif** : `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` (plus de `JWT_SECRET` ni de fallback en dur ; l'app refuse de démarrer sans), claim `type: 'access' | 'refresh'`, le middleware rejette un refresh token, `/refresh` rejette un access token. Durées selon Q-08.
**Fichiers** : `modules/auth/services/token.service.ts`, `middleware/auth.middleware.ts`, `services/api/src/index.ts` (validation des env), `.env.example`, `docker-compose*.yml`, tests, `docs/API_CONTRACT.md` (A1, A4).
**Critère de validation** :
```bash
R=$(curl -s -X POST localhost/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@drivingschool.com","password":"admin123"}') && AT=$(echo "$R" | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken') && RT=$(echo "$R" | node -pe 'JSON.parse(require("fs").readFileSync(0)).refreshToken') && test "$(curl -s -o /dev/null -w '%{http_code}' localhost/api/auth/me -H "Authorization: Bearer $RT")" = 401 && test "$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/auth/refresh -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$AT\"}")" = 401 && ! grep -rq 'fallback-secret' services/api/src && echo OK
```
**Hors périmètre** : révocation (4.6).
**Dépend de** : Q-08.

### - [ ] 4.5 — Refresh token réellement utilisé par le mobile
**Objectif** : `AuthContext` stocke `refreshToken` ; `ApiClient` intercepte un 401, appelle `/api/auth/refresh` une seule fois, rejoue la requête, et déconnecte si le refresh échoue. Jest (`jest-expo`) est installé côté mobile avec un test de l'interceptor (axios mocké, AsyncStorage mocké).
**Fichiers** : `mobile-app/package.json` (`jest-expo`, `@testing-library/react-native` non requis), `mobile-app/jest.config.js`, `mobile-app/src/services/api/ApiClient.ts`, `mobile-app/src/context/AuthContext.tsx`, `mobile-app/src/services/api/__tests__/ApiClient.test.ts`.
**Critère de validation** :
```bash
cd mobile-app && npm ci --silent && npx jest src/services/api --verbose 2>&1 | grep -E '✓|✕|Tests:' && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : typecheck global du mobile (6.1).

### - [ ] 4.6 — Déconnexion effective (révocation du refresh token)
**Objectif** : le refresh token (ou son hash) est enregistré en Redis avec TTL à la connexion ; `/logout` le supprime ; `/refresh` refuse un token absent de Redis.
**Fichiers** : `modules/auth/services/{auth,cache,token}.service.ts`, tests, `docs/API_CONTRACT.md` (A5).
**Critère de validation** :
```bash
R=$(curl -s -X POST localhost/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@drivingschool.com","password":"admin123"}') && AT=$(echo "$R" | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken') && RT=$(echo "$R" | node -pe 'JSON.parse(require("fs").readFileSync(0)).refreshToken') && curl -s -X POST localhost/api/auth/logout -H "Authorization: Bearer $AT" >/dev/null && test "$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/auth/refresh -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$RT\"}")" = 401 && echo OK
```
**Hors périmètre** : révocation des access tokens en cours (15 min de fenêtre acceptée).

---

## Phase 5 — Endpoints manquants, dans l'ordre du contrat

Chaque tâche met à jour `docs/API_CONTRACT.md` (statut → EXISTE, ou ligne supprimée si la route est retirée du mobile) **dans le même commit**.

### - [ ] 5.0 — Profils (P1–P11) : identifiants cohérents
**Objectif** : selon Q-13, les routes `/api/profiles/*` et `/api/student-profiles/*` acceptent l'identifiant retenu ; `getMyProfile` résout `users.id` → `students.id` via `schoolId`. Les 11 lignes P passent à EXISTE.
**Fichiers** : `modules/student/{controllers,services,repositories}/profile.*`, tests, `docs/API_CONTRACT.md`.
**Critère de validation** :
```bash
echo "→ avec un élève approuvé (voir helpers tests/) : " && (cd tests && npx jest e2e/profiles --verbose) && test "$(grep -cE '^\| P[0-9]+ .*\*\*DIVERGE\*\*' docs/API_CONTRACT.md)" -eq 0 && echo OK
```
(`tests/e2e/profiles.e2e.test.ts` à écrire dans cette tâche : élève approuvé → `GET /api/student-profiles/me/schools/:id/profile` → 200 avec `totalLessons`.)
**Hors périmètre** : contenu des onglets mobile (6.6).
**Dépend de** : Q-13.

### - [ ] 5.1 — L'instructeur connaît son école ; liste des élèves d'une école
**Objectif** : selon Q-04, `GET /api/auth/me` (ou route dédiée) renvoie `schoolId` et `instructorId` pour un instructeur ; `GET /api/schools/:id/students` (instructor/admin de cette école si Q-05 = a) liste les élèves autorisés `{ studentId, userId, name, email, enrollmentDate }`.
**Fichiers** : `modules/auth/**` ou `modules/school/**`, `modules/student/**`, tests, `docs/API_CONTRACT.md` (A3, nouvelle ligne S6).
**Critère de validation** :
```bash
ITOK=$(curl -s -X POST localhost/api/auth/login -H 'Content-Type: application/json' -d '{"email":"instructor@seed.io","password":"Seed1234!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken') && curl -s localhost/api/auth/me -H "Authorization: Bearer $ITOK" | grep -q '"schoolId"' && SID=$(curl -s localhost/api/auth/me -H "Authorization: Bearer $ITOK" | node -pe 'JSON.parse(require("fs").readFileSync(0)).schoolId') && curl -s localhost/api/schools/$SID/students -H "Authorization: Bearer $ITOK" | grep -q '^\[' && echo OK
```
(Identifiants de l'instructeur seedé : ceux définis dans `tests/fixtures/seed.sql`.)
**Hors périmètre** : écran mobile (6.2).
**Dépend de** : Q-04, Q-05, Q-10.

### - [ ] 5.2 — Leçons : demande (L2) et liste de l'appelant (L1)
**Objectif** : `POST /api/lessons` (rôle `student`, élève autorisé dans l'école de l'instructeur) crée une leçon `pending` `{ instructorId, type, notes? }` (+ `preferredDate` si Q-06 = c, + `schoolId` si Q-07 = b) ; `GET /api/lessons` renvoie les leçons de l'appelant (élève : les siennes ; instructeur : celles de son école ou les siennes) avec `startTime`, `status`, `type`, `price`, `instructor { id, firstName, lastName }`. Les anciennes routes de créneaux (`POST /:lessonId/book`, `GET /:id/availability`, …) sont retirées ou marquées en §8 du contrat.
**Fichiers** : `modules/lesson/**`, tests, `docs/API_CONTRACT.md` (L1, L2, §8).
**Critère de validation** :
```bash
(cd tests && npx jest e2e/critical-path --bail -t 'demande de leçon|liste des leçons' --verbose) && echo OK
```
**Hors périmètre** : approbation (5.3).
**Dépend de** : Q-01, Q-03, Q-05, Q-06, Q-07.

### - [ ] 5.3 — Leçons : approbation, refus, annulation (L5, L6, L3)
**Objectif** : `PUT /api/lessons/:id/approve { startTime, endTime, adminNotes? }` (instructeur de la leçon) → `scheduled`, prix selon Q-15 ; `PUT /api/lessons/:id/reject { reason? }` → `rejected` ; `POST /api/lessons/:id/cancel` selon Q-09 (élève sur sa leçon dans la fenêtre autorisée, instructeur toujours) → `cancelled`.
**Fichiers** : `modules/lesson/**`, tests, `docs/API_CONTRACT.md` (L3, L5, L6).
**Critère de validation** :
```bash
(cd tests && npx jest e2e/critical-path --bail -t 'approbation de la leçon' --verbose) && (cd services/api && npx jest lesson --silent) && echo OK
```
**Hors périmètre** : présence (5.4).
**Dépend de** : Q-05, Q-09, Q-15.

### - [ ] 5.4 — Leçons : présence (L7) et réservation directe (L4)
**Objectif** : `PUT /api/lessons/:id/attendance { attended, feedback?, rating? }` par identifiant de **leçon** → `completed`, met à jour `student_lesson_stats` ; `POST /api/lessons/book-for-student` selon Q-10 (crée directement une leçon `scheduled`).
**Fichiers** : `modules/lesson/**`, `modules/student/**` (stats), tests, `docs/API_CONTRACT.md` (L4, L7).
**Critère de validation** :
```bash
(cd tests && npx jest e2e/critical-path --verbose); echo "exit=$? (attendu 0 : chemin critique complet)"
```
**Hors périmètre** : examens.
**Dépend de** : Q-10.

### - [ ] 5.5 — Examens : demande (X2) et liste de l'appelant (X1)
**Objectif** : `POST /api/exams/request { examType, preferredDate, message? }` (élève autorisé ; `schoolId` si Q-07 = b) → `pending`, éligibilité selon Q-11 ; `GET /api/exams/my-exams` (élève : les siens ; instructeur : ceux de son école) au format du contrat. L'ancien `GET /api/exams` public et `POST /:examId/register` sont retirés ou déplacés en §8.
**Fichiers** : `modules/exam/**`, tests, `tests/e2e/exams.e2e.test.ts` (nouveau : demande → liste), `docs/API_CONTRACT.md` (X1, X2, §8).
**Critère de validation** :
```bash
(cd tests && npx jest e2e/exams --bail -t 'demande|liste' --verbose) && echo OK
```
**Hors périmètre** : planification.
**Dépend de** : Q-03, Q-05, Q-07, Q-11.

### - [ ] 5.6 — Examens : planification, refus, résultat (X3, X4, X5)
**Objectif** : `PUT /api/exams/:id/schedule { dateTime, location }` → `scheduled` ; `PUT /api/exams/:id/reject { reason }` → `cancelled` + `rejectionReason` ; `PUT /api/exams/:id/result { result, score, notes? }` → `completed`, rôle instructeur selon Q-05.
**Fichiers** : `modules/exam/**`, tests, `tests/e2e/exams.e2e.test.ts`, `docs/API_CONTRACT.md` (X3–X5).
**Critère de validation** :
```bash
(cd tests && npx jest e2e/exams --verbose); echo "exit=$? (attendu 0)"
```
**Hors périmètre** : —
**Dépend de** : Q-03, Q-05.

### - [ ] 5.7 — Routes hors contrat retirées ou verrouillées
**Objectif** : toute route backend absente du contrat (§1–7) est soit supprimée, soit listée en §8 avec un rôle `admin` ; `/api/verification/*` n'est plus montée publiquement (appelée en interne ou supprimée).
**Fichiers** : `modules/*/routes/*.ts`, `docs/API_CONTRACT.md` (§8).
**Critère de validation** :
```bash
test "$(curl -s -o /dev/null -w '%{http_code}' localhost/api/verification/verify-enrollment)" = 404 && test "$(curl -s -o /dev/null -w '%{http_code}' -X POST localhost/api/lessons/00000000-0000-0000-0000-000000000000/book)" = 404 && echo OK
```
**Hors périmètre** : —

### - [ ] 5.8 — Contrat entièrement EXISTE, e2e bloquant en CI
**Objectif** : plus aucune ligne MANQUE ou DIVERGE dans les tableaux du contrat ; le job e2e devient bloquant (`continue-on-error` retiré).
**Fichiers** : `docs/API_CONTRACT.md` (§10 synthèse), `.github/workflows/e2e.yml`.
**Critère de validation** :
```bash
test "$(grep -cE '^\| [A-Z]+[0-9]+ .*\*\*(MANQUE|DIVERGE)\*\*' docs/API_CONTRACT.md)" -eq 0 && ! grep -q 'continue-on-error' .github/workflows/e2e.yml && (cd tests && npx jest --silent) && echo OK
```
**Hors périmètre** : —

---

## Phase 6 — Câblage des écrans mobile

### - [ ] 6.1 — Hygiène mobile : services homogènes, vocabulaire, écrans morts, typecheck, CI
**Objectif** : tous les `*Service.ts` renvoient `response.data` ; les erreurs sont lues selon Q-12 ; enums `Lesson`/`Exam` alignés sur Q-03 ; suppression de `StudentDashboardScreen.tsx`, `RequestLessonScreen.tsx`, `ExamsListScreen.tsx` et des chemins du §9 du contrat ; `npx tsc --noEmit` passe ; job CI mobile (typecheck + jest).
**Fichiers** : `mobile-app/src/services/api/*.ts`, `mobile-app/src/config/api.config.ts`, `mobile-app/src/models/*.ts`, écrans supprimés, `.github/workflows/ci-cd.yml`.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && test "$(grep -rc 'return await apiClient' src/services/api | grep -v ':0' | wc -l)" -eq 0 && ! test -e src/screens/student/StudentDashboardScreen.tsx && grep -q 'mobile-app' ../.github/workflows/ci-cd.yml && npx jest --silent && echo OK
```
**Hors périmètre** : nouveaux appels.
**Dépend de** : Q-03, Q-12, Q-14.

### - [ ] 6.2 — Instructeur : école connue, inscription par code
**Objectif** : `AuthContext` expose `schoolId` (selon Q-04) ; `InstructorDashboard` passe `schoolId` à `EnrollmentRequests` ; `InstructorRegistrationScreen` suit le flux de Q-02 (un ou deux appels, authentifié) ; tests jest des méthodes de service concernées (URL + payload).
**Fichiers** : `mobile-app/src/context/AuthContext.tsx`, `screens/instructor/InstructorDashboard.tsx`, `screens/auth/InstructorRegistrationScreen.tsx`, `services/api/{AuthService,SchoolCodeService,EnrollmentService}.ts` + `__tests__`.
**Critère de validation** :
```bash
cd mobile-app && npx tsc --noEmit && npx jest src/services/api --silent && grep -q "navigate('EnrollmentRequests', { schoolId" src/screens/instructor/InstructorDashboard.tsx && echo OK
```
**Hors périmètre** : leçons/examens.
**Dépend de** : Q-02, Q-04.

### - [ ] 6.3 — Instructeur : demandes de leçons et présence
**Objectif** : `LessonRequestsScreen` appelle `approveLesson` / `rejectLesson` (plus de stub) et ne liste que les `pending` ; `TodayLessonsScreen` appelle `markAttendance` par identifiant de leçon ; tests jest des méthodes.
**Fichiers** : `screens/instructor/{LessonRequestsScreen,TodayLessonsScreen}.tsx`, `services/api/LessonService.ts` + tests.
**Critère de validation** :
```bash
cd mobile-app && test "$(grep -c 'API call to' src/screens/instructor/LessonRequestsScreen.tsx src/screens/instructor/TodayLessonsScreen.tsx | grep -v ':0' | wc -l)" -eq 0 && npx tsc --noEmit && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : réservation directe (6.4).
**Dépend de** : Q-06.

### - [ ] 6.4 — Instructeur : réservation directe pour un élève
**Objectif** : `BookForStudentScreen` selon Q-10 (liste des élèves via S6 ou email), payload conforme à L4.
**Fichiers** : `screens/instructor/BookForStudentScreen.tsx`, `services/api/{LessonService,SchoolService}.ts` + tests.
**Critère de validation** :
```bash
cd mobile-app && ! grep -q 'studentId: studentEmail' src/screens/instructor/BookForStudentScreen.tsx && npx tsc --noEmit && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : —
**Dépend de** : Q-10.

### - [ ] 6.5 — Instructeur et élève : examens
**Objectif** : `ExamRequestsScreen` appelle `scheduleExam` / `rejectExamRequest` (plus de stub) ; `TodayExamsScreen` appelle `recordExamResult` ; `RequestExamScreen` et `MyExamsScreen` utilisent le vocabulaire retenu ; tests jest.
**Fichiers** : `screens/instructor/{ExamRequestsScreen,TodayExamsScreen}.tsx`, `screens/student/{RequestExamScreen,MyExamsScreen}.tsx`, `services/api/ExamService.ts` + tests.
**Critère de validation** :
```bash
cd mobile-app && test "$(grep -c 'API call to' src/screens/instructor/ExamRequestsScreen.tsx src/screens/instructor/TodayExamsScreen.tsx | grep -v ':0' | wc -l)" -eq 0 && npx tsc --noEmit && npx jest src/services/api --silent && echo OK
```
**Hors périmètre** : —
**Dépend de** : Q-03, Q-11.

### - [ ] 6.6 — Fiches élève joignables : `StudentProfile` et `MyProfile`
**Objectif** : `EnrollmentRequestsScreen` (demandes approuvées) ou la liste des élèves (S6) navigue vers `StudentProfile` avec `{ studentId (selon Q-13), schoolId, studentName }` ; `StudentDashboard` navigue vers `MyProfile` avec `schoolId` (selon Q-07) ; `MyLessonsScreen` propose l'annulation selon Q-09.
**Fichiers** : `screens/instructor/EnrollmentRequestsScreen.tsx`, `screens/student/{StudentDashboard,MyLessonsScreen}.tsx`, `navigation/{AppNavigator,types}.tsx`.
**Critère de validation** :
```bash
cd mobile-app && grep -rq "navigate('StudentProfile'" src/screens/instructor && grep -q "navigate('MyProfile'" src/screens/student/StudentDashboard.tsx && npx tsc --noEmit && npx jest --silent && echo OK
```
**Hors périmètre** : —
**Dépend de** : Q-07, Q-09, Q-13.

---

## Après la Phase 6

La recette finale (parcours D-15 sur un téléphone via Expo Go, backend en Docker) est faite **par l'humain**, hors de cette liste. Les fonctionnalités non couvertes par le contrat (paiement en ligne, notifications push/email/SMS, analytics, web) ne sont pas dans la v1 et ne reçoivent pas de tâche tant que `DECISIONS.md` ne l'a pas décidé.
