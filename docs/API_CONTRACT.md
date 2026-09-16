# Contrat d'API — source de vérité des endpoints

**Statut de ce document : BROUILLON à relire et corriger par l'auteur du projet avant toute implémentation.**
Une fois validé, toute route créée, renommée ou modifiée doit l'être ici dans le même commit (règle d'or n° 1 de `CLAUDE.md`).

## Méthode de construction

Point de départ : les **écrans** de `mobile-app/src/screens/` réellement atteignables depuis `AppNavigator.tsx`, puis les méthodes de `mobile-app/src/services/api/*Service.ts` qu'ils appellent, puis les chemins dans `src/config/api.config.ts`. Les routes définies dans `api.config.ts` mais qu'aucun écran n'appelle sont listées à part (§9) et ne font **pas** partie du contrat.

Côté backend : `services/*/src/routes/*.routes.ts`, controllers et validators Joi.

### Légende des statuts

| Statut | Signification |
|---|---|
| **EXISTE** | La route existe côté backend avec la même méthode, le même chemin et un payload/réponse compatibles. Un bug d'exécution peut subsister (colonne « Écart / notes ») mais le contrat est le bon. |
| **MANQUE** | Aucune route backend ne répond à ce chemin. |
| **DIVERGE** | Une route backend existe au même chemin (ou au chemin le plus proche) mais son rôle autorisé, son payload, sa réponse ou sa sémantique diffèrent de ce que le mobile envoie/attend. La colonne « Écart » dit en quoi. |

### Conventions transverses (valables pour toutes les lignes)

- Préfixe : toutes les routes sont sous `/api/…`, jointes via Nginx sur `:80`.
- Auth : header `Authorization: Bearer <accessToken>` sauf mention « public ».
- Succès : l'objet ou le tableau **nu** en JSON, dates en ISO 8601.
- Erreur : `{ "error": "message" }`. **Écart transverse** : le mobile lit `error.response.data.message` dans 14 écrans ; le backend ne renvoie jamais `message`. À trancher (Q-12 dans `DECISIONS.md`).
- Identifiants : `userId` = `users.id` (celui du JWT). `studentId` = `students.id` (ligne élève × école). Chaque ligne précise lequel est attendu.
- Types de leçon : le backend utilise `CODE` / `Manœuvre` / `Parc` (base + Joi) ; le mobile utilise `THEORY` / `PRACTICAL` (et `theory` / `practical` en minuscules dans `BookForStudentScreen`). Écart transverse, voir Q-03.
- Types d'examen : backend `theory` / `practical`, résultat `passed` / `failed` / `pending` ; mobile `THEORY` / `PRACTICAL`, résultat `PASS` / `FAIL`. Voir Q-03.
- Bug transverse : dans les 6 services autres que `auth`, `req.user.userId` vaut `undefined` (voir `ARCHITECTURE.md` §3). Toutes les lignes « EXISTE » qui s'appuient sur l'identité de l'appelant sont cassées à l'exécution tant que la tâche 2.2 du plan n'est pas faite. Ce n'est pas répété ligne par ligne.

---

## 1. Auth

| # | Méthode | Chemin | Appelé par | Payload (mobile) | Réponse attendue (mobile) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| A1 | POST | `/api/auth/login` | `LoginScreen` → `AuthContext.login` | `{ email, password }` | `{ accessToken }` ; le mobile décode le JWT pour lire `userId`, `email`, `role` | **EXISTE** | Backend renvoie `{ accessToken, refreshToken }` ; `refreshToken` ignoré par le mobile. Session effective = 15 min (Q-08). |
| A2 | POST | `/api/auth/register` | `RegisterScreen` (role `student`), `InstructorRegistrationScreen` étape 1 (role `instructor`) → `authService.register` | `{ email, password, role }` — `firstName`/`lastName` saisis mais **supprimés** avant envoi | `{ accessToken }` (201) | **EXISTE** | Public. Backend accepte aussi `role: 'admin'`. Le nom de l'utilisateur n'est stocké **nulle part** (ni `users`, ni `students`), alors que `students.name` est `NOT NULL` — voir Q-01, tâche 3.1. `InstructorRegistrationScreen` appelle `authService.register` directement, pas `AuthContext.register` → le token n'est **pas** stocké après l'étape 1. |
| A3 | GET | `/api/auth/me` | Aucun écran (défini dans `AuthService.getCurrentUser`, jamais appelé). Appelé par les 6 middlewares backend. | — | `{ id, email, role, createdAt, updatedAt }` | **EXISTE** | Renvoie `id`, pas `userId`. C'est la cause du bug transverse. |
| A4 | POST | `/api/auth/refresh` | Aucun écran | `{ refreshToken }` | `{ accessToken, refreshToken }` | **EXISTE** | Non utilisé par le mobile. Refresh et access tokens sont indistinguables (même secret, même payload). Tâche 4.4 / 4.5. |
| A5 | POST | `/api/auth/logout` | Aucun écran (`AuthContext.logout` efface le stockage local seulement) | — | — | **EXISTE** | No-op côté backend (supprime une clé Redis jamais écrite). |

