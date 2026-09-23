/**
 * My Profile Screen (Student Self-View)
 * Tab Navigator with 3 tabs: Progress, Lessons, Exams
 *
 * Onglet « Profile » depuis 8.4 : ouvert sans paramètre, l'écran retrouve lui-même l'école de
 * l'inscription approuvée (E3, une seule inscription active — D-22) ; ouvert avec `schoolId`
 * (depuis l'accueil), il l'utilise tel quel. Sans inscription approuvée : invitation à
 * chercher une école.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MyProgressTab } from './tabs/MyProgressTab';
import { MyLessonsPaymentTab } from './tabs/MyLessonsPaymentTab';
import { MyExamsPaymentTab } from './tabs/MyExamsPaymentTab';
import { LanguagePicker } from '../../../components/LanguagePicker';
import { enrollmentService } from '../../../services/api/EnrollmentService';
import { getApiErrorMessage } from '../../../services/api/ApiError';
import { EnrollmentStatus } from '../../../models/Enrollment';
import { colors, typography, spacing } from '../../../theme';

const Tab = createMaterialTopTabNavigator();

export const MyProfileScreen = ({ route, navigation }: any) => {
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
          setError(getApiErrorMessage(err, 'Failed to load your enrollment'));
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      );
    }
    if (!schoolId) {
      return (
        <View style={styles.center}>
          <Ionicons name="school-outline" size={40} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>Not enrolled yet</Text>
          <Text style={styles.emptyText}>
            {error ?? 'Your profile is available once a school has approved your enrollment.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('SchoolsList')}
          >
            <Text style={styles.primaryButtonText}>Browse schools</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <Tab.Navigator
        key={schoolId}
        screenOptions={{
          tabBarActiveTintColor: colors.primary[600],
          tabBarInactiveTintColor: colors.text.secondary,
          tabBarLabelStyle: {
            fontSize: typography.size.sm,
            fontWeight: typography.weight.semibold,
            textTransform: 'none',
          },
          tabBarStyle: {
            backgroundColor: colors.background.primary,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.neutral[200],
          },
          tabBarIndicatorStyle: {
            backgroundColor: colors.primary[600],
            height: 3,
          },
        }}
      >
        <Tab.Screen name="Progress" component={MyProgressTab} initialParams={{ schoolId }} />
        <Tab.Screen name="Lessons" component={MyLessonsPaymentTab} initialParams={{ schoolId }} />
        <Tab.Screen name="Exams" component={MyExamsPaymentTab} initialParams={{ schoolId }} />
      </Tab.Navigator>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <LanguagePicker compact />
      </View>

      {renderBody()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  primaryButton: {
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },
});
