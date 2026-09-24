/**
 * Inscription d'un instructeur (11.3) — un seul formulaire → A2 avec `schoolCode` (D-17) : le rôle
 * et l'école sont déduits du code, `phone` et `licenseNumber` sont exigés, la fiche instructeur est
 * créée par le backend. Le code d'école ouvre le formulaire : c'est lui qui décide de tout.
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Button, Card, Field, Screen } from '../../components/ui';
import { PASSWORD_MIN_LENGTH } from '../../models/User';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { Theme } from '../../theme';
import { mirrorIcon } from '../../utils/rtl';

export const InstructorRegistrationScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const { register } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [schoolCode, setSchoolCode] = useState('');

  const passwordError =
    password.length > 0 && password.length < PASSWORD_MIN_LENGTH
      ? t('auth.passwordTooShort', { min: PASSWORD_MIN_LENGTH })
      : null;
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== password ? t('auth.passwordsMismatch') : null;

  const handleRegister = async () => {
    if (
      !email.trim() ||
      !password ||
      !firstName.trim() ||
      !lastName.trim() ||
      !phone.trim() ||
      !licenseNumber.trim() ||
      !schoolCode.trim()
    ) {
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
      // A2 avec schoolCode : rôle et école déduits du code, session ouverte directement
      await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        licenseNumber: licenseNumber.trim(),
        schoolCode: schoolCode.trim(),
      });
    } catch (error) {
      Alert.alert(
        t('auth.registrationFailed'),
        getApiErrorMessage(error, t('auth.checkDetailsAndCode'))
      );
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
        title={t('auth.instructor.title')}
        subtitle={t('auth.instructor.subtitle')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />

      <Screen contentContainerStyle={styles.content} edges={[]}>
        <Card highlighted elevation="none" style={styles.info}>
          <Ionicons name="key" size={22} color={theme.colors.accentText} />
          <Text style={styles.infoText}>{t('auth.instructor.codeHint')}</Text>
        </Card>

        <Field
          label={t('auth.schoolCode')}
          placeholder="INST-ABC123"
          value={schoolCode}
          onChangeText={setSchoolCode}
          icon="key-outline"
          autoCapitalize="characters"
          autoCorrect={false}
        />

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
          autoCorrect={false}
        />

        <Field
          label={t('auth.password')}
          placeholder={t('auth.passwordMinPlaceholder', { min: PASSWORD_MIN_LENGTH })}
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

        <Field
          label={t('auth.phone')}
          placeholder="+216 00 000 000"
          value={phone}
          onChangeText={setPhone}
          icon="call-outline"
          keyboardType="phone-pad"
        />

        <Field
          label={t('auth.licenseNumber')}
          placeholder={t('auth.licensePlaceholder')}
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          icon="card-outline"
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Button
          title={t('auth.createInstructorAccount')}
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
          <Text style={styles.loginLinkText}>{t('auth.alreadyHaveAccountSignIn')}</Text>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { paddingTop: theme.spacing.lg, gap: theme.spacing.base },
    info: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    infoText: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      color: theme.colors.accentText,
      lineHeight: theme.typography.size.sm * theme.typography.lineHeight.normal,
    },
    row: { flexDirection: 'row', gap: theme.spacing.md },
    half: { flex: 1 },
    submit: { marginTop: theme.spacing.sm },
    loginLink: { alignItems: 'center', paddingVertical: theme.spacing.md },
    loginLinkText: {
      fontSize: theme.typography.size.base,
      color: theme.colors.accentText,
      fontWeight: theme.typography.weight.medium,
    },
  });
