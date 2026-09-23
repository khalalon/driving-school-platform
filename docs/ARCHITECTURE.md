# Architecture — état réel au 18/09/2026 (fin de Phase 2)

Ce document décrit ce qui **est** dans le dépôt, pas ce qui est souhaité. Les incohérences sont listées telles quelles ; les corrections sont dans `PLAN.md`. Quand une source contredit une autre (README, Makefile, Dockerfile, compose), c'est **`docker-compose.yml`** qui fait foi car c'est lui qui tourne.

## 1. Vue d'ensemble

```
Expo Go (mobile-app)            web-frontend (gelé, D-05)
        │ HTTP :80                      │
        ▼                               ▼
   Nginx (driving-school-nginx) ── /api/* → api:3000 (résolu à la requête)
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
  index.ts              # dotenv, loadEnv() (Joi : DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET et JWT_REFRESH_SECRET obligatoires et distincts), câblage des modules, listen
  app.ts                # createApp({ routers }) : helmet, cors, json, rate-limit (garde-fou 1000/15 min), /health, /api/<préfixe>, 404 D-27
  config/{env,database,redis}.ts
  http/errors.ts        # HttpError(status, code, message), sendError, sendCaughtError (500 masqué + journal), sendValidationError
  http/validation.ts    # validate(schema, input) typé, uuidParam (404 si mal formé), enumQuery (400 si hors liste)
  http/authz.ts         # SchoolGuard : assertSameSchool(user, schoolId) → 403 FORBIDDEN_SCHOOL, requireSchool(user) (D-20, 5.1)
  middleware/auth.middleware.ts   # authenticate(verifier) : JWT vérifié localement, req.user = { userId, email, role } ; authorize(...roles) ; getAuthUser(req)
  types/{auth,domain}.ts          # UserRole, AuthUser ; LessonType (CODE / Manœuvre / Parc), statuts d'inscription
  modules/<domaine>/    # routes → controllers → services → repositories, validators, types, __tests__ ; index.ts = build<Module>()
  test-utils/http.ts    # jetons de test, Pool factice (exclu de la couverture)
```

