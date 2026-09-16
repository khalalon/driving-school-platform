# Décisions produit et techniques

Deux sections. « Décisions prises » fait autorité : on ne la rediscute pas dans une tâche. « Questions ouvertes » liste ce que le code ne permet pas de trancher ; **aucune tâche du plan qui dépend d'une question ouverte ne doit être commencée avant que l'humain y ait répondu** (règle d'or n° 2). Quand une question est tranchée, on la déplace dans « Décisions prises » avec sa date.

---

## Décisions prises

| ID | Décision | Origine / justification |
|---|---|---|
| **D-01** | **Le modèle de domaine retenu est celui du mobile : l'élève *demande* (inscription, leçon, examen), l'instructeur *approuve et planifie*, puis *enregistre* (présence, résultat, paiement). Le backend s'aligne sur ce modèle ; le modèle backend actuel (admin crée des créneaux/sessions, l'élève s'y réserve) est abandonné.** | Décision de l'auteur, 14/09/2026. Le mobile (13 k lignes, 20 écrans) est le produit ; le backend lesson/exam n'a jamais été branché dessus. |
| D-02 | Les 8 services sont fusionnés en **une seule application Express** (`services/api/` ou équivalent), les domaines restant des dossiers/modules (`auth/`, `school/`, `student/`, `lesson/`, `exam/`, `payment/`, `notification/`, `analytics/`) avec la même structure interne (routes → controllers → services → repositories). | Phase 2 du plan. Une seule base, aucun appel inter-services autre que l'auth, 6 copies du même middleware : le découpage n'apporte rien et coûte un aller-retour HTTP par requête. |
| D-03 | Les JWT sont **vérifiés localement** avec le `JWT_SECRET` partagé ; plus d'appel à `/api/auth/me` depuis un middleware. `req.user` porte `{ userId, email, role }` (le payload du token). | Phase 2. Corrige le bug `req.user.userId === undefined`. |
| D-04 | `POST /api/auth/register` public crée **uniquement des comptes `student`**. Les rôles `instructor` et `admin` sont obtenus par un **code d'école** (`school_codes`, migration 002, déjà en base). | Phase 4. Ferme la création libre de comptes admin. Le flux exact dépend de Q-02. |
| D-05 | **`web-frontend/` est gelé pour la v1.** Aucune tâche ne le touche, aucun endpoint n'est ajouté pour lui, sa compilation cassée n'est pas corrigée. | Décision de l'auteur, 14/09/2026. |
| D-06 | **Une seule base PostgreSQL** partagée, un seul schéma. Les migrations sont des fichiers SQL numérotés dans `migrations/`, appliqués dans l'ordre ; **un fichier commité ne se modifie jamais**. Une table de suivi (`schema_migrations`) est ajoutée en Phase 0/3 pour rendre l'application des migrations reproductible. | Existant dans le code ; formalisé. |
| D-07 | `docs/API_CONTRACT.md` est la seule source de vérité des endpoints ; `docs/PLAN.md` la seule liste de tâches ; `CHANGELOG.md` le seul journal. **Aucun fichier markdown de statut ou de résumé de session** n'est créé. | `CLAUDE.md`, règles d'or 1, 3, 4. |
| D-08 | **Multi-écoles** : la plateforme héberge plusieurs auto-écoles. Un élève est rattaché à une école par une ligne `students` (couple `user × school`) créée à l'approbation de sa demande d'inscription. Un instructeur appartient à une seule école (`instructors.school_id`). | Schéma 001/002, `EnrollmentService`. Le cas « élève dans deux écoles » reste à cadrer (Q-07). |
| D-09 | Le **cycle d'inscription** est : `enrollment_requests` (`pending` → `approved` \| `rejected`), avec message de l'élève et motif de refus, traité par un `instructor` ou `admin`. Approuver crée la ligne `students` avec `authorized = true`. | `services/student`, migration 002. Conforme au mobile. |
| D-10 | **Suivi des paiements** par ligne : `lesson_bookings.paid/amount/payment_date/payment_method` et `exam_registrations.paid/…`, marqués par l'instructeur depuis la fiche élève (`/api/profiles/.../mark-paid`). Le service `payment` (Stripe) n'est pas utilisé par le mobile. | Migration 003, `profile.routes.ts`, onglets `StudentLessonsTab` / `StudentExamsTab`. |
| D-11 | **Format des réponses HTTP** : succès = objet ou tableau nu, erreur = `{ error: string }` + code HTTP. Dates ISO 8601, clés camelCase. | Tous les controllers backend. L'écart mobile (`message`) est traité par Q-12. |
| D-12 | **Auth** : JWT HS256, `accessToken` court + `refreshToken` long, refresh **réellement utilisé** par le mobile (interceptor 401 → `/api/auth/refresh` → rejeu). Les deux tokens portent un claim `type` (`access` \| `refresh`) et sont signés avec **deux secrets distincts**. | Phase 4. Durées : Q-08. |
| D-13 | Le mobile ne fait **aucun appel réseau direct** : tout passe par `src/services/api/*Service.ts`, tous les services renvoient `response.data` (jamais l'`AxiosResponse`), tous les chemins vivent dans `src/config/api.config.ts`, et l'URL de base est lue depuis la config Expo (`app.json` → `extra`) — pas codée en dur. | Convention existante partiellement respectée ; homogénéisée en 0.3 et 6.1. |
| D-14 | Nginx reste le point d'entrée (`:80`) avec rate-limiting ; il proxifie **un seul upstream** après la Phase 2. Les routes internes (`/api/verification/*`) ne sont pas exposées publiquement. | Phase 2. |
| D-15 | Le flux critique de la v1, qui sert de test de bout en bout (Phase 1), est : **inscription élève → demande d'inscription à une école → approbation par l'instructeur → demande de leçon par l'élève → approbation/planification par l'instructeur → présence marquée**. Tout ce qui n'est pas sur ce chemin est secondaire. | Décision de l'auteur, 14/09/2026 (Phase 1). |

---

## Questions ouvertes

Chaque question est fermée et propose des options. Répondre par l'ID de l'option (ou « autre : … »). La colonne « Bloque » indique les tâches du plan qui ne peuvent pas démarrer sans réponse.

### Q-01 — Où est stocké le nom d'une personne ?
`users` n'a que `email`, `password_hash`, `role`. `students.name` et `instructors.name` sont `NOT NULL`. Le mobile saisit `firstName` / `lastName` à l'inscription puis les **jette** avant l'appel.
- **(a)** Ajouter `first_name` / `last_name` à `users` (migration 004), `register` les accepte et les exige ; `students.name` et `instructors.name` sont remplis par copie à la création, ou deviennent nullable.
- **(b)** Garder le nom sur `students` / `instructors` uniquement ; l'élève le saisit au moment de la demande d'inscription (nouveau champ dans E2), l'instructeur au moment du code d'école.
- **(c)** Rendre `students.name` nullable et laisser l'instructeur le compléter depuis la fiche élève.

Bloque : 3.1, 4.1, 4.2.

### Q-02 — Comment un instructeur rejoint-il une école avec un code ?
Le mobile fait aujourd'hui : (1) `register` role `instructor` sans stocker le token, (2) `POST /school-codes/verify { code }` anonyme. Le backend ne peut pas savoir qui rattacher. La table `instructors` exige aussi `phone` et `license_number` (`NOT NULL`).
- **(a)** Un seul appel : `POST /api/auth/register { email, password, schoolCode, firstName, lastName, phone, licenseNumber }` ; le rôle est déduit du code (`school_codes.role`), la ligne `instructors` est créée dans la même transaction, le code est consommé (`uses_count`, `max_uses`, `expires_at`).
- **(b)** Deux appels comme aujourd'hui, mais le second est **authentifié** : `register` (rôle `student` par défaut) → login → `POST /api/school-codes/redeem { code, phone, licenseNumber }` promeut l'utilisateur et crée `instructors`.
- **(c)** Pas de code : l'admin crée les instructeurs à la main via `POST /api/schools/:id/instructors` (route existante) ; l'écran `InstructorRegistrationScreen` est retiré.

Sous-question : qui crée les codes ? Un admin via une route `POST /api/schools/:id/codes` (à ajouter), ou insertion SQL manuelle pour la v1 ?

Bloque : 4.1, 4.2, 4.3, 6.2.

### Q-03 — Quel vocabulaire pour les types et résultats ?
Base + backend : leçons `CODE` / `Manœuvre` / `Parc` (CHECK sur `lessons.type` et `pricing.lesson_type`), examens `theory` / `practical`, résultats `passed` / `failed` / `pending`. Mobile : leçons `THEORY` / `PRACTICAL` (et `theory` / `practical` dans un écran), examens `THEORY` / `PRACTICAL`, résultats `PASS` / `FAIL`.
- **(a)** Le backend fait foi : le mobile adopte `CODE` / `Manœuvre` / `Parc` (trois choix dans le sélecteur), `theory` / `practical`, `passed` / `failed`.
- **(b)** Le mobile fait foi : migration 004 remplace les CHECK par `THEORY` / `PRACTICAL` (perte de la distinction Manœuvre / Parc et de la tarification par type) et `PASS` / `FAIL`.
- **(c)** Hybride : leçons gardent les trois types backend ; examens et résultats passent en majuscules côté backend.

Bloque : 5.2, 5.4, 6.1.

### Q-04 — Comment un instructeur connaît-il son école ?
Aucune route ne le lui dit ; `EnrollmentRequestsScreen` attend un `schoolId` que personne ne fournit.
- **(a)** `GET /api/auth/me` renvoie aussi `schoolId` (et `instructorId`) quand `role = instructor`, par jointure sur `instructors`.
- **(b)** Le claim `schoolId` est mis dans le JWT à la connexion.
- **(c)** Nouvelle route `GET /api/instructors/me`.

Bloque : 5.1, 6.2.

### Q-05 — Périmètre d'autorisation par école, et qui enregistre quoi ?
Aujourd'hui un `instructor` peut approuver les demandes de **n'importe quelle** école, et seul un `admin` peut enregistrer un résultat d'examen (403 pour l'instructeur, alors que le mobile le lui propose).
- **(a)** Un instructeur n'agit que sur **sa** école (vérifié dans la couche service pour inscriptions, leçons, examens, fiches élèves) ; l'instructeur peut enregistrer présences **et** résultats d'examen ; l'admin peut tout.
- **(b)** Pas de cloisonnement en v1 (déploiement mono-école) ; l'instructeur peut tout enregistrer.

Bloque : 5.1, 5.3, 5.4, 5.5.

### Q-06 — Cycle de vie d'une demande de leçon
Le mobile envoie `{ instructorId, type, notes }` sans date, et attend que l'instructeur fixe `startTime` / `endTime` à l'approbation. Son enum `LessonStatus` n'a pas `pending`, mais ses écrans le supposent.
- **(a)** Une seule table `lessons` avec statut `pending → scheduled → completed | cancelled | rejected`, `date_time` nullable tant que `pending`, `student_id` (= `students.id`) sur la leçon (capacité 1, plus de `lesson_bookings` pour les leçons individuelles).
- **(b)** Nouvelle table `lesson_requests` (`pending / approved / rejected`) ; l'approbation crée une `lessons` + `lesson_bookings` comme aujourd'hui.
- **(c)** Comme (a) mais l'élève propose aussi une date souhaitée (`preferred_date`), champ à ajouter à `BookLessonScreen`.

Sous-question : une leçon `CODE` (théorie) est-elle collective (capacité > 1) ? Si oui, (b) est plus naturel pour ce type.

Bloque : 3.4, 5.2, 5.3, 6.3.

### Q-07 — Élève inscrit dans plusieurs écoles
`RequestExamScreen` n'envoie pas de `schoolId` ; `MyLessonsScreen` / `MyExamsScreen` n'en filtrent pas. Le schéma autorise plusieurs lignes `students` par utilisateur.
- **(a)** v1 = **une seule école active par élève** : contrainte `UNIQUE(students.user_id)` (migration), les routes « my-* » n'ont pas besoin de `schoolId`, `POST /api/exams/request` non plus.
- **(b)** Multi-écoles assumé : le mobile envoie `schoolId` sur toutes les demandes et listes ; l'écran élève ajoute un sélecteur d'école.

Bloque : 5.2, 5.4, 6.1.

### Q-08 — Durées de session
- **(a)** Garder `accessToken` 15 min / `refreshToken` 7 j (valeurs actuelles), avec refresh automatique côté mobile (D-12).
- **(b)** `accessToken` 1 h / `refreshToken` 30 j.

Bloque : 4.4 (valeurs par défaut).

### Q-09 — Annulation d'une leçon par l'élève
`MyLessonsScreen` propose « Annuler » sur une leçon `scheduled`. Le backend ne laisse annuler que les admin/instructeurs (et annule le créneau entier).
- **(a)** L'élève peut annuler sa propre leçon `pending` ou `scheduled` **jusqu'à N heures avant** (N à fixer : 24 ?) ; après, seul l'instructeur.
- **(b)** L'élève ne peut annuler qu'une demande `pending` ; une leçon `scheduled` ne s'annule que par l'instructeur.
- **(c)** L'élève peut annuler à tout moment.

Bloque : 5.3, 6.1.

### Q-10 — Réservation directe par l'instructeur (`BookForStudentScreen`)
Le mobile envoie l'**email** de l'élève dans `studentId`.
- **(a)** Nouvelle route `GET /api/schools/:id/students` (élèves autorisés de l'école) ; l'écran remplace la saisie d'email par une liste ; le payload porte `studentId = students.id`.
- **(b)** Le backend accepte `studentEmail` et résout lui-même vers `students.id` de son école.
- **(c)** Écran retiré de la v1.

Bloque : 5.3, 6.4.

### Q-11 — Règle d'éligibilité aux examens
`registration.service.ts` exige **20 leçons complétées pour la théorie, 30 pour la pratique**, en dur. Rien dans le mobile ne l'affiche.
- **(a)** Conserver, valeurs configurables par école (colonnes sur `schools` ou table `school_settings`), et le mobile affiche la progression (`MyProgressTab` a déjà `completedLessons`).
- **(b)** Conserver en dur pour la v1 (20 / 30), message d'erreur explicite renvoyé à l'élève.
- **(c)** Supprimer : l'instructeur juge lui-même en approuvant ou non la demande d'examen.

Bloque : 5.4.

### Q-12 — Forme des erreurs et messages utilisateur
Backend : `{ error }`. Mobile : lit `error.response.data.message` dans 14 écrans et affiche un texte générique sinon.
- **(a)** Le backend passe à `{ error, message }` (même texte dans les deux clés) — aucun changement mobile.
- **(b)** Le mobile passe à `data.error` partout (tâche 6.1), backend inchangé.

Bloque : 6.1 (ou 2.1 si (a)).

### Q-13 — Identifiant élève dans les URL de fiche (`/api/profiles/:studentId/...`)
Le repository filtre sur `students.id`. La seule chose que l'instructeur a sous la main (depuis une demande d'inscription) est `users.id`.
- **(a)** `:studentId` = `students.id` partout ; les listes qui mènent à une fiche (demandes approuvées, liste des élèves de Q-10a) renvoient ce `students.id`.
- **(b)** `:studentId` = `users.id`, et le repository joint `students ON user_id` avec le `schoolId` de l'URL.

Bloque : 5.0, 6.5.

### Q-14 — Motif de refus : longueur minimale
Joi exige 10 caractères pour `reason` (E6). Le mobile n'exige que « non vide ».
- **(a)** Garder 10 et ajouter la même validation dans le mobile.
- **(b)** Abaisser à 1 (non vide) côté backend.

Bloque : 6.1 (mineur).

### Q-15 — Prix d'une leçon demandée
Le mobile affiche `lesson.price`. La table `pricing` donne un prix par `(école, type)`.
- **(a)** À l'approbation, le backend copie `pricing.price` du type dans `lessons.price` ; l'instructeur ne saisit pas de prix.
- **(b)** L'instructeur saisit ou ajuste le prix à l'approbation (champ dans L5).
- **(c)** Pas de prix sur la leçon en v1 ; seul `mark-paid` porte un montant.

Bloque : 5.3, 6.3.

### Q-16 — Périmètre v1 des modules payment, notification, analytics
Aucun écran mobile ne les appelle. `payment` dépend de Stripe, `notification` de tables absentes et d'Expo/SendGrid/Twilio, `analytics` a un middleware d'auth vide.
- **(a)** Hors v1 : les modules sont portés dans l'app unique (D-02) mais **non montés** (routes désactivées), leurs tests restent.
- **(b)** Montés mais uniquement derrière `admin`, sans nouvel endpoint.
- **(c)** Supprimés du dépôt.

Bloque : 2.1, 2.4.
