/**
 * Bibliothèque de composants (11.2) : chaque composant se rend dans les **deux** thèmes, et
 * toute couleur qu'il pose vient du thème demandé. Une couleur codée en dur, oubliée dans un
 * composant, fait échouer ce test : la refonte des écrans (11.3, 11.4) part donc sur du propre.
 */

import React from 'react';
import { Text } from 'react-native';
import {
  AppBar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  ListRow,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonCard,
  Toast,
} from '../index';
import {
  allowedColors,
  bothThemes,
  renderInTheme,
  renderedColors,
  unmountInTheme,
} from './renderInTheme';

const noop = () => undefined;

/** Un cas par composant, avec des propriétés représentatives de l'usage réel. */
const CASES: [string, React.ReactElement][] = [
  [
    'Screen',
    <Screen>
      <Text>Contenu</Text>
    </Screen>,
  ],
  ['AppBar', <AppBar title="Mes leçons" subtitle="Auto-école El Amel" onBack={noop} />],
  ['Button primary', <Button title="Demander une leçon" onPress={noop} />],
  ['Button secondary', <Button title="Annuler" onPress={noop} variant="secondary" />],
  ['Button ghost', <Button title="Tout voir" onPress={noop} variant="ghost" size="sm" />],
  ['Button danger', <Button title="Refuser" onPress={noop} variant="danger" icon="close" />],
  ['Button loading', <Button title="Envoi" onPress={noop} loading />],
  [
    'Card',
    <Card>
      <Text>Prochaine leçon</Text>
    </Card>,
  ],
  [
    'Card highlighted',
    <Card highlighted onPress={noop}>
      <Text>Manœuvre</Text>
    </Card>,
  ],
  ['Chip', <Chip label="CODE" onPress={noop} />],
  ['Chip selected', <Chip label="Parc" onPress={noop} selected tone="success" icon="car" />],
  ['Badge', <Badge label="Planifiée" tone="accent" dot />],
  ['Field', <Field label="Adresse e-mail" value="" onChangeText={noop} icon="mail-outline" />],
  [
    'Field error',
    <Field
      label="Mot de passe"
      value="123"
      onChangeText={noop}
      error="8 caractères minimum"
      secureTextEntry
    />,
  ],
  [
    'SectionHeader',
    <SectionHeader
      title="Mon parcours"
      subtitle="5 étapes"
      action={{ label: 'Tout voir', onPress: noop }}
    />,
  ],
  [
    'ListRow',
    <ListRow
      title="Manœuvre"
      subtitle="Lundi 9:00"
      meta="60 min"
      icon="car"
      tone="success"
      onPress={noop}
      chevron
    />,
  ],
  [
    'EmptyState',
    <EmptyState
      icon="school-outline"
      title="Aucune leçon"
      message="Demandez votre première leçon."
      action={{ label: 'Demander', onPress: noop }}
    />,
  ],
  ['Skeleton', <Skeleton width="60%" height={18} />],
  ['SkeletonCard', <SkeletonCard />],
  ['Toast', <Toast message="Demande envoyée" onDismiss={noop} />],
  ['Toast danger', <Toast message="Leçon annulée" tone="danger" />],
];

describe('composants partagés : rendu dans les deux thèmes (11.2)', () => {
  for (const [themeName, theme] of bothThemes) {
    const allowed = allowedColors(theme);

    describe(`thème ${themeName}`, () => {
      for (const [name, element] of CASES) {
        it(`${name} n'utilise que les couleurs du thème`, () => {
          const tree = renderInTheme(element, themeName);
          const unexpected = renderedColors(tree).filter(
            (color) => !allowed.has(color.toLowerCase()) && color !== 'transparent'
          );

          expect({ composant: name, couleurs: unexpected }).toEqual({
            composant: name,
            couleurs: [],
          });
          unmountInTheme(tree);
        });
      }
    });
  }

  it('un même composant change de couleur avec le thème', () => {
    const clair = renderInTheme(
      <Card>
        <Text>Carte</Text>
      </Card>,
      'light'
    );
    const sombre = renderInTheme(
      <Card>
        <Text>Carte</Text>
      </Card>,
      'dark'
    );

    expect(renderedColors(clair)).not.toEqual(renderedColors(sombre));
    unmountInTheme(clair);
    unmountInTheme(sombre);
  });
});
