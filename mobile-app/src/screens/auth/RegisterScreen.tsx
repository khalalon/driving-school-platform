/**
 * Register Screen - Minimal & Elegant
 * Single Responsibility: Handle student registration
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { colors, typography, spacing, shadows } from '../../theme';
import { mirrorIcon } from '../../utils/rtl';

export const RegisterScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleRegister = async () => {
    if (!email || !password || !firstName || !lastName) {
      Alert.alert(t('common.required'), t('auth.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordsMismatch'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordTooShort'));
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name={mirrorIcon('arrow-back')} size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t('auth.register.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>{t('auth.firstName')}</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.firstNamePlaceholder')}
                    placeholderTextColor={colors.neutral[400]}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>{t('auth.lastName')}</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.lastNamePlaceholder')}
                    placeholderTextColor={colors.neutral[400]}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.neutral[400]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={colors.neutral[400]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.neutral[400]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.passwordMinPlaceholder')}
                  placeholderTextColor={colors.neutral[400]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={colors.neutral[400]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.neutral[400]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  placeholderTextColor={colors.neutral[400]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={colors.neutral[400]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <>
                  <Text style={styles.buttonText}>{t('auth.createAccount')}</Text>
                  <Ionicons
                    name={mirrorIcon('arrow-forward')}
                    size={20}
                    color={colors.text.inverse}
                  />
                </>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
              <Text style={styles.loginLinkText}>
                {t('auth.alreadyHaveAccount')}{' '}
                <Text style={styles.loginLinkTextBold}>{t('auth.signInLink')}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.lg,
    backgroundColor: colors.background.secondary,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  titleContainer: {
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  form: {
    paddingBottom: spacing['4xl'],
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.base,
    height: 52,
  },
  inputIcon: {
    marginEnd: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    height: 52,
    gap: spacing.sm,
    marginTop: spacing.base,
    ...shadows.sm,
  },
  buttonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loginLink: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  loginLinkTextBold: {
    fontWeight: typography.weight.semibold,
    color: colors.primary[600],
  },
});
