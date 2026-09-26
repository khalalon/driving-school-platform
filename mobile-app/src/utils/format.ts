/**
 * Formatage d'affichage partagé par les écrans (montants, dates, noms).
 * Dates, heures et textes suivent la langue choisie (D-47) ; les montants gardent les chiffres
 * occidentaux et le code ISO de la devise (D-43).
 */

import { getLanguage, t } from '../i18n';

/**
 * Locale de formatage des dates selon la **langue choisie** (D-47) — jamais celle du téléphone :
 * une application en français sur un téléphone anglais afficherait sinon « Thursday, Sep 24 ».
 */
export const dateLocale = (): string => (getLanguage() === 'ar' ? 'ar-TN' : 'fr-FR');
const locale = dateLocale;

/**
 * Montant dans la devise de l'école (D-43, code ISO 4217 lu par `useSchoolCurrency`). Tant que
 * la devise n'est pas connue, le nombre s'affiche seul.
 */
export const formatAmount = (
  amount: number | null | undefined,
  currency: string | null | undefined
): string => {
  if (amount === null || amount === undefined) return t('format.empty');
  const value = amount.toFixed(2);
  return currency ? `${value} ${currency}` : value;
};

const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** `22 sept. 2026` (langue courante) ou le texte de repli si la date est absente. */
export const formatDate = (iso: string | null | undefined, fallback?: string): string => {
  const date = parse(iso);
  return date
    ? date.toLocaleDateString(locale(), {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : (fallback ?? t('format.dateTBD'));
};

/** `09:30` ou le texte de repli. */
export const formatTime = (iso: string | null | undefined, fallback?: string): string => {
  const date = parse(iso);
  return date
    ? date.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })
    : (fallback ?? t('format.timeTBD'));
};

/** `22 sept. 2026 à 09:30` ou le texte de repli. */
export const formatDateTime = (iso: string | null | undefined, fallback?: string): string => {
  const date = parse(iso);
  return date
    ? `${formatDate(iso)} ${t('format.at')} ${formatTime(iso)}`
    : (fallback ?? t('format.dateTBD'));
};

/**
 * Compte à rebours vers un instant : « Started », « in 45 min », « in 2 h 05 min », « in 3 days »
 * (ou le texte de repli si la date est absente). Au-delà de 24 h on compte en jours (arrondi).
 */
export const formatCountdown = (
  iso: string | null | undefined,
  now: Date = new Date(),
  fallback?: string
): string => {
  const date = parse(iso);
  if (!date) return fallback ?? t('format.dateTBD');
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return t('format.started');
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return t('format.inMinutes', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return t('format.inHours', {
      hours,
      minutes: String(minutes % 60).padStart(2, '0'),
    });
  const days = Math.max(1, Math.round(hours / 24));
  return days === 1 ? t('format.inDay') : t('format.inDays', { days });
};

/** Jour local `YYYY-MM-DD` (filtre `date` de L1), sans passer par l'UTC d'`toISOString`. */
export const toLocalDateKey = (date: Date = new Date()): string => {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
};

/** `Prénom Nom`, ou le texte de repli si l'identité est vide. */
export const formatPersonName = (
  person: { firstName?: string | null; lastName?: string | null } | null | undefined,
  fallback = '—'
): string => {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
  return name || fallback;
};

/** Initiales pour un avatar (13.5) : « YA » pour Yasmine Amri ; `?` si l'identité est vide. */
export const initialsOf = (firstName?: string | null, lastName?: string | null): string => {
  const letters = [firstName, lastName]
    .map((part) => part?.trim().charAt(0) ?? '')
    .join('')
    .toUpperCase();
  return letters || '?';
};
