/**
 * Erreurs du backend traduites par **code stable** (D-27, D-47, 10.5) : le code prime sur le
 * texte français du serveur ; un code hors contrat retombe sur ce texte, puis sur le repli.
 */
import {
  getScheduleConflict, getApiErrorCode, getApiErrorMessage, translateApiErrorCode } from '../ApiError';
import { applyLanguage } from '../../../i18n';

const httpError = (error?: string, message?: string) => ({
  response: { data: { error, message } },
});

afterEach(() => applyLanguage('fr'));

describe('getApiErrorMessage — traduction par code', () => {
  it('traduit le code du contrat plutôt que le message du serveur', () => {
    applyLanguage('fr');
    expect(
      getApiErrorMessage(httpError('NOT_ENROLLED', 'Inscription requise'), 'repli')
    ).toBe('Vous devez être inscrit dans cette école.');
  });

  it('en arabe, le même code donne le texte arabe (jamais la phrase française)', () => {
    applyLanguage('ar');
    const shown = getApiErrorMessage(
      httpError('CANCEL_WINDOW_CLOSED', "Trop tard pour annuler"),
      'repli'
    );
    expect(shown).toBe('لم يعد بالإمكان الإلغاء: أصبح الموعد قريباً جداً.');
    expect(shown).not.toContain('Trop tard');
  });

  it('code inconnu : message du serveur, puis repli', () => {
    applyLanguage('fr');
    expect(getApiErrorMessage(httpError('SOMETHING_ELSE', 'Texte du serveur'), 'repli')).toBe(
      'Texte du serveur'
    );
    expect(getApiErrorMessage(httpError(undefined, undefined), 'repli')).toBe('repli');
    expect(getApiErrorMessage(new Error('réseau'), 'repli')).toBe('repli');
  });

  it('le code reste lisible tel quel pour les écrans (D-24)', () => {
    expect(getApiErrorCode(httpError('CANCEL_WINDOW_CLOSED'))).toBe('CANCEL_WINDOW_CLOSED');
    expect(getApiErrorCode(new Error('réseau'))).toBeUndefined();
  });

  it('translateApiErrorCode : tous les codes du contrat sont couverts', () => {
    applyLanguage('fr');
    for (const code of [
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'FORBIDDEN_SCHOOL',
      'FORBIDDEN_MANAGER',
      'NOT_FOUND',
      'CONFLICT',
      'NOT_ENROLLED',
      'CANCEL_WINDOW_CLOSED',
      'PRICE_REQUIRED',
      'INVALID_SCHOOL_CODE',
      'SCHEDULE_CONFLICT',
      'INTERNAL_ERROR',
    ]) {
      expect(translateApiErrorCode(code)).toBeTruthy();
    }
    // Gérant (14.4) : traduit dans les deux langues
    expect(translateApiErrorCode('FORBIDDEN_MANAGER')).toBe('Cette action est réservée au gérant de l’école.');
    applyLanguage('ar');
    expect(translateApiErrorCode('FORBIDDEN_MANAGER')).toBe('هذا الإجراء مخصّص لمدير المدرسة.');
    applyLanguage('fr');
    expect(translateApiErrorCode('PAS_UN_CODE')).toBeUndefined();
    expect(translateApiErrorCode(undefined)).toBeUndefined();
  });
});

describe('getScheduleConflict (15.4, D-58)', () => {
  const conflict = {
    lessonId: 'l2',
    scheduledDate: '2026-10-06T09:00:00.000Z',
    durationMinutes: 60,
    instructorId: 'i1',
    studentId: 'u2',
    student: { id: 'u2', firstName: 'Nour', lastName: 'Cherif' },
  };
  const axiosError = (data: unknown) => ({ response: { status: 409, data } });

  it('renvoie la leçon en conflit d’un 409 SCHEDULE_CONFLICT', () => {
    expect(
      getScheduleConflict(axiosError({ error: 'SCHEDULE_CONFLICT', message: 'pris', conflict }))
    ).toEqual(conflict);
  });

  it('rien pour un autre code, un corps sans conflit ou une erreur réseau', () => {
    expect(getScheduleConflict(axiosError({ error: 'CONFLICT', message: 'déjà traitée' }))).toBeUndefined();
    expect(getScheduleConflict(axiosError({ error: 'SCHEDULE_CONFLICT', message: 'pris' }))).toBeUndefined();
    expect(getScheduleConflict(new Error('réseau'))).toBeUndefined();
  });
});
