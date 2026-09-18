# Architecture — état réel au 18/09/2026 (fin de Phase 2)

Ce document décrit ce qui **est** dans le dépôt, pas ce qui est souhaité. Les incohérences sont listées telles quelles ; les corrections sont dans `PLAN.md`. Quand une source contredit une autre (README, Makefile, Dockerfile, compose), c'est **`docker-compose.yml`** qui fait foi car c'est lui qui tourne.

## 1. Vue d'ensemble

```
Expo Go (mobile-app)            web-frontend (gelé, D-05)
        │ HTTP :80                      │
        ▼                               ▼
   Nginx (driving-school-nginx) ── /api/* → api:3000 (résolu à la requête)
        │                          /api/verification/* → 404, jamais transmis
        ▼
   api (services/api, driving-school-api)  :3000   ← une seule application Express
        │                      │
   PostgreSQL 15 :5432    Redis 7 :6379
   (UNE base : driving_school)  (module auth : clé de session, non écrite avant 4.6)
```

Tout tourne sur un réseau Docker `driving-school-network` (`docker compose up -d --build`). L'API publie aussi `3000:3000` sur l'hôte pour le développement ; la surcharge `docker-compose.prod.yml` retire ce port (Nginx seul). Les 8 anciens services (`auth`, `school`, `student`, `lesson`, `exam`, `payment`, `notification`, `analytics`, ports 3001–3008) ont été **supprimés en 2.7** ; leur code reste dans l'historique git.

## 2. `services/api` — l'application unique

Node 20 (`node:20-alpine`), Express, TypeScript strict, port **3000**. Structure :

```
services/api/src/
  index.ts              # dotenv, loadEnv() (Joi : DATABASE_URL, REDIS_URL, JWT_SECRET obligatoires), câblage des modules, listen
  app.ts                # createApp({ routers }) : helmet, cors, json, rate-limit (garde-fou 1000/15 min), /health, /api/<préfixe>, 404 D-27
  config/{env,database,redis}.ts
  http/errors.ts        # HttpError(status, code, message), sendError, sendCaughtError (500 masqué + journal), sendValidationError
  http/validation.ts    # validate(schema, input) typé, uuidParam (404 si mal formé), enumQuery (400 si hors liste)
  middleware/auth.middleware.ts   # authenticate(verifier) : JWT vérifié localement, req.user = { userId, email, role } ; authorize(...roles) ; getAuthUser(req)
  types/{auth,domain}.ts          # UserRole, AuthUser ; LessonType (CODE / Manœuvre / Parc), statuts d'inscription
  modules/<domaine>/    # routes → controllers → services → repositories, validators, types, __tests__ ; index.ts = build<Module>()
  test-utils/http.ts    # jetons de test, Pool factice (exclu de la couverture)
```

| Module | Préfixes montés | Contenu (état actuel, contrat cible entre parenthèses) | Réutilisé par |
|---|---|---|---|
| `auth` | `/api/auth` | A1–A5 ; `register` exige encore `role` (4.1) ; même secret pour access et refresh (4.4) ; logout = clé Redis jamais écrite (4.6) ; expose `requireAuth` | tous |
| `school` | `/api/schools` | S1–S4 publics + administration `admin` ; colonnes aliasées en camelCase ; `LessonType` D-18 | `lesson` (grille tarifaire, D-30) |
| `student` | `/api/enrollment`, `/api/profiles`, `/api/student-profiles`, `/api/verification` | E1–E6, P1–P11 (`:studentId` = students.id jusqu'à 5.0), vérification (publique dans l'app, **bloquée par Nginx**, retirée en 5.7) ; `approveRequest` fonctionne depuis 3.1 (`students.name` nullable) mais sans transaction (3.2) | `lesson`, `exam` (`StudentRepository`, `StatsRepository`) |
| `lesson` | `/api/lessons` | ancien modèle « l'école crée un créneau, l'élève réserve » (`lesson_bookings`, `studentId` = students.id) ; refonte D-01/D-21 en 3.3 et 5.2–5.4 | — |
| `exam` | `/api/exams` | ancien modèle « session + inscription », éligibilité 20/30 leçons (supprimée en 5.7, D-26) ; refonte D-01 en 3.4 et 5.5–5.6 | — |
| `payment` | **non monté** | porté typé (D-31 : paiement manuel en v1) ; sa table `payments` n'a pas la colonne `metadata` que le code écrit — migration nécessaire s'il est un jour monté | — |

