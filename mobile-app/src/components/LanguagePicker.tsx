/**
 * LanguagePicker — choix de la langue (D-47), sur l'écran de connexion et dans « My Profile ».
 * Deux boutons : la langue active est mise en avant. Passer en arabe redémarre l'application
 * (sens de lecture), ce que le contexte gère.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../context/LanguageContext';
import { LANGUAGES } from '../i18n';
import { colors, typography, spacing } from '../theme';

interface LanguagePickerProps {
  /** `compact` : une simple rangée sans titre (écran de connexion). */
  compact?: boolean;
}

export const LanguagePicker = ({ compact = false }: LanguagePickerProps) => {
  const { language, setLanguage, t } = useI18n();

  return (
    <View style={compact ? styles.compactContainer : styles.container}>
      {!compact && (
        <View style={styles.titleRow}>
          <Ionicons name="language-outline" size={18} color={colors.text.secondary} />
          <Text style={styles.title}>{t('language.title')}</Text>
        </View>
      )}
      <View style={styles.row}>
        {LANGUAGES.map((item) => {
          const active = item.code === language;
          return (
            <TouchableOpacity
              key={item.code}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => (active ? undefined : setLanguage(item.code))}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!compact && <Text style={styles.hint}>{t('language.hint')}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  compactContainer: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.secondary,
  },
  optionActive: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  optionText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  optionTextActive: {
    color: colors.primary[700],
    fontWeight: typography.weight.semibold,
  },
  hint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
});
