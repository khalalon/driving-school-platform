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
} as const;

/** Toutes les clés du catalogue : `ar.ts` doit les servir toutes. */
export type TranslationKey = keyof typeof fr;
