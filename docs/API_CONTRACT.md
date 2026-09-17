# Contrat d'API — source de vérité des endpoints

**Statut : VALIDÉ le 17/09/2026** (réponses aux questions ouvertes et aux 15 questions de comportement appliquées, voir `DECISIONS.md` D-16 à D-35). Restent suspendus : Q-17 (leçon payée annulée), Q-18 (absence facturée), Q-19 (procédure d'examen ATTT) ; marqués dans les lignes concernées.
Toute route créée, renommée ou modifiée doit l'être ici dans le même commit (règle d'or n° 1 de `CLAUDE.md`).

## Méthode de construction

Point de départ : les **écrans** de `mobile-app/src/screens/` réellement atteignables depuis `AppNavigator.tsx`, puis les méthodes de `mobile-app/src/services/api/*Service.ts` qu'ils appellent, puis les chemins dans `src/config/api.config.ts`. Les routes définies dans `api.config.ts` mais qu'aucun écran n'appelle sont listées en §9 et **seront supprimées du mobile** (D-13), pas implémentées.

Côté backend : `services/*/src/routes/*.routes.ts`, controllers et validators Joi.

### Légende des statuts

| Statut | Signification |
|---|---|
| **EXISTE** | La route existe côté backend avec la même méthode, le même chemin et un payload/réponse compatibles avec la **cible** décrite. Un bug d'exécution peut subsister (colonne « Écart / notes ») mais le contrat est le bon. |
| **MANQUE** | Aucune route backend ne répond à ce chemin. |
| **DIVERGE** | Une route backend existe au même chemin (ou au plus proche) mais son rôle, son payload, sa réponse ou sa sémantique diffèrent de la cible. |
| **SUPPRIMÉE** | Route abandonnée par décision ; à retirer du mobile, ne pas implémenter. |

Chaque ligne décrit la **cible** (ce que le mobile doit envoyer / recevoir une fois la Phase 5–6 livrée) et, dans « Écart / notes », l'état actuel du backend et du mobile.

### Conventions transverses (valables pour toutes les lignes)

- Préfixe `/api/…`, joint via Nginx sur `:80`.
- Auth : header `Authorization: Bearer <accessToken>` sauf mention « public ». `accessToken` 1 h, `refreshToken` 30 j avec rotation (D-12, D-23).
- Succès : objet ou tableau **nu** en JSON, dates ISO 8601, clés camelCase.
- Erreur : **`{ error: <code stable>, message: <texte français> }`** (D-27). Codes utilisés dans ce document : `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` / `FORBIDDEN_SCHOOL` (403), `NOT_FOUND` (404), `CONFLICT` (409), `CANCEL_WINDOW_CLOSED` (403), `NOT_ENROLLED` (403), `PRICE_REQUIRED` (400), `INVALID_SCHOOL_CODE` (400). *État actuel : le backend renvoie `{ error: <texte> }` sans `message` ; le mobile lit `message`.*
- Identifiants : **`:studentId` et `studentId` dans tout payload/réponse = `users.id`** (D-28). Le backend résout `students.id` en interne. `instructorId` = `instructors.id`. `schoolId` = `schools.id`.
- Vocabulaire (D-18) : leçons `CODE` / `Manœuvre` / `Parc` ; examens `theory` / `practical` ; résultats `passed` / `failed` / `pending`. *État actuel du mobile : `THEORY` / `PRACTICAL`, `PASS` / `FAIL` — à réécrire en 6.1.*
- Cloisonnement (D-20) : toute action d'un `instructor` est limitée à son école → 403 `FORBIDDEN_SCHOOL` sinon. Non répété ligne par ligne.
- Une seule inscription active par élève (D-22) : les routes qui prennent `:schoolId` sont conservées ; celles qui n'en prennent pas résolvent l'école depuis l'inscription active.
- Bug transverse actuel : dans les 6 services autres que `auth`, `req.user.userId` vaut `undefined` (`ARCHITECTURE.md` §3). Toutes les lignes « EXISTE » qui s'appuient sur l'identité de l'appelant sont cassées à l'exécution tant que la tâche 2.2 n'est pas faite. Non répété ligne par ligne.

