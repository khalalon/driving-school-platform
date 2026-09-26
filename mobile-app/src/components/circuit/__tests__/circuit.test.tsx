/**
 * Composants « Circuit » (13.6, D-52) : rendu dans les deux thèmes avec les seules couleurs du
 * thème, jauge annoncée comme une progression et remplie à proportion, secteurs lisibles sans
 * la couleur, barre d'onglets accessible et assez grande pour le pouce.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { Path } from 'react-native-svg';
import { act } from 'react-test-renderer';
import { DateBadge, Gauge, SectorBar, StatRow, TabBar, TimeBlock, gaugeFill } from '../index';
import type { Sector } from '../index';
import {
  allowedColors,
  bothThemes,
  renderInTheme,
  renderedColors,
  renderedText,
  unmountInTheme,
} from '../../ui/__tests__/renderInTheme';
import { MIN_TOUCH_TARGET } from '../../../theme/tokens';

const noop = () => undefined;

const SECTORS: Sector[] = [
  { key: 'code', label: 'Code', state: 'done', accessibilityLabel: 'Code, terminé' },
  { key: 'theory', label: 'Théorie', state: 'done', accessibilityLabel: 'Théorie, terminé' },
  { key: 'manoeuvre', label: 'Manœuvre', state: 'current', accessibilityLabel: 'Manœuvre, en cours' },
  { key: 'parc', label: 'Parc', state: 'todo', accessibilityLabel: 'Parc, à venir' },
  { key: 'practical', label: 'Pratique', state: 'todo', accessibilityLabel: 'Pratique, à venir' },
];

const TABS = [
  { key: 'home', label: 'Accueil', icon: 'home-outline' as const, activeIcon: 'home' as const },
  { key: 'lessons', label: 'Leçons', icon: 'calendar-outline' as const, badge: 3 },
  { key: 'exams', label: 'Examens', icon: 'ribbon-outline' as const },
];

const CASES: [string, React.ReactElement][] = [
  ['Gauge', <Gauge value={3} max={5} accessibilityLabel="3 étapes sur 5" caption="Étapes" />],
  ['Gauge vide', <Gauge value={0} max={5} accessibilityLabel="0 étape sur 5" />],
  ['SectorBar', <SectorBar sectors={SECTORS} />],
  ['StatRow', <StatRow label="Code" value={12} />],
  ['StatRow cliquable', <StatRow label="Demandes" value={4} onPress={noop} emphasis />],
  [
    'TimeBlock',
    <TimeBlock kicker="Prochaine session" time="14:00" line="Jeu 02 oct · Manœuvre · 60 min" />,
  ],
  ['DateBadge', <DateBadge day="02" month="Oct" highlighted />],
  ['TabBar', <TabBar items={TABS} activeKey="home" onSelect={noop} bottomInset={34} />],
];

describe('composants « Circuit » : rendu dans les deux thèmes (13.6)', () => {
  for (const [themeName, theme] of bothThemes) {
    const allowed = allowedColors(theme);
    for (const [name, element] of CASES) {
      it(`${themeName} : ${name} n'utilise que les couleurs du thème`, () => {
        const tree = renderInTheme(element, themeName);
        const svgColors = tree.root
          .findAllByType(Path)
          .map((path) => String(path.props.stroke).toLowerCase());
        const unexpected = [...renderedColors(tree), ...svgColors].filter(
          (color) => !allowed.has(color.toLowerCase()) && color !== 'transparent'
        );
        expect({ composant: name, couleurs: unexpected }).toEqual({
          composant: name,
          couleurs: [],
        });
        unmountInTheme(tree);
      });
    }
  }
});

describe('Gauge', () => {
  it('remplit l’arc à proportion, borné entre vide et plein', () => {
    expect(gaugeFill(3, 5, 100)).toBeCloseTo(60);
    expect(gaugeFill(-1, 5, 100)).toBe(0);
    expect(gaugeFill(9, 5, 100)).toBe(100);
    expect(gaugeFill(1, 0, 100)).toBe(0);
  });

  it('s’annonce comme une progression, avec sa valeur', () => {
    const tree = renderInTheme(
      <Gauge value={3} max={5} accessibilityLabel="3 étapes sur 5" />,
      'dark'
    );
    const gauge = tree.root.findByProps({ accessibilityRole: 'progressbar' });
    expect(gauge.props.accessibilityLabel).toBe('3 étapes sur 5');
    expect(gauge.props.accessibilityValue).toEqual({ min: 0, max: 5, now: 3 });
    expect(renderedText(tree)).toContain('3/5');
    unmountInTheme(tree);
  });

  it('à zéro, seule la piste est dessinée', () => {
    const tree = renderInTheme(<Gauge value={0} max={5} accessibilityLabel="0 sur 5" />, 'dark');
    expect(tree.root.findAllByType(Path)).toHaveLength(1);
    unmountInTheme(tree);
  });
});

describe('SectorBar', () => {
  it('chaque secteur s’annonce avec son état, et l’état a une icône en plus de la couleur', () => {
    const tree = renderInTheme(<SectorBar sectors={SECTORS} />, 'dark');
    expect(tree.root.findByProps({ testID: 'sector-manoeuvre' }).props.accessibilityLabel).toBe(
      'Manœuvre, en cours'
    );
    const texts = renderedText(tree);
    expect(texts.filter((text) => text === 'checkmark')).toHaveLength(2);
    expect(texts.filter((text) => text === 'navigate')).toHaveLength(1);
    unmountInTheme(tree);
  });
});

describe('TabBar', () => {
  it('signale l’onglet actif et change d’onglet à la pression', () => {
    const onSelect = jest.fn();
    const tree = renderInTheme(<TabBar items={TABS} activeKey="home" onSelect={onSelect} />, 'dark');
    const home = tree.root.findByProps({ testID: 'tab-home' });
    const lessons = tree.root.findByProps({ testID: 'tab-lessons' });

    expect(home.props.accessibilityState).toEqual({ selected: true });
    expect(lessons.props.accessibilityState).toEqual({ selected: false });
    expect(lessons.props.accessibilityLabel).toBe('Leçons, 3');

    act(() => lessons.props.onPress());
    expect(onSelect).toHaveBeenCalledWith('lessons');
    unmountInTheme(tree);
  });

  it('chaque onglet offre au moins 48 px au pouce', () => {
    const tree = renderInTheme(<TabBar items={TABS} activeKey="home" onSelect={noop} />, 'dark');
    const style = StyleSheet.flatten(
      tree.root.findByProps({ testID: 'tab-home' }).props.style({ pressed: false })
    );
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET + 4);
    unmountInTheme(tree);
  });
});

describe('StatRow', () => {
  it('annonce le libellé avec sa valeur ; cliquable, elle ouvre le détail', () => {
    const onPress = jest.fn();
    const tree = renderInTheme(<StatRow label="Demandes" value={4} onPress={onPress} />, 'dark');
    const row = tree.root.findByProps({ accessibilityRole: 'button' });
    expect(row.props.accessibilityLabel).toBe('Demandes : 4');
    act(() => row.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    unmountInTheme(tree);
  });
});
