/**
 * Thème (13.3, D-52) : sombre au premier lancement, choix Sombre / Clair / Système mémorisé,
 * « Système » qui suit le téléphone.
 */
import React from 'react';
import { Text, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  ThemePreference,
  ThemeProvider,
  loadThemePreference,
  resolveThemeName,
  useTheme,
  useThemePreference,
} from '../ThemeContext';

let setPreference: (preference: ThemePreference) => Promise<void>;
let phoneScheme: string | null | undefined;

const Probe = () => {
  const theme = useTheme();
  const value = useThemePreference();
  setPreference = value.setPreference;
  phoneScheme = useColorScheme();
  return (
    <Text>
      {theme.name}/{value.preference}
    </Text>
  );
};

const renderProbe = (initialPreference?: ThemePreference): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ThemeProvider initialPreference={initialPreference}>
        <Probe />
      </ThemeProvider>
    );
  });
  return tree;
};

const shown = (tree: ReactTestRenderer): string =>
  (tree.root.findByType(Text).props.children as string[]).join('');

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('choix mémorisé', () => {
  it('premier lancement : sombre', async () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe('dark');
    await expect(loadThemePreference()).resolves.toBe('dark');
  });

  it('relit le choix mémorisé', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
    await expect(loadThemePreference()).resolves.toBe('light');
  });

  it('une valeur inconnue retombe sur le défaut', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    await expect(loadThemePreference()).resolves.toBe('dark');
  });
});

describe('thème affiché', () => {
  it('« Système » suit le téléphone, sombre si le téléphone ne dit rien', () => {
    expect(resolveThemeName('system', 'light')).toBe('light');
    expect(resolveThemeName('system', 'dark')).toBe('dark');
    expect(resolveThemeName('system', null)).toBe('dark');
    expect(resolveThemeName('dark', 'light')).toBe('dark');
    expect(resolveThemeName('light', 'dark')).toBe('light');
  });

  it('sans choix passé, le fournisseur affiche le thème sombre', () => {
    const tree = renderProbe();
    expect(shown(tree)).toBe('dark/dark');
    act(() => tree.unmount());
  });

  it('changer de thème l’applique et le mémorise', async () => {
    const tree = renderProbe('dark');
    await act(async () => {
      await setPreference('light');
    });
    expect(shown(tree)).toBe('light/light');
    await expect(AsyncStorage.getItem(THEME_STORAGE_KEY)).resolves.toBe('light');

    await act(async () => {
      await setPreference('system');
    });
    const expected = resolveThemeName('system', phoneScheme);
    expect(shown(tree)).toBe(`${expected}/system`);
    act(() => tree.unmount());
  });
});
