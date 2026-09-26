/**
 * `SectorBar` (13.6, D-52) — le parcours en secteurs, comme les secteurs d'un circuit :
 * fait (signal, coche), en cours (télémétrie, flèche), à venir (piste, libellé atténué).
 * L'état se lit aussi par l'icône et le libellé, jamais par la seule couleur. C'est aussi le
 * repli 2D du parcours 3D (13.11). La rangée suit le sens de lecture (RTL en arabe).
 * Avec `onSelect`, chaque secteur se touche (13.11) ; le secteur choisi (`selectedKey`) porte un
 * trait sous son libellé.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';
import type { IoniconName } from '../../utils/rtl';

export type SectorState = 'done' | 'current' | 'todo';

export interface Sector {
  key: string;
  label: string;
  state: SectorState;
  /** Lu par les lecteurs d'écran : « Code, terminé » (traduit par l'appelant). */
  accessibilityLabel: string;
}

interface SectorBarProps {
  sectors: Sector[];
  /** Secteurs cliquables : ouvre le détail d'une étape. */
  onSelect?: (key: string) => void;
  selectedKey?: string | null;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const STATE_ICONS: Record<SectorState, IoniconName | null> = {
  done: 'checkmark',
  current: 'navigate',
  todo: null,
};

export const SectorBar = ({ sectors, onSelect, selectedKey, style, testID }: SectorBarProps) => {
  const theme = useTheme();
  const label = useTextStyle('label');

  const barColor = (state: SectorState): string =>
    state === 'done'
      ? theme.colors.gauge
      : state === 'current'
        ? theme.colors.telemetry
        : theme.colors.gaugeTrack;

  const inkColor = (state: SectorState): string =>
    state === 'todo' ? theme.colors.textMuted : theme.colors.textPrimary;

  return (
    <View style={[styles.row, { gap: theme.spacing.xs }, style]} testID={testID}>
      {sectors.map((sector) => {
        const icon = STATE_ICONS[sector.state];
        const selected = sector.key === selectedKey;
        const content = (
          <>
            <View
              style={[
                styles.bar,
                { backgroundColor: barColor(sector.state), borderRadius: theme.radius.xs / 2 },
              ]}
            />
            <View style={[styles.labelRow, { gap: 3 }]}>
              {icon ? <Ionicons name={icon} size={12} color={inkColor(sector.state)} /> : null}
              <Text
                style={[
                  label,
                  styles.label,
                  {
                    color: inkColor(sector.state),
                    fontSize: 12,
                    lineHeight: 16,
                    letterSpacing: label.letterSpacing ? 0.4 : 0,
                  },
                ]}
                numberOfLines={1}
              >
                {sector.label}
              </Text>
            </View>
            {onSelect ? (
              <View
                style={[
                  styles.selection,
                  { backgroundColor: selected ? theme.colors.textPrimary : 'transparent' },
                ]}
              />
            ) : null}
          </>
        );

        if (!onSelect) {
          return (
            <View
              key={sector.key}
              style={[styles.sector, { gap: theme.spacing.xs + 2 }]}
              accessible
              accessibilityLabel={sector.accessibilityLabel}
              testID={`sector-${sector.key}`}
            >
              {content}
            </View>
          );
        }

        return (
          <Pressable
            key={sector.key}
            onPress={() => {
              if (!selected) haptics.selection();
              onSelect(sector.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={sector.accessibilityLabel}
            testID={`sector-${sector.key}`}
            style={({ pressed }) => [
              styles.sector,
              styles.pressable,
              { gap: theme.spacing.xs + 2 },
              pressed && { opacity: 0.7 },
            ]}
          >
            {content}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  sector: { flex: 1, minWidth: 0 },
  pressable: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  selection: { height: 2, borderRadius: 1, marginTop: 2 },
  bar: { height: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  label: { flexShrink: 1 },
});
