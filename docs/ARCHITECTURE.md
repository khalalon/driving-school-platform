# Architecture — état réel au 17/09/2026

Ce document décrit ce qui **est** dans le dépôt, pas ce qui est souhaité. Les incohérences sont listées telles quelles ; les corrections sont dans `PLAN.md`. Quand une source contredit une autre (README, Makefile, Dockerfile, compose), c'est **`docker-compose.yml`** qui fait foi car c'est lui qui tourne.

## 1. Vue d'ensemble

```
Expo Go (mobile-app)            web-frontend (gelé)
        │ HTTP :80                      │
        ▼                               ▼
   Nginx (driving-school-nginx)  ──────────────  /api/<domaine> → upstream
        │
        ├── auth-service          :3001
        ├── school-service        :3002
        ├── lesson-service        :3003
        ├── exam-service          :3004
        ├── payment-service       :3005
        ├── notification-service  :3006
        ├── student-service       :3007
        └── analytics-service     :3008
                 │                      │
          PostgreSQL 15 :5432      Redis 7 :6379
          (UNE base partagée :     (auth, notification,
           driving_school)          analytics seulement)
```

Tout tourne sur un réseau Docker `driving-school-network`. Chaque service publie aussi son port sur l'hôte (`3001:3001`, etc.), donc on peut contourner Nginx en dev.

## 1 bis. `services/api` — l'application unique (Phase 2, en cours)

Depuis 2.1, `services/api` (port **3000**, `node:20-alpine`, conteneur `driving-school-api`) tourne **à côté** des 8 anciens services, qui disparaissent en 2.7. Structure :

