/**
 * Instructor Dashboard - Minimal & Elegant
 * Single Responsibility: Main dashboard for instructors
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors, typography, spacing, shadows } from '../../theme';

export const InstructorDashboard = ({ navigation }: any) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  const sections = [
    {
      title: 'Enrollment',
      items: [
        {
          id: 'enrollment-requests',
          title: 'Requests',
          description: 'Review applications',
          icon: 'people-outline',
          color: colors.primary[600],
          bgColor: colors.primary[50],
          route: 'EnrollmentRequests',
        },
      ],
    },
    {
      title: 'Lessons',
      items: [
        {
          id: 'today-lessons',
          title: "Today's Schedule",
          description: 'View daily lessons',
          icon: 'calendar-outline',
          color: colors.success[600],
          bgColor: colors.success[50],
          route: 'TodayLessons',
        },
        {
          id: 'lesson-requests',
          title: 'Lesson Requests',
          description: 'Approve bookings',
          icon: 'time-outline',
          color: colors.warning[600],
          bgColor: colors.warning[50],
          route: 'LessonRequests',
        },
        {
          id: 'book-for-student',
          title: 'Book Lesson',
          description: 'Create for student',
          icon: 'add-circle-outline',
          color: colors.primary[600],
          bgColor: colors.primary[50],
          route: 'BookForStudent',
        },
      ],
    },
    {
      title: 'Exams',
      items: [
        {
          id: 'today-exams',
          title: "Today's Exams",
          description: 'View scheduled tests',
          icon: 'clipboard-outline',
          color: colors.error[600],
          bgColor: colors.error[50],
          route: 'TodayExams',
        },
        {
          id: 'exam-requests',
          title: 'Exam Requests',
          description: 'Schedule tests',
          icon: 'documents-outline',
          color: colors.warning[600],
          bgColor: colors.warning[50],
          route: 'ExamRequests',
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.firstName || 'Instructor'}</Text>
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
        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuGrid}>
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuCard}
                  onPress={() => navigation.navigate(item.route)}
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
          </View>
        ))}
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
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