Non portés : `notification` (D-35) et `analytics` (D-31, dont le middleware pass-through rendait ses routes publiques). Règles de code : aucun `any` (lint `no-unsafe-*` en `error`), `db.query<T>`, schémas Joi génériques, erreurs métier = `HttpError` levée par le service et traduite par le controller ; identifiants mal formés → 404 ; suppressions → 204.

## 3. Authentification — comment ça marche

- Le module `auth` signe deux JWT HS256 avec **le même** `JWT_SECRET` et **le même payload** `{ userId, email, role }` : `accessToken` (15 min) et `refreshToken` (7 j). Rien ne distingue les deux (un refresh token est accepté comme access token) : claim `type`, secrets distincts et durées D-23 arrivent en 4.4.
- **Un seul middleware** (`src/middleware/auth.middleware.ts`) vérifie le jeton localement et pose `req.user` ; plus aucun appel HTTP vers `/api/auth/me` (D-03). Le bug historique `req.user.userId === undefined` des anciens services n'existe plus : `POST /api/enrollment/schools/:id/request` rattache la demande au `users.id` du jeton.
- `POST /api/auth/register` est public et accepte `role ∈ {admin, instructor, student}` : n'importe qui peut encore se créer un compte admin (4.1, 4.2).
- `POST /api/auth/logout` répond 204 et supprime une clé Redis `user:<id>:session` que rien n'écrit. Aucune révocation de jeton n'existe (4.6).
- Le mobile stocke l'`accessToken` mais **n'appelle jamais `/refresh`** : sur 401 il efface le stockage. Session effective = 15 min (4.5).
- Erreurs : partout `{ error: <code>, message: <français> }` (D-27). Codes : `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `NOT_ENROLLED`, `INTERNAL_ERROR` (+ `FORBIDDEN_SCHOOL`, `CANCEL_WINDOW_CLOSED`, `PRICE_REQUIRED`, `INVALID_SCHOOL_CODE` réservés aux phases 4–5).

## 4. Base de données

Une seule base `driving_school`, un seul schéma `public`. Les modules lisent et écrivent librement les tables des autres (ex. `lesson` lit `students`, `student` lit `lesson_bookings` et `exam_registrations`) ; c'est voulu dans une application unique.

### Migrations
`migrations/001_initial_schema.sql`, `002_enrollment_system.sql`, `003_student_profile.sql`, `004_schema_migrations.sql`, `005_enrollment_student_not_null.sql` (purge des demandes orphelines, `student_id NOT NULL`), `006_user_names.sql` (`users.first_name` / `last_name` avec backfill, `students.name` et `instructors.name` nullables), appliquées par Postgres à la première initialisation du volume. `004` crée la table de suivi `schema_migrations` (`name`, `applied_at`) et y inscrit 001–004. `scripts/migrate.sh` (`make migrate`) applique ensuite, dans l'ordre et en une transaction chacune, les migrations non enregistrées ; relançable sans effet. Les fichiers 001 et 002 ne sont pas idempotents (`CREATE INDEX` / `CREATE TRIGGER` sans `IF NOT EXISTS`) : rejouer l'un d'eux à la main sur une base existante échoue — passer par le script.

### Tables (état après 006)

| Table | Clés / colonnes notables | Écrite par (module) | Lue par (module) |
|---|---|---|---|
| `users` | `id`, `email` unique, `password_hash`, `role` ∈ admin/instructor/student, + (006) `first_name`, `last_name` NOT NULL (`''` pour les comptes antérieurs, D-16) | auth | tous (identité : jointures depuis school, student) |
| `schools` | `id`, `name`, `address`, `phone`, `email`, `logo_url` | school | school, student |
| `instructors` | `id`, `user_id` → users, `school_id` → schools, `name` (**nullable depuis 006**, identité portée par users), `phone`, `license_number`, `specialties[]` | school | school, student (jointures) |
| `pricing` | `school_id`, `lesson_type` ∈ CODE/Manœuvre/Parc, `price`, `duration`, unique(school, type) | school | school |
| `students` | `id`, `user_id` → users, `school_id` → schools, `name` (**nullable depuis 006**, plus alimentée), `authorized`, + (002) `enrollment_date`, `enrollment_request_id`, + (003) `date_of_birth`, `license_number`, `emergency_contact`, `emergency_phone`, `notes` | student | student, lesson, exam |
| `lessons` | `school_id`, `instructor_id`, `type` ∈ CODE/Manœuvre/Parc, `date_time`, `duration_minutes`, `capacity`, `current_bookings`, `price`, `status` ∈ scheduled/completed/cancelled | lesson | lesson, student |
| `lesson_bookings` | `lesson_id`, `student_id` → **students**, `attended`, `feedback`, `rating`, + (003) `paid`, `payment_date`, `payment_method`, `amount` ; unique(lesson, student) | lesson, student | lesson, exam (compte les leçons pointées), student |
| `exams` | `school_id`, `type` ∈ theory/practical, `date_time`, `examiner_id` (sans FK), `price`, `capacity` | exam | exam, student |
| `exam_registrations` | `exam_id`, `student_id` → **students**, `result` ∈ passed/failed/pending, `score`, `notes`, + (003) `paid`, `payment_date`, `payment_method`, `amount` | exam, student | exam, student |
| `payments` | `student_id` → students, `reference_type` ∈ lesson/exam, `reference_id`, `amount`, `status`, `method`, `transaction_id` — **pas de `metadata`** | personne (module non monté) | personne |
| `notifications` | `user_id` → users, `type`, `title`, `message`, `read` | personne (module non porté, D-35) | personne |
| `school_codes` (002) | `school_id`, `code` unique, `role` ∈ instructor/student, `max_uses`, `uses_count`, `expires_at`, `is_active` | personne (4.2 : consommé par `register`) | personne |
| `enrollment_requests` (002) | `student_id` → **users** (pas students), **NOT NULL depuis 005**, `school_id`, `status` ∈ pending/approved/rejected, `message`, `rejection_reason`, `processed_by` → users, `processed_at` ; unique(student, school) | student | student |
| `student_lesson_stats` (002) | `student_id` → students, `school_id`, compteurs de leçons effectuées | student (`/verification/.../lesson-completed`, bloqué par Nginx) | student |
| `schema_migrations` (004) | `name` (PK, nom du fichier), `applied_at` | 004, `scripts/migrate.sh` | `scripts/migrate.sh` |

### Le double identifiant élève
- `users.id` : identité de connexion, présent dans le JWT. Utilisé comme `student_id` par `enrollment_requests`.
- `students.id` : une ligne **par couple (user, école)**, créée à l'approbation d'une inscription. Utilisé comme `student_id` par `lesson_bookings`, `exam_registrations`, `payments`, `student_lesson_stats`.
- Le mobile ne connaît que `users.id`. `POST /api/lessons/:id/book` et `POST /api/exams/:id/register` exigent un `students.id` dans le body : le mobile ne peut pas les appeler correctement (D-28, Phase 5).
- Un élève inscrit dans deux écoles a deux `students.id` (D-22 : une seule inscription active, 3.5).

### Approbation sans transaction (3.2)
`EnrollmentService.approveRequest` (`services/api/src/modules/student/services/enrollment.service.ts`) fait `updateStatus(approved)` puis `studentRepository.create({ userId, schoolId, authorized, enrollmentRequestId })` en deux requêtes indépendantes. Depuis 006 l'INSERT passe (`students.name` nullable), mais si la seconde requête échoue la demande reste `approved` sans ligne `students` : transaction en 3.2.

## 5. Nginx — où passent les requêtes

Fichier : `nginx/nginx.conf` (+ `nginx/proxy_params.conf`, inclus). Depuis 2.6, **un seul upstream** : l'application unique.

| Préfixe | Traitement | Rate limit |
|---|---|---|
| `/health` | réponse statique `healthy` | — |
| `/api/verification/*` | **404 JSON**, jamais transmis (D-14 ; routes retirées de l'application en 5.7) | — |
| `/api/*` | `proxy_pass` vers `api:3000`, nom résolu **à la requête** (`resolver 127.0.0.11 valid=10s`) : recréer le conteneur `api` ne casse plus la passerelle | 10 r/s par IP, burst 20 |
| tout le reste | 404 JSON `{ error: NOT_FOUND }` | — |

Conséquences : `/api/profiles/*` et `/api/student-profiles/*` sont **joignables** (ils ne l'étaient pas) ; `/api/payments`, `/api/notifications`, `/api/analytics` répondent 404 par l'application (modules non montés / non portés). Plus de `listen 443` ni de montage `./nginx/ssl` (TLS hors périmètre). `Access-Control-Allow-Origin: *` conservé (le mobile appelle depuis un autre hôte).

## 6. Qui appelle quoi

### Mobile → backend (via Nginx :80)
Le détail par écran est dans `API_CONTRACT.md`. Résumé des dépendances réelles :

| Écran mobile | Domaines appelés |
|---|---|
| Login / Register / InstructorRegistration | auth, schools (`school-codes/verify` — inexistant) |
| StudentDashboard, InstructorDashboard | aucun (menus) |
| SchoolsList, SchoolDetail | schools, enrollment |
| BookLesson, MyLessons | lessons, enrollment |
| RequestExam, MyExams | exams |
| MyEnrollmentRequests | enrollment |
| MyProfile (3 onglets) | student-profiles — **injoignable** : aucun écran actif n'y navigue |
| EnrollmentRequests (instructeur) | enrollment — reçoit `schoolId` en param de route mais le dashboard n'en passe aucun → ne charge rien |
| LessonRequests, TodayLessons, ExamRequests, TodayExams | lessons / exams en lecture ; les boutons approuver / rejeter / planifier / résultat sont des **stubs** (`Alert('Success')` sans appel réseau) |
| BookForStudent | lessons (`/book-for-student` — inexistant ; envoie l'email de l'élève comme `studentId`) |
| StudentProfile (3 onglets) | profiles — **injoignable** : aucun écran n'y navigue |

Config : l'URL de base vient de `app.json` → `expo.extra.API_BASE_URL` (valeur neutre `http://10.0.2.2:80`, l'hôte vu de l'émulateur Android — D-38), surchargeable par `EXPO_PUBLIC_API_BASE_URL` (fichier `mobile-app/.env`, ignoré ; modèle `.env.example`), résolue dans `mobile-app/src/config/api.config.ts` via `expo-constants` (déclaré en dépendance directe depuis 0.4). Le plugin Babel `react-native-dotenv` (module `@env`) reste configuré mais plus rien ne l'importe (6.1).

### Backend → backend
Aucun appel HTTP : les modules se parlent en mémoire (`buildXModule()` reçoit les services et repositories dont il dépend) et partagent la base.

### Web → backend
`web-frontend/src/services/api.ts` appelle `/api/auth/*`, `/api/schools`, `/api/lessons`, `/api/bookings` (**n'existe nulle part**), `/api/exams/:id/register`, `/api/enrollment/*`, `/api/payments`, `/api/analytics/dashboard`. Le fichier utilise le type `AxiosInstance` sans l'importer → `npm run build` échoue. Gelé (D-05).

## 7. Outillage

- **Docker** : `services/api/Dockerfile` multi-stage (builder `npm ci` + `tsc` sans fallback, runtime `npm ci --omit=dev`, user `nodejs`, `curl` pour le healthcheck). Trois compose : `docker-compose.yml` (postgres, redis, api, nginx), `docker-compose.dev.yml` (API en `ts-node-dev` sur les sources), `docker-compose.prod.yml` (limites de ressources, journaux, pas de port direct sur l'API).
- **Makefile** : `install / typecheck / lint / test / format / build` sur `services/api`, `dev / prod / stop / clean / logs / restart / health / migrate / shell-postgres / shell-redis / backup-db / restore-db / db-status / redis-*`. `make` n'est pas installé sur toutes les machines : chaque cible est une commande directe documentée dans `CLAUDE.md`.
- **CI** (`.github/workflows/ci-cd.yml`) : job `api` (lint, `tsc --noEmit`, tests avec couverture, build) sur Node 20, déclenché sur `services/api/**`, puis `build-images` (image `api`) et deploy staging/prod (coquilles vides). `pr-check.yml` : titre et commits conventionnels, typecheck de `services/api` et de `tests/`, détection de secrets. `e2e.yml` monte la stack complète, lance `npm run test:e2e` (informatif, `continue-on-error` jusqu'à 5.8) et publie `report.json` + un résumé par test. Pas de job mobile (6.1).
- **Hooks git** : `.husky/pre-commit` lance `lint-staged --config package.json` (Prettier `--write` sur `services/*/src/**/*.ts`) ; `.husky/commit-msg` lance commitlint (scopes : `api`, les 8 domaines, `mobile`, `docs`, `infra`, `e2e`, `docker`, `ci`, `deps`). Husky s'active par `npm install` racine ; sans lui, aucun hook ne tourne.
- **Tests** : `services/api` — 169 tests Jest (services avec mocks d'interfaces, routes HTTP via supertest sur `createApp`, repositories sur `Pool` factice), seuils de couverture = couverture mesurée (D-37, 87/85/93/87 au 18/09). `tests/` — paquet npm autonome (jest + ts-jest + supertest + pg) qui cible `GATEWAY_URL` (défaut `http://localhost`), attend `/health`, applique `tests/fixtures/seed.sql` (école `Seed Driving School`, instructeur `instructor@seed.io`, grille tarifaire, code `INST-SEED`) puis lance `*.e2e.test.ts` en série ; `npm run test:e2e` à la racine ; il lit `POSTGRES_*` dans l'environnement puis dans le `.env` racine. `e2e/critical-path.e2e.test.ts` (D-15, routes cibles du contrat) **échoue dès A2** (`register` exige `role`) : attendu jusqu'à 5.8.
- **Git** : `.gitignore` racine (`node_modules/`, `dist/`, `coverage/`, `.env`, `.env.*.local`, `.DS_Store`, `*.log`, `.expo/`), `.gitattributes` (`* text=auto eol=lf`). Un `.env.example` à la racine (toutes les variables lues par les compose), dans `services/api/`, `mobile-app/` et `web-frontend/`.

