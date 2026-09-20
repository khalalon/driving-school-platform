/**
 * Formatage d'affichage partagé par les écrans (montants, dates, noms).
 */

/**
 * Montant dans la devise de l'école (D-43, code ISO 4217 lu par `useSchoolCurrency`). Tant que
 * la devise n'est pas connue, le nombre s'affiche seul.
 */
export const formatAmount = (
  amount: number | null | undefined,
  currency: string | null | undefined
): string => {
  if (amount === null || amount === undefined) return '—';
  const value = amount.toFixed(2);
  return currency ? `${value} ${currency}` : value;
};

const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** `Sep 22, 2026` ou le texte de repli si la date est absente. */
export const formatDate = (iso: string | null | undefined, fallback = 'Date TBD'): string => {
  const date = parse(iso);
  return date
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : fallback;
};

/** `09:30` ou le texte de repli. */
export const formatTime = (iso: string | null | undefined, fallback = 'Time TBD'): string => {
  const date = parse(iso);
  return date ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : fallback;
};

/** `Sep 22, 2026 at 09:30` ou le texte de repli. */
export const formatDateTime = (iso: string | null | undefined, fallback = 'Date TBD'): string => {
  const date = parse(iso);
  return date ? `${formatDate(iso)} at ${formatTime(iso)}` : fallback;
};

/**
 * Compte à rebours vers un instant : « Started », « in 45 min », « in 2 h 05 min », « in 3 days »
 * (ou le texte de repli si la date est absente). Au-delà de 24 h on compte en jours calendaires.
 */
export const formatCountdown = (
  iso: string | null | undefined,
  now: Date = new Date(),
  fallback = 'Date TBD'
): string => {
  const date = parse(iso);
  if (!date) return fallback;
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return 'Started';
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
  const days = Math.ceil(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
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
