/**
 * Catalogue français (D-47). Les clés sont partagées avec `ar.ts` : un test vérifie qu'aucune
 * n'est absente d'un côté ni vide. `{param}` est remplacé par `t(key, { param })`.
 */

export const fr = {
  // Langue
  'language.title': 'Langue',
  'language.french': 'Français',
  'language.arabic': 'العربية',
  'language.hint': "L'application redémarre lorsque le sens de lecture change.",

  // Vocabulaire commun
  'common.ok': 'OK',
  'common.cancel': 'Annuler',
  'common.close': 'Fermer',
  'common.retry': 'Réessayer',
  'common.save': 'Enregistrer',
  'common.error': 'Erreur',
  'common.success': 'C’est fait',
  'common.required': 'Champ obligatoire',
  'common.loading': 'Chargement…',
  'common.optional': 'facultatif',
  'common.back': 'Retour',

  // Types de leçon (valeurs en base inchangées, D-18)
  'lesson.type.CODE': 'Code',
  'lesson.type.MANOEUVRE': 'Manœuvre',
  'lesson.type.PARC': 'Parc',

  // États d'une leçon
  'lesson.status.pending': 'En attente',
  'lesson.status.scheduled': 'Planifiée',
  'lesson.status.completed': 'Effectuée',
  'lesson.status.cancelled': 'Annulée',
  'lesson.status.rejected': 'Refusée',

  // Examens
  'exam.type.theory': 'Code',
  'exam.type.practical': 'Conduite',
  'exam.status.pending': 'En attente',
  'exam.status.scheduled': 'Planifié',
  'exam.status.completed': 'Passé',
  'exam.status.cancelled': 'Annulé',
  'exam.status.rejected': 'Refusé',
  'exam.result.pending': 'En attente',
  'exam.result.passed': 'Réussi',
  'exam.result.failed': 'Ajourné',

  // Procédure « l'école fixe la date » (théorie, D-42)
  'exam.procedure.school.scheduleAction': 'Planifier',
  'exam.procedure.school.scheduleHint': "Fixer la date, l'heure et le lieu de l'examen",
  'exam.procedure.school.dateLabel': "Date de l'examen",
  'exam.procedure.school.locationLabel': 'Lieu',
  'exam.procedure.school.locationPlaceholder': 'ex. : centre d’examen principal',
  'exam.procedure.school.rejectAction': 'Refuser',
  'exam.procedure.school.rejectHint':
    "Expliquer pourquoi l'école ne présente pas l'élève à cet examen",
  'exam.procedure.school.scheduledStatus': 'Planifié',
  'exam.procedure.school.rejectedStatus': 'Refusé',
  'exam.procedure.school.pendingHint': "En attente de la date fixée par l'école",
  'exam.procedure.school.rejectedHint': "L'école ne vous a pas présenté à cet examen",

  // Procédure « session ATTT » (pratique, D-42)
  'exam.procedure.attt.scheduleAction': 'Enregistrer la convocation',
  'exam.procedure.attt.scheduleHint':
    "Saisir la date de session et le centre d'examen reçus de l'ATTT",
  'exam.procedure.attt.dateLabel': 'Date de session (ATTT)',
  'exam.procedure.attt.locationLabel': "Centre d'examen (ATTT)",
  'exam.procedure.attt.locationPlaceholder': 'ex. : Centre ATTT Tunis',
  'exam.procedure.attt.rejectAction': 'Dossier incomplet',
  'exam.procedure.attt.rejectHint':
    "Indiquer ce qui manque : l'élève pourra redemander à la session suivante",
  'exam.procedure.attt.scheduledStatus': 'Convocation reçue',
  'exam.procedure.attt.rejectedStatus': 'Dossier incomplet',
  'exam.procedure.attt.pendingHint': 'En attente de la prochaine session ATTT',
  'exam.procedure.attt.rejectedHint': 'Vous pourrez redemander à la session suivante',

  // Moyens de paiement (D-40)
  'payment.method.cash': 'Espèces',
  'payment.method.card': 'Carte',
  'payment.method.bank_transfer': 'Virement',
  'payment.method.credit': 'Avoir de l’élève',
  'payment.method.unknown': '—',

  // Parcours de l'accueil élève (D-45)
  'journey.step.theoryExam': 'Examen du code',
  'journey.step.practicalExam': 'Examen de conduite',
  'journey.lessons.none': 'Pas encore commencé',
  'journey.lessons.doneOne': '1 leçon effectuée',
  'journey.lessons.doneMany': '{count} leçons effectuées',
  'journey.lessons.scheduledOne': '1 planifiée',
  'journey.lessons.scheduledMany': '{count} planifiées',
  'journey.exam.notRequested': 'Pas encore demandé',
  'journey.exam.requested': 'Demandé — {hint}',
  'journey.exam.scheduled': '{status} · {date}',
  'journey.exam.rejected': '{status} — {hint}',
  'journey.exam.passed': 'Réussi',
  'journey.exam.passedWithScore': 'Réussi · note {score}',
  'journey.exam.failed': 'Ajourné — vous pouvez redemander',

  // Dates et montants
  'format.dateTBD': 'Date à définir',
  'format.timeTBD': 'Heure à définir',
  'format.at': 'à',
  'format.started': 'Commencée',
  'format.inMinutes': 'dans {minutes} min',
  'format.inHours': 'dans {hours} h {minutes} min',
  'format.inDay': 'dans 1 jour',
  'format.inDays': 'dans {days} jours',
  'format.empty': '—',
} as const;

/** Toutes les clés du catalogue : `ar.ts` doit les servir toutes. */
export type TranslationKey = keyof typeof fr;