```
services/api/src/
  index.ts              # dotenv, loadEnv() (Joi : DATABASE_URL, REDIS_URL, JWT_SECRET obligatoires), câblage, listen
  app.ts                # createApp({ routers }) : helmet, cors, json, rate-limit (garde-fou), /health, /api/<domaine>, 404 D-27
  config/{env,database,redis}.ts
  http/errors.ts        # HttpError(status, code, message), sendError, sendCaughtError (500 masqué), sendValidationError
  http/validation.ts    # validate(schema, input) typé
  modules/<domaine>/    # routes → controllers → services → repositories, validators, types, __tests__ ; index.ts = build<Module>()
```
Modules portés : `auth` (2.1), `school` (2.3 : S1–S4 + administration `admin`, colonnes aliasées en camelCase, `LessonType` = `CODE / Manœuvre / Parc` via `src/types/domain.ts`), `student` (2.3 : `/api/enrollment`, `/api/profiles`, `/api/student-profiles`, `/api/verification` — ce dernier encore public jusqu'à 2.6/5.7), `lesson` et `exam` (2.4 : routes de l'ancien modèle « l'école crée, l'élève réserve », portées telles quelles, `studentId` = students.id ; refonte D-01 en Phase 3/5 ; les deux réutilisent le `StudentRepository` du module student). `payment` est porté mais **non monté** (2.5, D-31 ; sa table `payments` n'a pas la colonne `metadata` que le code écrit — à corriger par migration s'il est un jour monté) ; `notification` et `analytics` ne sont **pas portés** (D-31, D-35 : le code reste dans l'historique git après 2.7). Chaque module expose `build<Module>()` et ce que les autres réutilisent (`pricingService`, `studentRepository`, `statsRepository`). Middleware unique `src/middleware/auth.middleware.ts` (2.2) : `authenticate(tokenService)` vérifie le JWT localement et pose `req.user = { userId, email, role }` ; `authorize(...roles)` → 403 FORBIDDEN. Plus aucun appel HTTP entre modules (D-03) ; le bug `req.user.userId === undefined` n'existe pas dans `services/api`. Règles : aucun `any` (lint strict), `db.query<T>`, schémas Joi génériques, erreurs métier = `HttpError` levée par le service et traduite par le controller. Tests : unitaires (mocks d'interfaces) + HTTP (supertest sur `createApp`).

## 2. Services et ports

| Service | Dossier | Port (compose) | Fallback code | `EXPOSE` Dockerfile | Redis | Dans `make` | Dans CI | Dans compose prod |
|---|---|---|---|---|---|---|---|---|
| auth | `services/auth` | **3001** | 3001 | 3001 | oui | oui | oui | oui |
| school | `services/school` | **3002** | 3002 | 3002 | non | oui | oui | oui |
| lesson | `services/lesson` | **3003** | 3003 | 3003 | non | oui | oui | oui |
| exam | `services/exam` | **3004** | 3004 | 3004 | non | oui | oui | oui |
| payment | `services/payment` | **3005** | 3005 | 3005 | non | oui | oui | oui |
| notification | `services/notification` | **3006** | 3006 | 3006 | oui | oui | oui | oui |
| student | `services/student` | **3007** | 3007 | 3007 | non | oui | **non** | **non** |
| analytics | `services/analytics` | **3008** | **3007** | **3007** | oui | oui | **non** | oui |

Incohérences :
- **analytics** : compose dit 3008, mais le fallback dans `src/index.ts`, le `EXPOSE` du Dockerfile et le README disent 3007 — qui est le port de `student`. Lancé hors Docker sans `PORT`, analytics et student entrent en collision.
- **student** est absent de `.github/workflows/ci-cd.yml`, de `docker-compose.dev.yml` et de `docker-compose.prod.yml` (présent dans le `Makefile` depuis 0.1). C'est pourtant le service qui porte le flux d'inscription, cœur du produit.
- Le README historique décrivait 7 services ; il y en a 8.

### Structure interne d'un service (identique partout sauf analytics)

```
services/<nom>/src/
  index.ts            # crée le pool pg (+ redis), instancie App, écoute PORT
  app.ts              # helmet, cors, json, rate-limit, /health, monte /api/<domaine>
  config/             # database.config.ts (Pool pg via DATABASE_URL), redis.config.ts
  routes/             # câblage repo → service → controller → router
  controllers/        # validation Joi + réponse HTTP
  services/           # règles métier, reçoit des interfaces par constructeur
  repositories/       # SQL paramétré, retourne des objets camelCase
  validators/         # schémas Joi
  middleware/auth.middleware.ts
  types/index.ts
```
`analytics` n'a pas de `app.ts` (tout est dans `index.ts`) et ses fichiers config s'appellent `database.ts` / `redis.ts`.

## 3. Authentification — comment ça marche vraiment

- `auth-service` signe deux JWT HS256 avec **le même** `JWT_SECRET` et **le même payload** `{ userId, email, role }` : `accessToken` (15 min) et `refreshToken` (7 j). Rien ne distingue les deux : un refresh token est accepté comme access token.
- `auth-service` vérifie les tokens **localement** (`services/auth/src/middleware/auth.middleware.ts`, injecte `TokenService`).
- **Les 6 autres services** (school, student, lesson, exam, payment, notification) ont chacun une copie du même middleware qui fait, à **chaque requête authentifiée**, `GET http://auth-service:3001/api/auth/me` avec le token, puis `req.user = response.data`.
  - `/api/auth/me` renvoie l'utilisateur en base : `{ id, email, role, createdAt, updatedAt }`.
  - Les controllers lisent `req.user.userId`. **Ce champ n'existe pas** → `undefined` dans les 6 services. Conséquence directe : `POST /api/enrollment/schools/:id/request` insère `student_id = NULL` (la colonne n'a pas de `NOT NULL`), et `GET /my-requests` renvoie toujours `[]`.
  - `auth-service` est donc un point de défaillance unique et ajoute un aller-retour HTTP par requête, alors que `JWT_SECRET` pourrait être partagé.
- **analytics** a un middleware **pass-through** : n'importe quel `Authorization: Bearer xxx` est accepté et `adminOnly` ne vérifie rien. `/api/analytics/revenue`, `/dashboard`, etc. sont de fait publics.
- `POST /api/auth/register` est public et accepte `role ∈ {admin, instructor, student}` : n'importe qui peut se créer un compte admin.
- `POST /api/auth/logout` supprime une clé Redis `user:<id>:session` que **rien n'écrit** jamais. Aucune révocation de token n'existe.
- Mobile et web stockent l'`accessToken` mais **n'appellent jamais `/refresh`** : sur 401 ils effacent le stockage. Session effective = 15 min.

## 4. Base de données

Une seule base `driving_school`, un seul schéma `public`, partagée par tous les services. Les services lisent et écrivent librement les tables des autres (ex. `lesson-service` lit `students`, `student-service` lit `lesson_bookings` et `exam_registrations`). Il n'y a **aucun** appel HTTP entre services autre que vers `auth`. Les variables `SCHOOL_SERVICE_URL`, `STUDENT_SERVICE_URL`, `LESSON_SERVICE_URL` du compose ne sont lues nulle part.

### Migrations
`migrations/001_initial_schema.sql`, `002_enrollment_system.sql`, `003_student_profile.sql`, `004_schema_migrations.sql`, appliquées par Postgres à la première initialisation du volume. `004` crée la table de suivi `schema_migrations` (`name`, `applied_at`) et y inscrit 001–004. `scripts/migrate.sh` (`make migrate`) applique ensuite, dans l'ordre et en une transaction chacune, les migrations non enregistrées ; relançable sans effet. Les fichiers 001 et 002 ne sont pas idempotents (`CREATE INDEX` / `CREATE TRIGGER` sans `IF NOT EXISTS`) : rejouer l'un d'eux à la main sur une base existante échoue — passer par le script.

### Tables (état après 004)

| Table | Clés / colonnes notables | Écrite par | Lue par |
|---|---|---|---|
| `users` | `id`, `email` unique, `password_hash`, `role` ∈ admin/instructor/student | auth | tous |
| `schools` | `id`, `name`, `address`, `phone`, `email`, `logo_url` | school | school, student |
| `instructors` | `id`, `user_id` → users, `school_id` → schools, `name`, `phone`, `license_number`, `specialties[]` | school | school, lesson, student (jointures) |
| `pricing` | `school_id`, `lesson_type` ∈ CODE/Manœuvre/Parc, `price`, `duration`, unique(school, type) | school | school |
| `students` | `id`, `user_id` → users, `school_id` → schools, **`name NOT NULL`**, `authorized`, + (002) `enrollment_date`, `enrollment_request_id`, + (003) `date_of_birth`, `license_number`, `emergency_contact`, `emergency_phone`, `notes` | student | lesson, exam, payment, student |
| `lessons` | `school_id`, `instructor_id`, `type` ∈ CODE/Manœuvre/Parc, `date_time`, `duration_minutes`, `capacity`, `current_bookings`, `price`, `status` ∈ scheduled/completed/cancelled | lesson | lesson, student, analytics |
| `lesson_bookings` | `lesson_id`, `student_id` → **students**, `attended`, `feedback`, `rating`, + (003) `paid`, `payment_date`, `payment_method`, `amount` ; unique(lesson, student) | lesson, student | lesson, exam (compte les leçons complétées), student, analytics |
| `exams` | `school_id`, `type` ∈ theory/practical, `date_time`, `examiner_id` (sans FK), `price`, `capacity` | exam | exam, student, analytics |
| `exam_registrations` | `exam_id`, `student_id` → **students**, `result` ∈ passed/failed/pending, `score`, `notes`, + (003) `paid`, `payment_date`, `payment_method`, `amount` | exam, student | exam, student, analytics |
| `payments` | `student_id` → students, `reference_type` ∈ lesson/exam, `reference_id`, `amount`, `status`, `method`, `transaction_id` | payment | payment, analytics |
| `notifications` | `user_id` → users, `type`, `title`, `message`, `read` | notification | notification |
| `school_codes` (002) | `school_id`, `code` unique, `role` ∈ instructor/student, `max_uses`, `uses_count`, `expires_at`, `is_active` | **personne** | **personne** |
| `enrollment_requests` (002) | `student_id` → **users** (pas students), `school_id`, `status` ∈ pending/approved/rejected, `message`, `rejection_reason`, `processed_by` → users, `processed_at` ; unique(student, school) | student | student |
| `student_lesson_stats` (002) | `student_id` → students, `school_id`, compteurs de leçons complétées | student (`/verification/.../lesson-completed`) | student |
| `schema_migrations` (004) | `name` (PK, nom du fichier), `applied_at` | 004, `scripts/migrate.sh` | `scripts/migrate.sh` |

Tables **utilisées par le code mais absentes des migrations** : `push_tokens` et `notification_preferences` (`services/notification/src/repositories/push-token.repository.ts`, `preference.repository.ts`). Tout appel à `/api/notifications/push-tokens` ou `/preferences` échoue en SQL.

### Le double identifiant élève
- `users.id` : identité de connexion, présent dans le JWT. Utilisé comme `student_id` par `enrollment_requests`.
- `students.id` : une ligne **par couple (user, école)**, créée à l'approbation d'une inscription. Utilisé comme `student_id` par `lesson_bookings`, `exam_registrations`, `payments`, `student_lesson_stats`.
- Le mobile ne connaît que `users.id` (décodé du JWT). Les endpoints `POST /api/lessons/:id/book` et `POST /api/exams/:id/register` exigent un `students.id` dans le body : le mobile ne peut pas les appeler correctement.
- Un élève inscrit dans deux écoles a deux `students.id`.

### Bug bloquant connu
`EnrollmentService.approveRequest` (`services/student/src/services/enrollment.service.ts`) fait `updateStatus(approved)` puis `studentRepository.create({ userId, schoolId, authorized, enrollmentRequestId })` **sans `name`**. `students.name` est `NOT NULL` → l'INSERT échoue, mais la demande est déjà passée à `approved` (pas de transaction). L'approbation est donc impossible aujourd'hui.

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

Config : l'URL de base vient de `app.json` → `expo.extra.API_BASE_URL`, surchargeable par `EXPO_PUBLIC_API_BASE_URL` (fichier `mobile-app/.env`, ignoré ; modèle `.env.example`), résolue dans `mobile-app/src/config/api.config.ts` via `expo-constants` (déclaré en dépendance directe depuis 0.4 ; il n'était que transitif, imbriqué sous `expo/node_modules`). Le plugin Babel `react-native-dotenv` (module ``) reste configuré mais plus rien ne l'importe.