| Module | Préfixes montés | Contenu (état actuel, contrat cible entre parenthèses) | Réutilisé par |
|---|---|---|---|
| `auth` | `/api/auth` | A1–A5 (A3 avec `schoolId` / `instructorId` pour un instructeur, D-19) ; `register` conforme à D-17 (sans `role` ; `schoolCode` → rôle du code + fiche `instructors` en transaction, via `SchoolCodeRepository` et `InstructorRepository` du module school injectés) ; jetons D-12 (claim `type`, deux secrets, 1 h / 30 j, rotation et révocation des refresh tokens en Redis — 4.4, 4.6) ; expose `requireAuth` | tous |
| `school` | `/api/schools` | S1–S4 publics, S6 (élèves autorisés de l'école, cloisonné) + administration `admin` ; `InstructorRepository` partagé (câblé dans `src/index.ts` pour auth, `SchoolGuard` et ce module) | `lesson` (grille tarifaire, D-30) |
| `student` | `/api/enrollment`, `/api/profiles`, `/api/student-profiles` | E1–E6, P1–P11 (`:studentId` = users.id, D-28 ; leçons et examens lus dans `lessons` / `exams`, paiement porté par la leçon / l'examen — 5.0 ; E4–E6 et P1–P7 cloisonnées par `SchoolGuard` — 5.1 ; résumé financier avec avoir et hors absences, P6 refusée sur une absence — D-40 / D-41, 7.2 / 7.3), `approveRequest` atomique (UPDATE + INSERT dans une transaction, 3.2) | `lesson`, `exam` (`StudentRepository`, `StatsRepository`) |
| `lesson` | `/api/lessons` | modèle D-21 / D-32 : L2 (demande `pending`, école résolue depuis la fiche `students`, 403 `NOT_ENROLLED`), L1 (portée par appelant : élève, file `pending` de l'école et/ou leçons de l'instructeur, admin), `GET /:id` scoped (5.2) ; L5 (prix figé depuis la grille ou saisi, D-30 ; l'approbateur devient l'instructeur ; avoir de l'élève imputé dans la transaction, D-40), L6, L3 (fenêtre `LESSON_CANCEL_HOURS` pour l'élève, D-24 ; motif et auteur conservés, 011 ; versement et crédit consommé rendus à l'avoir, D-40) en 5.3 / 7.2 ; L4 (leçon planifiée par l'instructeur pour un élève inscrit, avoir imputé) et L7 (présence par l'instructeur de la leçon, compteur `student_lesson_stats` incrémenté si présent, transaction ; absence prépayée rendue à l'avoir — D-41) en 5.4 / 7.3 ; anciennes routes de créneaux et `lesson_bookings` abandonnées | `student` (`StudentRepository` : fiche et avoir — `CreditLedger`), `school` (`InstructorRepository`, grille D-30 en 5.3), `SchoolGuard` |
| `exam` | `/api/exams` | modèle D-01 / D-33 : X2 (demande `pending`, école résolue depuis la fiche `students`, 403 `NOT_ENROLLED`, pas d'éligibilité — D-26), X1 (élève : les siens ; instructeur : tous ceux de son école ; admin : tout), `GET /:id` scoped (5.5) ; X3 (planification : date + centre), X4 (refus), X5 (résultat sur un examen planifié, score facultatif) par l'école (5.6) ; anciennes sessions et `exam_registrations` abandonnées | `student` (`StudentRepository`), `school` (`InstructorRepository`), `SchoolGuard` |
| `payment` | **non monté** | porté typé (D-31 : paiement manuel en v1) ; sa table `payments` n'a pas la colonne `metadata` que le code écrit — migration nécessaire s'il est un jour monté | — |

Non portés : `notification` (D-35) et `analytics` (D-31, dont le middleware pass-through rendait ses routes publiques). Règles de code : aucun `any` (lint `no-unsafe-*` en `error`), `db.query<T>`, schémas Joi génériques, erreurs métier = `HttpError` levée par le service et traduite par le controller ; identifiants mal formés → 404 ; suppressions → 204.

## 3. Authentification — comment ça marche

- Le module `auth` signe deux JWT HS256 (D-12, D-23) : `accessToken` (1 h, `JWT_ACCESS_SECRET`) et `refreshToken` (30 j, `JWT_REFRESH_SECRET`), payload `{ userId, email, role, type, sid }` (+ `jti` sur le refresh). Le middleware n'accepte que `type = access`, `/refresh` que `type = refresh`. Redis : `auth:refresh:<jti>` (refresh token utilisable une fois, TTL 30 j, consommé par GETDEL à la rotation) et `auth:session:<sid>:revoked` (session révoquée par logout ou par réutilisation d'un refresh token déjà consommé, TTL 30 j). `req.user` porte `sid`.
- **Un seul middleware** (`src/middleware/auth.middleware.ts`) vérifie le jeton localement et pose `req.user` ; plus aucun appel HTTP vers `/api/auth/me` (D-03). Le bug historique `req.user.userId === undefined` des anciens services n'existe plus : `POST /api/enrollment/schools/:id/request` rattache la demande au `users.id` du jeton.
- `POST /api/auth/register` est public et accepte `role ∈ {admin, instructor, student}` : n'importe qui peut encore se créer un compte admin (4.1, 4.2).
- `POST /api/auth/logout` répond 204 et supprime une clé Redis `user:<id>:session` que rien n'écrit. Aucune révocation de jeton n'existe (4.6).
- Le mobile stocke la paire de jetons (`@auth_token`, `@auth_refresh_token`) ; sur 401, `ApiClient` appelle `/refresh` une seule fois (appels concurrents partagés), stocke la nouvelle paire et rejoue la requête ; si le refresh est refusé, la session locale est effacée et `AuthContext` déconnecte (4.5). Session effective = 30 j glissants. Après A1 / A2, `AuthContext` appelle A3 et stocke `{ id, email, firstName, lastName, role, schoolId?, instructorId? }` (`@auth_user`), rafraîchi au démarrage ; `logout` appelle A5 puis efface le stockage local (6.2).
- Erreurs : partout `{ error: <code>, message: <français> }` (D-27). Codes : `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `NOT_ENROLLED`, `INTERNAL_ERROR` (+ `FORBIDDEN_SCHOOL`, `CANCEL_WINDOW_CLOSED`, `PRICE_REQUIRED`, `INVALID_SCHOOL_CODE` réservés aux phases 4–5).

## 4. Base de données

Une seule base `driving_school`, un seul schéma `public`. Les modules lisent et écrivent librement les tables des autres (ex. `lesson` lit `students`, `student` lit `lesson_bookings` et `exam_registrations`) ; c'est voulu dans une application unique.

### Migrations
`migrations/001_initial_schema.sql`, `002_enrollment_system.sql`, `003_student_profile.sql`, `004_schema_migrations.sql`, `005_enrollment_student_not_null.sql` (purge des demandes orphelines, `student_id NOT NULL`), `006_user_names.sql` (`users.first_name` / `last_name` avec backfill, `students.name` et `instructors.name` nullables), `007_lessons_requests.sql` (leçons individuelles D-21 : `student_id` NOT NULL, `requested_date` / `scheduled_date`, statuts `pending` / `rejected`, présence et paiement sur `lessons`, reprise de `lesson_bookings`), `008_exam_requests.sql` (examens individuels D-01 : `student_id` NOT NULL, `preferred_date`, `message`, `status`, `location`, `rejection_reason`, résultat et paiement sur `exams`, reprise d'`exam_registrations`), `009_one_active_enrollment.sql` (D-22 : unique `students.user_id`, index unique partiel sur les demandes actives, s'arrête sur des doublons), `010_admin_seed_password.sql` (hash du compte admin), `011_lessons_cancellation.sql` (`lessons.cancellation_reason`, `cancelled_by`), `012_school_currency.sql` (`schools.currency` ISO 4217, `TND` par défaut — D-43), `013_student_credit.sql` (`students.credit`, `lessons.credit_applied` — D-40), appliquées par Postgres à la première initialisation du volume. `004` crée la table de suivi `schema_migrations` (`name`, `applied_at`) et y inscrit 001–004. `scripts/migrate.sh` (`make migrate`) applique ensuite, dans l'ordre et en une transaction chacune, les migrations non enregistrées ; relançable sans effet. Les fichiers 001 et 002 ne sont pas idempotents (`CREATE INDEX` / `CREATE TRIGGER` sans `IF NOT EXISTS`) : rejouer l'un d'eux à la main sur une base existante échoue — passer par le script.

### Tables (état après 011)

| Table | Clés / colonnes notables | Écrite par (module) | Lue par (module) |
|---|---|---|---|
| `users` | `id`, `email` unique, `password_hash`, `role` ∈ admin/instructor/student, + (006) `first_name`, `last_name` NOT NULL (`''` pour les comptes antérieurs, D-16) | auth | tous (identité : jointures depuis school, student) |
| `schools` | `id`, `name`, `address`, `phone`, `email`, `logo_url` | school | school, student |
| `instructors` | `id`, `user_id` → users, `school_id` → schools, `name` (**nullable depuis 006**, identité portée par users), `phone`, `license_number`, `specialties[]` | school | school, student (jointures) |
| `pricing` | `school_id`, `lesson_type` ∈ CODE/Manœuvre/Parc, `price`, `duration`, unique(school, type) | school | school |
| `students` | `id`, `user_id` → users, `school_id` → schools, `name` (**nullable depuis 006**, plus alimentée), `authorized`, + (002) `enrollment_date`, `enrollment_request_id`, + (003) `date_of_birth`, `license_number`, `emergency_contact`, `emergency_phone`, `notes` ; **unique(user_id) depuis 009** (une seule école par élève, D-22) | student | student, lesson, exam |
| `lessons` (007) | `school_id`, **`student_id` → students NOT NULL** (une leçon = un élève, D-34), `instructor_id` nullable (renseigné à l'approbation, D-32), `preferred_instructor_id`, `type` ∈ CODE/Manœuvre/Parc, `status` ∈ **pending**/scheduled/completed/cancelled/**rejected** (défaut `pending`), `requested_date`, `scheduled_date` (ex-`date_time`, nullable), `duration_minutes` nullable, `price`, `capacity` **CHECK (= 1)**, `current_bookings`, `notes`, `admin_notes`, `rejection_reason`, + (011) `cancellation_reason`, `cancelled_by` → users, `attended`, `feedback`, `rating`, `paid`, `amount`, `payment_date`, `payment_method` | lesson | lesson, student |
| `lesson_bookings` | `lesson_id`, `student_id` → **students**, `attended`, `feedback`, `rating`, + (003) `paid`, `payment_date`, `payment_method`, `amount` ; unique(lesson, student). **Données reprises dans `lessons` par 007, table conservée mais plus alimentée** (anciennes routes `/book` jusqu'en 5.2) | lesson (ancien `/book`) | lesson |
| `exams` (008) | `school_id`, **`student_id` → students NOT NULL** (un examen = un élève), `type` ∈ theory/practical, `status` ∈ **pending**/scheduled/completed/cancelled/**rejected** (défaut `pending`, D-33), `preferred_date`, `message`, `date_time` (session, nullable), `location`, `rejection_reason`, `result` ∈ pending/passed/failed (défaut `pending`), `score` 0–100, `notes`, `price`, `paid`, `amount`, `payment_date`, `payment_method`, `examiner_id` (sans FK), `capacity` (héritée, sans usage) | exam | exam, student |
| `exam_registrations` | `exam_id`, `student_id` → **students**, `result` ∈ passed/failed/pending, `score`, `notes`, + (003) `paid`, `payment_date`, `payment_method`, `amount`. **Données reprises dans `exams` par 008, table conservée mais plus alimentée** (plus lue depuis 5.0) | personne | personne |
| `payments` | `student_id` → students, `reference_type` ∈ lesson/exam, `reference_id`, `amount`, `status`, `method`, `transaction_id` — **pas de `metadata`** | personne (module non monté) | personne |
| `notifications` | `user_id` → users, `type`, `title`, `message`, `read` | personne (module non porté, D-35) | personne |
| `school_codes` (002) | `school_id`, `code` unique, `role` ∈ instructor/student, `max_uses`, `uses_count`, `expires_at`, `is_active` | auth (`register` consomme : `uses_count + 1` sous conditions de validité, 4.2) ; insérés par script (4.3) | auth |
| `enrollment_requests` (002) | `student_id` → **users** (pas students), **NOT NULL depuis 005**, `school_id`, `status` ∈ pending/approved/rejected, `message`, `rejection_reason`, `processed_by` → users, `processed_at` ; **index unique partiel sur `student_id` WHERE status IN (pending, approved)** depuis 009 (D-22 ; l'ancienne unique(student, school) de 002 est levée : les refus s'accumulent) | student | student |
| `student_lesson_stats` (002) | `student_id` → students, `school_id`, compteurs de leçons effectuées | lesson (L7, présent seulement — D-33) | student (P1, P8, S6), exam (X1) |
| `schema_migrations` (004) | `name` (PK, nom du fichier), `applied_at` | 004, `scripts/migrate.sh` | `scripts/migrate.sh` |

### Le double identifiant élève
- `users.id` : identité de connexion, présent dans le JWT. Utilisé comme `student_id` par `enrollment_requests`.
- `students.id` : une ligne **par couple (user, école)**, créée à l'approbation d'une inscription. Utilisé comme `student_id` par `lesson_bookings`, `exam_registrations`, `payments`, `student_lesson_stats`.
- Le mobile ne connaît que `users.id`. `POST /api/lessons/:id/book` et `POST /api/exams/:id/register` exigent un `students.id` dans le body : le mobile ne peut pas les appeler correctement (D-28, Phase 5).
- Un élève n'a qu'une ligne `students` et qu'une demande active à la fois, toutes écoles confondues (D-22, index uniques de 009 ; E2 répond 409 `CONFLICT`).

### Écritures multi-tables
`src/db/transaction.ts` : `PgTransactionRunner.run(work)` (BEGIN / COMMIT, ROLLBACK et rejet en cas d'erreur) et le type `Queryable` (`Pool` ou `PoolClient`) que les méthodes de repository concernées acceptent en dernier paramètre (`executor`). Seule utilisation : `EnrollmentService.approveRequest` (UPDATE `enrollment_requests` + INSERT `students`) ; si l'INSERT échoue, la demande reste `pending`.

## 5. Nginx — où passent les requêtes

Fichier : `nginx/nginx.conf` (+ `nginx/proxy_params.conf`, inclus). Depuis 2.6, **un seul upstream** : l'application unique.

| Préfixe | Traitement | Rate limit |
|---|---|---|
| `/health` | réponse statique `healthy` | — |
| `/api/*` | `proxy_pass` vers `api:3000`, nom résolu **à la requête** (`resolver 127.0.0.11 valid=10s`) : recréer le conteneur `api` ne casse plus la passerelle | 10 r/s par IP, burst 20 |
| tout le reste | 404 JSON `{ error: NOT_FOUND }` | — |

Conséquences : `/api/profiles/*` et `/api/student-profiles/*` sont **joignables** (ils ne l'étaient pas) ; `/api/payments`, `/api/notifications`, `/api/analytics` répondent 404 par l'application (modules non montés / non portés). Plus de `listen 443` ni de montage `./nginx/ssl` (TLS hors périmètre). `Access-Control-Allow-Origin: *` conservé (le mobile appelle depuis un autre hôte).

## 6. Qui appelle quoi

### Mobile → backend (via Nginx :80)
Le détail par écran est dans `API_CONTRACT.md`. Navigation (8.4, `src/navigation/AppNavigator.tsx`) : une pile par rôle dont la racine est une barre d'onglets — élève `StudentTabs` (Home = `StudentDashboard`, Lessons = `MyLessons`, Exams = `MyExams`, Profile = `MyProfile`, qui résout l'école par E3 quand il est ouvert sans paramètre), instructeur `InstructorTabs` (Today = `InstructorDashboard`, Requests = `LessonRequests`, Exams = `ExamRequests`, Students = `BookForStudent`) ; les autres écrans s'empilent au-dessus avec leur bouton retour ; les onglets se rechargent au focus. Résumé des dépendances réelles :

| Écran mobile | Domaines appelés |
|---|---|
| Login / Register / InstructorRegistration | auth (A1, A2 avec `schoolCode` en une étape depuis 6.1) |
| StudentDashboard (« My journey », 8.2) | enrollment (E3 : école active), lessons (L1 `status=pending,scheduled` : prochaine leçon, compte à rebours, L3 annulation D-24), exams (X1), student-profiles (P8 `completedLessonsByType`, P11 dû / avoir) — parcours Code → théorie → Manœuvre → Parc → pratique construit par `models/Journey.ts` (D-45, pur, testé) ; sans inscription approuvée : « Browse schools » / « Enrollment status » |
| InstructorDashboard (« Today », 8.3) | lessons (L1 `scope=mine` du jour local : timeline, leçon en cours `pickCurrentLesson` (D-45) avec « Present » / « Absent » → L7 via `components/AttendanceModal` partagée avec `TodayLessons` ; L1 `scope=mine, status=scheduled` : charge des 7 prochains jours ; L1 `scope=school, status=pending` : demandes, dont codes regroupables D-34), exams (X1 `pending,scheduled` : demandes et examens du jour → `TodayExams`), enrollment (E4 `pending`, `schoolId` de A3) |
| SchoolsList, SchoolDetail | schools, enrollment (bouton « Request Lesson » sans instructeur, ou « Request » depuis un instructeur = préférence D-32) |
| BookLesson, MyLessons | lessons (L2 `{ type, requestedDate, preferredInstructorId?, notes? }`, L1, L3 — bouton « Cancel » masqué hors fenêtre D-24 par `canStudentCancel`, `CANCEL_WINDOW_CLOSED` géré), enrollment (E1) |
| RequestExam, MyExams | exams |
| MyEnrollmentRequests | enrollment |
| MyProfile (3 onglets) | student-profiles (P8–P11) — joint depuis `StudentDashboard` (« My Profile ») avec le `schoolId` de l'inscription approuvée (E3, rechargée à chaque retour sur le tableau de bord) — 6.6 |
| EnrollmentRequests (instructeur) | enrollment (E4, E5, E6 avec motif de 10 à 500 caractères) — `schoolId` passé par `InstructorDashboard` depuis A3 (6.2) |
| LessonRequests, TodayLessons | lessons (L1 `?status=pending&scope=school` + S3 / S4 pour la préférence et la grille, L5 — une demande ou un lot de demandes `CODE` cochées, un L5 par demande en séquence (D-34, 6.7) —, L6 ; L1 `?status=scheduled,completed&scope=mine&date=`, L7) — câblés en 6.3 |
| ExamRequests, TodayExams | exams (X1 `?status=pending`, X3, X4 ; X1 `?status=scheduled,completed` filtré sur le jour local, X5 score facultatif) — câblés en 6.5 ; libellés selon le type (D-42, `EXAM_PROCEDURES`) : théorie « Schedule » / « Reject », pratique « Record convocation » / « File not ready » |
| BookForStudent | schools (S6 liste des élèves, S4 grille), lessons (L4 `{ studentId (users.id), type, scheduledDate, durationMinutes, price?, notes? }`) — câblé en 6.4 |
| StudentProfile (3 onglets) | profiles (P1–P7) — joint depuis `EnrollmentRequests` (demande approuvée → « View student profile ») et `BookForStudent` (icône profil sur chaque élève de S6), avec `{ studentId (users.id), schoolId, studentName }` — 6.6 |

Pile : **Expo SDK 57** (React Native 0.86, React 19.2, TypeScript 6 — tâche 9.1, D-46) ; `app.json` déclare les plugins `expo-status-bar`, `expo-splash-screen` (sur `assets/splash-icon.png` — l'ancienne clé `splash` pointait vers un fichier absent) et `expo-font` ; `npx expo-doctor` passe 21/21.

Config : l'URL de base vient de `app.json` → `expo.extra.API_BASE_URL` (valeur neutre `http://10.0.2.2:80`, l'hôte vu de l'émulateur Android — D-38), surchargeable par `EXPO_PUBLIC_API_BASE_URL` (fichier `mobile-app/.env`, ignoré ; modèle `.env.example`), résolue dans `mobile-app/src/config/api.config.ts` via `expo-constants` (déclaré en dépendance directe depuis 0.4). `api.config.ts` ne définit que les chemins du contrat (§1–6) ; le plugin Babel `react-native-dotenv` a été retiré en 6.1.

Conventions mobile (6.1) : les `*Service.ts` renvoient `response.data` (`ApiClient.get<T>` / `post<T>` / `put<T>` typés) ; les objets échangés sont définis une seule fois dans `src/models/` (`Lesson`, `Exam`, `Enrollment`, `School`, `Profile`, `User`) au format du contrat, avec les enums D-18 et leurs libellés d'affichage ; tout `catch` d'écran affiche `getApiErrorMessage(error, secours)` (`src/services/api/ApiError.ts` : `message` du backend, repli `error`, repli texte) ; montants et dates par `src/utils/format.ts` — `formatAmount(amount, currency)` avec la devise de l'école lue par `src/hooks/useSchoolCurrency.ts` (S2, cache par école, D-43), aucun symbole codé en dur.

### Backend → backend
Aucun appel HTTP : les modules se parlent en mémoire (`buildXModule()` reçoit les services et repositories dont il dépend) et partagent la base.

### Web → backend
`web-frontend/src/services/api.ts` appelle `/api/auth/*`, `/api/schools`, `/api/lessons`, `/api/bookings` (**n'existe nulle part**), `/api/exams/:id/register`, `/api/enrollment/*`, `/api/payments`, `/api/analytics/dashboard`. Le fichier utilise le type `AxiosInstance` sans l'importer → `npm run build` échoue. Gelé (D-05).

## 7. Outillage

- **Docker** : `services/api/Dockerfile` multi-stage (builder `npm ci` + `tsc` sans fallback, runtime `npm ci --omit=dev`, user `nodejs`, `curl` pour le healthcheck). Trois compose : `docker-compose.yml` (postgres, redis, api, nginx), `docker-compose.dev.yml` (API en `ts-node-dev` sur les sources), `docker-compose.prod.yml` (limites de ressources, journaux, pas de port direct sur l'API).
- **Makefile** : `install / typecheck / lint / test / format / build` sur `services/api`, `dev / prod / stop / clean / logs / restart / health / migrate / shell-postgres / shell-redis / backup-db / restore-db / db-status / redis-*`. `make` n'est pas installé sur toutes les machines : chaque cible est une commande directe documentée dans `CLAUDE.md`.
- **CI** (`.github/workflows/ci-cd.yml`) : job `api` (lint, `tsc --noEmit`, tests avec couverture, build) sur Node 20, déclenché sur `services/api/**` ; job `mobile` (`npm ci`, `tsc --noEmit` strict, jest-expo) déclenché sur `mobile-app/**` (6.1) ; puis `build-images` (image `api`, `permissions: packages: write`) et deploy staging/prod (coquilles vides). `pr-check.yml` : titre et commits conventionnels, typecheck de `services/api` et de `tests/`, détection de secrets. `e2e.yml` monte la stack complète (secrets JWT jetables au niveau du job), lance `npm run test:e2e` (requêtes cadencées à ≥ 110 ms par `tests/helpers/api.ts` pour rester sous le rate-limit Nginx de 10 r/s) (**bloquant depuis 5.8** : chemin critique, profils, examens, harnais) et publie `report.json` + un résumé par test.
- **Hooks git** : `.husky/pre-commit` lance `lint-staged --config package.json` (Prettier `--write` sur `services/*/src/**/*.ts`) ; `.husky/commit-msg` lance commitlint (scopes : `api`, les 8 domaines, `mobile`, `docs`, `infra`, `e2e`, `docker`, `ci`, `deps`). Husky s'active par `npm install` racine ; sans lui, aucun hook ne tourne.
- **Tests** : `services/api` — 169 tests Jest (services avec mocks d'interfaces, routes HTTP via supertest sur `createApp`, repositories sur `Pool` factice), seuils de couverture = couverture mesurée (D-37, 87/85/93/87 au 18/09). `tests/` — paquet npm autonome (jest + ts-jest + supertest + pg) qui cible `GATEWAY_URL` (défaut `http://localhost`), attend `/health`, applique `tests/fixtures/seed.sql` (école `Seed Driving School`, instructeur `instructor@seed.io`, grille tarifaire, code `INST-SEED`) puis lance `*.e2e.test.ts` en série ; `npm run test:e2e` à la racine ; il lit `POSTGRES_*` dans l'environnement puis dans le `.env` racine. `e2e/critical-path.e2e.test.ts` (D-15, routes cibles du contrat) **échoue dès A2** (`register` exige `role`) : attendu jusqu'à 5.8.
- **Git** : `.gitignore` racine (`node_modules/`, `dist/`, `coverage/`, `.env`, `.env.*.local`, `.DS_Store`, `*.log`, `.expo/`), `.gitattributes` (`* text=auto eol=lf`). Un `.env.example` à la racine (toutes les variables lues par les compose), dans `services/api/`, `mobile-app/` et `web-frontend/`.

## 8. Doublons et fichiers morts restants (état après 2.7)

| Fichier | Constat |
|---|---|
| `mobile-app/MINIMAL_DESIGN_GUIDE.md` | Conservé (6.1) : c'est la référence du système de design des écrans (composants, couleurs, espacements), pas un document de statut. |
| `.commitlintrc.json` scopes `auth`…`analytics` | Conservés comme scopes de module ; `notification` et `analytics` ne désignent plus rien dans le code. |

Supprimés en 2.7 : `services/{auth,school,student,lesson,exam,payment,notification,analytics}`, `scripts/quick-start.sh` (contenait une copie du schéma SQL hors migrations) et `scripts/docker-*.{sh,ps1}` (doublons cassés des cibles `make`, `-f docker compose.yml`). Supprimés en 0.8 : les 8 scripts de test manuel de la racine, `scripts/test-api.sh`, `mobile-app/src/app.ts`, les trois écrans injoignables, `mobile-app/MOBILE_APP_COMPLETE.md`, `services/student/src/repositories/profile.service.ts`. Supprimés en 6.1 : `mobile-app/src/services/api/SchoolCodeService.ts`, le plugin Babel `react-native-dotenv` et sa dépendance, les chemins du §9 du contrat.
