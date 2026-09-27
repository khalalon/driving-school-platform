/**
 * SettingsScreen (13.3, D-52) — réglages communs aux deux rôles : langue (D-47), thème
 * Sombre / Clair / Système (sombre au premier lancement), déconnexion. Ouvert depuis l'en-tête
 * des accueils élève et instructeur : l'instructeur n'a pas d'onglet profil.
 */

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import {
  THEME_PREFERENCES,
  ThemePreference,
  useTheme,
  useThemePreference,
} from '../../context/ThemeContext';
import { LanguagePicker } from '../../components/LanguagePicker';
import { AppBar, Button, Card, Chip, Screen } from '../../components/ui';
import type { IoniconName } from '../../utils/rtl';
import { Theme, textStyle } from '../../theme';
import type { Language, TranslationKey } from '../../i18n';

const THEME_OPTIONS: Record<ThemePreference, { label: TranslationKey; icon: IoniconName }> = {
  dark: { label: 'settings.theme.dark', icon: 'moon-outline' },
  light: { label: 'settings.theme.light', icon: 'sunny-outline' },
  system: { label: 'settings.theme.system', icon: 'phone-portrait-outline' },
};

export const SettingsScreen = ({ navigation }: any) => {
  const { t, language } = useI18n();
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const styles = useMemo(() => createStyles(theme, language), [theme, language]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('settings.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />
      <Screen contentContainerStyle={styles.content} edges={['bottom']}>
        <LanguagePicker />

        <Card>
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('settings.appearance')}
            </Text>
            <View style={styles.row} accessibilityRole="radiogroup">
              {THEME_PREFERENCES.map((option) => (
                <Chip
                  key={option}
                  label={t(THEME_OPTIONS[option].label)}
                  icon={THEME_OPTIONS[option].icon}
                  selected={option === preference}
                  onPress={() => setPreference(option)}
                  testID={`theme-${option}`}
                />
              ))}
            </View>
            <Text style={styles.hint}>{t('settings.theme.hint')}</Text>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('settings.account')}
            </Text>
            {user?.email ? (
              <Text style={styles.hint}>{t('settings.signedInAs', { email: user.email })}</Text>
            ) : null}
            <Button
              title={t('common.logout')}
              onPress={handleLogout}
              variant="secondary"
              icon="log-out-outline"
              loading={loggingOut}
              fullWidth
              testID="settings-logout"
            />
          </View>
        </Card>
      </Screen>
    </View>
  );
};

const createStyles = (theme: Theme, language: Language) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { padding: theme.spacing.base, gap: theme.spacing.base },
    section: { gap: theme.spacing.md },
    sectionTitle: {
      ...textStyle('bodyStrong', language),
      color: theme.colors.textPrimary,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    hint: { ...textStyle('caption', language), color: theme.colors.textMuted },
  });
