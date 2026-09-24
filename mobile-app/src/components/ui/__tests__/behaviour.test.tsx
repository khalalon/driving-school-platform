/**
 * Comportements des composants partagés (11.2) : ce que les écrans attendent d'eux — une pression
 * qui appelle bien l'action, un bouton qui ne part pas deux fois pendant un appel réseau, une
 * erreur de champ qui s'affiche, une liste vide qui propose une suite.
 */

import React from 'react';
import { Text, TextInput } from 'react-native';
import { act } from 'react-test-renderer';
import { Button, Card, Chip, EmptyState, Field, ListRow } from '../index';
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
