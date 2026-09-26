/**
 * Navigation « Circuit » (13.7, D-52) : la barre d'onglets est alimentée par React Navigation
 * (libellés, compteurs, onglet actif, `tabPress` avant de naviguer), chaque route d'onglet a son
 * icône, et les transitions de pile suivent les jetons de mouvement — coupées si « réduire les
 * animations » est actif.
 */

import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CardStyleInterpolators } from '@react-navigation/stack';
import { act } from 'react-test-renderer';
import { CircuitTabBar, TAB_ICONS } from '../CircuitTabBar';
import { stackScreenOptions } from '../AppNavigator';
import { exitDuration, motion } from '../../theme/motion';
import { renderInTheme, unmountInTheme } from '../../components/ui/__tests__/renderInTheme';
import type { InstructorTabParamList, StudentTabParamList } from '../types';

const routes = [
  { key: 'home-1', name: 'StudentDashboard', params: undefined },
  { key: 'lessons-1', name: 'MyLessons', params: undefined },
];

const makeProps = (index: number, defaultPrevented = false) => {
  const emit = jest.fn(() => ({ defaultPrevented }));
  const navigate = jest.fn();
  const props = {
    state: { index, routes, key: 'tabs', routeNames: routes.map((r) => r.name) },
    descriptors: {
      'home-1': { options: { title: 'Accueil' } },
      'lessons-1': { options: { title: 'Leçons', tabBarBadge: 2 } },
    },
    navigation: { emit, navigate },
    insets: { top: 0, bottom: 34, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
  return { props, emit, navigate };
};

describe('CircuitTabBar', () => {
  it('reprend titres, compteur et onglet actif', () => {
    const { props } = makeProps(0);
    const tree = renderInTheme(<CircuitTabBar {...props} />, 'dark');
    const home = tree.root.findByProps({ testID: 'tab-home-1' });
    const lessons = tree.root.findByProps({ testID: 'tab-lessons-1' });

    expect(home.props.accessibilityLabel).toBe('Accueil');
    expect(home.props.accessibilityState).toEqual({ selected: true });
    expect(lessons.props.accessibilityLabel).toBe('Leçons, 2');
    unmountInTheme(tree);
  });

  it('émet tabPress puis navigue vers l’onglet choisi', () => {
    const { props, emit, navigate } = makeProps(0);
    const tree = renderInTheme(<CircuitTabBar {...props} />, 'dark');
    act(() => tree.root.findByProps({ testID: 'tab-lessons-1' }).props.onPress());

    expect(emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'lessons-1',
      canPreventDefault: true,
    });
    expect(navigate).toHaveBeenCalledWith('MyLessons', undefined);
    unmountInTheme(tree);
  });

  it('un écran qui intercepte tabPress empêche la navigation ; l’onglet actif ne renavigue pas', () => {
    const prevented = makeProps(0, true);
    const tree = renderInTheme(<CircuitTabBar {...prevented.props} />, 'dark');
    act(() => tree.root.findByProps({ testID: 'tab-lessons-1' }).props.onPress());
    expect(prevented.navigate).not.toHaveBeenCalled();
    unmountInTheme(tree);

    const focused = makeProps(1);
    const again = renderInTheme(<CircuitTabBar {...focused.props} />, 'dark');
    act(() => again.root.findByProps({ testID: 'tab-lessons-1' }).props.onPress());
    expect(focused.emit).toHaveBeenCalled();
    expect(focused.navigate).not.toHaveBeenCalled();
    unmountInTheme(again);
  });

  it('chaque onglet des deux rôles a son icône', () => {
    const student: (keyof StudentTabParamList)[] = ['StudentDashboard', 'MyLessons', 'MyExams', 'MyProfile'];
    const instructor: (keyof InstructorTabParamList)[] = [
      'InstructorDashboard',
      'LessonRequests',
      'ExamRequests',
      'BookForStudent',
    ];
    for (const name of [...student, ...instructor]) {
      expect(TAB_ICONS[name]).toBeDefined();
    }
  });
});

describe('transitions de pile', () => {
  it('glissement aux durées des jetons, sortie plus courte que l’entrée', () => {
    const options = stackScreenOptions(false);
    expect(options.headerShown).toBe(false);
    expect(options.gestureDirection).toBe('horizontal');
    expect(options.cardStyleInterpolator).toBe(CardStyleInterpolators.forHorizontalIOS);
    expect(options.transitionSpec?.open).toEqual({
      animation: 'timing',
      config: { duration: motion.duration.slow },
    });
    expect(options.transitionSpec?.close).toEqual({
      animation: 'timing',
      config: { duration: exitDuration(motion.duration.slow) },
    });
  });

  it('aucune animation quand « réduire les animations » est actif', () => {
    const options = stackScreenOptions(true);
    expect(options.animation).toBe('none');
    expect(options.cardStyleInterpolator).toBe(CardStyleInterpolators.forNoAnimation);
  });
});
