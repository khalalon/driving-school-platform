/**
 * Toasts (11.5) : un message s'affiche sans bloquer l'écran, disparaît seul, se ferme à la main,
 * et le dernier appel remplace le précédent. Hors `ToastProvider`, l'appel est sans effet.
 */

import React from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderer, { ReactTestRenderer, act } from 'react-test-renderer';
import { ToastProvider, useToast } from '../ToastContext';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Bouton nu : il déclenche `showToast` quand le test appelle son `onPress`. */
const Trigger = ({ message, tone }: { message: string; tone?: 'success' | 'danger' }) => {
  const { showToast } = useToast();
  return (
    <Text testID="trigger" onPress={() => showToast(message, tone)}>
      go
    </Text>
  );
};

const texts = (tree: ReactTestRenderer): string[] => {
  const found: string[] = [];
  const walk = (node: any): void => {
    if (!node) return;
    if (typeof node === 'string') {
      found.push(node);
      return;
    }
    (node.children ?? []).forEach(walk);
  };
  walk(tree.toJSON());
  return found;
};

const renderWithProvider = (node: React.ReactElement): ReactTestRenderer => {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ToastProvider>{node}</ToastProvider>
      </SafeAreaProvider>
    );
  });
  if (!tree) throw new Error('rendu impossible');
  return tree;
};

const press = (tree: ReactTestRenderer, testID = 'trigger'): void => {
  const node = tree.root.findAll((n) => n.props?.testID === testID)[0];
  act(() => {
    node.props.onPress();
  });
};

describe('ToastContext (11.5)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('affiche le message demandé, sans fenêtre bloquante', () => {
    const tree = renderWithProvider(<Trigger message="Demande envoyée" />);

    expect(texts(tree)).not.toContain('Demande envoyée');
    press(tree);
    expect(texts(tree)).toContain('Demande envoyée');
  });

  it('disparaît tout seul au bout de quelques secondes', () => {
    const tree = renderWithProvider(<Trigger message="Leçon annulée" />);
    press(tree);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(texts(tree)).not.toContain('Leçon annulée');
  });

  it('le dernier message remplace le précédent', () => {
    const First = () => {
      const { showToast } = useToast();
      return (
        <>
          <Text testID="first" onPress={() => showToast('Premier')}>
            1
          </Text>
          <Text testID="second" onPress={() => showToast('Second')}>
            2
          </Text>
        </>
      );
    };
    const tree = renderWithProvider(<First />);

    press(tree, 'first');
    press(tree, 'second');

    const shown = texts(tree);
    expect(shown).toContain('Second');
    expect(shown).not.toContain('Premier');
  });

  it('hors ToastProvider, demander un toast ne casse rien', () => {
    let tree: ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<Trigger message="Sans fournisseur" />);
    });
    expect(() => press(tree as ReactTestRenderer)).not.toThrow();
  });
});
