/**
 * Erreurs du backend traduites par **code stable** (D-27, D-47, 10.5) : le code prime sur le
 * texte français du serveur ; un code hors contrat retombe sur ce texte, puis sur le repli.
 */
import { getApiErrorCode, getApiErrorMessage, translateApiErrorCode } from '../ApiError';
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
      'NOT_FOUND',
      'CONFLICT',
      'NOT_ENROLLED',
      'CANCEL_WINDOW_CLOSED',
      'PRICE_REQUIRED',
      'INVALID_SCHOOL_CODE',
      'INTERNAL_ERROR',
    ]) {
      expect(translateApiErrorCode(code)).toBeTruthy();
    }
    expect(translateApiErrorCode('PAS_UN_CODE')).toBeUndefined();
    expect(translateApiErrorCode(undefined)).toBeUndefined();
  });
});
