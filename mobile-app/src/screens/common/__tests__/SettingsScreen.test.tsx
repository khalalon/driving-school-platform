/**
 * Réglages (13.3) : le thème se choisit et se mémorise, la déconnexion y est accessible, et
 * l'écran se rend dans les deux thèmes et en arabe.
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act } from 'react-test-renderer';
import { applyLanguage, t as translate } from '../../../i18n';
import { THEME_STORAGE_KEY } from '../../../context/ThemeContext';
import { SettingsScreen } from '../SettingsScreen';
import {
  pressables,
  renderInTheme,
  unmountInTheme,
} from '../../../components/ui/__tests__/renderInTheme';

const mockLogout = jest.fn(() => Promise.resolve());

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'eleve@example.tn' }, logout: mockLogout }),
}));

jest.mock('../../../context/LanguageContext', () => {
  const i18n = jest.requireActual('../../../i18n');
  return {
    useI18n: () => ({
      language: i18n.getLanguage(),
      isRTL: i18n.isRTL(),
      isLoading: false,
      t: i18n.t,
      setLanguage: jest.fn(),
    }),
  };
});

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

afterEach(async () => {
  applyLanguage('fr');
  await AsyncStorage.clear();
});

describe('SettingsScreen', () => {
  it.each(['dark', 'light'] as const)('se rend en thème %s', (name) => {
    const tree = renderInTheme(<SettingsScreen navigation={navigation} />, name);
    expect(tree.root.findByProps({ testID: 'theme-dark' })).toBeTruthy();
    expect(tree.root.findByProps({ testID: 'settings-logout' })).toBeTruthy();
    unmountInTheme(tree);
  });

  it('se rend en arabe', () => {
    applyLanguage('ar');
    const tree = renderInTheme(<SettingsScreen navigation={navigation} />, 'dark');
    const texts = tree.root
      .findAll((node) => typeof node.props?.children === 'string')
      .map((node) => node.props.children as string);
    expect(texts).toContain(translate('settings.title'));
    expect(translate('settings.title')).toBe('الإعدادات');
    unmountInTheme(tree);
  });

  it('choisir « Clair » mémorise le choix', async () => {
    const tree = renderInTheme(<SettingsScreen navigation={navigation} />, 'dark');
    const light = pressables(tree).find((node) => node.props.testID === 'theme-light');
    expect(light).toBeDefined();
    await act(async () => {
      await light!.props.onPress();
    });
    await expect(AsyncStorage.getItem(THEME_STORAGE_KEY)).resolves.toBe('light');
    unmountInTheme(tree);
  });

  it('se déconnecter appelle logout', async () => {
    const tree = renderInTheme(<SettingsScreen navigation={navigation} />, 'dark');
    const button = pressables(tree).find((node) => node.props.testID === 'settings-logout');
    expect(button).toBeDefined();
    await act(async () => {
      await button!.props.onPress();
    });
    expect(mockLogout).toHaveBeenCalledTimes(1);
    unmountInTheme(tree);
  });
});
