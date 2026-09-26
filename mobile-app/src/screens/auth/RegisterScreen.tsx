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
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Button, Field, Screen, SectionHeader } from '../../components/ui';
import { ContactDetails, PASSWORD_MIN_LENGTH, toIsoDay } from '../../models/User';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { Theme } from '../../theme';
import { dateLocale } from '../../utils/format';
import { mirrorIcon } from '../../utils/rtl';

/** Ne garde que les coordonnees reellement saisies : un champ vide n'est pas envoye (D-50). */
const filledDetails = (details: ContactDetails): ContactDetails =>
  Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined && value !== '')
  );

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

  // Coordonnees facultatives (D-50) : l'inscription reste possible sans en saisir une seule
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

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
      // A2 sans schoolCode : le compte cree est un eleve (D-17) ; coordonnees facultatives (D-50)
      await register({
        email: email.trim(),
        password,
        firstName,
        lastName,
        ...filledDetails({
          phone: phone.trim(),
          dateOfBirth: dateOfBirth ? toIsoDay(dateOfBirth) : undefined,
          address: address.trim(),
          emergencyContact: emergencyContact.trim(),
          emergencyPhone: emergencyPhone.trim(),
        }),
      });
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

        <SectionHeader
          title={t('register.details.title')}
          subtitle={t('register.details.hint')}
          icon="person-circle-outline"
          style={styles.detailsHeader}
        />

        <Field
          label={t('register.details.phone')}
          placeholder="+216 00 000 000"
          value={phone}
          onChangeText={setPhone}
          icon="call-outline"
          keyboardType="phone-pad"
        />

        <View style={styles.section}>
          <Text style={styles.label}>{t('register.details.dateOfBirth')}</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            accessibilityRole="button"
            accessibilityLabel={t('register.details.dateOfBirth')}
            style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={dateOfBirth ? styles.dateText : styles.datePlaceholder}>
              {dateOfBirth
                ? dateOfBirth.toLocaleDateString(dateLocale())
                : t('register.details.dateNotSet')}
            </Text>
            {dateOfBirth ? (
              <Pressable
                onPress={() => setDateOfBirth(null)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('register.details.clearDate')}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
              </Pressable>
            ) : null}
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              // Une date de naissance future est refusee par le serveur : le selecteur l'interdit
              maximumDate={new Date()}
              onValueChange={(_event: unknown, selected?: Date) => {
                setShowDatePicker(false);
                if (selected) setDateOfBirth(selected);
              }}
              onDismiss={() => setShowDatePicker(false)}
            />
          )}
        </View>

        <Field
          label={t('register.details.address')}
          placeholder={t('register.details.addressPlaceholder')}
          value={address}
          onChangeText={setAddress}
          icon="location-outline"
        />

        <Field
          label={t('register.details.emergencyContact')}
          placeholder={t('register.details.emergencyContactPlaceholder')}
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          icon="people-outline"
          autoCapitalize="words"
        />

        <Field
          label={t('register.details.emergencyPhone')}
          placeholder="+216 00 000 000"
          value={emergencyPhone}
          onChangeText={setEmergencyPhone}
          icon="call-outline"
          keyboardType="phone-pad"
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
    detailsHeader: { marginTop: theme.spacing.lg },
    section: { gap: theme.spacing.xs },
    label: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textSecondary,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: 48,
      backgroundColor: theme.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
    },
    pressed: { opacity: 0.7 },
    dateText: { flex: 1, fontSize: theme.typography.size.base, color: theme.colors.textPrimary },
    datePlaceholder: {
      flex: 1,
      fontSize: theme.typography.size.base,
      color: theme.colors.textMuted,
    },
    loginLink: { alignItems: 'center', paddingVertical: theme.spacing.md },
    loginLinkText: { fontSize: theme.typography.size.base, color: theme.colors.textSecondary },
    loginLinkBold: {
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.accentText,
    },
  });