### Backend → backend
- 6 services → `auth-service` `GET /api/auth/me` (voir §3). C'est le seul appel inter-services.
- Tout le reste passe par la base partagée.

### Web → backend
`web-frontend/src/services/api.ts` appelle `/api/auth/*`, `/api/schools`, `/api/lessons`, `/api/bookings` (**n'existe nulle part**), `/api/exams/:id/register`, `/api/enrollment/*`, `/api/payments`, `/api/analytics/dashboard`. Le fichier utilise le type `AxiosInstance` sans l'importer → `npm run build` échoue. Gelé (D-05).

## 7. Outillage

- **Docker** : `Dockerfile` multi-stage identique par service (builder `npm ci` + `tsc`, runtime `npm ci --only=production`, user `nodejs`). Depuis 0.5, celui d'`auth` n'a plus le fallback `npm run build || (mkdir -p dist && cp -r src/* dist)` qui masquait les erreurs de compilation : une erreur `tsc` fait échouer le build de l'image, comme pour les autres services.
- **CI** (`.github/workflows/ci-cd.yml`) : un job par service pour les **8** services (lint, `npx tsc --noEmit`, test, build, codecov), déclenché par filtre de chemins ; `build-images` couvre les 8 ; puis deploy staging/prod (coquilles vides). `pr-check.yml` ajoute un job `typecheck` en matrice sur les 8 services. `e2e.yml` monte la stack complète, lance `npm run test:e2e` (informatif, `continue-on-error` jusqu'à 5.8) et publie `report.json` + un résumé par test. Pas de job mobile (6.1). `npm run lint` passe dans les 8 services depuis 0.10 : `.gitattributes` impose LF (plus de `Delete ␍` sous Windows) et les règles `no-unsafe-*` / `no-explicit-any` / `require-await` sont en `warn` dans ces 8 services legacy (strictes dans `services/api`, 2.1).
- **Hooks git** : `.husky/pre-commit` lance `lint-staged --config package.json` (Prettier `--write` sur `services/*/src/**/*.ts` ; `--config` impose cette seule config : sept `services/*/package.json` portent une clé `lint-staged` héritée — eslint + prettier + jest par fichier — que la découverte automatique appliquerait) ; `.husky/commit-msg` lance commitlint (scopes : 8 domaines + `mobile`, `docs`, `infra`, `e2e`, `docker`, `ci`, `deps`). Husky s'active par `npm install` racine ; sans lui, aucun hook ne tourne. Pas de script `test` racine (e2e en 1.1). Aucun `package.json` de service ne touche plus à `core.hooksPath` (le `prepare` d'analytics le faisait, retiré en 0.6).
- **Tests** : seuls `auth` (12 tests) et `analytics` (9 tests + 1 `it.skip`) ont une suite ; les six autres suites, obsolètes, ont été supprimées en 0.9 (D-39, `passWithNoTests`). Seuils de couverture = couverture mesurée (D-37). `tests/` est un paquet npm autonome (jest + ts-jest + supertest + pg) qui cible `GATEWAY_URL` (défaut `http://localhost`), attend `/health`, applique `tests/fixtures/seed.sql` (école `Seed Driving School`, instructeur `instructor@seed.io`, grille tarifaire, code `INST-SEED`) puis lance `*.e2e.test.ts` en série ; `npm run test:e2e` à la racine. Il lit `POSTGRES_*` dans l'environnement puis dans le `.env` racine. `e2e/critical-path.e2e.test.ts` (D-15, routes cibles du contrat) **échoue aujourd'hui dès A2** (`"role" is required`) : attendu jusqu'à 5.8.
- **Git** : `.gitignore` racine (`node_modules/`, `dist/`, `coverage/`, `.env`, `.env.*.local`, `.DS_Store`, `*.log`, `.expo/`) ; plus aucun `node_modules` ni `.env` suivi (380 fichiers suivis au 17/09). Un `.env.example` à la racine (toutes les variables lues par `docker-compose.yml`), dans `mobile-app/` et dans `web-frontend/`.

## 8. Doublons et fichiers morts restants (état après 0.8)

| Fichier | Constat |
|---|---|
| `services/*/src/middleware/auth.middleware.ts` × 6 | Même code copié (lesson/exam/payment/notification/student identiques au byte près ; school = variante cosmétique). |
| `nginx/proxy_params.conf` | Jamais inclus. |
| `mobile-app/babel.config.js` plugin `module:react-native-dotenv` (+ dépendance `react-native-dotenv`) | Plus aucun import `@env` depuis 0.4 (l'URL vient de `expo-constants` / `EXPO_PUBLIC_*`) ; à retirer en 6.1. |
| `mobile-app/MINIMAL_DESIGN_GUIDE.md` | Doc de statut hors racine (`MOBILE_APP_COMPLETE.md` supprimé en 0.8) ; à trancher en 6.1. |
| `.env.example` racine | Décrit `STRIPE_*`, `SENDGRID_*`, `TWILIO_*` : lus par compose, mais les intégrations réelles ne sont pas vérifiées dans cette session. |

Supprimés en 0.8 : les 8 scripts de test manuel de la racine, `scripts/test-api.sh` (et la cible `make api-test`), `mobile-app/src/app.ts`, les trois écrans injoignables, `mobile-app/MOBILE_APP_COMPLETE.md`, `services/student/src/repositories/profile.service.ts`.
