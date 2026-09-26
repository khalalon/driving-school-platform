# Décisions produit et techniques

Deux sections. « Décisions prises » fait autorité : on ne la rediscute pas dans une tâche. « Questions ouvertes » liste ce que le code ne permet pas de trancher ; **aucune tâche du plan qui dépend d'une question ouverte ne doit être commencée avant que l'humain y ait répondu** (règle d'or n° 2). Quand une question est tranchée, on la déplace dans « Décisions prises » avec sa date.

---

## Décisions prises

### Décisions structurantes (14/09/2026)

| ID | Décision | Origine / justification |
|---|---|---|
| **D-01** | **Le modèle de domaine retenu est celui du mobile pour le *flux* : l'élève *demande* (inscription, leçon, examen), l'instructeur *approuve et planifie*, puis *enregistre* (présence, résultat, paiement). Le backend s'aligne. Le modèle backend « admin crée des créneaux/sessions, l'élève s'y réserve » est abandonné comme flux principal — ses colonnes `capacity` / `current_bookings` restent dans le schéma, forcées à 1 en v1 (D-34).** | Décision de l'auteur. Le mobile (13 k lignes, 20 écrans) est le produit. |
| D-02 | Les services sont fusionnés en **une seule application Express** (`services/api/`), les domaines restant des modules (`auth/`, `school/`, `student/`, `lesson/`, `exam/`, `payment/`) avec la même structure interne (routes → controllers → services → repositories). `analytics` et `notification` ne sont pas portés (D-31, D-35). | Phase 2. Une seule base, aucun appel inter-services autre que l'auth, 6 copies du même middleware. |
| D-03 | Les JWT sont **vérifiés localement** avec les secrets partagés ; plus d'appel à `/api/auth/me` depuis un middleware. `req.user` porte `{ userId, email, role }`. | Phase 2. Corrige `req.user.userId === undefined`. |
| D-04 | `POST /api/auth/register` sans `schoolCode` crée **uniquement** un compte `student`. Avec un `schoolCode` valide, le rôle et l'école sont **déduits du code** (D-17). | Phase 4. Ferme la création libre de comptes admin. |
| D-05 | **`web-frontend/` est gelé pour la v1.** | Décision de l'auteur. |
| D-06 | **Une seule base PostgreSQL**, un seul schéma. Migrations SQL numérotées dans `migrations/`, appliquées dans l'ordre par un lanceur qui rejoue **toutes** les migrations non appliquées (table `schema_migrations`, tâche 0.1) ; **un fichier commité ne se modifie jamais**. | Existant, formalisé. |
| D-07 | `docs/API_CONTRACT.md` = seule source de vérité des endpoints ; `docs/PLAN.md` = seule liste de tâches ; `CHANGELOG.md` = seul journal. Aucun markdown de statut. | `CLAUDE.md`, règles d'or 1, 3, 4. |
| D-08 | **Multi-écoles** : la plateforme héberge plusieurs auto-écoles (5 en pilote). Un instructeur appartient à une seule école (`instructors.school_id`). Un élève a **une seule inscription active** (D-22). | Schéma 001/002. |
| D-09 | **Cycle d'inscription** : `enrollment_requests` (`pending` → `approved` \| `rejected`), message de l'élève, motif de refus (≥ 10 caractères, D-29), traité par un `instructor` ou `admin` **de cette école** (D-20). Approuver crée la ligne `students` avec `authorized = true`, dans une transaction. | `services/student`, migration 002. |
| D-10 | **Suivi des paiements** par ligne : `lesson_bookings.paid/amount/payment_date/payment_method` et `exam_registrations.paid/…`, marqués par l'instructeur depuis la fiche élève. Le module `payment` (Stripe) est porté mais **non monté** (D-31). | Migration 003, `profile.routes.ts`. |
| D-11 | **Format des réponses HTTP** : succès = objet ou tableau nu ; erreur = `{ error: <code stable, machine>, message: <texte humain, français> }` + code HTTP (D-27). Dates ISO 8601, clés camelCase. | Convention existante, étendue par Q-12. |
| D-12 | **Auth** : JWT HS256, `accessToken` **1 h** + `refreshToken` **30 j** avec **rotation** (chaque `/refresh` émet un nouveau refresh et invalide l'ancien), claim `type` (`access` \| `refresh`), **deux secrets distincts**, refresh réellement utilisé par le mobile (interceptor 401 → `/refresh` → rejeu). | Phase 4, Q-08. |
| D-13 | Le mobile ne fait **aucun appel réseau direct** : tout passe par `src/services/api/*Service.ts`, qui renvoient `response.data` ; les chemins vivent dans `src/config/api.config.ts` ; l'URL de base est lue depuis la config Expo. Les chemins définis mais appelés par aucun écran sont **supprimés**, pas implémentés ; idem pour les écrans morts. | Convention homogénéisée en Phase 0 et 6.1. |
| D-14 | Nginx reste le point d'entrée (`:80`) avec rate-limiting ; un seul upstream après la Phase 2. `/api/verification/*` n'est pas exposé publiquement. | Phase 2. |
| D-15 | **Flux critique v1** (test de bout en bout, Phase 1) : inscription élève → demande d'inscription → approbation par l'instructeur → demande de leçon → approbation/planification → présence marquée. | Décision de l'auteur. |

### Réponses aux questions ouvertes (16/09/2026)

| ID | Ex-question | Décision | Justification | Note d'application |
|---|---|---|---|---|
| **D-16** | Q-01 | **`first_name` / `last_name` sur `users`** (migration), exigés à l'inscription pour tous les rôles. `students.name` passe en nullable puis est supprimée dans une migration ultérieure ; aucune écriture nouvelle ne l'alimente. | Tous les rôles ont un nom. Le mobile consomme déjà `instructor{firstName, lastName}` (L1). | **`instructors.name` est aussi `NOT NULL`** (migration 001) : même traitement, même migration. Les `SELECT` qui exposent un nom (S3, E4, P2 `instructorName`) joignent `users`. |
| **D-17** | Q-02 | **Un seul `register`** : `{ email, password, firstName, lastName, schoolCode? , phone?, licenseNumber? }`. Sans code → `student`. Avec code valide (actif, non expiré, `uses_count < max_uses`) → rôle = `school_codes.role`, ligne `instructors` créée dans la même transaction, code consommé. Les codes sont **insérés par script** à l'onboarding de chaque école (pas d'écran, pas de route admin en v1 ; à revoir au-delà de 10 écoles). | Un aller-retour ; ferme la faille admin. | `instructors.phone` et `license_number` sont `NOT NULL` → exigés quand `schoolCode` est présent. L'écran `InstructorRegistrationScreen` passe de 2 étapes à 1. Route `POST /school-codes/verify` **abandonnée**. |
| **D-18** | Q-03 | **Le backend fait foi sur le vocabulaire** : leçons `CODE` / `Manœuvre` / `Parc`, examens `theory` / `practical`, résultats `passed` / `failed` / `pending`. Le mobile fait une correspondance d'affichage. | Trois types de leçons réellement distincts en auto-école tunisienne ; `THEORY/PRACTICAL` perdrait l'information. Pas une contradiction avec D-01 : mobile fait foi sur le *flux*, backend sur le *vocabulaire*. | Enums `LessonType`, `ExamType`, `ExamResult` du mobile réécrits en 6.1 ; sélecteur à 3 choix dans `BookLessonScreen`. |
| **D-19** | Q-04 | **`GET /api/auth/me` renvoie `schoolId` et `instructorId`** quand `role = instructor` (jointure `instructors`). Pas de claim JWT. | Un claim devient périmé si l'instructeur change d'école. `/me` est déjà appelé au login. | Le mobile appelle `/me` après login et stocke `schoolId` dans `AuthContext`. |
| **D-20** | Q-05 | **Cloisonnement par école, non négociable en v1** : un instructeur n'agit que sur les demandes, leçons, examens et fiches élèves de **son** école, vérifié dans la couche service. **L'instructeur enregistre les résultats d'examen** ; l'admin peut tout. | Un abonnement par école = le modèle économique. Le plus cher à rétro-installer. Aucune interface admin pour les résultats. | Toute route instructeur charge `instructors.school_id` de l'appelant et le compare à l'école de la ressource ; sinon 403 `{ error: 'FORBIDDEN_SCHOOL' }`. |
| **D-21** | Q-06 | **Une seule table `lessons`** : `status ∈ pending \| scheduled \| completed \| cancelled \| rejected`, **`requested_date`** (souhaitée par l'élève, saisie dans `BookLessonScreen`) et **`scheduled_date`** (confirmée par l'instructeur), deux colonnes distinctes. `student_id` (élève demandeur, D-28) sur la leçon. **Toutes les leçons sont individuelles en v1, `CODE` compris** (`capacity` conservée dans le schéma, forcée à 1 — D-34). Complété par D-32 (instructeur). | Deux colonnes : ne pas confondre « aucune date demandée » et « date non confirmée ». Une seule table évite une migration de données à l'approbation. | Douze élèves qui demandent le code sont approuvés pour le même créneau : même présence par élève, sans nouvelle table. |
| **D-22** | Q-07 | **Une seule inscription active par élève** (contrainte unique partielle sur `students.user_id` et sur `enrollment_requests.student_id WHERE status IN ('pending','approved')`). Les routes en `/schools/:schoolId/…` du mobile **sont conservées telles quelles**. | Un candidat s'inscrit dans une seule auto-école ; les routes ne bougeront pas le jour où le multi-écoles s'ouvre, seule la contrainte tombera. | `POST /api/exams/request` et `POST /api/lessons` n'ont pas besoin de `schoolId` : le backend le résout depuis l'inscription active. |
| **D-23** | Q-08 | **`accessToken` 1 h, `refreshToken` 30 j, avec rotation** (intégré à D-12). | App grand public ; 15 min force trop de refresh, 7 j déconnecte l'élève hebdomadaire. | `JWT_ACCESS_EXPIRES_IN=1h`, `JWT_REFRESH_EXPIRES_IN=30d`. |
| **D-24** | Q-09 | **L'élève peut annuler** une demande `pending` à tout moment, et une leçon `scheduled` **jusqu'à 24 h avant** `scheduled_date`. Après, seul l'instructeur. **Constante unique** `LESSON_CANCEL_HOURS=24` dans la config, pas un paramètre par école. | Le temps de l'instructeur est la ressource rare ; 24 h est le standard. | **Le contrôle serveur est la règle** : `POST /api/lessons/:id/cancel` → 403 `{ error: 'CANCEL_WINDOW_CLOSED', message }` hors fenêtre ; le mobile masque le bouton en plus, par confort (17/09). Sort d'une leçon déjà payée : **Q-17**. |
| **D-25** | Q-10 | **`GET /api/schools/:id/students`** (élèves autorisés de l'école, instructeur de cette école ou admin) ; `BookForStudentScreen` remplace la saisie d'email par cette liste et envoie `studentId = users.id`. | Les instructeurs ne connaissent pas les emails ; la route sert aussi au tableau de bord. | Nouvelle ligne S6 du contrat. |
| **D-26** | Q-11 | **Règle d'éligibilité aux examens supprimée en v1** (les 20 / 30 leçons codées en dur disparaissent). Le nombre de leçons complétées est **affiché à l'instructeur** (déjà dans P1 `completedLessons`) ; c'est lui qui approuve ou non. | Une barrière mal calibrée bloquera de vrais élèves en pilote. Le paramétrage par école est la bonne cible mais demande un écran qui n'existe pas. | `checkEligibility` et `REQUIRED_LESSONS_*` supprimés ; `student_lesson_stats` conservée pour l'affichage. |
| **D-27** | Q-12 | **Le backend renvoie `{ error, message }`** : `error` = code stable lisible par machine (`VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN_SCHOOL`, …), `message` = texte humain en français. Le mobile affiche `message` avec repli sur `error`. | Changer le backend une fois coûte moins que chaque `catch` du mobile ; le code stable permettra la traduction en arabe côté client. | Aucun test backend n'asserte aujourd'hui sur le texte de `error` (vérifié le 16/09). Un helper `sendError(res, status, code, message)` centralise le format. |
| **D-28** | Q-13 | **`:studentId` dans les URL = `users.id`**, partout. Le backend résout `students.id` en interne (jointure sur `user_id` + `school_id` de l'URL ou de l'inscription active). Un seul identifiant exposé vers l'extérieur. | Le mobile ne détient que `users.id` — cause des 404 P8–P11. Le coût est une jointure. | À noter pour plus tard (hors v1) : `students.id = users.id` en 1:1 supprimerait le double identifiant à la racine. |
| **D-29** | Q-14 | **Motif de refus : minimum 10 caractères conservé** côté backend ; le mobile ajoute la même validation avant envoi. | Le motif est affiché à l'élève ; un refus sans explication ne sert personne. | Écrans instructeur : validation ajoutée en 6.2 / 6.3 / 6.5. |
| **D-30** | Q-15 | **Le prix est copié depuis `pricing` (école × type) dans `lessons.price` au moment de l'approbation**, et **n'est jamais recalculé à la lecture**. **S'il n'y a pas de tarif pour ce type, l'instructeur saisit le prix à la main** ; le montant est stocké sur la leçon dans les deux cas (17/09). | Le suivi des paiements existe déjà ; un changement de tarif ne doit pas réécrire l'historique financier. Une grille incomplète ne doit pas bloquer une approbation. | Approbation : `price` facultatif dans le payload ; 400 `{ error: 'PRICE_REQUIRED' }` seulement si ni grille ni saisie. |
| **D-31** | Q-16 | **`analytics` : supprimé** (middleware pass-through = faille, aucun écran). **`payment` : porté, non monté.** **`notification` : supprimé** (D-35). | Éliminer la faille plutôt que la surveiller ; le paiement est manuel. | `analytics` et `notification` retirés de compose, Makefile, CI, Nginx en Phase 2 ; le code reste dans l'historique git. |

### Réponses aux 15 questions de comportement (17/09/2026)

| ID | Décision | Justification | Note d'application |
|---|---|---|---|
| **D-32** | **Une demande de leçon est adressée à l'école, pas à un instructeur.** L'instructeur choisi par l'élève est une **préférence facultative** (`preferred_instructor_id`). Les demandes `pending` forment une **file partagée** visible par tous les instructeurs de l'école ; **celui qui approuve devient l'instructeur de la leçon** (`instructor_id`, `null` tant que `pending`). Ensuite, un instructeur ne voit, ne pointe et n'annule que **ses** leçons (`TodayLessonsScreen` = ses leçons du jour). Seul un élève dont l'inscription est **approuvée** dans l'école peut demander une leçon (403 `NOT_ENROLLED`). | L'affectation à la demande bloquerait une leçon sur l'agenda d'un seul instructeur ; la file partagée absorbe les absences. | `lessons.instructor_id` nullable ; `preferred_instructor_id` nullable ; L1, L2, L5, L7 du contrat. L'élève voit l'état de paiement (`paid`, `amount`) sur chaque leçon et chaque examen. |
| **D-33** | **Examens** : pas d'instructeur attitré (toute l'école voit et agit) ; un refus donne le statut **`rejected`** (comme les leçons ; `cancelled` réservé à une annulation après planification) ; le **score est facultatif** (un examen de conduite est admis/ajourné sans note, seul le code en donne un) ; le nombre de leçons effectuées de l'élève est renvoyé avec chaque examen pour aider l'instructeur. **Présence** : le compteur de leçons effectuées n'augmente que si l'élève était présent. | Même vocabulaire de statuts partout ; réalité des examens tunisiens. | `exams.status` inclut `rejected` ; X1, X4, X5, L7 du contrat. Le sens exact de « planifier » / « refuser » dépend de **Q-19**. |


### Décisions du 17/09/2026 (suite)

| ID | Ex-question | Décision | Justification | Note d'application |
|---|---|---|---|---|
| **D-34** | Q-06b | **Leçons `CODE` individuelles en v1** : toutes les leçons ont `capacity = 1` (colonne conservée dans le schéma, forcée à 1, `current_bookings` conservée). Une demande = une leçon = un élève, même pour le code. Ergonomie en Phase 6 : **sélection multiple sur l'écran d'approbation** (« approuver ces 12 demandes pour mardi 9 h »), qui appelle L5 une fois par demande. | (a) et (b) supposent un écran de création de séance qui n'existe dans aucune phase. Douze élèves approuvés pour le même créneau donnent la même présence par élève, sans nouvelle table. | L5 sans `capacity`, L7 sans `studentId`. Tâche 6.7. Le collectif viendra plus tard sans migration de données (la colonne est là). |
| **D-35** | Q-16b | **Pas de module `notification` en v1** : non porté dans `services/api`, tables `push_tokens` / `notification_preferences` **non créées**, aucune route. L'état d'une demande est visible sur le tableau de bord. | Le mobile n'a aucun code push ; ce serait une fonctionnalité neuve de bout en bout (dépendance Expo, cycle de vie des tokens, credentials iOS/Android, service d'envoi). | Le code de `services/notification` reste dans l'historique git. La table `notifications` (migration 001) reste en base, inutilisée. |