## 2. Écoles

| # | Méthode | Chemin | Appelé par | Payload | Réponse attendue (mobile) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| S1 | GET | `/api/schools` | `SchoolsListScreen` | — (public) | `School[]` : `{ id, name, address, phone, email, description?, logo?, rating?, totalStudents?, totalInstructors?, createdAt }` | **EXISTE** | Backend renvoie les colonnes de `schools` (`logoUrl`, pas `logo` ; pas de `description`, `rating`, `totalStudents`, `totalInstructors`). Les champs optionnels manquants sont tolérés par l'écran. **Bug mobile** : `SchoolService` renvoie l'`AxiosResponse` entière et non `.data` → l'écran reçoit un objet, pas un tableau (tâche 6.1). |
| S2 | GET | `/api/schools/:id` | `SchoolDetailScreen` | — (public) | `School` | **EXISTE** | Même bug `.data` que S1. |
| S3 | GET | `/api/schools/:id/instructors` | `SchoolDetailScreen` | — (public) | `SchoolInstructor[]` : `{ id, userId, schoolId, name, phone, licenseNumber, specialties[], rating? }` | **EXISTE** | `rating` non fourni (toléré). Même bug `.data`. L'`id` renvoyé est `instructors.id`, réutilisé par le mobile comme `instructorId` dans L2. |
| S4 | GET | `/api/schools/:id/pricing` | `SchoolDetailScreen` (onglet Tarifs) | — (public) | `SchoolPricing[]` : `{ id, schoolId, lessonType, price, duration }` | **EXISTE** | `lessonType` vaut `CODE` / `Manœuvre` / `Parc` ; l'écran l'affiche tel quel. Même bug `.data`. |
| S5 | POST | `/api/schools/school-codes/verify` | `InstructorRegistrationScreen` étape 2 → `schoolCodeService.verifyCode` | `{ code }` — envoyé **sans token** (voir A2) | `{ schoolId, schoolName, role }` | **MANQUE** | Aucune route. La table `school_codes` existe (migration 002) mais aucun service ne la lit. Le backend ne peut pas savoir **quel utilisateur** rattacher à l'école puisque l'appel est anonyme. Dépend de Q-02. Tâche 4.2. |

## 3. Inscriptions (enrollment)

`schoolId` = `schools.id`. `requestId` = `enrollment_requests.id`. L'élève est identifié par `users.id` dans cette table.

| # | Méthode | Chemin | Appelé par | Payload | Réponse attendue (mobile) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| E1 | GET | `/api/enrollment/schools/:schoolId/status` | `SchoolDetailScreen`, `BookLessonScreen` | — | `{ isEnrolled, requestStatus?, enrollmentDate?, canBook }` | **EXISTE** | Rôle `student`. Réponse conforme. |
| E2 | POST | `/api/enrollment/schools/:schoolId/request` | `SchoolDetailScreen` (modal) | `{ message }` — l'écran exige un message non vide, Joi le rend optionnel (max 500) | `EnrollmentRequest` (201) : `{ id, studentId, schoolId, status, message, createdAt, … }` | **EXISTE** | Rôle `student`. Refuse si déjà inscrit ou demande en attente/approuvée (400). |
| E3 | GET | `/api/enrollment/my-requests` | `MyEnrollmentRequestsScreen` | — | `EnrollmentRequest[]` avec `schoolName` | **EXISTE** | Rôle `student`. Jointure `schools` faite → `schoolName` présent. |
| E4 | GET | `/api/enrollment/schools/:schoolId/requests?status=` | `EnrollmentRequestsScreen` (instructeur) | query `status` optionnel ∈ pending/approved/rejected | `EnrollmentRequest[]` avec `studentEmail` | **EXISTE** | Rôle `instructor` ou `admin`. **Aucune vérification** que l'instructeur appartient à `schoolId` (Q-05). **Bug mobile** : l'écran lit `route.params.schoolId` mais `InstructorDashboard` navigue sans paramètre → jamais chargé. Il n'existe **aucune route** pour qu'un instructeur connaisse son école (Q-04, tâche 5.1). |
| E5 | PUT | `/api/enrollment/:requestId/approve` | `EnrollmentRequestsScreen` | — | `EnrollmentRequest` (status `approved`) | **EXISTE** | Rôle `instructor`/`admin`. **Cassé à l'exécution** : insère dans `students` sans `name` (`NOT NULL`) → 404 `{ error }` avec la demande déjà passée à `approved` (pas de transaction). Tâches 3.1, 3.2. Pas de vérification d'appartenance à l'école (Q-05). |
| E6 | PUT | `/api/enrollment/:requestId/reject` | `EnrollmentRequestsScreen` (modal) | `{ reason }` | `EnrollmentRequest` (status `rejected`) | **EXISTE** | Joi exige `reason` de **10 à 500 caractères** ; l'écran ne vérifie que « non vide » → 400 possible sans message utile (Q-14, Q-12). |

