/**
 * Mon profil (11.3) — trois onglets : progression, leçons, examens.
 *
 * Onglet « Profil » depuis 8.4 : ouvert sans paramètre, l'écran retrouve lui-même l'école de
 * l'inscription approuvée (E3, une seule inscription active — D-22) ; ouvert avec `schoolId`
 * (depuis l'accueil), il l'utilise tel quel. Sans inscription approuvée : invitation à
 * chercher une école.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { MyProgressTab } from './tabs/MyProgressTab';
import { MyLessonsPaymentTab } from './tabs/MyLessonsPaymentTab';
import { MyExamsPaymentTab } from './tabs/MyExamsPaymentTab';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { AppBar, EmptyState, SkeletonCard } from '../../../components/ui';
import { enrollmentService } from '../../../services/api/EnrollmentService';
import { getApiErrorMessage } from '../../../services/api/ApiError';
import { EnrollmentStatus } from '../../../models/Enrollment';
import { Theme } from '../../../theme';
import { initialsOf } from '../../../utils/format';

const Tab = createMaterialTopTabNavigator();

export const MyProfileScreen = ({ route, navigation }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const paramSchoolId: string | undefined = route.params?.schoolId;
  // `undefined` = pas encore résolue, `null` = aucune inscription approuvée
  const [schoolId, setSchoolId] = useState<string | null | undefined>(paramSchoolId);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (paramSchoolId) {
        setSchoolId(paramSchoolId);
        return;
      }
      let cancelled = false;
      // E3 : l'inscription approuvée donne l'école de la fiche élève
      enrollmentService
        .getMyRequests()
        .then((requests) => {
          if (cancelled) return;
          const approved = requests.find((r) => r.status === EnrollmentStatus.APPROVED);
          setSchoolId(approved?.schoolId ?? null);
          setError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(getApiErrorMessage(err, t('profile.enrollmentFailed')));
          setSchoolId((current) => current ?? null);
        });
      return () => {
        cancelled = true;
      };
    }, [paramSchoolId])
  );

  const renderBody = () => {
    if (schoolId === undefined) {
      return (
        <View style={styles.loading}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </View>
      );
    }
    if (!schoolId) {
      return (
        <EmptyState
          icon="school-outline"
          title={t('profile.notEnrolled')}
          message={error ?? t('profile.notEnrolledText')}
          tone={error ? 'danger' : 'accent'}
          action={{
            label: t('home.browseSchools'),
            onPress: () => navigation.navigate('SchoolsList'),
          }}
          style={styles.empty}
        />
      );
    }
    return (
      <Tab.Navigator
        key={schoolId}
        screenOptions={{
          tabBarActiveTintColor: theme.colors.signal,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: theme.typography.size.sm,
            fontWeight: theme.typography.weight.semibold,
            textTransform: 'none',
          },
          tabBarStyle: {
            backgroundColor: theme.colors.surfaceRaised,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.border,
          },
          tabBarIndicatorStyle: { backgroundColor: theme.colors.signal, height: 3 },
        }}
      >
        <Tab.Screen
          name="Progress"
          component={MyProgressTab}
          initialParams={{ schoolId }}
          options={{ title: t('profile.tab.progress') }}
        />
        <Tab.Screen
          name="Lessons"
          component={MyLessonsPaymentTab}
          initialParams={{ schoolId }}
          options={{ title: t('profile.tab.lessons') }}
        />
        <Tab.Screen
          name="Exams"
          component={MyExamsPaymentTab}
          initialParams={{ schoolId }}
          options={{ title: t('profile.tab.exams') }}
        />
      </Tab.Navigator>
    );
  };

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('profile.title')}
        large
        avatar={{
          initials: initialsOf(user?.firstName, user?.lastName),
          onPress: () => navigation.navigate('Settings'),
          label: t('settings.open'),
        }}
      />
      {renderBody()}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    loading: { padding: theme.spacing.base, gap: theme.spacing.md },
    empty: { flex: 1 },
  });
