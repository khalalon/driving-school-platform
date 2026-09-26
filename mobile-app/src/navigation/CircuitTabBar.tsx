/**
 * Adaptateur React Navigation → `TabBar` « Circuit » (13.7, D-52). Les onglets gardent leurs
 * routes (8.4) ; le libellé vient de `options.title`, le compteur de `options.tabBarBadge`,
 * l'icône de la table `TAB_ICONS` (une icône au repos, une pleine quand l'onglet est actif).
 *
 * Une pression émet `tabPress` avant de naviguer, comme la barre d'origine : un écran peut
 * encore l'intercepter (remonter en haut de sa liste, par exemple).
 */

import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabBar, TabBarItem } from '../components/circuit';
import type { IoniconName } from '../utils/rtl';

/** Icônes des onglets des deux rôles, par nom de route (noms inchangés depuis 8.4). */
export const TAB_ICONS: Record<string, { icon: IoniconName; activeIcon: IoniconName }> = {
  StudentDashboard: { icon: 'speedometer-outline', activeIcon: 'speedometer' },
  MyLessons: { icon: 'calendar-outline', activeIcon: 'calendar' },
  MyExams: { icon: 'ribbon-outline', activeIcon: 'ribbon' },
  MyProfile: { icon: 'person-outline', activeIcon: 'person' },
  InstructorDashboard: { icon: 'speedometer-outline', activeIcon: 'speedometer' },
  LessonRequests: { icon: 'time-outline', activeIcon: 'time' },
  ExamRequests: { icon: 'ribbon-outline', activeIcon: 'ribbon' },
  BookForStudent: { icon: 'people-outline', activeIcon: 'people' },
};

const FALLBACK_ICON = { icon: 'ellipse-outline' as IoniconName, activeIcon: 'ellipse' as IoniconName };

export const CircuitTabBar = ({ state, descriptors, navigation, insets }: BottomTabBarProps) => {
  const items: TabBarItem[] = state.routes.map((route) => {
    const { options } = descriptors[route.key];
    const icons = TAB_ICONS[route.name] ?? FALLBACK_ICON;
    const badge = typeof options.tabBarBadge === 'number' ? options.tabBarBadge : undefined;
    return {
      key: route.key,
      label: options.title ?? route.name,
      icon: icons.icon,
      activeIcon: icons.activeIcon,
      badge,
    };
  });

  const onSelect = (key: string) => {
    const route = state.routes.find((candidate) => candidate.key === key);
    if (!route) return;
    const focused = state.routes[state.index]?.key === key;
    const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <TabBar
      items={items}
      activeKey={state.routes[state.index]?.key ?? ''}
      onSelect={onSelect}
      bottomInset={insets.bottom}
    />
  );
};
