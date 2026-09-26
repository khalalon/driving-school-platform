/**
 * Comportements des composants partagés (11.2) : ce que les écrans attendent d'eux — une pression
 * qui appelle bien l'action, un bouton qui ne part pas deux fois pendant un appel réseau, une
 * erreur de champ qui s'affiche, une liste vide qui propose une suite.
 */

import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { act } from 'react-test-renderer';
import { AppBar, Badge, Button, Card, Chip, EmptyState, Field, ListRow } from '../index';
import { pressables, renderInTheme, renderedText } from './renderInTheme';

const press = (tree: ReturnType<typeof renderInTheme>, index = 0): void => {
  const pressable = pressables(tree)[index];
  act(() => {
    (pressable.props.onPress as () => void)();
  });
};

describe('Button (11.2)', () => {
  it('appelle son action à la pression', () => {
    const onPress = jest.fn();
    const tree = renderInTheme(<Button title="Envoyer" onPress={onPress} />, 'light');

    press(tree);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('pendant un chargement, le bouton est inactif et son libellé disparaît', () => {
    const onPress = jest.fn();
    const tree = renderInTheme(<Button title="Envoyer" onPress={onPress} loading />, 'light');

    expect(pressables(tree)[0].props.disabled).toBe(true);
    expect(renderedText(tree)).not.toContain('Envoyer');
    expect(onPress).not.toHaveBeenCalled();
  });

  it('désactivé, il annonce son état aux lecteurs d’écran', () => {
    const tree = renderInTheme(<Button title="Envoyer" onPress={jest.fn()} disabled />, 'light');

    expect(pressables(tree)[0].props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });
  });
});

describe('Card, Chip et ListRow (11.2)', () => {
  it('une carte sans action ne devient pas cliquable', () => {
    const tree = renderInTheme(
      <Card>
        <Text>Prochaine leçon</Text>
      </Card>,
      'light'
    );

    expect(pressables(tree)).toHaveLength(0);
  });

  it('un chip sélectionné le dit aux lecteurs d’écran', () => {
    const tree = renderInTheme(<Chip label="CODE" onPress={jest.fn()} selected />, 'light');

    expect(pressables(tree)[0].props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });
  });

  it('une ligne de liste est annoncée avec son sous-titre', () => {
    const tree = renderInTheme(
      <ListRow title="Manœuvre" subtitle="Lundi 9:00" onPress={jest.fn()} />,
      'light'
    );

    expect(pressables(tree)[0].props.accessibilityLabel).toBe('Manœuvre, Lundi 9:00');
  });
});

describe('Field (11.2)', () => {
  it('affiche l’erreur à la place de l’aide', () => {
    const tree = renderInTheme(
      <Field
        label="Mot de passe"
        value=""
        onChangeText={jest.fn()}
        hint="8 caractères minimum"
        error="Mot de passe trop court"
      />,
      'light'
    );

    const texts = renderedText(tree);
    expect(texts).toContain('Mot de passe trop court');
    expect(texts).not.toContain('8 caractères minimum');
  });

  it('reprend le libellé pour l’accessibilité et transmet la saisie', () => {
    const onChangeText = jest.fn();
    const tree = renderInTheme(
      <Field label="Adresse e-mail" value="" onChangeText={onChangeText} />,
      'light'
    );
    const input = tree.root.findAllByType(TextInput)[0];

    expect(input.props.accessibilityLabel).toBe('Adresse e-mail');
    act(() => {
      input.props.onChangeText?.('ali@exemple.tn');
    });
    expect(onChangeText).toHaveBeenCalledWith('ali@exemple.tn');
  });
});

describe('EmptyState (11.2)', () => {
  it('propose une suite plutôt qu’un simple « aucun résultat »', () => {
    const onPress = jest.fn();
    const tree = renderInTheme(
      <EmptyState
        icon="calendar-outline"
        title="Aucune leçon"
        message="Demandez votre première leçon."
        action={{ label: 'Demander une leçon', onPress }}
      />,
      'light'
    );

    expect(renderedText(tree)).toContain('Demander une leçon');
    press(tree);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('style « Circuit » (13.5)', () => {
  it('un bouton de confirmation vibre, un bouton ordinaire non', () => {
    const confirm = renderInTheme(
      <Button title="Envoyer" onPress={jest.fn()} haptic="success" />,
      'dark'
    );
    press(confirm);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

    const plain = renderInTheme(<Button title="Voir" onPress={jest.fn()} />, 'dark');
    press(plain);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('une pastille sélectionnée porte une coche : la sélection ne repose pas sur la couleur', () => {
    const selected = renderInTheme(<Chip label="Sombre" onPress={jest.fn()} selected />, 'dark');
    const idle = renderInTheme(<Chip label="Clair" onPress={jest.fn()} />, 'dark');

    expect(renderedText(selected)).toContain('checkmark');
    expect(renderedText(idle)).not.toContain('checkmark');
  });

  it('le repère d’un badge change de forme selon l’intention', () => {
    const shapeOf = (tone: 'accent' | 'danger') => {
      const tree = renderInTheme(<Badge label="Statut" tone={tone} dot />, 'dark');
      const dot = tree.root
        .findAllByType(View)
        .map((node) => StyleSheet.flatten(node.props.style))
        .find((style) => style?.width === 7);
      return { radius: dot?.borderRadius, rotate: JSON.stringify(dot?.transform ?? null) };
    };

    expect(shapeOf('accent')).not.toEqual(shapeOf('danger'));
  });

  it('l’avatar de l’en-tête ouvre les réglages', () => {
    const onPress = jest.fn();
    const tree = renderInTheme(
      <AppBar title="Accueil" avatar={{ initials: 'YA', onPress, label: 'Ouvrir les réglages' }} />,
      'dark'
    );
    const avatar = tree.root.findByProps({ testID: 'appbar-avatar' });

    expect(avatar.props.accessibilityLabel).toBe('Ouvrir les réglages');
    expect(renderedText(tree)).toContain('YA');
    act(() => avatar.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
