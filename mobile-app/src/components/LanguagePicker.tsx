/**
 * LanguagePicker — choix de la langue (D-47), sur l'écran de connexion et dans « Réglages » (13.3).
 * Deux `Chip` : la langue active est sélectionnée. Passer en arabe redémarre l'application
 * (sens de lecture), ce que le contexte gère.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LANGUAGES } from '../i18n';
import { Theme } from '../theme';
import { Chip } from './ui';

interface LanguagePickerProps {
  /** `compact` : une simple rangée sans titre (écran de connexion). */
  compact?: boolean;
}

export const LanguagePicker = ({ compact = false }: LanguagePickerProps) => {
  const { language, setLanguage, t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={compact ? styles.compactContainer : styles.container}>
      {!compact && (
        <View style={styles.titleRow}>
          <Ionicons name="language-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.title}>{t('language.title')}</Text>
        </View>
      )}
      <View style={styles.row}>
        {LANGUAGES.map((item) => (
          <Chip
            key={item.code}
            label={t(item.labelKey)}
            selected={item.code === language}
            onPress={() => (item.code === language ? undefined : setLanguage(item.code))}
          />
        ))}
      </View>
      {!compact && <Text style={styles.hint}>{t('language.hint')}</Text>}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    compactContainer: { alignItems: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    title: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    row: { flexDirection: 'row', gap: theme.spacing.sm },
    hint: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },
  });
