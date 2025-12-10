/**
 * Student Dashboard Screen
 * Single Responsibility: Main dashboard for students
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../../navigation/types';
import { enrollmentService, EnrolledSchool } from '../../services/api/EnrollmentService';
import { colors, typography, spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<StudentStackParamList, 'StudentDashboard'>;

export const StudentDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const [enrolledSchools, setEnrolledSchools] = useState<EnrolledSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEnrolledSchools();
  }, []);

  const loadEnrolledSchools = async () => {
    try {
      const schools = await enrollmentService.getMyEnrollments();
      setEnrolledSchools(schools.filter((s) => s.status === 'active'));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load enrolled schools');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEnrolledSchools();
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' } as any] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Student'}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.error[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionCard
              icon="school-outline"
              title="Browse Schools"
              onPress={() => navigation.navigate('BrowseSchools')}
            />
            <ActionCard
              icon="list-outline"
              title="My Requests"
              onPress={() => navigation.navigate('MyRequests')}
            />
          </View>
        </View>

        {/* Enrolled Schools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Schools</Text>
          {loading ? (
            <Text style={styles.emptyText}>Loading schools...</Text>
          ) : enrolledSchools.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No enrolled schools yet</Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('BrowseSchools')}
                activeOpacity={0.7}
              >
                <Text style={styles.browseButtonText}>Browse Schools</Text>
              </TouchableOpacity>
            </View>
          ) : (
            enrolledSchools.map((school) => (
              <SchoolCard
                key={school.id}
                school={school}
                onPress={() => navigation.navigate('MyProfile', { schoolId: school.schoolId })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

interface ActionCardProps {
  icon: string;
  title: string;
  onPress: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon as any} size={32} color={colors.primary[600]} />
    <Text style={styles.actionTitle}>{title}</Text>
  </TouchableOpacity>
);

interface SchoolCardProps {
  school: EnrolledSchool;
  onPress: () => void;
}

const SchoolCard: React.FC<SchoolCardProps> = ({ school, onPress }) => (
  <TouchableOpacity style={styles.schoolCard} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.schoolIcon}>
      <Ionicons name="school" size={24} color={colors.primary[600]} />
    </View>
    <View style={styles.schoolInfo}>
      <Text style={styles.schoolName}>{school.schoolName}</Text>
      <View style={styles.schoolMeta}>
        <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
        <Text style={styles.schoolLocation}>{school.location || 'Location not set'}</Text>
      </View>
      <View style={styles.enrollmentDateContainer}>
        <Text style={styles.enrollmentDateLabel}>Enrolled:</Text>
        <Text style={styles.enrollmentDate}>
          {new Date(school.enrollmentDate).toLocaleDateString()}
        </Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  greeting: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  userName: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  logoutButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyText: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  browseButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.background.primary,
  },
  schoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  schoolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  schoolMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginBottom: spacing.xs / 2,
  },
  schoolLocation: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  enrollmentDateContainer: {
    flexDirection: 'row',
    gap: spacing.xs / 2,
  },
  enrollmentDateLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  enrollmentDate: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
});
