/**
 * Écrans d'authentification refaits (13.13, D-52) : connexion, inscription élève, inscription
 * instructeur — rendus en clair, en sombre et en arabe, textes clés présents, cibles tactiles
 * suffisantes, et la connexion garde sa scène d'accueil.
 */
import React from 'react';
import { act } from 'react-test-renderer';
import { LoginScreen } from '../LoginScreen';
import { RegisterScreen } from '../RegisterScreen';
import { InstructorRegistrationScreen } from '../InstructorRegistrationScreen';
import { applyLanguage, t } from '../../../i18n';
import {
  SCREEN_VARIANTS,
  renderScreen,
  renderedText,
  smallTouchTargets,
  unmountInTheme,
} from '../../../components/ui/__tests__/renderInTheme';

const mockLogin = jest.fn();
const mockRegister = jest.fn();

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, register: mockRegister, user: null, isLoading: false }),
}));

jest.mock('../../../context/LanguageContext', () => {
  const i18n = jest.requireActual('../../../i18n');
  return {
    useI18n: () => ({
      t: i18n.t,
      language: i18n.getLanguage(),
      isRTL: i18n.isRTL(),
      isLoading: false,
      setLanguage: jest.fn(),
    }),
  };
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };

const SCREENS: [string, React.ComponentType<{ navigation: typeof navigation }>, () => string][] = [
  ['connexion', LoginScreen, () => t('auth.login.title')],
  ['inscription élève', RegisterScreen, () => t('auth.createAccount')],
  ['inscription instructeur', InstructorRegistrationScreen, () => t('auth.createInstructorAccount')],
];

afterEach(() => applyLanguage('fr'));

describe.each(SCREENS)('%s', (_, Screen, keyText) => {
  it.each(SCREEN_VARIANTS)('se rend en %s, texte clé présent, cibles tactiles suffisantes', async (__, theme, language) => {
    const tree = renderScreen(<Screen navigation={navigation} />, theme, language);
    await act(async () => undefined);
    expect(renderedText(tree)).toContain(keyText());
    expect(smallTouchTargets(tree)).toEqual([]);
    unmountInTheme(tree);
  });
});

describe('connexion', () => {
  it('garde la scène d’accueil en tête, annoncée aux lecteurs d’écran', async () => {
    const tree = renderScreen(<LoginScreen navigation={navigation} />, 'dark');
    await act(async () => undefined);
    const scene = tree.root.findByProps({ testID: 'login-car-scene' });
    expect(scene.props.accessibilityLabel).toBe(t('home.scene3d'));
    unmountInTheme(tree);
  });

  it('mène à l’inscription élève et à l’inscription instructeur', async () => {
    const tree = renderScreen(<LoginScreen navigation={navigation} />, 'dark');
    await act(async () => undefined);
    act(() => tree.root.findByProps({ accessibilityLabel: t('auth.createStudent') }).props.onPress());
    act(() =>
      tree.root.findByProps({ accessibilityLabel: t('auth.registerInstructor') }).props.onPress()
    );
    expect(navigation.navigate).toHaveBeenCalledWith('Register');
    expect(navigation.navigate).toHaveBeenCalledWith('InstructorRegistration');
    unmountInTheme(tree);
  });
});
