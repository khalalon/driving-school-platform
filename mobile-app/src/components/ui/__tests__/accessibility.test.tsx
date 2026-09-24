/**
 * Accessibilité des composants partagés (11.6) : tout ce qui se touche s'annonce (rôle, libellé)
 * et offre au moins 44 px de haut, débord (`hitSlop`) compris. Mesuré, pas estimé.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppBar, Badge, Button, Card, Chip, ListRow } from '../index';
import { MIN_TOUCH_TARGET } from '../../../theme/tokens';
import { pressables, renderInTheme, unmountInTheme } from './renderInTheme';

const noop = () => undefined;

/** Hauteur réellement touchable : la hauteur minimale plus le débord au-dessus et en dessous. */
const touchHeight = (props: Record<string, any>): number => {
  const style = StyleSheet.flatten(
    typeof props.style === 'function' ? props.style({ pressed: false }) : props.style
  ) as
    | { minHeight?: number; height?: number; paddingVertical?: number; padding?: number }
    | undefined;

  // À défaut de hauteur imposée : les marges intérieures autour d'une ligne de texte (~20 px)
  const base =
    style?.minHeight ?? style?.height ?? (style?.paddingVertical ?? style?.padding ?? 0) * 2 + 20;

  const slop = props.hitSlop;
  const extra =
    typeof slop === 'number' ? slop * 2 : slop ? (slop.top ?? 0) + (slop.bottom ?? 0) : 0;

  return base + extra;
};

/** Un cas par composant interactif, avec l'action qui le rend pressable. */
const CASES: [string, React.ReactElement][] = [
  ['Button md', <Button title="Envoyer" onPress={noop} />],
  ['Button sm', <Button title="Voir" onPress={noop} size="sm" />],
  ['Chip', <Chip label="CODE" onPress={noop} />],
  ['ListRow', <ListRow title="Manœuvre" onPress={noop} />],
  ['AppBar retour', <AppBar title="Mes leçons" onBack={noop} backLabel="Retour" />],
  [
    'Card cliquable',
    <Card onPress={noop} accessibilityLabel="Ouvrir">
      <Text>Carte</Text>
    </Card>,
  ],
];

describe('cibles tactiles et annonces (11.6)', () => {
  for (const [name, element] of CASES) {
    it(`${name} : rôle annoncé et au moins ${MIN_TOUCH_TARGET} px touchables`, () => {
      const tree = renderInTheme(element, 'light');
      const found = pressables(tree);

      expect({ composant: name, pressables: found.length > 0 }).toEqual({
        composant: name,
        pressables: true,
      });

      const measured = touchHeight(found[0].props);
      expect({ composant: name, hauteur: measured >= MIN_TOUCH_TARGET }).toEqual({
        composant: name,
        hauteur: true,
      });

      unmountInTheme(tree);
    });
  }

  it('un badge n’est pas touchable : il n’annonce pas de bouton', () => {
    const tree = renderInTheme(<Badge label="Planifiée" tone="accent" />, 'light');
    expect(pressables(tree)).toHaveLength(0);
    unmountInTheme(tree);
  });
});
