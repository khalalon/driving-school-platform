/**
 * Outil des tests de 11.2 : rendre un composant dans un thème donné, puis relire les couleurs
 * réellement posées dans l'arbre. C'est ce qui permet d'affirmer qu'un composant « lit le thème »
 * au lieu de le croire : toute couleur rendue doit appartenir au thème demandé.
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderer, { ReactTestRenderer, act } from 'react-test-renderer';
import { ThemeProvider } from '../../../context/ThemeContext';
import { Theme, ThemeName, themes } from '../../../theme';

/** Mesures fixes : hors téléphone, `SafeAreaProvider` n'a rien à mesurer. */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Démonte l'arbre sans déclencher l'avertissement `act(...)` de React. */
export const unmountInTheme = (tree: ReactTestRenderer): void => {
  act(() => {
    tree.unmount();
  });
};

/**
 * Les éléments réellement pressables : `Pressable` est enveloppé par React Native, on le repère
 * donc à ce qu'il porte — un `onPress` et un rôle de bouton.
 */
export const pressables = (tree: ReactTestRenderer) =>
  tree.root.findAll(
    (node) =>
      typeof node.props?.onPress === 'function' && node.props?.accessibilityRole === 'button'
  );

export const renderInTheme = (node: React.ReactElement, name: ThemeName): ReactTestRenderer => {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider name={name}>{node}</ThemeProvider>
      </SafeAreaProvider>
    );
  });
  if (!tree) throw new Error('rendu impossible');
  return tree;
};

type StyleValue = Record<string, unknown> | StyleValue[] | null | undefined | false | number;

const collectFromStyle = (style: StyleValue, found: string[]): void => {
  if (!style || typeof style === 'number') return;
  if (Array.isArray(style)) {
    style.forEach((entry) => collectFromStyle(entry as StyleValue, found));
    return;
  }
  for (const value of Object.values(style)) {
    if (typeof value === 'string' && (value.startsWith('#') || value.startsWith('rgba'))) {
      found.push(value);
    }
  }
};

interface RenderedNode {
  props?: { style?: StyleValue; color?: unknown; placeholderTextColor?: unknown };
  children?: (RenderedNode | string)[] | null;
}

/** Toutes les couleurs posées dans l'arbre : styles, `color` et `placeholderTextColor`. */
export const renderedColors = (tree: ReactTestRenderer): string[] => {
  const found: string[] = [];

  const walk = (node: RenderedNode | string | null): void => {
    if (!node || typeof node === 'string') return;
    collectFromStyle(node.props?.style, found);
    for (const key of ['color', 'placeholderTextColor'] as const) {
      const value = node.props?.[key];
      if (typeof value === 'string' && value.startsWith('#')) found.push(value);
    }
    (node.children ?? []).forEach(walk);
  };

  walk(tree.toJSON() as RenderedNode | null);
  return found;
};

/** Les couleurs qu'un thème autorise : ses jetons plus celles de ses ombres. */
export const allowedColors = (theme: Theme): Set<string> =>
  new Set(
    [
      ...Object.values(theme.colors),
      ...Object.values(theme.shadows).map((shadow) => shadow.shadowColor),
    ].map((color) => color.toLowerCase())
  );

export const bothThemes: [ThemeName, Theme][] = [
  ['light', themes.light],
  ['dark', themes.dark],
];

/** Textes rendus, dans l'ordre : de quoi vérifier qu'un libellé est bien affiché. */
export const renderedText = (tree: ReactTestRenderer): string[] => {
  const texts: string[] = [];

  const walk = (node: RenderedNode | string | null): void => {
    if (!node) return;
    if (typeof node === 'string') {
      texts.push(node);
      return;
    }
    (node.children ?? []).forEach(walk);
  };

  walk(tree.toJSON() as RenderedNode | null);
  return texts;
};