## 4. Leçons

Modèle attendu par le mobile (`models/Lesson.ts`) : une leçon est **une demande d'un élève vers un instructeur**, sans créneau au départ, que l'instructeur approuve en fixant `startTime`/`endTime`, ou rejette. Une leçon a `{ id, schoolId, instructorId?, type, startTime, duration, price?, status, instructor?: { id, firstName, lastName } }`. Le mobile n'a pas de statut `pending` dans son enum `LessonStatus` (scheduled/completed/cancelled) mais ses écrans instructeur supposent qu'il existe (Q-06).

Modèle backend : une leçon est **un créneau créé par un admin/instructeur** (`schoolId, instructorId, type, dateTime, durationMinutes, capacity, price`), et les élèves s'y **réservent** (`lesson_bookings`). Aucun concept de demande.

| # | Méthode | Chemin | Appelé par | Payload (mobile) | Réponse attendue (mobile) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| L1 | GET | `/api/lessons` | `MyLessonsScreen` (élève), `LessonRequestsScreen`, `TodayLessonsScreen` (instructeur, filtrent côté client) | — | **Les leçons de l'appelant** : `Lesson[]` avec `startTime`, `status`, `type`, `price`, `instructor{firstName,lastName}` | **DIVERGE** | Backend : public, renvoie **toutes** les leçons de la base (filtres `schoolId`, `instructorId`, `studentId`, `type`, `status`, `dateFrom`, `dateTo` en query, aucun appliqué par le mobile). Champs `dateTime`, `durationMinutes`, `capacity`, `currentBookings` ; pas de `startTime`, pas d'objet `instructor`. Aucun scoping par utilisateur. **Bug mobile** : `LessonService` renvoie l'`AxiosResponse` (pas `.data`). |
| L2 | POST | `/api/lessons` | `BookLessonScreen` (élève) → `lessonService.requestLesson` | `{ instructorId, type: 'PRACTICAL'\|'THEORY', notes? }` | `Lesson` créée en attente | **DIVERGE** | Backend : rôle **admin/instructor** uniquement (l'élève reçoit 403) ; Joi exige `schoolId`, `instructorId`, `type ∈ CODE/Manœuvre/Parc`, `dateTime` (futur), `durationMinutes` (15–480), `capacity`, `price`. Sémantique : crée un créneau, pas une demande. Le mobile n'envoie pas `schoolId` (il l'a pourtant en param de route). Dépend de Q-03, Q-06, Q-07. |
| L3 | POST | `/api/lessons/:id/cancel` | `MyLessonsScreen` (élève, sur une leçon `scheduled`) | — | — | **DIVERGE** | Backend : rôle **admin/instructor** ; annule le **créneau** entier (`lessons.status = cancelled`), pas la réservation de l'élève. L'annulation élève côté backend est `DELETE /api/lessons/bookings/:bookingId` (exige `lesson_bookings.id`, inconnu du mobile). Q-09. |
| L4 | POST | `/api/lessons/book-for-student` | `BookForStudentScreen` (instructeur) | `{ studentId: <email de l'élève>, type: 'theory'\|'practical', startTime, endTime, notes? }` | `Lesson` | **MANQUE** | Aucune route. Le mobile envoie un **email** dans `studentId` (commentaire dans le code : « Backend should handle email-to-ID lookup »). Types en minuscules, contrairement à L2. Q-10. |
| L5 | PUT | `/api/lessons/:id/approve` | `LessonRequestsScreen` — **stub** : le bouton affiche `Alert('Success')` sans appel ; `lessonService.approveLesson` existe | `{ startTime, endTime, adminNotes? }` | `Lesson` (status `scheduled`) | **MANQUE** | Aucune route. À câbler en 6.3 une fois 5.x livré. |
| L6 | PUT | `/api/lessons/:id/reject` | `LessonRequestsScreen` — **stub** ; `lessonService.rejectLesson` existe | `{ reason? }` | — | **MANQUE** | Aucune route. |
| L7 | PUT | `/api/lessons/:id/attendance` | Aucun écran actif (`TodayLessonsScreen` n'appelle pas `markAttendance`) ; défini dans `LessonService` | `{ attended, feedback?, rating? }` avec `:id` = **lesson id** | — | **DIVERGE** | Backend : `PUT /api/lessons/bookings/:bookingId/attendance` (rôle instructor/admin), clé = **`lesson_bookings.id`**. Payload identique. |
| L8 | GET | `/api/lessons/instructors` | Aucun écran actif (`RequestLessonScreen` est mort ; `BookLessonScreen` reçoit `instructorId` par navigation) | — | `Instructor[]` `{ id, firstName, lastName, specializations, rating, hourlyRate, yearsOfExperience }` | **DIVERGE** | Le chemin tombe sur `GET /api/lessons/:id` avec `id = "instructors"` → erreur UUID. Les instructeurs sont sous `/api/schools/:id/instructors` (S3). Hors contrat tant qu'aucun écran actif ne l'appelle. |

## 5. Examens

Modèle attendu par le mobile (`models/Exam.ts`) : un examen est **une demande d'un élève** `{ type, preferredDate, message }` → statut `pending` ; l'instructeur la **planifie** (`dateTime`, `location`) → `scheduled`, ou la **rejette** (`rejectionReason`) → `cancelled` ; puis enregistre `{ result: PASS|FAIL, score, notes }` → `completed`.

Modèle backend : un examen est **une session créée par un admin** `{ schoolId, type, dateTime, examinerId?, price?, capacity? }` ; l'élève s'y **inscrit** (`exam_registrations`) sous condition d'éligibilité (**20 leçons complétées pour la théorie, 30 pour la pratique**, codé en dur dans `registration.service.ts` — Q-11) ; un admin enregistre le résultat sur la registration.

| # | Méthode | Chemin | Appelé par | Payload (mobile) | Réponse attendue (mobile) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| X1 | GET | `/api/exams/my-exams` | `MyExamsScreen` (élève), `ExamRequestsScreen`, `TodayExamsScreen` (instructeur, filtrent côté client) | — | `Exam[]` de l'appelant : `{ id, studentId, schoolId, type, status, preferredDate?, message?, dateTime?, location?, result?, score?, notes?, rejectionReason? }` | **MANQUE** | Le chemin tombe sur `GET /api/exams/:id` avec `id = "my-exams"` → erreur UUID. Le plus proche côté backend : `GET /api/exams` (toutes les sessions, public) et `GET /api/exams/students/:studentId/registrations` (exige `students.id`). Ni l'un ni l'autre ne porte `preferredDate`, `location`, `rejectionReason`, `status`. |
| X2 | POST | `/api/exams/request` | `RequestExamScreen` (élève) | `{ examType: 'THEORY'\|'PRACTICAL', preferredDate: ISO, message }` — **pas de `schoolId`** | `Exam` (status `pending`) | **MANQUE** | Aucune route. Le plus proche : `POST /api/exams/:examId/register` `{ studentId }` (s'inscrire à une session existante), sémantique différente. Le mobile ne dit pas pour quelle école (Q-07). |
| X3 | PUT | `/api/exams/:id/schedule` | `ExamRequestsScreen` — **stub** ; `examService.scheduleExam` existe | `{ dateTime, location }` | `Exam` (status `scheduled`) | **MANQUE** | Aucune route. Il n'y a pas de colonne `location` en base. |
| X4 | PUT | `/api/exams/:id/reject` | `ExamRequestsScreen` — **stub** ; `examService.rejectExamRequest` existe | `{ reason }` | `Exam` (status `cancelled`) | **MANQUE** | Aucune route. Pas de colonne `rejection_reason` sur `exams` ni `exam_registrations`. |
| X5 | PUT | `/api/exams/:id/result` | `TodayExamsScreen` — **stub** ; `examService.recordExamResult` existe | `{ result: 'PASS'\|'FAIL', score, notes? }` avec `:id` = exam | `Exam` (status `completed`) | **MANQUE** | Le plus proche : `PUT /api/exams/registrations/:registrationId/result` `{ result: 'passed'\|'failed', score?, notes? }`, rôle **admin uniquement** (l'instructeur reçoit 403), clé = `exam_registrations.id`. Q-03, Q-05. |

## 6. Profils (fiche élève)

Deux familles montées par `student-service` : `/api/profiles/*` (vue instructeur) et `/api/student-profiles/*` (vue élève). **Aucune des deux n'est proxifiée par Nginx** → 404 depuis le mobile. Tâche 2.5 / 5.0.

Sémantique des identifiants : `profile.repository.ts` filtre sur **`students.id`** (`WHERE s.id = $1 AND s.school_id = $2`).

| # | Méthode | Chemin | Appelé par | Payload | Réponse attendue (mobile) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| P1 | GET | `/api/profiles/:studentId/schools/:schoolId/complete` | `StudentInfoTab` (écran `StudentProfile`, **injoignable** : aucun écran n'y navigue) | — | `StudentProfile` `{ id, userId, name, email, phone?, address?, dateOfBirth?, licenseNumber?, enrollmentDate?, emergencyContact?, emergencyPhone?, totalLessons, completedLessons, totalExams, passedExams, notes? }` | **DIVERGE** | Route existe (rôle instructor/admin) mais non routée par Nginx. `:studentId` doit être `students.id` ; la seule source côté mobile (`EnrollmentRequest.studentId`) est un `users.id`. Q-13. |
| P2 | GET | `/api/profiles/:studentId/schools/:schoolId/lessons` | `StudentLessonsTab` | — | `LessonHistory[]` `{ id, lessonId, lessonType, dateTime, duration, instructorName, attended?, feedback?, rating?, paid, amount?, paymentDate?, paymentMethod? }` | **DIVERGE** | Idem P1 (Nginx + id). Réponse conforme sinon. |
| P3 | GET | `/api/profiles/:studentId/schools/:schoolId/exams` | `StudentExamsTab` | — | `ExamHistory[]` `{ id, examId, examType, dateTime, result?, score?, notes?, paid, amount?, paymentDate?, paymentMethod? }` | **DIVERGE** | Idem P1. |
| P4 | GET | `/api/profiles/:studentId/schools/:schoolId/financial` | `StudentInfoTab` | — | `FinancialSummary` `{ totalRevenue, totalPending, totalDue, lessonsRevenue, examsRevenue, lessonsPending, examsPending, lastPaymentDate? }` | **DIVERGE** | Idem P1. |
| P5 | PUT | `/api/profiles/:studentId/notes` | `StudentInfoTab` | `{ notes }` | — | **DIVERGE** | Idem P1 (Nginx + `students.id`). |
| P6 | PUT | `/api/profiles/bookings/:bookingId/mark-paid` | `StudentLessonsTab` | `{ amount, paymentMethod }` | — | **DIVERGE** | Nginx seulement ; `bookingId` = `lesson_bookings.id`, fourni par P2 (`id`) → cohérent. |
| P7 | PUT | `/api/profiles/registrations/:registrationId/mark-paid` | `StudentExamsTab` | `{ amount, paymentMethod }` | — | **DIVERGE** | Nginx seulement ; `registrationId` fourni par P3 → cohérent. |
| P8 | GET | `/api/student-profiles/me/schools/:schoolId/profile` | `MyProgressTab` (écran `MyProfile`, **injoignable** : seul le `StudentDashboardScreen` mort y navigue) | — | `MyProfile` (= P1 sans `notes`) | **DIVERGE** | Non routé par Nginx. Le controller passe `req.user.userId` (`users.id`) à une requête qui attend `students.id` → 404 même une fois le bug transverse corrigé. Tâche 5.0. |
| P9 | GET | `/api/student-profiles/me/schools/:schoolId/lessons` | `MyLessonsPaymentTab` | — | `MyLessonHistory[]` | **DIVERGE** | Idem P8. |
| P10 | GET | `/api/student-profiles/me/schools/:schoolId/exams` | `MyExamsPaymentTab` | — | `MyExamHistory[]` | **DIVERGE** | Idem P8. |
| P11 | GET | `/api/student-profiles/me/schools/:schoolId/financial` | `MyProgressTab` | — | `MyFinancialSummary` | **DIVERGE** | Idem P8. |

## 7. Notifications

Le mobile déclare `NOTIFICATION_SERVICE` dans `api.config.ts` mais **n'a ni service ni écran** qui l'appelle. Aucune ligne de contrat côté mobile.

Routes backend existantes (`/api/notifications`, rôle authentifié) : `POST /send`, `POST /send-bulk`, `GET /`, `GET /unread-count`, `GET /:id`, `PUT /:id/read`, `PUT /read-all`, `DELETE /:id`, `GET /preferences/me`, `PUT /preferences`, `POST /push-tokens`, `DELETE /push-tokens/:token`. Les routes `preferences` et `push-tokens` échouent en SQL (tables absentes — tâche 3.3). Hors périmètre v1 tant qu'aucun écran ne les consomme.

## 8. Routes backend hors contrat mobile (pour information)

Elles existent, ne sont appelées par aucun écran, et ne sont pas garanties. Elles seront reconsidérées quand la Phase 5 les touchera.

- `/api/verification/*` (student-service, **public**, destiné aux autres services qui ne l'appellent pas) : `GET /verify-enrollment`, `GET /students/:studentId/eligibility`, `POST /students/:studentId/lesson-completed`. Exposé par Nginx sans auth — à fermer (tâche 2.5).
- `/api/schools` : `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:schoolId/instructors`, `GET /instructors/:id`, `PUT|DELETE /instructors/:id`, `POST /:schoolId/pricing`, `DELETE /pricing/:id` (admin).
- `/api/lessons` : `GET /:id`, `GET /:id/availability`, `PUT /:id`, `DELETE /:id`, `POST /:lessonId/book`, `GET /bookings/:id`, `GET /:lessonId/bookings`, `GET /students/:studentId/bookings`, `DELETE /bookings/:bookingId`.
- `/api/exams` : `POST /`, `GET /`, `GET /:id`, `GET /:id/availability`, `PUT|DELETE /:id`, `POST /:examId/register`, `GET /registrations/:id`, `GET /:examId/registrations`, `GET /students/:studentId/registrations`, `GET /students/:studentId/eligibility`, `PUT /registrations/:id/result`, `DELETE /registrations/:id`.
- `/api/payments/*` (Stripe) et `/api/analytics/*` (middleware pass-through, voir `ARCHITECTURE.md` §3) : aucun écran mobile.

## 9. Chemins définis dans `api.config.ts` / `*Service.ts` mais appelés par aucun écran actif

Ne font pas partie du contrat. À supprimer du mobile ou à câbler explicitement via une tâche du plan.

| Chemin | Défini dans | Remarque |
|---|---|---|
| `GET /api/lessons/requests` | `LessonService.getLessonRequests` | Les écrans utilisent `getMyLessons()` + filtre client. |
| `GET /api/lessons/today` | `LessonService.getTodayLessons` | Idem. |
| `GET /api/lessons/instructors` | `LessonService.getInstructors` | Voir L8. |
| `GET /api/exams/requests` | `ExamService.getExamRequests` | Les écrans utilisent `getMyExams()` + filtre client. |
| `GET /api/exams/today` | `ExamService.getTodayExams` | Idem. |
| `GET /api/schools/:id/codes` | `SchoolCodeService.getSchoolCodes` | Aucun écran admin. |
| `POST/PUT/DELETE /api/schools…` | `SchoolService.createSchool/updateSchool/deleteSchool` | Aucun écran admin. |
| `/api/verification/*` | `api.config.ts` (`VERIFICATION`) | Commenté « internal ». |
| `/api/payments`, `/api/notifications` | `api.config.ts` | Aucun service mobile. |

## 10. Synthèse

| Statut | Nombre | Lignes |
|---|---|---|
| EXISTE | 14 | A1–A5, S1–S4, E1–E6 |
| DIVERGE | 15 | L1, L2, L3, L7, L8, P1–P11 |
| MANQUE | 9 | S5, L4, L5, L6, X1–X5 |

Les DIVERGE se répartissent en deux causes : **(a)** modèle de domaine différent (L1, L2, L3, L7, L8) — résolu par la décision D-01 et les tâches de Phase 5 ; **(b)** routage Nginx absent + confusion `users.id` / `students.id` (P1–P11) — résolu par les tâches 2.5 et 5.0 sans changer le contrat.
