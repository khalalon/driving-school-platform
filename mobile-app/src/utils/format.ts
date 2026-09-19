/**
 * Formatage d'affichage partagé par les écrans (montants, dates, noms).
 */

/**
 * Libellé monétaire. Le backend ne porte aucune devise ; le symbole affiché n'est pas tranché
 * (Q-20 dans `docs/DECISIONS.md`) : on garde ici, en un seul endroit, celui des écrans existants.
 */
export const CURRENCY_SYMBOL = '€';

export const formatAmount = (amount: number | null | undefined): string =>
  amount === null || amount === undefined ? '—' : `${amount.toFixed(2)} ${CURRENCY_SYMBOL}`;

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

/** `Prénom Nom`, ou le texte de repli si l'identité est vide. */
export const formatPersonName = (
  person: { firstName?: string | null; lastName?: string | null } | null | undefined,
  fallback = '—'
): string => {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
  return name || fallback;
};
