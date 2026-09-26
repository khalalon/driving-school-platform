/**
 * Connexion (11.3) — première impression de l'application : la voiture de l'auto-école qui
 * roule de nuit (scène 3D, 13.10), langue (D-47), deux champs, puis les deux portes d'entrée
 * (élève, auto-école). Tout vient du système de 11.1 / 11.2 : aucune couleur ni aucun bouton
 * dessiné ici.
 */

import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { LanguagePicker } from '../../components/LanguagePicker';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Button, Field, Screen } from '../../components/ui';
import { Scene3D } from '../../components/three/Scene3D';
import { HomeCarScene } from '../../components/three/HomeCarScene';
import { HomeCarFallback } from '../../components/three/HomeCarFallback';
import { homeCarPalette } from '../../components/three/homeCar';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { Theme } from '../../theme';
import { mirrorIcon } from '../../utils/rtl';

export const LoginScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const { login } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.required'), t('auth.missingCredentials'));
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (error) {
      Alert.alert(t('auth.loginFailed'), getApiErrorMessage(error, t('auth.invalidCredentials')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen contentContainerStyle={styles.content} edges={['top', 'bottom']}>
        {/* Langue : accessible avant la connexion (D-47) */}
        <View style={styles.languageRow}>
          <LanguagePicker compact />
        </View>

        <Scene3D
          height={220}
          accessibilityLabel={t('home.scene3d')}
          style={styles.scene}
          testID="login-car-scene"
          fallback={<HomeCarFallback />}
        >
          <HomeCarScene palette={homeCarPalette(theme)} />
        </Scene3D>

        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.login.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <Field
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Field
            label={t('auth.password')}
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            icon="lock-closed-outline"
            revealable
          />

          <Button
            title={t('auth.signIn')}
            onPress={handleLogin}
            loading={loading}
            icon={mirrorIcon('arrow-forward')}
            iconPosition="trailing"
            fullWidth
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title={t('auth.createStudent')}
            onPress={() => navigation.navigate('Register')}
            variant="secondary"
            icon="person-add-outline"
            fullWidth
          />

          <Button
            title={t('auth.registerInstructor')}
            onPress={() => navigation.navigate('InstructorRegistration')}
            variant="ghost"
            icon="school-outline"
            fullWidth
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { justifyContent: 'center', paddingHorizontal: theme.spacing.xl },
    languageRow: { alignItems: 'center', marginBottom: theme.spacing.lg },
    header: { alignItems: 'center', marginBottom: theme.spacing['2xl'] },
    scene: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.size['3xl'],
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: theme.typography.size.base,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    form: { width: '100%', gap: theme.spacing.base },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: theme.spacing.sm },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      marginHorizontal: theme.spacing.base,
    },
  });