---

## 1. Auth

| # | Méthode | Chemin | Appelé par | Payload (cible) | Réponse (cible) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| A1 | POST | `/api/auth/login` | `LoginScreen` → `AuthContext.login` | `{ email, password }` (public) | `{ accessToken, refreshToken }` ; le mobile enchaîne sur A3 pour le profil | **EXISTE** | Aujourd'hui le mobile décode le JWT au lieu d'appeler A3 et ignore `refreshToken` (4.5, 6.2). |
| A2 | POST | `/api/auth/register` | `RegisterScreen`, `InstructorRegistrationScreen` (une seule étape après 6.2) | `{ email, password, firstName, lastName, schoolCode?, phone?, licenseNumber? }` (public). Sans `schoolCode` → rôle `student`. Avec `schoolCode` valide → rôle = `school_codes.role`, `phone` et `licenseNumber` **requis**, ligne `instructors` créée, code consommé (D-17). Le champ `role` n'est **plus accepté**. | 201 `{ accessToken, refreshToken }` ; 400 `INVALID_SCHOOL_CODE` si code inconnu/expiré/épuisé ; 409 `CONFLICT` si email pris | **DIVERGE** | Backend actuel : accepte `{ email, password, role }` avec `role` libre (y compris `admin`), ignore les noms, ne connaît pas `schoolCode`. Mobile actuel : envoie `role`, jette `firstName`/`lastName`. Tâches 4.1, 4.2, 6.2. |
| A3 | GET | `/api/auth/me` | `AuthContext` après login (6.2) ; plus aucun middleware backend après 2.2 | — | `{ id, email, firstName, lastName, role, createdAt }` + si `role = instructor` : `schoolId`, `instructorId` (D-19) | **DIVERGE** | Backend actuel : `{ id, email, role, createdAt, updatedAt }` sans noms ni école. Tâches 3.1 (noms), 5.1 (école). |
| A4 | POST | `/api/auth/refresh` | `ApiClient` interceptor sur 401 (4.5) | `{ refreshToken }` (public) | `{ accessToken, refreshToken }` — **nouveau** refresh, l'ancien est révoqué (rotation, D-12) | **DIVERGE** | Backend actuel : renvoie une paire mais ne révoque rien, accepte un access token comme refresh (même secret, même payload). Tâches 4.4, 4.6. |
| A5 | POST | `/api/auth/logout` | `AuthContext.logout` (6.2) | — (Bearer) | 204 ; le refresh token courant est révoqué | **DIVERGE** | Backend actuel : no-op (supprime une clé Redis jamais écrite). Mobile actuel : n'appelle pas. Tâche 4.6. |

## 2. Écoles

