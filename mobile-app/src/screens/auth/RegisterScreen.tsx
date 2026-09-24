/**
 * Inscription d'un élève (11.3) — A2 sans code d'école : le compte créé est un élève (D-17).
 * Les règles de saisie sont annoncées **dans** les champs (aide, longueur minimale) plutôt que
 * découvertes après coup dans une fenêtre système.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Button, Field, Screen } from '../../components/ui';
import { PASSWORD_MIN_LENGTH } from '../../models/User';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { Theme } from '../../theme';
import { mirrorIcon } from '../../utils/rtl';

export const RegisterScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const { register } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Erreurs portées par les champs : l'utilisateur voit quoi corriger sans quitter le clavier
  const passwordError =
    password.length > 0 && password.length < PASSWORD_MIN_LENGTH
      ? t('auth.passwordTooShort', { min: PASSWORD_MIN_LENGTH })
      : null;
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== password ? t('auth.passwordsMismatch') : null;

  const handleRegister = async () => {
    if (!email || !password || !firstName || !lastName) {
      Alert.alert(t('common.required'), t('auth.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordsMismatch'));
      return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      Alert.alert(t('common.error'), t('auth.passwordTooShort', { min: PASSWORD_MIN_LENGTH }));
      return;
    }

    try {
      setLoading(true);
      // A2 sans schoolCode : le compte créé est un élève (D-17)
      await register({ email: email.trim(), password, firstName, lastName });
    } catch (error) {
      Alert.alert(t('auth.registrationFailed'), getApiErrorMessage(error, t('auth.tryAgain')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AppBar
        title={t('auth.register.title')}
        subtitle={t('auth.register.subtitle')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />

      <Screen contentContainerStyle={styles.content} edges={[]}>
        <View style={styles.row}>
          <Field
            label={t('auth.firstName')}
            placeholder={t('auth.firstNamePlaceholder')}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            containerStyle={styles.half}
          />
          <Field
            label={t('auth.lastName')}
            placeholder={t('auth.lastNamePlaceholder')}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            containerStyle={styles.half}
          />
        </View>

        <Field
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          icon="mail-outline"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Field
          label={t('auth.password')}
          placeholder={t('auth.passwordMinPlaceholder', { min: PASSWORD_MIN_LENGTH })}
          hint={t('auth.passwordTooShort', { min: PASSWORD_MIN_LENGTH })}
          error={passwordError}
          value={password}
          onChangeText={setPassword}
          icon="lock-closed-outline"
          revealable
        />

        <Field
          label={t('auth.confirmPassword')}
          placeholder={t('auth.confirmPasswordPlaceholder')}
          error={confirmError}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          icon="lock-closed-outline"
          revealable
        />

        <Button
          title={t('auth.createAccount')}
          onPress={handleRegister}
          loading={loading}
          icon={mirrorIcon('arrow-forward')}
          iconPosition="trailing"
          fullWidth
          style={styles.submit}
        />

        <Pressable
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
          style={styles.loginLink}
        >
          <Text style={styles.loginLinkText}>
            {t('auth.alreadyHaveAccount')}{' '}
            <Text style={styles.loginLinkBold}>{t('auth.signInLink')}</Text>
          </Text>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { paddingTop: theme.spacing.lg, gap: theme.spacing.base },
    row: { flexDirection: 'row', gap: theme.spacing.md },
    half: { flex: 1 },
    submit: { marginTop: theme.spacing.sm },
    loginLink: { alignItems: 'center', paddingVertical: theme.spacing.md },
    loginLinkText: { fontSize: theme.typography.size.base, color: theme.colors.textSecondary },
    loginLinkBold: {
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.accentText,
    },
  });