## 8. Doublons et fichiers morts restants (état après 2.7)

| Fichier | Constat |
|---|---|
| `mobile-app/babel.config.js` plugin `module:react-native-dotenv` (+ dépendance `react-native-dotenv`) | Plus aucun import `@env` depuis 0.4 (l'URL vient de `expo-constants` / `EXPO_PUBLIC_*`) ; à retirer en 6.1. |
| `mobile-app/MINIMAL_DESIGN_GUIDE.md` | Doc de statut hors racine (`MOBILE_APP_COMPLETE.md` supprimé en 0.8) ; à trancher en 6.1. |
| `.commitlintrc.json` scopes `auth`…`analytics` | Conservés comme scopes de module ; `notification` et `analytics` ne désignent plus rien dans le code. |

Supprimés en 2.7 : `services/{auth,school,student,lesson,exam,payment,notification,analytics}`, `scripts/quick-start.sh` (contenait une copie du schéma SQL hors migrations) et `scripts/docker-*.{sh,ps1}` (doublons cassés des cibles `make`, `-f docker compose.yml`). Supprimés en 0.8 : les 8 scripts de test manuel de la racine, `scripts/test-api.sh`, `mobile-app/src/app.ts`, les trois écrans injoignables, `mobile-app/MOBILE_APP_COMPLETE.md`, `services/student/src/repositories/profile.service.ts`.