| # | Méthode | Chemin | Appelé par | Payload (cible) | Réponse (cible) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| S1 | GET | `/api/schools` | `SchoolsListScreen` | — (public) | `School[]` : `{ id, name, address, phone, email, logoUrl?, createdAt }` | **EXISTE** | Le mobile déclare aussi `description?`, `rating?`, `totalStudents?`, `totalInstructors?` : non fournis, tolérés. **Bug mobile** : `SchoolService` renvoie l'`AxiosResponse` entière (6.1). |
| S2 | GET | `/api/schools/:id` | `SchoolDetailScreen` | — (public) | `School` | **EXISTE** | Même bug `.data`. |
| S3 | GET | `/api/schools/:id/instructors` | `SchoolDetailScreen` | — (public) | `Instructor[]` : `{ id, userId, schoolId, firstName, lastName, phone, licenseNumber, specialties[] }` | **DIVERGE** | Backend actuel renvoie `name` (colonne `instructors.name`) ; cible = `firstName` / `lastName` par jointure `users` (D-16). L'`id` est `instructors.id`, réutilisé comme `instructorId` dans L2. Même bug `.data`. Tâche 3.1. |
| S4 | GET | `/api/schools/:id/pricing` | `SchoolDetailScreen` (onglet Tarifs) | — (public) | `Pricing[]` : `{ id, schoolId, lessonType ∈ CODE\|Manœuvre\|Parc, price, duration }` | **EXISTE** | Même bug `.data`. |
| S5 | POST | `/api/schools/school-codes/verify` | `InstructorRegistrationScreen` étape 2 | — | — | **SUPPRIMÉE** | Remplacée par `schoolCode` dans A2 (D-17). À retirer de `api.config.ts` et de `SchoolCodeService.ts` (6.2). |
| S6 | GET | `/api/schools/:id/students` | `BookForStudentScreen` (6.4), tableau de bord instructeur | — (instructeur de cette école ou admin) | `[{ studentId (users.id), firstName, lastName, email, phone?, enrollmentDate, completedLessons }]` — élèves `authorized` de l'école | **MANQUE** | Nouvelle route (D-25). Tâche 5.1. |

## 3. Inscriptions (enrollment)

`:schoolId` = `schools.id`, `:requestId` = `enrollment_requests.id`, `studentId` = `users.id`.

| # | Méthode | Chemin | Appelé par | Payload (cible) | Réponse (cible) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| E1 | GET | `/api/enrollment/schools/:schoolId/status` | `SchoolDetailScreen`, `BookLessonScreen` | — (`student`) | `{ isEnrolled, requestStatus?, enrollmentDate?, canBook }` | **EXISTE** | — |
| E2 | POST | `/api/enrollment/schools/:schoolId/request` | `SchoolDetailScreen` (modal) | `{ message }` (`student`) ; refusé 409 si une inscription ou une demande `pending`/`approved` existe **dans n'importe quelle école** (D-22) | 201 `EnrollmentRequest` : `{ id, studentId, schoolId, status, message, createdAt, updatedAt }` | **EXISTE** | Backend actuel : ne vérifie que la même école (D-22 → tâche 3.5). Joi : `message` optionnel ≤ 500 ; l'écran l'exige non vide. |
| E3 | GET | `/api/enrollment/my-requests` | `MyEnrollmentRequestsScreen` | — (`student`) | `EnrollmentRequest[]` + `schoolName` | **EXISTE** | — |
| E4 | GET | `/api/enrollment/schools/:schoolId/requests?status=` | `EnrollmentRequestsScreen` | query `status?` (`instructor` de cette école / `admin`) | `EnrollmentRequest[]` + `studentEmail`, `studentFirstName`, `studentLastName` | **DIVERGE** | Backend actuel : pas de cloisonnement (D-20), pas de noms (D-16). **Bug mobile** : l'écran attend `route.params.schoolId` que `InstructorDashboard` ne passe pas ; résolu par A3 + 6.2. Tâches 3.1, 5.1. |
| E5 | PUT | `/api/enrollment/:requestId/approve` | `EnrollmentRequestsScreen` | — (`instructor` de cette école / `admin`) | `EnrollmentRequest` (`approved`) ; crée `students` (`authorized = true`) dans la même transaction | **EXISTE** | **Cassé à l'exécution** : `students.name NOT NULL` non renseigné, pas de transaction (3.1, 3.2) ; pas de cloisonnement (5.1). |
| E6 | PUT | `/api/enrollment/:requestId/reject` | `EnrollmentRequestsScreen` (modal) | `{ reason }` — **10 à 500 caractères** (D-29) | `EnrollmentRequest` (`rejected`, `rejectionReason`) | **EXISTE** | Le mobile doit valider ≥ 10 caractères avant envoi (6.2). |

## 4. Leçons

