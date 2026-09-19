/**
 * Student Dashboard - Minimal & Elegant
 * Single Responsibility: Main dashboard for students
 *
 * La fiche « My Profile » (P8–P11) est celle de l'école de l'inscription approuvée (une seule
 * inscription active, D-22), retrouvée par E3 à chaque retour sur le tableau de bord.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { EnrollmentStatus } from '../../models/Enrollment';
import { colors, typography, spacing, shadows } from '../../theme';

export const StudentDashboard = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  // `undefined` = pas encore chargé, `null` = aucune inscription approuvée
  const [activeSchoolId, setActiveSchoolId] = useState<string | null | undefined>(undefined);

  const loadActiveEnrollment = useCallback(async (): Promise<string | null> => {
    try {
      // E3 : l'inscription approuvée donne l'école de la fiche élève
      const requests = await enrollmentService.getMyRequests();
      const approved = requests.find((r) => r.status === EnrollmentStatus.APPROVED);
      const schoolId = approved?.schoolId ?? null;
      setActiveSchoolId(schoolId);
      return schoolId;
    } catch {
      // Hors réseau : on retentera au prochain retour sur l'écran
      return activeSchoolId ?? null;
    }
  }, [activeSchoolId]);

  useFocusEffect(
    useCallback(() => {
      loadActiveEnrollment();
    }, [])
  );

  const handleLogout = async () => {
    await logout();
    // No need to navigate - AuthContext will trigger navigator rebuild
  };

  const openMyProfile = async () => {
    let schoolId = activeSchoolId;
    if (schoolId === undefined) {
      try {
        schoolId = await loadActiveEnrollment();
      } catch (error) {
        Alert.alert('Error', getApiErrorMessage(error, 'Failed to load your enrollment'));
        return;
      }
    }
    if (!schoolId) {
      Alert.alert(
        'Not enrolled yet',
        'Your profile is available once a school has approved your enrollment.',
        [
          { text: 'Browse schools', onPress: () => navigation.navigate('SchoolsList') },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }
    navigation.navigate('MyProfile', { schoolId });
  };

  const openRoute = (route: string) => {
    if (route === 'MyProfile') {
      openMyProfile();
      return;
    }
    navigation.navigate(route);
  };

  const menuItems = [
    {
      id: '1',
      title: 'Enrollment Status',
      description: 'Track your applications',
      icon: 'school-outline',
      color: colors.primary[600],
      bgColor: colors.primary[50],
      route: 'MyEnrollmentRequests',
    },
    {
      id: '2',
      title: 'Browse Schools',
      description: 'Find driving schools',
      icon: 'business-outline',
      color: colors.success[600],
      bgColor: colors.success[50],
      route: 'SchoolsList',
    },
    {
      id: '3',
      title: 'My Lessons',
      description: 'View and manage lessons',
      icon: 'calendar-outline',
      color: colors.warning[600],
      bgColor: colors.warning[50],
      route: 'MyLessons',
    },
    {
      id: '4',
      title: 'Request Exam',
      description: 'Schedule driving test',
      icon: 'clipboard-outline',
      color: colors.error[600],
      bgColor: colors.error[50],
      route: 'RequestExam',
    },
    {
      id: '5',
      title: 'My Exams',
      description: 'View exam results',
      icon: 'trophy-outline',
      color: colors.primary[600],
      bgColor: colors.primary[50],
      route: 'MyExams',
    },
    {
      id: '6',
      title: 'My Profile',
      description: 'Progress and payments',
      icon: 'person-outline',
      color: colors.success[600],
      bgColor: colors.success[50],
      route: 'MyProfile',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName}>{user?.firstName || 'Student'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Menu Grid */}
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuCard}
              onPress={() => openRoute(item.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: item.bgColor }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  greeting: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  menuCard: {
    width: '48%',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.lg,
    ...shadows.sm,
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  menuTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  menuDescription: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
});
