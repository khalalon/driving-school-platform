/**
 * Catalogues de traduction (D-47) : parité des clés, aucune valeur vide, interpolation,
 * choix de la langue au démarrage (mémorisée, sinon celle du téléphone).
 */
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import { ar } from '../ar';
import { fr } from '../fr';
import {
  LANGUAGE_STORAGE_KEY,
  applyLanguage,
  deviceLanguage,
  getLanguage,
  initLanguage,
  isRTL,
  setLanguage,
  t,
} from '../index';
import { storageService } from '../../services/storage/StorageService';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'fr' }]),
}));

const mockedLocales = Localization.getLocales as jest.MockedFunction<
  typeof Localization.getLocales
>;

/** Seule `languageCode` est lue par `deviceLanguage` : le reste de `Locale` n'a pas à être simulé. */
const localesOf = (languageCode: string) =>
  [{ languageCode }] as unknown as ReturnType<typeof Localization.getLocales>;

describe('catalogues fr / ar', () => {
  it('servent exactement les mêmes clés', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(fr).sort());
  });

  it('n’ont aucune valeur vide', () => {
    for (const [key, value] of Object.entries({ ...fr })) {
      expect(`${key}=${String(value).trim()}`).not.toBe(`${key}=`);
    }
    for (const [key, value] of Object.entries(ar)) {
      expect(`${key}=${value.trim()}`).not.toBe(`${key}=`);
    }
  });
});

describe('t', () => {
  afterEach(() => applyLanguage('fr'));

  it('traduit dans la langue courante', () => {
    applyLanguage('fr');
    expect(t('common.cancel')).toBe('Annuler');
    applyLanguage('ar');
    expect(t('common.cancel')).toBe('إلغاء');
  });

  it('remplace les paramètres', () => {
    applyLanguage('fr');
    // Clé absente : renvoyée telle quelle, sans faire planter l'écran
    expect(t('inconnue' as never)).toBe('inconnue');
  });
});

describe('langue au démarrage (D-47)', () => {
  beforeEach(async () => {
    await storageService.removeItem(LANGUAGE_STORAGE_KEY);
    applyLanguage('fr');
  });

  it('téléphone en arabe et aucun choix mémorisé : arabe', async () => {
    mockedLocales.mockReturnValue(localesOf('ar'));
    expect(deviceLanguage()).toBe('ar');
    await expect(initLanguage()).resolves.toBe('ar');
    expect(getLanguage()).toBe('ar');
  });

  it('téléphone dans une autre langue : français', async () => {
    mockedLocales.mockReturnValue(localesOf('en'));
    expect(deviceLanguage()).toBe('fr');
    await expect(initLanguage()).resolves.toBe('fr');
  });

  it('le choix mémorisé l’emporte sur la langue du téléphone', async () => {
    mockedLocales.mockReturnValue(localesOf('en'));
    await storageService.setItem(LANGUAGE_STORAGE_KEY, 'ar');
    await expect(initLanguage()).resolves.toBe('ar');
  });
});

describe('setLanguage', () => {
  afterEach(async () => {
    await storageService.removeItem(LANGUAGE_STORAGE_KEY);
    applyLanguage('fr');
  });

  it('mémorise le choix et signale le redémarrage quand le sens de lecture change', async () => {
    I18nManager.isRTL = false;
    const toArabic = await setLanguage('ar');
    expect(toArabic.needsRestart).toBe(true);
    expect(isRTL('ar')).toBe(true);
    await expect(storageService.getItem(LANGUAGE_STORAGE_KEY)).resolves.toBe('ar');
  });

  it('ne redémarre pas quand le sens de lecture est déjà le bon', async () => {
    I18nManager.isRTL = false;
    await expect(setLanguage('fr')).resolves.toEqual({ needsRestart: false });
  });
});
