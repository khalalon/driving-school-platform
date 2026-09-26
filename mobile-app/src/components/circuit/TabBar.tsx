/**
 * `TabBar` (13.6, D-52) — barre d'onglets « Circuit » : filet en haut, icône + libellé en
 * capitales condensées, onglet actif en signal avec un trait au-dessus (l'état ne tient pas à
 * la seule couleur), pastille de compteur facultative, zone de sécurité du bas respectée.
 *
 * Indépendante de React Navigation : elle reçoit une liste d'onglets. La navigation (13.7)
 * l'alimente depuis `BottomTabBarProps`.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';
import type { IoniconName } from '../../utils/rtl';

export interface TabBarItem {
  key: string;
  label: string;
  icon: IoniconName;
  /** Icône pleine de l'onglet actif ; par défaut `icon`. */
  activeIcon?: IoniconName;
  /** Compteur (demandes en attente) ; masqué à 0. */
  badge?: number;
}

interface TabBarProps {
  items: TabBarItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** Marge de la zone de sécurité du bas (barre de gestes). */
  bottomInset?: number;
  testID?: string;
}

export const TabBar = ({ items, activeKey, onSelect, bottomInset = 0, testID }: TabBarProps) => {
  const theme = useTheme();
  const label = useTextStyle('label');

  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: bottomInset,
        },
      ]}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        const color = active ? theme.colors.signalText : theme.colors.textMuted;
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              if (!active) {
                haptics.selection();
              }
              onSelect(item.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.badge ? `${item.label}, ${item.badge}` : item.label}
            testID={`tab-${item.key}`}
            style={({ pressed }) => [
              styles.item,
              { gap: 3 },
              pressed && { backgroundColor: theme.colors.surfaceMuted },
            ]}
          >
            <View
              style={[
                styles.indicator,
                { backgroundColor: active ? theme.colors.gauge : 'transparent' },
              ]}
            />
            <View>
              <Ionicons
                name={active ? (item.activeIcon ?? item.icon) : item.icon}
                size={22}
                color={color}
              />
              {item.badge ? (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.colors.danger, borderColor: theme.colors.surface },
                  ]}
                >
                  <Text style={[label, styles.badgeText, { color: theme.colors.textOnDanger }]}>
                    {item.badge > 99 ? '99+' : String(item.badge)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                label,
                {
                  color,
                  fontSize: 12,
                  lineHeight: 15,
                  letterSpacing: label.letterSpacing ? 1 : 0,
                },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1 },
  item: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET + 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 6,
  },
  indicator: { position: 'absolute', top: 0, width: 28, height: 3, borderRadius: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    end: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, letterSpacing: 0 },
});