---

### Décisions du 18/09/2026 (mode de travail)

| ID | Décision | Justification | Note d'application |
|---|---|---|---|
| **D-36** | **Mode d'exécution du plan** : les tâches d'une même phase s'enchaînent sans validation humaine intermédiaire ; arrêt obligatoire en fin de phase, sur question ouverte non tranchée, sur échec d'un critère de validation non réparable dans le périmètre de la tâche, ou sur tout choix produit absent du contrat et de ce fichier. Chaque commit est poussé sur `origin/main` aussitôt. Après chaque livraison, l'auteur teste sur son téléphone **Android** (Expo Go + Metro sur le même Wi-Fi ; EAS Update quand un compte Expo sera connecté). | Demande de l'auteur : accélérer sans perdre les garde-fous des règles 2 et 5. | Règle d'or 3 de `CLAUDE.md` et règles de lecture de `PLAN.md` réécrites. |
| **D-37** | **Seuil de couverture Jest par service = couverture actuellement mesurée** (arrondi à l'entier inférieur), au lieu de 70 % partout ; à remonter avec les tests des phases 2–5. | 70 % faisait échouer `npm test` (auth : 16,9 %) et donc la CI, tests verts ou pas. | Tâche 0.9. |
| **D-38** | **`app.json` → `expo.extra.API_BASE_URL` porte une valeur neutre : `http://10.0.2.2:80`** (la machine hôte vue depuis l'émulateur Android) ; l'IP réelle de chaque poste, pour un téléphone physique, vit dans `mobile-app/.env` (`EXPO_PUBLIC_API_BASE_URL`), ignoré par git. | L'IP LAN de l'auteur était commitée et déjà périmée le lendemain. L'émulateur fonctionne ainsi sans configuration. | Tâche 0.8. |
| **D-39** | **Suites de tests unitaires obsolètes supprimées** (`school`, `student`, `lesson`, `exam`, `payment`, `notification`) : elles ne compilaient plus contre le code (méthodes et champs de l'ancien modèle de domaine). `passWithNoTests` en attendant ; les tests sont **réécrits module par module en Phase 2** (2.1, 2.3, 2.4, 2.5). Le test analytics « cached data » est désactivé (`it.skip`, D-31). | Réparer ~1 200 lignes de tests d'un modèle abandonné, sur du code réécrit en Phases 2–5, n'apporte rien. | Tâche 0.9. |

### Décisions du 19/09/2026 (réponses à Q-17 … Q-21, Phase 7 du plan)

| ID | Ex-question | Décision | Justification | Note d'application |
|---|---|---|---|---|
| **D-40** | Q-17 | **Avoir.** Quand une leçon déjà payée est annulée (L3, par l'élève ou par l'école), son montant devient un **crédit de l'élève** (`students.credit`, migration 013), imputé automatiquement sur sa **prochaine leçon planifiée** — approuvée (L5) ou réservée par l'instructeur (L4) — dans la même transaction que la planification. Le crédit couvre la leçon en entier (`paid = true`, `payment_method = 'credit'`, `amount = 0`, `credit_applied = prix`) ou en partie (`credit_applied = crédit consommé`, `amount = reste dû`, `paid = false`). Une leçon annulée qui avait consommé du crédit le restitue (`amount` payé + `credit_applied`). | Réponse de l'auteur (option a). Le schéma ne connaît pas les paiements partiels : `amount` = espèces reçues pour la leçon, `credit_applied` = crédit consommé, la somme des deux = le prix. | La leçon annulée garde sa trace de paiement (`paid`, `amount`, `payment_method`) : c'est l'argent réellement encaissé ; le crédit est une dette de l'école envers l'élève, exposée dans P4 / P11 (`credit`). Encaissé = `amount` des leçons payées (un paiement par crédit vaut 0). Lignes L3, L4, L5, P4, P11 du contrat ; objets `Lesson`, `LessonHistory` (`creditApplied`, `paymentMethod`) et `FinancialSummary` (`credit`). Mobile : crédit affiché sur la fiche, « Paid with credit » / « Refunded as credit » sur les leçons. |
| **D-41** | Q-18 | **Une absence n'est pas facturée.** Une leçon `completed` avec `attended = false` **sort du dû** (P4 / P11 `totalDue`, `lessonsPending`) et **ne peut pas être marquée payée** (P6 → 409 `CONFLICT`). Si elle avait déjà été payée ou avait consommé du crédit avant le pointage, le montant devient un crédit de l'élève (même mécanisme que D-40 : leçon non délivrée → avoir). | Réponse de l'auteur (option b). Le cas « déjà payée puis absente » n'était pas dans la question : traité comme une annulation par cohérence avec D-40, **confirmé par l'auteur le 19/09/2026 (« oui, un avoir »)**. | L7 : dans la transaction de présence, si `attended = false` et (`paid` ou `credit_applied > 0`) → `students.credit += amount + credit_applied`. Mobile : « Absent — not billed », bouton « Mark as Paid » masqué. Le compteur de leçons effectuées reste inchangé (D-33). |
| **D-42** | Q-19 | **Les deux procédures existent, selon le type d'examen** : **théorie → (a)** l'école choisit la date (« Schedule » = fixer un rendez-vous, « Reject » = l'école ne présente pas l'élève) ; **pratique → (b)** la date est imposée par la session ATTT (« Record convocation » = enregistrer la date et le centre reçus, « File not ready » = dossier pas prêt, l'élève redemandera à la session suivante). Aucun changement de payload (X3 `{ dateTime, location }`, X4 `{ reason }`) ni de statut (`scheduled` / `rejected`). | Réponse de l'auteur (option c). L'option écrivait « théorie (a), pratique (b), ou l'inverse » sans préciser : l'ordre écrit est appliqué ; l'inverse se fait en échangeant deux entrées de `EXAM_PROCEDURES` (`mobile-app/src/models/Exam.ts`). **Le 19/09 l'auteur précise que le rattachement type → procédure reste à vérifier et que « pour le moment on fait les deux » : voir Q-21.** | Libellés par type dans `EXAM_PROCEDURES` (actions, statuts, champs date / lieu, textes d'attente), utilisés par `ExamRequestsScreen` et `MyExamsScreen`. Texte du §5 du contrat réécrit ; X3 / X4 ne sont plus suspendus. |
| **D-43** | Q-20 | **Une devise par école** : colonne `schools.currency` (ISO 4217, `CHAR(3)`, migration 012), **`TND` par défaut** (écoles pilotes tunisiennes), exposée dans `School` (S1, S2) et modifiable par les routes admin et le script d'onboarding (`CURRENCY=`). Tous les montants d'une école (grille, leçons, examens, résumé financier) sont dans sa devise ; le mobile affiche le code (« 40.00 TND »). | Réponse de l'auteur (option d, ramenée en v1). Le backend ne portait aucune devise et les écrans mélangeaient `€` et `$`. | Le mobile lit la devise par S2 (cache par école, `useSchoolCurrency`), jamais de symbole codé en dur ; `formatAmount(amount, currency)`. Lignes S1 / S2 du contrat + convention transverse. |
| **D-44** | Q-21 | **Les deux procédures d'examen restent telles que D-42 les répartit** : théorie → l'école fixe la date (« Schedule » / « Reject »), pratique → session ATTT (« Record convocation » / « File not ready »), en attendant que le rattachement soit vérifié sur le terrain. Aucun choix par demande, rien d'enregistré, aucun changement de code. | Réponse de l'auteur (option c) : les écrans fonctionnent avec D-42 ; un rattachement inversé se corrige en échangeant deux entrées de `EXAM_PROCEDURES`. | Si la vérification contredit D-42 : échanger `SCHOOL_PROCEDURE` et `ATTT_SESSION_PROCEDURE` dans `mobile-app/src/models/Exam.ts` et réécrire le paragraphe §5 du contrat — une tâche, un commit. |

### Décisions du 20/09/2026 (Phase 8 : accueils « wow »)

| ID | Ex-question | Décision | Justification | Note d'application |
|---|---|---|---|---|
| **D-45** | — | **Accueils qui racontent le parcours.** Élève : la prochaine leçon, puis le **parcours** dans l'ordre **Code → examen théorique → Manœuvre → Parc → examen pratique**, purement informatif : chaque étape leçon affiche le nombre de leçons effectuées (présence marquée, D-33) de ce type, **sans objectif ni seuil** (D-26) ; chaque étape examen affiche l'état de la dernière demande (demandé, planifié / convocation reçue, réussi, ajourné, dossier pas prêt) ; une étape est **conclue** quand un examen de cette famille est réussi (théorie → conclut aussi Code ; pratique → conclut Manœuvre et Parc) ; l'**étape courante** est la dernière étape non conclue portant une activité (leçon effectuée ou planifiée, demande d'examen), sinon la première ; rien n'est bloqué : l'élève peut demander n'importe quel type de leçon ou d'examen. Instructeur : la journée = ses leçons planifiées ou passées du jour local (L1 `scope=mine`) ; la leçon **en cours** est celle dont `[scheduledDate, scheduledDate + durationMinutes[` contient l'instant présent, à défaut la prochaine du jour ; présence marquée depuis l'accueil (L7). Puis barre d'onglets par rôle. | Proposition de design acceptée par l'auteur le 20/09/2026 (artefact « Amélioration wow »). Les grilles de menus n'aidaient ni l'élève à se situer ni l'instructeur à agir vite. | Aucune route nouvelle : P8 / P1 gagnent `completedLessonsByType` (8.1), le reste vient de L1, X1, P11, E3 / E4. Phase 8 du plan. |
### Décision du 23/09/2026 (Phase 9)

| ID | Ex-question | Décision | Justification | Note d'application |
|---|---|---|---|---|
| **D-46** | — | **Le mobile suit le dernier SDK Expo** (aujourd'hui **57**). Expo Go ne charge qu'un seul SDK à la fois et se met à jour tout seul depuis le magasin : un projet en retard d'un SDK n'est plus testable sur un vrai téléphone. La montée de version est donc une tâche du plan dès qu'Expo Go de la machine de recette passe au SDK suivant, pas un chantier « quand on aura le temps ». | Recette du 21/09/2026 bloquée : Expo Go SDK 57 contre projet SDK 54 (« Project is incompatible with this version of Expo Go »). Rétrograder Expo Go n'est qu'un dépannage : le magasin le remet à jour. | Une tâche, un commit (Phase 9) : `npx expo install expo@~<SDK> --fix`, `npx expo-doctor` propre, typecheck et tests verts, bundle vérifié dans Expo Go. Le code applicatif ne change que si le SDK le casse. |

### Décision du 23/09/2026 (Phase 10, langues)

| ID | Ex-question | Décision | Justification | Note d'application |
|---|---|---|---|---|
| **D-47** | — | **L'app parle français et arabe, au choix de l'utilisateur.** Catalogue de traductions dans le mobile (`src/i18n`), sélecteur accessible **avant** connexion (écran de login) et dans « My Profile ». Au premier lancement la langue suit celle du téléphone (locale `ar*` → arabe, **tout le reste → français**) ; le choix est ensuite mémorisé sur l'appareil (`AsyncStorage`), pas côté serveur — aucune route du contrat ne porte de préférence de langue. L'arabe s'affiche en **RTL** (`I18nManager.forceRTL` + redémarrage de l'app au changement). Le **vocabulaire métier est traduit en arabe** (types de leçon, examens, ATTT) : les valeurs échangées et stockées ne changent pas (D-18), seul l'affichage. Les messages d'erreur du serveur restent français (D-27) et sont **retraduits côté mobile à partir du code d'erreur stable**, avec repli sur le texte du serveur si le code est inconnu. | Réponses de l'auteur (23/09/2026) : élèves tunisiens, deux langues d'usage ; l'anglais actuel de l'interface n'était le choix de personne. Le coût du sélecteur + RTL a été présenté et accepté. | Phase 10 (10.1 à 10.6). Les termes arabes du métier vivent dans le seul fichier `mobile-app/src/i18n/ar.ts` et **restent à valider par une école pilote**, comme D-44 : une correction = un commit, sans toucher au reste. |

### Décision du 24/09/2026 (Phase 11, front)

| ID | Ex-question | Décision | Justification | Note d'application |
|---|---|---|---|---|
| **D-48** | — | **Un front dédié, bâti sur un système.** Le nom de l'application ne change pas ; ce sont la palette, la typographie et les composants qui sont refaits. Toute couleur passe par un **jeton sémantique** (`surface`, `textPrimary`, `accent`, `danger`…) décliné en **clair et sombre** ; le thème suit le réglage du téléphone, sans sélecteur dans l'application (ajoutable plus tard puisque tout passe par les jetons). Les écrans n'écrivent plus leurs cartes, boutons et en-têtes : ils utilisent les composants partagés (`Screen`, `AppBar`, `Button`, `Card`, `Field`, `EmptyState`, `Skeleton`, `Toast`). Une action réussie s'annonce par un toast, pas par une fenêtre système ; les fenêtres restent pour les confirmations et les erreurs bloquantes. Aucune route, aucune règle métier, aucun texte traduit ne change. | Demande de l'auteur (24/09/2026) : « un front excellent et attirant, dédié aux élèves et aux auto-écoles ». L'application était fonctionnelle mais chaque écran redéclarait ses styles, ce qui empêchait toute cohérence et rendait le mode sombre impossible. | Phase 11 (11.1 à 11.6). Le contraste des paires texte/fond est vérifié par un test (≥ 4,5:1), pas à l'œil. |


### Décisions du 26/09/2026 (Phase 12, inscription enrichie)

| ID | Ex-question | Décision | Justification | Note d'application |
|---|---|---|---|---|
| **D-49** | Q-22 : où stocker les photos d'élève et les logos d'école ? | **Pas de photo en v1.** Aucun envoi de fichier, aucun stockage, aucune route d'upload : l'inscription s'enrichit de champs **texte** seulement. Les colonnes `students.profile_photo_url` et `schools.logo_url` restent en base, inutilisées, prêtes pour le jour où la question sera tranchée. | Réponse de l'auteur (26/09/2026). Un envoi de fichier n'est pas une case en plus : il faut un stockage (volume ou service externe), une route, une limite de taille, un nettoyage et une sauvegarde. Le bénéfice ne justifiait pas ce chantier maintenant. | Rien à faire côté infrastructure. Une reprise ultérieure devra trancher entre volume Docker servi par Nginx et service externe. |
| **D-50** | Q-23 : à quel moment l'élève renseigne ses détails ? | **Pendant l'inscription.** A2 accepte pour un élève `phone`, `dateOfBirth`, `address`, `emergencyContact`, `emergencyPhone`, **tous facultatifs** : un compte se crée toujours avec e-mail, mot de passe, prénom et nom. Ces champs sont portés par le **compte** (`users`, migration 014) puis **recopiés dans la fiche élève** (`students`) au moment où une école approuve l'inscription (E5). La fiche élève de l'instructeur (P1) et « Mon profil » (P8) les affichent comme aujourd'hui. Champs retenus : date de naissance, adresse, téléphone, contact d'urgence (nom + téléphone). **Le numéro de permis / CIN n'est pas demandé** à l'élève. | Réponse de l'auteur (26/09/2026). La ligne `students` n'existe qu'après l'approbation de l'école : sans colonnes sur `users`, des détails saisis à l'inscription n'auraient nulle part où vivre. Facultatifs parce que l'auteur a demandé qu'un élève **puisse** ajouter des détails, pas qu'il y soit contraint. | Migration 014 (colonnes nullables sur `users`), A2 étendu, E5 recopie. Un élève déjà inscrit garde sa fiche telle quelle ; il n'y a pas de rattrapage rétroactif. |
| **D-51** | Q-24 : que recouvre « l'inscription des écoles » ? | **L'école reste créée par l'administrateur** (script d'onboarding et routes `admin` du §8) ; ce qui change, c'est que **l'instructeur de l'école peut ensuite compléter et corriger sa fiche depuis l'application** : nom, adresse, téléphone, e-mail, devise, et la **grille tarifaire** (ajout et retrait d'un tarif). Aucun formulaire public d'inscription d'école, donc aucune file de validation à tenir. Le cloisonnement D-20 s'applique : un instructeur ne touche que son école. | Réponse de l'auteur (26/09/2026). Une inscription publique ouvrirait la porte à des écoles fantômes visibles des élèves, et demanderait un écran d'administration qui n'existe pas. | Les routes `PUT /api/schools/:id`, `POST /api/schools/:schoolId/pricing` et `DELETE /api/schools/pricing/:id` passent d'`admin` à « admin **ou** instructeur de cette école » (contrat §2, `SchoolGuard`). Un écran « Mon école » côté instructeur. |


### Décision du 26/09/2026 (Phase 13, rénovation UI/UX)

| ID | Ex-question | Décision | Justification | Note d'application |
|---|---|---|---|---|
| **D-52** | — (trois directions présentées sur un canevas, choix de l'auteur) | **Refonte complète de l'interface mobile dans la direction « Circuit »** (univers automobile), maquette de référence : canevas « Directions visuelles — Auto-école », rangée C (https://claude.ai/artifact/WTqrcC3fQcFSrq5WFrTzi1). **Couleurs** : fond `#0A0C0F`, surfaces `#14171C` / `#23282F`, texte `#F3F4F6` / `#9BA3AF`, filets `#272C34`, **signal jaune `#FFC21A`** (action principale, progression), **télémétrie turquoise `#2DD4BF`** (étape en cours, information) ; déclinaison claire de la maquette (`#EEF0F3`, `#FFFFFF`, `#0E1116`, `#4A5260`, signal en texte `#7A5A00`, télémétrie `#0F766E`). **Typographie** : Barlow Condensed (titres, chiffres, libellés en capitales), Barlow (texte), Cairo (arabe, sans capitales ni espacement de lettres). **Thème** : **sombre au premier lancement**, réglage Sombre / Clair / Système dans l'application, mémorisé sur le téléphone — remplace « suit le téléphone, sans sélecteur » de D-48. **3D mixte** : accueil (voiture de nuit, phares) et parcours (circuit vu du ciel, un secteur par étape) en **temps réel** (`expo-gl` + three.js, compatible Expo Go), avec repli sur une image fixe si le téléphone est trop lent ou si « réduire les animations » est actif ; **célébrations pré-rendues** (animations Lottie). **Modèles 3D libres de droits** (CC0, ex. Kenney, Quaternius), recolorés, remplaçables plus tard ; chaque fichier tiers est inventorié avec sa source et sa licence. Les écrans gardent leurs destinations, leurs routes et leurs textes traduits ; seuls la forme, la navigation visuelle et les animations changent. | Choix de l'auteur (26/09/2026) parmi trois directions : « refonte complète », 3D sur l'accueil, le parcours et les célébrations. Le mixte réserve le temps réel là où l'interaction apporte quelque chose et garde les effets lourds (confettis, drapeau) légers sur les petits Android. | Phase 13 (13.1 à 13.21). D-48 reste vrai pour le principe (jetons sémantiques, composants partagés, toasts) ; ses valeurs et sa règle de thème sont remplacées. Les célébrations se déclenchent sur des événements qui existent déjà (inscription acceptée, examen réussi), sans nouvelle route. |


## Questions ouvertes

Historique : Q-17 → D-40, Q-18 → D-41, Q-19 → D-42, Q-20 → D-43, Q-21 → D-44, Q-22 → D-49, Q-23 → D-50, Q-24 → D-51 ; D-45 (design accepté), D-46 (SDK Expo), D-47 (français et arabe) et D-48 (design system et thèmes) prises sans question. **À vérifier sur le terrain** : le rattachement type → procédure d'examen (D-44) et les termes arabes du métier (D-47).

### Feuille de route v1.1 (26/09/2026) — Q-25 à Q-53

Après la recette sur téléphone (aucun bug), l'auteur a demandé des améliorations métier. Elles sont découpées en phases 14 à 23 dans `docs/PLAN.md` ; chaque phase dépend des questions ci-dessous. **Répondre par lettre.** La « recommandation » est une proposition de Claude, pas une décision : une réponse du type « toutes les recommandations sauf Q-xx → (b) » suffit. Une fois tranchées, les questions deviennent des décisions D-53 et suivantes, et les tâches écrites pour une autre option que celle retenue sont réécrites **avant** de commencer la phase.

#### Phase 14 — Gérant de l'école

### Q-25 — Faut-il distinguer le gérant des moniteurs ?
Aujourd'hui tous les instructeurs d'une école ont les mêmes droits : un moniteur salarié peut modifier les tarifs (S8) et verra demain la caisse de l'école.
- **(a)** Non, statu quo : tous les instructeurs sont égaux. La Phase 14 est supprimée ; partout où le plan dit « gérant », lire « tout instructeur de l'école ».
- **(b)** Oui, par un **drapeau `is_manager`** sur `instructors` : le gérant reste un instructeur (il donne aussi des leçons), avec des droits en plus.
- **(c)** Oui, par un **nouveau rôle `manager`** dans `users.role`, distinct d'`instructor` (le gérant ne donne pas de leçons dans l'app).

**Recommandation** : (b). Dans une petite auto-école le gérant est presque toujours aussi moniteur ; un rôle distinct obligerait à lui créer deux comptes.
Bloque : toute la Phase 14 et les tâches « gérant » des phases 16, 18, 19, 22, 23.

### Q-26 — Quelles actions sont réservées au gérant ? (plusieurs choix)
- **(a)** Modifier la fiche école et la grille tarifaire (S7, S8, S9, aujourd'hui ouvertes à tout instructeur par D-51).
- **(b)** Gérer la liste des pièces du dossier (Phase 16).
- **(c)** Voir la caisse de l'école (Phase 18).
- **(d)** Annuler un versement (Phase 18).
- **(e)** Gérer le catalogue de forfaits (Phase 19).
- **(f)** Voir le tableau de bord (Phase 22).
- **(g)** Gérer la flotte de véhicules (Phase 23).
- **(h)** Encaisser un versement (Phase 18).

**Recommandation** : (a) à (g). L'encaissement (h) reste ouvert à tout moniteur, qui reçoit souvent l'argent en voiture.
Bloque : 14.3 et les gardes des phases suivantes.

### Q-27 — Comment devient-on gérant ?
- **(a)** Par un **code d'inscription gérant** (`school_codes.role = 'manager'`, une utilisation) émis par le script d'onboarding.
- **(b)** Désigné par l'administrateur sur un instructeur existant (script `scripts/set-manager.sh <email>`).
- **(c)** Les deux : (a) pour les nouvelles écoles, (b) pour les écoles pilotes déjà inscrites.

**Recommandation** : (c). Les 5 écoles pilotes ont déjà leurs instructeurs ; il faut pouvoir désigner leur gérant sans nouvelle inscription.
Bloque : 14.1, 14.2.

#### Phase 15 — Agenda et conflits d'horaire

### Q-28 — Deux leçons qui se chevauchent pour un même instructeur ou un même élève ?
Aujourd'hui rien n'empêche L4 / L5 de planifier deux leçons à la même heure.
- **(a)** Bloquant : 409 `SCHEDULE_CONFLICT`, il faut choisir une autre heure.
- **(b)** Avertissement : 409 `SCHEDULE_CONFLICT` avec la leçon en conflit, et l'instructeur peut **forcer** (`force: true`).
- **(c)** Bloquant, sauf pour les leçons `CODE` (séances de code données à plusieurs élèves dans la même salle).

**Recommandation** : (b). Couvre le code en salle et les cas exceptionnels sans inventer de règle par type.
Bloque : 15.2, 15.4.

### Q-29 — Qui voit quoi dans l'agenda ?
- **(a)** Chaque instructeur voit **ses** leçons seulement.
- **(b)** Tout instructeur voit l'agenda de **toute son école**, avec un filtre par instructeur.

**Recommandation** : (b). Même logique que la file partagée des demandes (D-32) ; utile pour se répartir les élèves.
Bloque : 15.1, 15.3.

### Q-30 — L'élève choisit-il parmi des créneaux libres ?
Aujourd'hui l'élève écrit une date souhaitée et l'instructeur fixe la vraie date : plusieurs allers-retours sont fréquents.
- **(a)** Non : l'agenda sert seulement à l'instructeur ; 15.6 à 15.10 sont supprimées.
- **(b)** Oui : chaque instructeur publie sa **semaine type de disponibilités** ; l'élève choisit un créneau libre, **la demande reste à approuver** par l'école (D-01 inchangé).
- **(c)** Oui, et choisir un créneau **réserve directement** la leçon, sans approbation.

**Recommandation** : (b). On garde le contrôle de l'école tout en supprimant la négociation de date.
Bloque : 15.6 à 15.10.

#### Phase 16 — Dossier administratif de l'élève

### Q-31 — Liste des pièces du dossier
L'élève ne coche rien lui-même : il n'y a pas d'envoi de fichier en v1 (D-49). C'est l'instructeur qui note qu'une pièce a été **reçue au bureau**, l'élève voit ce qui manque.
- **(a)** Liste **fixe**, la même pour toutes les écoles, codée dans l'app.
- **(b)** Liste **par école**, modifiable par le gérant, initialisée avec une liste par défaut.

Liste par défaut proposée, **à corriger par l'auteur** : copie de la CIN, photos d'identité, certificat médical, extrait de naissance, timbre fiscal.
**Recommandation** : (b), avec la liste par défaut que l'auteur aura corrigée.
Bloque : 16.1 à 16.4.

### Q-32 — Que se passe-t-il si le dossier est incomplet ?
- **(a)** Rien de bloquant : l'élève voit les pièces manquantes, l'instructeur voit un badge « dossier incomplet » sur la demande d'examen et décide (comme D-26 pour les leçons effectuées).
- **(b)** La demande d'examen **pratique** (X2) est refusée (403 `FILE_INCOMPLETE`) tant que le dossier n'est pas complet.
- **(c)** Les demandes d'examen **théorique et pratique** sont refusées tant que le dossier n'est pas complet.

**Recommandation** : (a). Cohérent avec D-26 (l'instructeur juge, l'app informe).
Bloque : 16.3.

#### Phase 17 — Notifications

### Q-33 — Quels événements déclenchent une notification ? (plusieurs choix)
Côté élève :
- **(a)** Inscription acceptée ou refusée (E5, E6).
- **(b)** Leçon planifiée, refusée, ou annulée par l'école (L4, L5, L6, L3).
- **(c)** Examen planifié, refusé, résultat enregistré (X3, X4, X5).
- **(d)** Rappel avant une leçon (voir Q-35).

Côté école :
- **(e)** Nouvelle demande d'inscription (E2).
- **(f)** Nouvelle demande de leçon ou d'examen (L2, X2).
- **(g)** Leçon annulée par l'élève (L3).

**Recommandation** : toutes.
Bloque : 17.4.

### Q-34 — Côté école, qui reçoit une nouvelle demande ?
- **(a)** Tous les instructeurs de l'école (file partagée, D-32).
- **(b)** L'instructeur préféré s'il y en a un (`preferredInstructorId`), sinon tous.
- **(c)** Le gérant seulement.

**Recommandation** : (b).
Bloque : 17.4.

### Q-35 — Rappel avant une leçon
- **(a)** La veille à 18 h.
- **(b)** 24 h avant.
- **(c)** 2 h avant.
- **(d)** La veille à 18 h **et** 2 h avant.
- **(e)** Aucun rappel.

**Recommandation** : (a). Un seul message, au moment où l'élève peut encore s'organiser.
Bloque : 17.5.

### Q-36 — Un écran « Notifications » dans l'app ?
- **(a)** Push seulement : une notification manquée est perdue.
- **(b)** Push **et** un écran historique (lu / non lu, badge sur l'icône).

**Recommandation** : (b). La table `notifications` existe déjà depuis 001 ; sans historique, une notification balayée par erreur est perdue.
Bloque : 17.6.

### Q-37 — Pour quelles plateformes produire une version installable ?
Depuis le SDK 53, **Expo Go ne reçoit plus les notifications push sur Android**. Pour les tester, il faut une version installable de l'application (build de développement EAS) : un compte Expo gratuit suffit pour Android, iOS demande un compte Apple Developer (99 $ par an). Expo Go reste utilisable pour tout le reste (D-46 inchangé).
- **(a)** Android seulement pour l'instant.
- **(b)** Android et iOS.

**Recommandation** : (a).
Bloque : 17.1.

#### Phase 18 — Paiements partiels et reçus

### Q-38 — Comment enregistrer un paiement partiel ?
Aujourd'hui une leçon ou un examen est « payé » ou « non payé » d'un bloc (P6, P7), et seul l'avoir (D-40) porte un solde.
- **(a)** Versements **par ligne** : une leçon ou un examen reçoit plusieurs versements jusqu'à atteindre son prix.
- **(b)** **Compte élève** : l'élève verse une somme libre ; elle est imputée automatiquement sur ce qu'il doit, **du plus ancien au plus récent** ; un excédent devient de l'avoir (D-40 généralisé). P6 / P7 restent comme raccourci « solder cette ligne ».
- **(c)** Statu quo plus un champ « acompte » sur la leçon.

**Recommandation** : (b). C'est la pratique réelle (« je vous laisse 200 dinars ») et c'est ce qui permettra de payer un forfait (Phase 19). Les tâches de la phase sont écrites pour (b).
Bloque : toute la Phase 18 et 19.3.

### Q-39 — Reçu de paiement
- **(a)** Reçu dans l'app (numéro séquentiel par école, date, montant, ce qu'il règle), **exportable en PDF par le téléphone** et partageable (WhatsApp, e-mail).
- **(b)** PDF généré par le serveur et téléchargé.
- **(c)** Pas de reçu.

**Recommandation** : (a). Aucun stockage de fichier côté serveur (cohérent avec D-49).
Bloque : 18.6.

### Q-40 — Corriger un versement saisi par erreur
- **(a)** Impossible.
- **(b)** Annulable par celui qui l'a saisi ou par le gérant, **dans les 24 h**, avec un motif ; le versement est marqué annulé, jamais supprimé.
- **(c)** Annulable par le gérant **sans limite de temps**, avec un motif ; marqué annulé, jamais supprimé.

**Recommandation** : (c). Une erreur se découvre souvent en fin de mois ; la trace suffit à éviter les abus.
Bloque : 18.3.

#### Phase 19 — Forfaits

### Q-41 — Un forfait se compte en quoi ?
- **(a)** En **heures par type** (ex. 20 h de Manœuvre + 10 h de Parc) : chaque leçon décompte sa durée.
- **(b)** En **nombre de leçons par type**.
- **(c)** En **montant prépayé** (c'est alors un avoir, D-40 existe déjà).

**Recommandation** : (a). C'est l'unité que vendent les écoles, et la grille tarifaire porte déjà une durée par type.
Bloque : toute la Phase 19.

### Q-42 — Comment un forfait est-il vendu ?
Dans tous les cas, le catalogue de l'école est visible sur sa fiche publique.
- **(a)** Au comptoir : l'école **attribue** un forfait à l'élève dans l'app.
- **(b)** L'élève **demande** un forfait dans l'app, l'école valide.
- **(c)** Les deux.

**Recommandation** : (a).
Bloque : 19.3, 19.6.

### Q-43 — Une absence consomme-t-elle des heures du forfait ?
- **(a)** Non, comme une absence n'est pas facturée (D-41).
- **(b)** Oui.

**Recommandation** : (a), par cohérence avec D-41.
Bloque : 19.4.

### Q-44 — Forfait épuisé et durée de validité
- **(a)** Au-delà du forfait, les leçons repassent au tarif normal ; **pas de date d'expiration**.
- **(b)** Tarif normal au-delà, et une **date d'expiration** fixée par l'école à la vente.
- **(c)** Aucune leçon ne peut être planifiée sans heures restantes.

**Recommandation** : (a).
Bloque : 19.1, 19.4.

#### Phase 20 — Progression pédagogique

### Q-45 — Quelles compétences suivre ?
- **(a)** Une liste **fixe par type de leçon**, la même pour toutes les écoles, **fournie par l'auteur**.
- **(b)** Une liste **par école**, modifiable par le gérant.

Proposition de départ, **à corriger par l'auteur** (Claude ne connaît pas le découpage exact des épreuves en Tunisie) : Manœuvre → démarrage et arrêt, marche arrière, créneau, rangement en bataille, demi-tour, démarrage en côte ; Parc → à fournir ; CODE → signalisation, priorités, vitesses, stationnement, mécanique.
**Recommandation** : (a).
Bloque : 20.1.

### Q-46 — Échelle d'évaluation
- **(a)** Trois niveaux : non abordé / en cours / acquis.
- **(b)** Note de 1 à 5.

**Recommandation** : (a). Plus parlant pour l'élève et plus rapide à saisir à la fin d'une leçon.
Bloque : 20.1, 20.2.

### Q-47 — Le commentaire de fin de leçon est-il visible par l'élève ?
L7 enregistre déjà un `feedback` ; la note privée de l'instructeur sur l'élève (P5) reste privée dans tous les cas.
- **(a)** Oui, l'élève voit le commentaire de chaque leçon.
- **(b)** Non, il reste réservé à l'école.

**Recommandation** : (a).
Bloque : 20.4.

#### Phase 21 — Examens : repasses et prix

### Q-48 — Après un échec, qui programme la repasse ?
- **(a)** L'élève redemande lui-même (X2, comme aujourd'hui).
- **(b)** L'instructeur programme directement la repasse (nouvelle route, comme L4 pour les leçons).
- **(c)** Les deux.

**Recommandation** : (c).
Bloque : 21.2, 21.4.

### Q-49 — Prix des examens
Aujourd'hui un examen n'a pas de prix : le montant est saisi au moment de le marquer payé (P7).
- **(a)** Une **grille de prix d'examen par école** (théorie, pratique), copiée sur l'examen à sa planification, comme les leçons (D-30).
- **(b)** Statu quo : montant saisi au paiement.

**Recommandation** : (a). Sans prix, un examen n'entre pas dans le « reste à payer » de l'élève ni dans le tableau de bord.
Bloque : 21.3, 21.5.

#### Phase 22 — Tableau de bord du gérant

### Q-50 — Quels indicateurs ? (plusieurs choix)
- **(a)** Montant encaissé du mois, comparé au mois précédent, par mode de paiement.
- **(b)** Reste à encaisser (tous élèves confondus).
- **(c)** Heures de leçon données par instructeur.
- **(d)** Taux de réussite aux examens théorique et pratique (première tentative et global).
- **(e)** Élèves inactifs : aucune leçon depuis 14 jours.
- **(f)** Demandes en attente (inscriptions, leçons, examens).
- **(g)** Taux d'absence.

**Recommandation** : toutes, avec un seuil d'inactivité de 14 jours.
Bloque : 22.1, 22.2.

#### Phase 23 — Flotte de véhicules

### Q-51 — Le véhicule est-il obligatoire à la planification ?
- **(a)** Facultatif.
- **(b)** Obligatoire pour les leçons `Manœuvre` et `Parc`.

**Recommandation** : (a). Une école avec une seule voiture n'a pas à le saisir à chaque fois.
Bloque : 23.3.

### Q-52 — Deux leçons sur le même véhicule à la même heure ?
- **(a)** Même règle que Q-28 pour les instructeurs.
- **(b)** Toujours bloquant (une voiture ne se partage pas).

**Recommandation** : (b).
Bloque : 23.3.

### Q-53 — Quelles échéances suivre ?
- **(a)** Assurance, visite technique, vignette (des dates) ; alerte à J-30 sur le tableau de bord et notification au gérant.
- **(b)** Comme (a), plus la vidange au kilométrage (il faut alors saisir le kilométrage).

**Recommandation** : (a).
Bloque : 23.1, 23.4.