Modèle cible (D-01, D-21, D-32) : **une seule table `lessons`**. Une leçon naît d'une **demande** de l'élève (`status = pending`, `requestedDate`, `type`, `notes`, et un `preferredInstructorId` **facultatif** qui n'est qu'une préférence), **adressée à l'école, pas à un instructeur** ; elle n'est possible que si l'élève a une inscription **approuvée** dans cette école. **L'instructeur qui approuve devient l'instructeur de la leçon** (`instructorId` renseigné à ce moment), en fixant `scheduledDate` (→ `scheduled`, prix copié de la grille ou saisi à la main s'il n'y a pas de tarif, D-30) ; ou il la **rejette** (→ `rejected`, `rejectionReason`) ; la présence la passe en `completed` ; l'annulation en `cancelled` (règle 24 h, D-24, contrôlée **côté serveur**, le masquage du bouton n'est que du confort). **Toutes les leçons sont individuelles en v1, `CODE` compris** (`capacity` conservée, forcée à 1 — D-34) : une demande = une leçon = un élève ; douze élèves approuvés pour le même créneau de code donnent douze leçons, chacune avec sa présence. L'écran d'approbation offre une sélection multiple (6.7) qui appelle L5 une fois par demande.

Objet `Lesson` (cible) : `{ id, schoolId, preferredInstructorId?, instructorId?, instructor?: { id, firstName, lastName }, studentId (users.id), type, status, requestedDate?, scheduledDate?, durationMinutes?, price?, capacity, currentBookings, notes?, adminNotes?, rejectionReason?, attended?, feedback?, rating?, paid, amount?, paymentDate?, createdAt, updatedAt }`. `instructorId` / `instructor` sont `null` tant que la leçon est `pending`.

| # | Méthode | Chemin | Appelé par | Payload (cible) | Réponse (cible) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| L1 | GET | `/api/lessons` | `MyLessonsScreen` (élève), `LessonRequestsScreen`, `TodayLessonsScreen` (instructeur) | query optionnelle : **`status`** ∈ `pending\|scheduled\|completed\|cancelled\|rejected` (plusieurs valeurs séparées par des virgules) ; **`scope`** ∈ `school\|mine` — instructeur seulement : `school` = les demandes `pending` de son école (file partagée), `mine` = les leçons dont il est `instructorId` ; sans `scope` = les deux ; ignoré pour un élève ; **`date`** = un jour `YYYY-MM-DD`, filtre sur `scheduledDate` (et `requestedDate` pour les `pending`) dans le fuseau de l'école | `Lesson[]` **de l'appelant**, triées par date croissante : élève → ses leçons (avec `paid`, `amount`) ; instructeur → selon `scope`. `LessonRequestsScreen` = `?status=pending&scope=school` ; `TodayLessonsScreen` = `?status=scheduled&scope=mine&date=<aujourd'hui>` → il ne voit et ne pointe que **ses** leçons | **DIVERGE** | Backend actuel : public, toutes les leçons, champs `dateTime`/`durationMinutes`/`capacity`/`currentBookings`, pas d'`instructor{}`, pas de scoping. **Bug mobile** : `LessonService` renvoie l'`AxiosResponse`. Tâches 3.3, 5.2, 6.1. |
| L2 | POST | `/api/lessons` | `BookLessonScreen` (élève) | `{ type ∈ CODE\|Manœuvre\|Parc, requestedDate (ISO, futur), preferredInstructorId?, notes? }` (`student` ; **refusé 403 `NOT_ENROLLED` si l'élève n'a pas d'inscription `approved`** ; école résolue depuis cette inscription ; si `preferredInstructorId` est fourni, il doit être de cette école) | 201 `Lesson` (`pending`, `instructorId: null`) | **DIVERGE** | Backend actuel : rôle admin/instructor, exige `schoolId, dateTime, durationMinutes, capacity, price`, crée un créneau. Mobile actuel : `{ instructorId, type: PRACTICAL\|THEORY, notes }` sans date → champ date à ajouter à l'écran (D-21, 6.1). Tâches 3.3, 5.2. |
| L3 | POST | `/api/lessons/:id/cancel` | `MyLessonsScreen` (élève), écrans instructeur | `{ reason? }` — **deux chemins distincts selon le rôle de l'appelant** : **(1) élève** : uniquement sa propre leçon ; `pending` → toujours ; `scheduled` → seulement si `scheduledDate − now ≥ 24 h` (`LESSON_CANCEL_HOURS`, D-24), sinon 403 `CANCEL_WINDOW_CLOSED` ; **(2) instructeur** : n'importe quelle leçon de son école (`pending` ou `scheduled`, la sienne ou celle d'un collègue), **à tout moment, sans fenêtre** ; hors de son école → 403 `FORBIDDEN_SCHOOL` | `Lesson` (`cancelled`) ; **le contrôle serveur est la règle**, le mobile masque le bouton en plus (6.6). Sort d'une leçon déjà payée : **Q-17** | **DIVERGE** | Backend actuel : admin/instructor seulement, annule le créneau entier. Tâche 5.3. |
| L4 | POST | `/api/lessons/book-for-student` | `BookForStudentScreen` (instructeur) | `{ studentId (users.id, choisi dans S6, inscription `approved` requise), type, scheduledDate, durationMinutes, price?, notes? }` | 201 `Lesson` (`scheduled`, `instructorId` = appelant, prix de la grille ou saisi ; 400 `PRICE_REQUIRED` si aucun) | **MANQUE** | Mobile actuel : envoie l'**email** dans `studentId`, `startTime`/`endTime`, types en minuscules → réécrit en 6.4 (D-25). Tâche 5.4. |
| L5 | PUT | `/api/lessons/:id/approve` | `LessonRequestsScreen` — **stub aujourd'hui** | `{ scheduledDate (ISO, futur), durationMinutes, price?, adminNotes? }` — **tout instructeur de l'école** ; celui qui approuve devient `instructorId` | `Lesson` (`scheduled`, `instructorId` = appelant, `price` = `pricing[school, type]` si un tarif existe, sinon le `price` saisi ; **400 `PRICE_REQUIRED`** si ni l'un ni l'autre). Le montant est stocké sur la leçon dans les deux cas (D-30) | **MANQUE** | `lessonService.approveLesson` du mobile envoie `{ startTime, endTime, adminNotes }` → réécrit en 6.3. Tâche 5.3. |
| L6 | PUT | `/api/lessons/:id/reject` | `LessonRequestsScreen` — **stub** | `{ reason }` (10–500 car., D-29) — tout instructeur de l'école | `Lesson` (`rejected`, `rejectionReason`) | **MANQUE** | Tâche 5.3, 6.3. |
| L7 | PUT | `/api/lessons/:id/attendance` | `TodayLessonsScreen` — **non câblé** | `{ attended, feedback?, rating? }` par **identifiant de leçon** (une leçon = un élève, D-34) — **uniquement l'instructeur de la leçon** (`instructorId` = appelant, sinon 403) | `Lesson` (`completed`) ; `student_lesson_stats.completed_lessons` **incrémenté seulement si `attended = true`**. Facturation d'une absence : **Q-18** | **DIVERGE** | Backend actuel : `PUT /bookings/:bookingId/attendance` par identifiant de réservation. Tâche 5.4, 6.3. |
| L8 | GET | `/api/lessons/instructors` | Aucun écran actif | — | — | **SUPPRIMÉE** | Les instructeurs sont sous S3. À retirer de `api.config.ts` / `LessonService` (6.1). |

## 5. Examens

Modèle cible (D-01) : un examen est **une demande d'élève** `{ type, preferredDate, message }` (`pending`), adressée à l'école — **pas d'instructeur attitré** ; tout instructeur de l'école la voit et agit dessus. L'instructeur la **planifie** (`dateTime`, `location` → `scheduled`), la **rejette** (`rejectionReason` → **`rejected`**, même vocabulaire que les leçons ; `cancelled` est réservé à une annulation après planification), puis enregistre `{ result, score?, notes? }` (→ `completed`). **Pas de règle d'éligibilité** (D-26) ; le nombre de leçons complétées de l'élève est **renvoyé dans chaque `Exam`** (`studentCompletedLessons`) pour aider l'instructeur à décider. Résultats enregistrés par l'**instructeur** (D-20). **Sens exact de « planifier » et « refuser » suspendu à Q-19** (date choisie par l'école ou imposée par la session ATTT) : le formulaire est le même, les libellés et le texte de ce paragraphe changeront.

Objet `Exam` (cible) : `{ id, schoolId, studentId (users.id), studentFirstName, studentLastName, studentCompletedLessons, type ∈ theory\|practical, status ∈ pending\|scheduled\|completed\|cancelled\|rejected, preferredDate?, message?, dateTime?, location?, result ∈ pending\|passed\|failed, score?, notes?, rejectionReason?, paid, amount?, paymentDate?, createdAt, updatedAt }`.

| # | Méthode | Chemin | Appelé par | Payload (cible) | Réponse (cible) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| X1 | GET | `/api/exams/my-exams` | `MyExamsScreen` (élève), `ExamRequestsScreen`, `TodayExamsScreen` (instructeur) | query optionnelle `status` | `Exam[]` **de l'appelant** : élève → les siens (avec `paid`, `amount`) ; instructeur → **tous ceux de son école** (pas d'instructeur attitré), avec `studentCompletedLessons` | **MANQUE** | Aujourd'hui tombe sur `GET /:id` avec `id = "my-exams"` → erreur UUID. Mobile actuel : `THEORY`/`PRACTICAL`, `PASS`/`FAIL` (6.1). Tâches 3.4, 5.5. |
| X2 | POST | `/api/exams/request` | `RequestExamScreen` (élève) | `{ examType ∈ theory\|practical, preferredDate (ISO, futur), message? }` (`student` ; **refusé 403 `NOT_ENROLLED` si l'élève n'a pas d'inscription `approved`**, même règle que L2 ; école résolue depuis cette inscription, D-22) | 201 `Exam` (`pending`) | **MANQUE** | Tâche 5.5. |
| X3 | PUT | `/api/exams/:id/schedule` | `ExamRequestsScreen` — **stub** | `{ dateTime (ISO, futur), location }` — instructeur de l'école | `Exam` (`scheduled`) | **MANQUE** | Pas de colonne `location` en base (3.4). Tâches 5.6, 6.5. **Suspendu à Q-19** pour le libellé (« planifier » vs « enregistrer la date de session ») ; le payload ne change pas. |
| X4 | PUT | `/api/exams/:id/reject` | `ExamRequestsScreen` — **stub** | `{ reason }` (10–500 car.) | `Exam` (**`rejected`**, `rejectionReason`) | **MANQUE** | Tâches 5.6, 6.5. Libellé écran selon Q-19 (« refuser » ou « dossier pas prêt »). |
| X5 | PUT | `/api/exams/:id/result` | `TodayExamsScreen` — **stub** | `{ result ∈ passed\|failed, score? (0–100, **facultatif** : un examen de conduite est admis/ajourné sans note, seul le code donne un score), notes? }` — **instructeur** de l'école (D-20) | `Exam` (`completed`) | **MANQUE** | Backend actuel : `PUT /registrations/:id/result` admin uniquement, par identifiant de registration. Mobile actuel : `PASS`/`FAIL` (6.1). Tâches 5.6, 6.5. |

## 6. Profils (fiche élève)

Deux familles montées par `student-service` : `/api/profiles/*` (vue instructeur) et `/api/student-profiles/*` (vue élève). **Aucune n'est proxifiée par Nginx** aujourd'hui (2.6). **`:studentId` = `users.id`** (D-28) ; le backend joint `students ON user_id = :studentId AND school_id = :schoolId`.

| # | Méthode | Chemin | Appelé par | Payload | Réponse (cible) | Statut | Écart / notes |
|---|---|---|---|---|---|---|---|
| P1 | GET | `/api/profiles/:studentId/schools/:schoolId/complete` | `StudentInfoTab` (écran `StudentProfile`, joignable après 6.6) | — (`instructor` de cette école / `admin`) | `StudentProfile` `{ id (users.id), firstName, lastName, email, phone?, address?, dateOfBirth?, licenseNumber?, enrollmentDate?, emergencyContact?, emergencyPhone?, totalLessons, completedLessons, totalExams, passedExams, notes? }` | **DIVERGE** | Non routé par Nginx ; repository filtre sur `students.id` (D-28 → 5.0) ; `name` → `firstName`/`lastName` (3.1). |
| P2 | GET | `/api/profiles/:studentId/schools/:schoolId/lessons` | `StudentLessonsTab` | — | `LessonHistory[]` `{ id (lesson), type, scheduledDate, durationMinutes, instructorFirstName, instructorLastName, attended?, feedback?, rating?, paid, amount?, paymentDate?, paymentMethod? }` | **DIVERGE** | Idem P1 ; après 3.3 la source est `lessons` (plus `lesson_bookings` pour l'individuel). |
| P3 | GET | `/api/profiles/:studentId/schools/:schoolId/exams` | `StudentExamsTab` | — | `ExamHistory[]` `{ id (exam), type, dateTime, result, score?, notes?, paid, amount?, paymentDate?, paymentMethod? }` | **DIVERGE** | Idem P1 ; après 3.4 la source est `exams`. |
| P4 | GET | `/api/profiles/:studentId/schools/:schoolId/financial` | `StudentInfoTab` | — | `FinancialSummary` `{ totalRevenue, totalPending, totalDue, lessonsRevenue, examsRevenue, lessonsPending, examsPending, lastPaymentDate? }` | **DIVERGE** | Idem P1. |
| P5 | PUT | `/api/profiles/:studentId/notes` | `StudentInfoTab` | `{ notes }` — note privée instructeur, portée à l'école de l'appelant | 204 | **DIVERGE** | Idem P1 (`students.notes` résolu via `user_id` + école de l'instructeur). |
| P6 | PUT | `/api/profiles/lessons/:lessonId/mark-paid` | `StudentLessonsTab` | `{ amount, paymentMethod ∈ cash\|card\|bank_transfer }` | 204 | **DIVERGE** | Chemin actuel `/bookings/:bookingId/mark-paid` sur `lesson_bookings` ; après 3.3 le paiement est porté par `lessons` (individuel) → chemin renommé. Tâche 5.0. |
| P7 | PUT | `/api/profiles/exams/:examId/mark-paid` | `StudentExamsTab` | `{ amount, paymentMethod }` | 204 | **DIVERGE** | Chemin actuel `/registrations/:registrationId/mark-paid` ; après 3.4 porté par `exams` → renommé. Tâche 5.0. |
| P8 | GET | `/api/student-profiles/me/schools/:schoolId/profile` | `MyProgressTab` (écran `MyProfile`, joignable après 6.6) | — (`student`) | `MyProfile` (= P1 sans `notes`) | **DIVERGE** | Non routé ; controller passe `users.id` à une requête `students.id` — corrigé par D-28 (5.0). |
| P9 | GET | `/api/student-profiles/me/schools/:schoolId/lessons` | `MyLessonsPaymentTab` | — | `LessonHistory[]` (sans `feedback` privé si décidé plus tard) | **DIVERGE** | Idem P8. |
| P10 | GET | `/api/student-profiles/me/schools/:schoolId/exams` | `MyExamsPaymentTab` | — | `ExamHistory[]` | **DIVERGE** | Idem P8. |
| P11 | GET | `/api/student-profiles/me/schools/:schoolId/financial` | `MyProgressTab` | — | `FinancialSummary` | **DIVERGE** | Idem P8. |

## 7. Notifications

**Hors v1 (D-35).** Aucune route, aucune table, aucun code mobile. Le module `services/notification` n'est pas porté dans `services/api` ; son code reste dans l'historique git. L'état d'une demande (inscription, leçon, examen) est visible sur le tableau de bord de chaque rôle via E3, L1 et X1.

## 8. Routes backend hors contrat mobile

Elles existent aujourd'hui, ne sont appelées par aucun écran, et sont **retirées** (5.7) sauf mention.

- `/api/verification/*` (student-service, **public**) : retiré de Nginx en 2.6, supprimé en 5.7 (`student_lesson_stats` est mis à jour directement par L7).
- `/api/schools` : `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:schoolId/instructors`, `GET /instructors/:id`, `PUT|DELETE /instructors/:id`, `POST /:schoolId/pricing`, `DELETE /pricing/:id` — **conservées, `admin` uniquement** (onboarding des écoles par script + ces routes).
- `/api/lessons` : `GET /:id` (conservée, scoping D-20), `GET /:id/availability`, `PUT /:id`, `DELETE /:id`, `POST /:lessonId/book`, `GET /bookings/:id`, `GET /:lessonId/bookings`, `GET /students/:studentId/bookings`, `DELETE /bookings/:bookingId` — retirées en 5.2 / 5.7.
- `/api/exams` : `POST /`, `GET /`, `GET /:id` (conservée, scoping), `GET /:id/availability`, `PUT|DELETE /:id`, `POST /:examId/register`, `GET /registrations/:id`, `GET /:examId/registrations`, `GET /students/:studentId/registrations`, `GET /students/:studentId/eligibility`, `PUT /registrations/:id/result`, `DELETE /registrations/:id` — retirées en 5.5 / 5.7.
- `/api/payments/*` : module porté, **non monté** (D-31).
- `/api/analytics/*` : **supprimé** (D-31).

## 9. Chemins définis côté mobile mais appelés par aucun écran actif — **à supprimer** (6.1)

| Chemin | Défini dans |
|---|---|
| `GET /api/lessons/requests`, `GET /api/lessons/today` | `LessonService.getLessonRequests / getTodayLessons` |
| `GET /api/lessons/instructors` | `LessonService.getInstructors` (L8) |
| `GET /api/exams/requests`, `GET /api/exams/today` | `ExamService.getExamRequests / getTodayExams` |
| `POST /api/schools/school-codes/verify`, `GET /api/schools/:id/codes` | `SchoolCodeService` (S5) — fichier entier supprimé |
| `POST/PUT/DELETE /api/schools…` | `SchoolService.createSchool / updateSchool / deleteSchool` |
| `/api/verification/*`, `/api/payments`, `/api/notifications` | `api.config.ts` |

Écrans morts à supprimer avec eux (0.8) : `StudentDashboardScreen.tsx`, `RequestLessonScreen.tsx`, `ExamsListScreen.tsx`.

## 10. Synthèse

| Statut | Nombre | Lignes |
|---|---|---|
| EXISTE | 9 | A1, S1, S2, S4, E1, E2, E3, E5, E6 |
| DIVERGE | 22 | A2, A3, A4, A5, S3, E4, L1, L2, L3, L7, P1–P11 |
| MANQUE | 9 | S6, L4, L5, L6, X1–X5 |
| SUPPRIMÉE | 2 | S5, L8 |

Suspendu : L3 (Q-17, sort d'une leçon payée annulée) ; L7 (Q-18, facturation d'une absence) ; X3, X4 libellés (Q-19, procédure ATTT).
